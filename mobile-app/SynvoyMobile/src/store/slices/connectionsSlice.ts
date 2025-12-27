import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiService from '../../services/api';

interface ConnectedUser {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
}

interface Connection {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: string | { value: string };
  created_at: string;
  updated_at?: string;
  connected_user?: ConnectedUser | null;
}

interface ConnectionsState {
  connections: Connection[];
  searchResults: any[];
  isLoading: boolean;
  isSearching: boolean;
  isUpdating: boolean;
  error: string | null;
}

const initialState: ConnectionsState = {
  connections: [],
  searchResults: [],
  isLoading: false,
  isSearching: false,
  isUpdating: false,
  error: null,
};

export const fetchConnections = createAsyncThunk(
  'connections/fetchAll',
  async (statusFilter?: string, { rejectWithValue }) => {
    try {
      const data = await apiService.getConnections(statusFilter);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch connections');
    }
  }
);

export const updateConnection = createAsyncThunk(
  'connections/update',
  async ({ connectionId, status }: { connectionId: string; status: 'pending' | 'accepted' | 'blocked' }, { rejectWithValue }) => {
    try {
      const data = await apiService.updateConnection(connectionId, status);
      return { connectionId, data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update connection');
    }
  }
);

export const deleteConnection = createAsyncThunk(
  'connections/delete',
  async (connectionId: string, { rejectWithValue }) => {
    try {
      await apiService.deleteConnection(connectionId);
      return connectionId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to delete connection');
    }
  }
);

export const searchUsers = createAsyncThunk(
  'connections/searchUsers',
  async (query: string, { rejectWithValue }) => {
    try {
      const data = await apiService.searchUsers(query);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to search users');
    }
  }
);

export const sendConnectionRequest = createAsyncThunk(
  'connections/sendRequest',
  async (connectedUserId: string, { rejectWithValue }) => {
    try {
      const data = await apiService.sendConnectionRequest(connectedUserId);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to send connection request');
    }
  }
);

const connectionsSlice = createSlice({
  name: 'connections',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.isSearching = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch connections
      .addCase(fetchConnections.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConnections.fulfilled, (state, action) => {
        state.isLoading = false;
        state.connections = action.payload;
      })
      .addCase(fetchConnections.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update connection
      .addCase(updateConnection.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateConnection.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.connections.findIndex(conn => conn.id === action.payload.connectionId);
        if (index !== -1) {
          state.connections[index] = { ...state.connections[index], ...action.payload.data };
        }
      })
      .addCase(updateConnection.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      // Delete connection
      .addCase(deleteConnection.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(deleteConnection.fulfilled, (state, action) => {
        state.isUpdating = false;
        state.connections = state.connections.filter(conn => conn.id !== action.payload);
      })
      .addCase(deleteConnection.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      // Search users
      .addCase(searchUsers.pending, (state) => {
        state.isSearching = true;
        state.error = null;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.isSearching = false;
        state.searchResults = action.payload;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.isSearching = false;
        state.error = action.payload as string;
        state.searchResults = [];
      })
      // Send connection request
      .addCase(sendConnectionRequest.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(sendConnectionRequest.fulfilled, (state) => {
        state.isUpdating = false;
      })
      .addCase(sendConnectionRequest.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSearchResults } = connectionsSlice.actions;
export default connectionsSlice.reducer;


