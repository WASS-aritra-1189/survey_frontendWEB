import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { faqService, FAQ } from "@/services/faqService";

interface FaqState {
  data: FAQ[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: FaqState = {
  data: [],
  isLoading: false,
  isSaving: false,
  error: null,
};

export const fetchFaqs = createAsyncThunk(
  "faq/fetchFaqs",
  async ({ token, isAdmin }: { token: string; isAdmin: boolean }) => {
    return isAdmin
      ? await faqService.getAllFaqs(token)
      : await faqService.getPublicFaqs();
  }
);

export const createFaq = createAsyncThunk(
  "faq/createFaq",
  async ({ token, data }: { token: string; data: Omit<FAQ, "id" | "createdAt" | "updatedAt"> }) => {
    return await faqService.createFaq(token, data);
  }
);

export const updateFaq = createAsyncThunk(
  "faq/updateFaq",
  async ({ token, id, data }: { token: string; id: string; data: Partial<FAQ> }) => {
    return await faqService.updateFaq(token, id, data);
  }
);

export const deleteFaq = createAsyncThunk(
  "faq/deleteFaq",
  async ({ token, id }: { token: string; id: string }) => {
    await faqService.deleteFaq(token, id);
    return id;
  }
);

const faqSlice = createSlice({
  name: "faq",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFaqs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFaqs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchFaqs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to fetch FAQs";
      })
      .addCase(createFaq.pending, (state) => { state.isSaving = true; })
      .addCase(createFaq.fulfilled, (state, action) => {
        state.isSaving = false;
        state.data.unshift(action.payload);
      })
      .addCase(createFaq.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.error.message || "Failed to create FAQ";
      })
      .addCase(updateFaq.pending, (state) => { state.isSaving = true; })
      .addCase(updateFaq.fulfilled, (state, action) => {
        state.isSaving = false;
        const idx = state.data.findIndex((f) => f.id === action.payload.id);
        if (idx !== -1) state.data[idx] = action.payload;
      })
      .addCase(updateFaq.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.error.message || "Failed to update FAQ";
      })
      .addCase(deleteFaq.pending, (state) => { state.isSaving = true; })
      .addCase(deleteFaq.fulfilled, (state, action) => {
        state.isSaving = false;
        state.data = state.data.filter((f) => f.id !== action.payload);
      })
      .addCase(deleteFaq.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.error.message || "Failed to delete FAQ";
      });
  },
});

export default faqSlice.reducer;
