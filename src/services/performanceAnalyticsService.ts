import { BaseUrl } from "@/config/BaseUrl";
import { extractApiError } from "@/lib/apiError";

export const performanceAnalyticsService = {
  getAnalytics: async (
    token: string,
    params: { startDate?: string; endDate?: string; surveyId?: string; masterId?: string } = {}
  ) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set("startDate", params.startDate);
    if (params.endDate) query.set("endDate", params.endDate);
    if (params.surveyId) query.set("surveyId", params.surveyId);
    if (params.masterId) query.set("masterId", params.masterId);

    const response = await fetch(
      `${BaseUrl}/survey-masters/performance-analytics?${query.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      throw new Error(
        extractApiError(await response.json().catch(() => null), "Failed to fetch analytics")
      );
    }

    return response.json();
  },
};
