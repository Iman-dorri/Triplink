import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiService from '../../services/api';

interface Alert {
  id: string;
  userId: string;
  tripId?: string;
  alertType: string;
  origin?: string;
  destination?: string;
  maxPrice?: number;
  minPrice?: number;
  isActive: boolean;
  createdAt: string;
}

interface AlertsState {
  alerts: Alert[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AlertsState = {
  alerts: [],
  isLoading: false,
  error: null,
};

export const fetchAlerts = createAsyncThunk('alerts/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const data = await apiService.getAlerts();
    return data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to fetch alerts');
  }
});

export const createAlert = createAsyncThunk('alerts/create', async (alertData: any, { rejectWithValue }) => {
  try {
    const data = await apiService.createAlert(alertData);
    return data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to create alert');
  }
});

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlerts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.alerts = action.payload;
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createAlert.fulfilled, (state, action) => {
        state.alerts.push(action.payload);
      });
  },
});

export const { clearError } = alertsSlice.actions;
export default alertsSlice.reducer;




