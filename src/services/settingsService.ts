import { BaseUrl } from "@/config/BaseUrl";
import { SettingsResponse } from "@/types/settings";

export const settingsService = {
  getAll: async (token: string): Promise<SettingsResponse> => {
    const response = await fetch(`${BaseUrl}/settings`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch settings");
    }

    return response.json();
  },

  update: async (id: string, data: any, token: string): Promise<Response> => {
    const response = await fetch(`${BaseUrl}/settings/${id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response;
  },
};
