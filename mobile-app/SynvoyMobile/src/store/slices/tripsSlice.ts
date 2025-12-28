import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiService from '../../services/api';

interface Trip {
  id: string;
  userId: string;
  title: string;
  description?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface TripsState {
  trips: Trip[];
  currentTrip: Trip | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: TripsState = {
  trips: [],
  currentTrip: null,
  isLoading: false,
  error: null,
};

export const fetchTrips = createAsyncThunk('trips/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const data = await apiService.getTrips();
    return data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to fetch trips');
  }
});

export const createTrip = createAsyncThunk('trips/create', async (tripData: any, { rejectWithValue }) => {
  try {
    const data = await apiService.createTrip(tripData);
    return data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to create trip');
  }
});

export const updateTrip = createAsyncThunk(
  'trips/update',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const updated = await apiService.updateTrip(id, data);
      return updated;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update trip');
    }
  }
);

export const deleteTrip = createAsyncThunk('trips/delete', async (id: string, { rejectWithValue }) => {
  try {
    await apiService.deleteTrip(id);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to delete trip');
  }
});

const tripsSlice = createSlice({
  name: 'trips',
  initialState,
  reducers: {
    setCurrentTrip: (state, action) => {
      state.currentTrip = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrips.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTrips.fulfilled, (state, action) => {
        state.isLoading = false;
        state.trips = action.payload;
      })
      .addCase(fetchTrips.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createTrip.fulfilled, (state, action) => {
        state.trips.push(action.payload);
      })
      .addCase(updateTrip.fulfilled, (state, action) => {
        const index = state.trips.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.trips[index] = action.payload;
        }
        if (state.currentTrip?.id === action.payload.id) {
          state.currentTrip = action.payload;
        }
      })
      .addCase(deleteTrip.fulfilled, (state, action) => {
        state.trips = state.trips.filter((t) => t.id !== action.payload);
        if (state.currentTrip?.id === action.payload) {
          state.currentTrip = null;
        }
      });
  },
});

export const { setCurrentTrip, clearError } = tripsSlice.actions;
export default tripsSlice.reducer;





