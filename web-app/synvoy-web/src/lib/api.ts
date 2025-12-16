import axios from 'axios';

// Base URL for your FastAPI backend
const BASE_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Token expired, clear storage and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  // Register new user
  register: async (userData: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      // Handle network connectivity errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.message?.includes('Network Error')) {
        throw new Error(`Cannot connect to server. Please check:\n1. Backend is running on ${BASE_URL}\n2. Backend is accessible from this network\n3. Firewall allows connections on port 8000`);
      }
      
      let errorMessage = 'Registration failed';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join(', ');
        } else {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  },

  // Login user
  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });
      return response.data;
    } catch (error: any) {
      // Handle network connectivity errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.message?.includes('Network Error')) {
        throw new Error(`Cannot connect to server. Please check:\n1. Backend is running on ${BASE_URL}\n2. Backend is accessible from this network\n3. Firewall allows connections on port 8000`);
      }
      
      throw new Error(error.response?.data?.detail || error.message || 'Login failed');
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get profile');
    }
  },

  // Logout user
  logout: async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
    return true;
  },
};

// Connection API functions
export const connectionAPI = {
  // Search users
  searchUsers: async (query: string) => {
    try {
      const response = await api.get(`/connections/search?query=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to search users');
    }
  },

  // Send connection request
  sendConnectionRequest: async (connectedUserId: string) => {
    try {
      const response = await api.post('/connections/request', {
        connected_user_id: connectedUserId,
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to send connection request';
      throw new Error(errorMessage);
    }
  },

  // Get all connections
  getConnections: async (status?: string) => {
    try {
      const url = status ? `/connections?status_filter=${status}` : '/connections';
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get connections');
    }
  },

  // Update connection (accept/reject/block)
  updateConnection: async (connectionId: string, status: 'pending' | 'accepted' | 'blocked') => {
    try {
      const response = await api.put(`/connections/${connectionId}`, { status });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to update connection');
    }
  },

  // Delete connection
  deleteConnection: async (connectionId: string) => {
    try {
      const response = await api.delete(`/connections/${connectionId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to delete connection');
    }
  },
};

// Message API functions
export const messageAPI = {
  // Send message (1-on-1 or trip group chat)
  sendMessage: async (content: string, receiverId?: string, tripId?: string) => {
    try {
      const response = await api.post('/messages/', {
        receiver_id: receiverId,
        trip_id: tripId,
        content,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to send message');
    }
  },

  // Get conversation with a user
  getConversation: async (userId: string, limit: number = 50, offset: number = 0) => {
    try {
      const response = await api.get(`/messages/conversation/${userId}?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get conversation');
    }
  },

  // Get trip messages (group chat)
  getTripMessages: async (tripId: string, limit: number = 50, offset: number = 0) => {
    try {
      const response = await api.get(`/messages/trip/${tripId}?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get trip messages');
    }
  },

  // Get all conversations
  getConversations: async () => {
    try {
      const response = await api.get('/messages/conversations');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get conversations');
    }
  },
};

// Storage utilities
export const storage = {
  // Save auth token
  saveToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  },

  // Get auth token
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  },

  // Save user data
  saveUserData: (userData: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_data', JSON.stringify(userData));
    }
  },

  // Get user data
  getUserData: (): any | null => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  },

  // Clear all data
  clearAll: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
  },
};

// Trip API functions
export const tripAPI = {
  // Create a new trip
  createTrip: async (tripData: {
    title: string;
    description?: string;
    budget?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
  }) => {
    try {
      const response = await api.post('/trips/', tripData);
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.message?.includes('Network Error')) {
        throw new Error(`Cannot connect to server. Please check:\n1. Backend is running on ${BASE_URL}\n2. Backend is accessible from this network\n3. Firewall allows connections on port 8000`);
      }
      throw new Error(error.response?.data?.detail || error.message || 'Failed to create trip');
    }
  },

  // Get all trips
  getTrips: async () => {
    try {
      const response = await api.get('/trips/');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch trips');
    }
  },

  // Get a specific trip
  getTrip: async (tripId: string) => {
    try {
      const response = await api.get(`/trips/${tripId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch trip');
    }
  },

  // Update a trip
  updateTrip: async (tripId: string, tripData: {
    title?: string;
    description?: string;
    budget?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
  }) => {
    try {
      const response = await api.put(`/trips/${tripId}`, tripData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.message || 'Failed to update trip');
    }
  },

  // Invite users to a trip
  inviteUsers: async (tripId: string, userIds: string[]) => {
    try {
      const response = await api.post(`/trips/${tripId}/invite`, { user_ids: userIds });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.message || 'Failed to invite users');
    }
  },

  // Accept or decline trip invitation
  updateParticipantStatus: async (tripId: string, participantId: string, status: 'accepted' | 'declined') => {
    try {
      const response = await api.put(`/trips/${tripId}/participants/${participantId}`, { status });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.message || 'Failed to update participant status');
    }
  },

  // Delete a trip
  deleteTrip: async (tripId: string) => {
    try {
      const response = await api.delete(`/trips/${tripId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.message || 'Failed to delete trip');
    }
  },
};

export default api;

