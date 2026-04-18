import { BaseUrl } from "@/config/BaseUrl";

export interface GlobalSearchResult {
  devices: { id: string; deviceName: string; deviceId: string; status: string }[];
  surveyMasters: { id: string; [key: string]: any }[];
  surveys: { id: string; title: string; description: string; status: string }[];
}

export const globalSearchService = {
  search: async (token: string, query: string): Promise<GlobalSearchResult> => {
    const response = await fetch(`${BaseUrl}/global-search?query=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Search failed");
    const json = await response.json();
    return json.data;
  },
};
