import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { settingsService } from "@/services/settingsService";
import { Setting } from "@/types/settings";

interface SettingsState {
  data: Setting[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  data: [],
  isLoading: false,
  error: null,
};

export const fetchSettings = createAsyncThunk(
  "settings/fetchAll",
  async (token: string) => {
    const response = await settingsService.getAll(token);
    return response.data.data;
  }
);

export const updateSettings = createAsyncThunk(
  "settings/update",
  async ({ id, data, token }: { id: string; data: Partial<Setting>; token: string }) => {
    const response = await settingsService.update(id, data, token);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.data?.errors?.[0] || "Failed to update settings");
    }
  }
);

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to fetch settings";
      })
      .addCase(updateSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to update settings";
      });
  },
});

export default settingsSlice.reducer;
