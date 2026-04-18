import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { downloadHistoryService, DownloadHistoryRecord } from '@/services/downloadHistoryService';

export const fetchDownloadHistory = createAsyncThunk(
  'downloadHistory/fetchAll',
  async (args: { token: string; page?: number; limit?: number; format?: string; dateFrom?: string; dateTo?: string }, { rejectWithValue }) => {
    const { token, ...params } = args;
    try {
      return await downloadHistoryService.getAll(token, params);
    } catch {
      return rejectWithValue(null);
    }
  },
);

export const fetchMyDownloadHistory = createAsyncThunk(
  'downloadHistory/fetchMy',
  async (args: { token: string; page?: number; limit?: number; format?: string; dateFrom?: string; dateTo?: string }, { rejectWithValue }) => {
    const { token, ...params } = args;
    try {
      return await downloadHistoryService.getMy(token, params);
    } catch {
      return rejectWithValue(null);
    }
  },
);

interface DownloadHistoryState {
  records: DownloadHistoryRecord[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;
}

const initialState: DownloadHistoryState = {
  records: [],
  total: 0,
  page: 1,
  limit: 20,
  loading: false,
  error: null,
};

const downloadHistorySlice = createSlice({
  name: 'downloadHistory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    const handle = (thunk: typeof fetchDownloadHistory | typeof fetchMyDownloadHistory) => {
      builder
        .addCase(thunk.pending, (state) => { state.loading = true; state.error = null; })
        .addCase(thunk.fulfilled, (state, action) => {
          state.loading = false;
          if (action.payload) {
            state.records = action.payload.data;
            state.total   = action.payload.total;
            state.page    = action.payload.page;
            state.limit   = action.payload.limit;
          }
        })
        .addCase(thunk.rejected, (state) => {
          state.loading = false;
          // silently fail — API may not be deployed yet
        });
    };
    handle(fetchDownloadHistory);
    handle(fetchMyDownloadHistory);
  },
});

export default downloadHistorySlice.reducer;
