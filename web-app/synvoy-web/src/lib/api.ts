import axios from 'axios';

// Base URL for your FastAPI backend
// Dynamically detect the hostname to work from both localhost and network devices
const getBaseURL = () => {
  // In browser, always use current window location (ignore build-time env vars)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    // Always use current hostname - this works from any device on the network
    return `${protocol}//${hostname}:8000`;
  }
  
  // Server-side fallback (shouldn't be used for API calls)
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

// Create axios instance - baseURL will be set dynamically in interceptor
const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure we never use HTTP for production
  maxRedirects: 0, // Prevent following redirects that might go to HTTP
});

// Request interceptor to set baseURL dynamically and add auth token
api.interceptors.request.use(
  (config) => {
    // Always set baseURL dynamically on each request (works in browser)
    // IMPORTANT: In browser, always use window.location - ignore build-time env vars
    if (typeof window !== 'undefined') {
      // Check if we're on the production domain (use /api path) or localhost (use :8000)
      const hostname = window.location.hostname;
      const currentProtocol = window.location.protocol;
      
      // If on production domain (synvoy.com), use /api path through nginx
      // ALWAYS force HTTPS for production domain to avoid mixed content errors
      if (hostname.includes('synvoy.com')) {
        // Production: use /api path through nginx, ALWAYS force HTTPS
        // Get the URL path and clean it
        let urlPath = config.url || '';
        
        // If url is a full URL, extract just the path
        if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) {
          try {
            const urlObj = new URL(urlPath);
            urlPath = urlObj.pathname + urlObj.search;
          } catch (e) {
            // If parsing fails, extract path manually
            urlPath = urlPath.replace(/^https?:\/\/[^/]+/, '');
          }
        }
        
        // Ensure path starts with / and doesn't already have /api
        urlPath = urlPath.startsWith('/') ? urlPath : '/' + urlPath;
        urlPath = urlPath.replace(/^\/api/, ''); // Remove /api if present
        urlPath = urlPath.startsWith('/') ? urlPath : '/' + urlPath;
        
        // Set baseURL to HTTPS with /api prefix - this is the final value
        config.baseURL = `https://${hostname}/api`;
        config.url = urlPath;
      } else {
        // Development/local: use direct backend port with current protocol
        config.baseURL = `${currentProtocol}//${hostname}:8000`;
      }
      
      // Final safety check: NEVER allow HTTP for production
      if (hostname.includes('synvoy.com')) {
        // Force HTTPS - replace any HTTP with HTTPS
        if (config.baseURL && config.baseURL.startsWith('http://')) {
          config.baseURL = config.baseURL.replace('http://', 'https://');
        }
        // Also check if url somehow has http://
        if (config.url && config.url.includes('http://')) {
          config.url = config.url.replace(/http:\/\//g, 'https://');
        }
        
        // CRITICAL: Validate the final URL before request
        const finalUrl = (config.baseURL || '') + (config.url || '');
        if (finalUrl.includes('http://')) {
          console.error('[API ERROR] Detected HTTP in final URL, forcing HTTPS:', finalUrl);
          config.baseURL = `https://${hostname}/api`;
          // Reconstruct URL
          if (config.url) {
            config.url = config.url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '');
            config.url = config.url.startsWith('/') ? config.url : '/' + config.url;
          }
        }
      }
      
      // Log for debugging - show what we're actually sending
      const finalUrl = (config.baseURL || '') + (config.url || '');
      console.log('[API v2.0] Request to:', finalUrl, 'from hostname:', hostname, 'protocol:', currentProtocol);
      console.log('[API DEBUG] Config details:', {
        baseURL: config.baseURL,
        url: config.url,
        method: config.method,
        headers: config.headers
      });
      
      // Final validation - throw error if HTTP detected for production
      if (hostname.includes('synvoy.com') && finalUrl.includes('http://')) {
        console.error('[API CRITICAL ERROR] HTTP detected in production URL!', finalUrl);
        console.error('[API CRITICAL ERROR] Config:', config);
        // Force correct URL instead of throwing (to prevent breaking the app)
        config.baseURL = `https://${hostname}/api`;
        if (config.url) {
          config.url = config.url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '');
          config.url = config.url.startsWith('/') ? config.url : '/' + config.url;
        }
      }
    } else {
      // Server-side fallback (shouldn't happen for API calls, but just in case)
      config.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    }
    
    // Add auth token
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

// Response interceptor to handle token expiration and redirects
api.interceptors.response.use(
  (response) => {
    // Check if response has a redirect to HTTP (should never happen)
    if (typeof window !== 'undefined' && window.location.hostname.includes('synvoy.com')) {
      const responseUrl = response.request?.responseURL || response.config?.url || '';
      if (responseUrl.includes('http://')) {
        console.error('[API ERROR] Response URL contains HTTP:', responseUrl);
      }
    }
    return response;
  },
  (error) => {
    // Check if error is due to HTTP redirect
    if (error.config && typeof window !== 'undefined' && window.location.hostname.includes('synvoy.com')) {
      const requestUrl = error.config.url || '';
      const baseURL = error.config.baseURL || '';
      const fullUrl = baseURL + requestUrl;
      if (fullUrl.includes('http://')) {
        console.error('[API ERROR] Request URL contains HTTP:', fullUrl, error.config);
      }
    }
    
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Only redirect if:
      // 1. User has a token (was logged in) - token expired
      // 2. Request is NOT to auth endpoints (login/register) - those should show errors
      const hasToken = localStorage.getItem('auth_token');
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
      
      if (hasToken && !isAuthEndpoint) {
        // Token expired, clear storage and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = '/';
      }
      // For auth endpoints (login/register), let the form handle the error
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  // Register new user
  register: async (userData: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone?: string;
    tester_code: string;
  }) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      // Handle network connectivity errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.message?.includes('Network Error')) {
        // Get the actual URL that was attempted from the error config
        const attemptedUrl = error.config?.baseURL || error.config?.url || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000` : 'http://localhost:8000');
        throw new Error(`Cannot connect to server. Please check:\n1. Backend is running on ${attemptedUrl}\n2. Backend is accessible from this network\n3. Firewall allows connections on port 8000`);
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
  login: async (usernameOrEmail: string, password: string) => {
    try {
      const response = await api.post('/auth/login', {
        username_or_email: usernameOrEmail,
        password,
      });
      return response.data;
    } catch (error: any) {
      // Handle network connectivity errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.message?.includes('Network Error')) {
        // Get the actual URL that was attempted from the error config
        const attemptedUrl = error.config?.baseURL || error.config?.url || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000` : 'http://localhost:8000');
        throw new Error(`Cannot connect to server. Please check:\n1. Backend is running on ${attemptedUrl}\n2. Backend is accessible from this network\n3. Firewall allows connections on port 8000`);
      }
      
      // Pass through the error detail (including "user_not_registered" for 404)
      const errorDetail = error.response?.data?.detail || error.message || 'Login failed';
      throw new Error(errorDetail);
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

  // Verify email
  verifyEmail: async (email: string, code: string) => {
    try {
      const response = await api.post('/auth/verify-email', {
        email,
        code,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Verification failed');
    }
  },

  // Resend verification code
  resendVerification: async (email: string) => {
    try {
      const response = await api.post('/auth/resend-verification', {
        email,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to resend verification code');
    }
  },

  // Get verification status
  getVerificationStatus: async (email: string) => {
    try {
      const response = await api.get(`/auth/verification-status?email=${encodeURIComponent(email)}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get verification status');
    }
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      const response = await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to change password');
    }
  },

  // Delete account
  deleteAccount: async (password: string) => {
    try {
      const response = await api.post('/auth/delete-account', {
        password,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to delete account');
    }
  },

  // Cancel deletion
  cancelDeletion: async (token: string) => {
    try {
      const response = await api.post('/auth/cancel-deletion', {
        token,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to cancel deletion');
    }
  },

  // Get deletion status
  getDeletionStatus: async () => {
    try {
      const response = await api.get('/auth/deletion-status');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get deletion status');
    }
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
      const url = status ? `/connections/?status_filter=${status}` : '/connections/';
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

  // Clear chat for me
  clearChat: async (userId?: string, tripId?: string) => {
    try {
      const response = await api.post('/messages/clear-chat', {
        user_id: userId,
        trip_id: tripId,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to clear chat');
    }
  },

  // Delete message for everyone
  deleteMessageForEveryone: async (messageId: string) => {
    try {
      const response = await api.post('/messages/delete-for-everyone', {
        message_id: messageId,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to delete message');
    }
  },

  // Leave group
  leaveGroup: async (tripId: string) => {
    try {
      const response = await api.post('/messages/leave-group', {
        trip_id: tripId,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to leave group');
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

// Contact API functions
export const contactAPI = {
  // Submit contact form
  submitContact: async (contactData: {
    name: string;
    email: string;
    subject: string;
    message: string;
    phone?: string;
  }) => {
    const response = await api.post('/contact/', contactData);
    return response.data;
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
        const apiUrl = getBaseURL();
        throw new Error(`Cannot connect to server. Please check:\n1. Backend is running on ${apiUrl}\n2. Backend is accessible from this network\n3. Firewall allows connections on port 8000`);
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

  // Remove a participant from a trip
  removeParticipant: async (tripId: string, participantId: string) => {
    try {
      const response = await api.delete(`/trips/${tripId}/participants/${participantId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.message || 'Failed to remove participant');
    }
  },
};

export default api;

