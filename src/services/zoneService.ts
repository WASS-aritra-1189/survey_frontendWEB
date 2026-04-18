import { BaseUrl } from "@/config/BaseUrl";
import { extractApiError } from "@/lib/apiError";

export const zoneService = {
  async getAll(token: string, params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await fetch(`${BaseUrl}/zones?${searchParams.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(extractApiError(result, "Failed to fetch zones"));
    return result.data;
  },

  async getById(token: string, id: string) {
    const response = await fetch(`${BaseUrl}/zones/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(extractApiError(result, "Failed to fetch zone"));
    }

    return result.data;
  },
};
