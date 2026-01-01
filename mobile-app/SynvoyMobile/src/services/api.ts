import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use a function to get API URL to avoid issues during module initialization
// For Android physical devices, use your computer's IP address instead of localhost
// Your detected IP: 192.168.50.183 (update if it changes)
const getApiBaseUrl = (): string => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // For Android emulator, use 10.0.2.2 (special alias to host machine)
    // For physical device, use your computer's local IP
    // To find your IP: ip addr show | grep "inet " | grep -v 127.0.0.1
    const DEVICE_IP = '192.168.50.183'; // Your computer's IP - update if it changes
    // Note: Backend runs directly on port 8000 without /api prefix
    // Nginx adds /api prefix, but direct connection doesn't need it
    return `http://${DEVICE_IP}:8000`; // Physical device - no /api prefix
    // return 'http://10.0.2.2:8000'; // Uncomment for Android emulator
  }
  // Production: use nginx which handles /api prefix
  return 'https://www.synvoy.com/api';
};

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    try {
      this.client = axios.create({
        baseURL: getApiBaseUrl(),
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        maxRedirects: 5,
      });

      // Request interceptor to add token
      this.client.interceptors.request.use(
        async (config) => {
          try {
            // Always get fresh token from storage to ensure it's up to date
            const token = await AsyncStorage.getItem('authToken');
            if (token) {
              this.token = token;
              if (config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
              }
            } else if (this.token && config.headers) {
              // Fallback to cached token if storage read fails
              config.headers.Authorization = `Bearer ${this.token}`;
            }
            return config;
          } catch (error) {
            console.error('Request interceptor error:', error);
            // If storage read fails, try using cached token
            if (this.token && config.headers) {
              config.headers.Authorization = `Bearer ${this.token}`;
            }
            return config;
          }
        },
        (error) => Promise.reject(error)
      );

      // Response interceptor for error handling
      this.client.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
          try {
            if (error.response?.status === 401) {
              // Token expired or invalid
              await this.logout();
            }
            return Promise.reject(error);
          } catch (logoutError) {
            console.error('Logout error in interceptor:', logoutError);
            return Promise.reject(error);
          }
        }
      );
    } catch (error) {
      console.error('ApiService constructor error:', error);
      // Create a minimal client even if there's an error
      this.client = axios.create({
        baseURL: 'http://localhost:8000/api',
        timeout: 10000,
      });
    }
  }

  async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem('authToken', token);
  }

  async logout() {
    this.token = null;
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
  }

  // Auth endpoints
  async login(usernameOrEmail: string, password: string) {
    try {
      const response = await this.client.post('/auth/login', { username_or_email: usernameOrEmail, password });
      if (response.data.access_token) {
        await this.setToken(response.data.access_token);
      }
      return response.data;
    } catch (error: any) {
      console.error('API login error:', error);
      // Re-throw with more context
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || error.message?.includes('Network request failed')) {
        throw new Error('Cannot connect to server. Make sure the backend is running and the API URL is correct.');
      }
      throw error;
    }
  }

  async register(data: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    tester_code?: string;
  }) {
    const response = await this.client.post('/auth/register', data);
    if (response.data.access_token) {
      await this.setToken(response.data.access_token);
    }
    return response.data;
  }

  async verifyEmail(email: string, code: string) {
    try {
      const response = await this.client.post('/auth/verify-email', { email, code });
      return response.data;
    } catch (error: any) {
      console.error('API verify email error:', error);
      throw error;
    }
  }

  async resendVerification(email: string) {
    try {
      const response = await this.client.post('/auth/resend-verification', { email });
      return response.data;
    } catch (error: any) {
      console.error('API resend verification error:', error);
      throw error;
    }
  }

  async getVerificationStatus(email: string) {
    try {
      const response = await this.client.get(`/auth/verification-status?email=${encodeURIComponent(email)}`);
      return response.data;
    } catch (error: any) {
      console.error('API get verification status error:', error);
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string) {
    try {
      const response = await this.client.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return response.data;
    } catch (error: any) {
      console.error('API change password error:', error);
      throw error;
    }
  }

  async deleteAccount(password: string) {
    try {
      const response = await this.client.post('/auth/delete-account', {
        password,
      });
      return response.data;
    } catch (error: any) {
      console.error('API delete account error:', error);
      throw error;
    }
  }

  async cancelDeletion(token: string) {
    try {
      const response = await this.client.post('/auth/cancel-deletion', {
        token,
      });
      return response.data;
    } catch (error: any) {
      console.error('API cancel deletion error:', error);
      throw error;
    }
  }

  async getDeletionStatus() {
    try {
      const response = await this.client.get('/auth/deletion-status');
      return response.data;
    } catch (error: any) {
      console.error('API get deletion status error:', error);
      throw error;
    }
  }

  // User endpoints
  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  async updateProfile(data: any) {
    const response = await this.client.put('/auth/profile', data);
    return response.data;
  }

  // Trip endpoints
  async getTrips() {
    const response = await this.client.get('/trips/');
    return response.data;
  }

  async getTrip(id: string) {
    const response = await this.client.get(`/trips/${id}`);
    return response.data;
  }

  async createTrip(data: any) {
    const response = await this.client.post('/trips', data);
    return response.data;
  }

  async updateTrip(id: string, data: any) {
    const response = await this.client.put(`/trips/${id}`, data);
    return response.data;
  }

  async deleteTrip(id: string) {
    const response = await this.client.delete(`/trips/${id}`);
    return response.data;
  }

  async inviteUsers(tripId: string, userIds: string[]) {
    const response = await this.client.post(`/trips/${tripId}/invite`, { user_ids: userIds });
    return response.data;
  }

  async updateParticipantStatus(tripId: string, participantId: string, status: 'accepted' | 'declined') {
    const response = await this.client.put(`/trips/${tripId}/participants/${participantId}`, { status });
    return response.data;
  }

  async removeParticipant(tripId: string, participantId: string) {
    const response = await this.client.delete(`/trips/${tripId}/participants/${participantId}`);
    return response.data;
  }

  // Price alert endpoints
  async getAlerts() {
    const response = await this.client.get('/alerts');
    return response.data;
  }

  async createAlert(data: any) {
    const response = await this.client.post('/alerts', data);
    return response.data;
  }

  async updateAlert(id: string, data: any) {
    const response = await this.client.put(`/alerts/${id}`, data);
    return response.data;
  }

  async deleteAlert(id: string) {
    const response = await this.client.delete(`/alerts/${id}`);
    return response.data;
  }

  // Shopping endpoints
  async getShoppingItems() {
    const response = await this.client.get('/shopping/items');
    return response.data;
  }

  async createShoppingItem(data: any) {
    const response = await this.client.post('/shopping/items', data);
    return response.data;
  }

  async updateShoppingItem(id: string, data: any) {
    const response = await this.client.put(`/shopping/items/${id}`, data);
    return response.data;
  }

  async deleteShoppingItem(id: string) {
    const response = await this.client.delete(`/shopping/items/${id}`);
    return response.data;
  }

  // Connection endpoints
  async getConnections(statusFilter?: string) {
    const url = statusFilter ? `/connections/?status_filter=${statusFilter}` : '/connections/';
    const response = await this.client.get(url);
    return response.data;
  }

  async searchUsers(query: string) {
    const response = await this.client.get(`/connections/search?query=${encodeURIComponent(query)}`);
    return response.data;
  }

  async sendConnectionRequest(connectedUserId: string) {
    const response = await this.client.post('/connections/request', {
      connected_user_id: connectedUserId,
    });
    return response.data;
  }

  async createConnection(data: { connectedUserId: string; connectionType?: string }) {
    const response = await this.client.post('/connections', data);
    return response.data;
  }

  async updateConnection(id: string, status: 'pending' | 'accepted' | 'blocked') {
    const response = await this.client.put(`/connections/${id}`, { status });
    return response.data;
  }

  async deleteConnection(id: string) {
    const response = await this.client.delete(`/connections/${id}`);
    return response.data;
  }

  // Message endpoints
  async getConversations() {
    const response = await this.client.get('/messages/conversations');
    return response.data;
  }

  async getConversation(userId: string, limit: number = 50, offset: number = 0) {
    const response = await this.client.get(`/messages/conversation/${userId}`, {
      params: { limit, offset },
    });
    return response.data;
  }

  async sendMessage(content: string, receiverId?: string, tripId?: string) {
    const body: any = { content };
    if (receiverId) {
      body.receiver_id = receiverId;
    }
    if (tripId) {
      body.trip_id = tripId;
    }
    const response = await this.client.post('/messages/', body);
    return response.data;
  }

  async getTripMessages(tripId: string, limit: number = 50, offset: number = 0) {
    const response = await this.client.get(`/messages/trip/${tripId}`, {
      params: { limit, offset },
    });
    return response.data;
  }

  async clearChat(userId?: string, tripId?: string) {
    const response = await this.client.post('/messages/clear-chat', {
      user_id: userId,
      trip_id: tripId,
    });
    return response.data;
  }

  async deleteMessageForEveryone(messageId: string) {
    const response = await this.client.post('/messages/delete-for-everyone', {
      message_id: messageId,
    });
    return response.data;
  }

  async leaveGroup(tripId: string) {
    const response = await this.client.post('/messages/leave-group', {
      trip_id: tripId,
    });
    return response.data;
  }

  // Notification endpoints
  async getNotifications() {
    const response = await this.client.get('/notifications');
    return response.data;
  }

  async markNotificationRead(id: string) {
    const response = await this.client.put(`/notifications/${id}/read`);
    return response.data;
  }
}

// Lazy initialization to avoid issues during module loading
let apiServiceInstance: ApiService | null = null;

const getApiService = (): ApiService => {
  if (!apiServiceInstance) {
    apiServiceInstance = new ApiService();
  }
  return apiServiceInstance;
};

// Export getter function for lazy access
export { getApiService };

// For backward compatibility, export as object with getter
// This will only instantiate when first property is accessed
export const apiService = {
  get client() { return getApiService().client; },
  get token() { return getApiService().token; },
  setToken: (token: string) => getApiService().setToken(token),
  logout: () => getApiService().logout(),
  login: (email: string, password: string) => getApiService().login(email, password),
  register: (data: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    tester_code?: string;
  }) => getApiService().register(data),
  getProfile: () => getApiService().getProfile(),
  updateProfile: (data: any) => getApiService().updateProfile(data),
  getTrips: () => getApiService().getTrips(),
  getTrip: (id: string) => getApiService().getTrip(id),
  createTrip: (data: any) => getApiService().createTrip(data),
  updateTrip: (id: string, data: any) => getApiService().updateTrip(id, data),
  deleteTrip: (id: string) => getApiService().deleteTrip(id),
  inviteUsers: (tripId: string, userIds: string[]) => getApiService().inviteUsers(tripId, userIds),
  updateParticipantStatus: (tripId: string, participantId: string, status: 'accepted' | 'declined') => getApiService().updateParticipantStatus(tripId, participantId, status),
  removeParticipant: (tripId: string, participantId: string) => getApiService().removeParticipant(tripId, participantId),
  getAlerts: () => getApiService().getAlerts(),
  createAlert: (data: any) => getApiService().createAlert(data),
  updateAlert: (id: string, data: any) => getApiService().updateAlert(id, data),
  deleteAlert: (id: string) => getApiService().deleteAlert(id),
  getShoppingItems: () => getApiService().getShoppingItems(),
  createShoppingItem: (data: any) => getApiService().createShoppingItem(data),
  updateShoppingItem: (id: string, data: any) => getApiService().updateShoppingItem(id, data),
  deleteShoppingItem: (id: string) => getApiService().deleteShoppingItem(id),
        getConnections: (statusFilter?: string) => getApiService().getConnections(statusFilter),
        searchUsers: (query: string) => getApiService().searchUsers(query),
        sendConnectionRequest: (connectedUserId: string) => getApiService().sendConnectionRequest(connectedUserId),
        createConnection: (data: any) => getApiService().createConnection(data),
        updateConnection: (id: string, status: 'pending' | 'accepted' | 'blocked') => getApiService().updateConnection(id, status),
  deleteConnection: (id: string) => getApiService().deleteConnection(id),
        deleteConnection: (id: string) => getApiService().deleteConnection(id),
  getConversations: () => getApiService().getConversations(),
  getConversation: (userId: string, limit?: number, offset?: number) => getApiService().getConversation(userId, limit, offset),
  getTripMessages: (tripId: string, limit?: number, offset?: number) => getApiService().getTripMessages(tripId, limit, offset),
  sendMessage: (content: string, receiverId?: string, tripId?: string) => getApiService().sendMessage(content, receiverId, tripId),
  clearChat: (userId?: string, tripId?: string) => getApiService().clearChat(userId, tripId),
  deleteMessageForEveryone: (messageId: string) => getApiService().deleteMessageForEveryone(messageId),
  leaveGroup: (tripId: string) => getApiService().leaveGroup(tripId),
  getNotifications: () => getApiService().getNotifications(),
  markNotificationRead: (id: string) => getApiService().markNotificationRead(id),
};

export default apiService;

