import { BaseUrl } from "@/config/BaseUrl";

export const activityLogsService = {
  getAll: async (
    token: string,
    params: { page?: number; limit?: number; search?: string; action?: string; module?: string; dateFrom?: string; dateTo?: string }
  ) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.action) searchParams.append('action', params.action);
    if (params.module) searchParams.append('module', params.module);
    if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.append('dateTo', params.dateTo);

    const response = await fetch(`${BaseUrl}/activity-logs?${searchParams.toString()}`, {
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    });

    if (!response.ok) throw new Error("Failed to fetch activity logs");
    return response.json();
  },

  getByUser: async (
    token: string,
    userId: string,
    params: { page?: number; limit?: number; search?: string; action?: string; module?: string; dateFrom?: string; dateTo?: string }
  ) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.action) searchParams.append('action', params.action);
    if (params.module) searchParams.append('module', params.module);
    if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.append('dateTo', params.dateTo);

    const response = await fetch(`${BaseUrl}/activity-logs/user/${userId}?${searchParams.toString()}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });

    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Failed to fetch user activity logs");
    return result.data;
  },
};
