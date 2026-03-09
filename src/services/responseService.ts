import { BaseUrl } from "@/config/BaseUrl";

export interface SurveyResponse {
  id: string;
  surveyId: string;
  surveyMasterId: string;
  respondentName: string;
  respondentContact: string;
  responses: { questionId: string; answer: string }[];
  latitude?: number;
  longitude?: number;
  audioUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResponseListResponse {
  success: boolean;
  data: {
    data: SurveyResponse[];
    total: number;
    page: number;
    limit: number;
  };
}

export const responseService = {
  async getAll(
    token: string,
    surveyId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    startDate?: string,
    endDate?: string,
    surveyMasterIds?: string
  ): Promise<ResponseListResponse> {
    const params = new URLSearchParams({
      surveyId,
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(surveyMasterIds && { surveyMasterIds }),
    });

    const url = `${BaseUrl}/survey-responses?${params}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to fetch responses");
    }

    return result;
  },

  async create(
    surveyId: string, 
    responses: { questionId: string; answer: any }[], 
    accessToken?: string,
    location?: { latitude: number; longitude: number }
  ) {
    const endpoint = accessToken ? `${BaseUrl}/survey-responses/master` : `${BaseUrl}/survey-responses`;
    const body: any = accessToken 
      ? { surveyId, responses, accessToken }
      : { surveyId, responses };
    
    if (location) {
      body.latitude = location.latitude;
      body.longitude = location.longitude;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to submit response');
    }

    return result;
  },

  async uploadAudio(
    token: string,
    responseId: string,
    audioBlob: Blob
  ) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch(`${BaseUrl}/survey-responses/${responseId}/audio`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to upload audio');
    }

    return result;
  }
};
