import { BaseUrl } from "@/config/BaseUrl";

export const zoneService = {
  async getAll(token: string) {
    const response = await fetch(`${BaseUrl}/zones`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to fetch zones");
    }

    return result.data || [];
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
      throw new Error(result.message || "Failed to fetch zone");
    }

    return result.data;
  },
};
