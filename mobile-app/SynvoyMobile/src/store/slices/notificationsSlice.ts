import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiService from '../../services/api';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

export const fetchNotifications = createAsyncThunk('notifications/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const data = await apiService.getNotifications();
    return data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to fetch notifications');
  }
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUnreadCount: (state) => {
      state.unreadCount = state.notifications.filter((n) => !n.isRead).length;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter((n: Notification) => !n.isRead).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, updateUnreadCount } = notificationsSlice.actions;
export default notificationsSlice.reducer;





