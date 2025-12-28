import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/api';

interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  first_name?: string; // Backend format
  last_name?: string; // Backend format
  phone?: string;
  avatarUrl?: string;
  avatar_url?: string; // Backend format
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ usernameOrEmail, password }: { usernameOrEmail: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.login(usernameOrEmail, password);
      const user = await apiService.getProfile();
      await AsyncStorage.setItem('user', JSON.stringify(user));
      return { token: response.access_token, user };
    } catch (error: any) {
      console.error('Login error:', error);
      // Provide more detailed error message
      let errorMessage = 'Login failed';
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.detail || error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request made but no response (network error)
        errorMessage = 'Cannot connect to server. Check your network connection and ensure the backend is running.';
      } else {
        // Something else happened
        errorMessage = error.message || 'Login failed';
      }
      return rejectWithValue(errorMessage);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    data: {
      username: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      // Convert to backend format (snake_case)
      const registerData = {
        username: data.username.trim().toLowerCase(),
        email: data.email,
        password: data.password,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone || undefined,
      };
      const response = await apiService.register(registerData);
      const user = await apiService.getProfile();
      await AsyncStorage.setItem('user', JSON.stringify(user));
      return { token: response.access_token, user };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Registration failed');
    }
  }
);

export const loadUser = createAsyncThunk('auth/loadUser', async (_, { rejectWithValue }) => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    const userStr = await AsyncStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && typeof user === 'object') {
          return { token, user };
        }
      } catch (parseError) {
        console.error('Error parsing user:', parseError);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Error loading user:', error);
    return rejectWithValue('Failed to load user');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await apiService.logout();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
            .addCase(login.fulfilled, (state, action) => {
              state.isLoading = false;
              state.isAuthenticated = true;
              state.token = action.payload.token;
              // Map backend response to frontend format
              const user = action.payload.user;
              state.user = {
                ...user,
                firstName: user.first_name || user.firstName,
                lastName: user.last_name || user.lastName,
                avatarUrl: user.avatar_url || user.avatarUrl,
              };
              state.error = null;
            })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
            .addCase(register.fulfilled, (state, action) => {
              state.isLoading = false;
              state.isAuthenticated = true;
              state.token = action.payload.token;
              // Map backend response to frontend format
              const user = action.payload.user;
              state.user = {
                ...user,
                firstName: user.first_name || user.firstName,
                lastName: user.last_name || user.lastName,
                avatarUrl: user.avatar_url || user.avatarUrl,
              };
              state.error = null;
            })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });

    // Load user
    builder
      .addCase(loadUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.token = action.payload.token;
          // Map backend response to frontend format
          const user = action.payload.user;
          state.user = {
            ...user,
            firstName: user.first_name || user.firstName,
            lastName: user.last_name || user.lastName,
            avatarUrl: user.avatar_url || user.avatarUrl,
          };
          state.isAuthenticated = true;
        }
      })
      .addCase(loadUser.rejected, (state) => {
        state.isLoading = false;
      });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;

