import { BaseUrl } from '@/config/BaseUrl';
import { extractApiError } from '@/lib/apiError';

export type DownloadFormat = 'CSV' | 'PDF' | 'EXCEL' | 'JSON';

export interface CreateDownloadPayload {
  format: DownloadFormat;
  fileName: string;
  source: string;
  recordCount?: number;
}

export interface DownloadHistoryRecord {
  id: string;
  fileName: string;
  format: DownloadFormat;
  source: string;
  recordCount: number;
  ipAddress: string | null;
  createdAt: string;
  account?: { loginId: string };
}

export const downloadHistoryService = {
  record: async (token: string, payload: CreateDownloadPayload): Promise<void> => {
    try {
      await fetch(`${BaseUrl}/download-history`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // fire-and-forget — never block the actual download
    }
  },

  getAll: async (
    token: string,
    params: { page?: number; limit?: number; format?: string; dateFrom?: string; dateTo?: string },
  ) => {
    const q = new URLSearchParams();
    if (params.page)     q.append('page',     String(params.page));
    if (params.limit)    q.append('limit',    String(params.limit));
    if (params.format)   q.append('format',   params.format);
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo)   q.append('dateTo',   params.dateTo);

    const res = await fetch(`${BaseUrl}/download-history?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(extractApiError(result, 'Failed to fetch download history'));
    return result.data as { data: DownloadHistoryRecord[]; total: number; page: number; limit: number };
  },

  getMy: async (
    token: string,
    params: { page?: number; limit?: number; format?: string; dateFrom?: string; dateTo?: string },
  ) => {
    const q = new URLSearchParams();
    if (params.page)     q.append('page',     String(params.page));
    if (params.limit)    q.append('limit',    String(params.limit));
    if (params.format)   q.append('format',   params.format);
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo)   q.append('dateTo',   params.dateTo);

    const res = await fetch(`${BaseUrl}/download-history/my?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(extractApiError(result, 'Failed to fetch download history'));
    return result.data as { data: DownloadHistoryRecord[]; total: number; page: number; limit: number };
  },
};
