import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiService from '../../services/api';

interface ShoppingItem {
  id: string;
  userId: string;
  name: string;
  category?: string;
  targetPrice?: number;
  maxPrice?: number;
  currentPrice?: number;
  url?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

interface ShoppingState {
  items: ShoppingItem[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ShoppingState = {
  items: [],
  isLoading: false,
  error: null,
};

export const fetchShoppingItems = createAsyncThunk('shopping/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const data = await apiService.getShoppingItems();
    return data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to fetch shopping items');
  }
});

export const createShoppingItem = createAsyncThunk('shopping/create', async (itemData: any, { rejectWithValue }) => {
  try {
    const data = await apiService.createShoppingItem(itemData);
    return data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to create shopping item');
  }
});

const shoppingSlice = createSlice({
  name: 'shopping',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchShoppingItems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchShoppingItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchShoppingItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createShoppingItem.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });
  },
});

export const { clearError } = shoppingSlice.actions;
export default shoppingSlice.reducer;








