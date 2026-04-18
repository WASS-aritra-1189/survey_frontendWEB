import { BaseUrl } from "@/config/BaseUrl";
import { LoginRequest, LoginResponse } from "@/types/auth";
import { extractApiError } from "@/lib/apiError";

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await fetch(`${BaseUrl}/auth/login-with-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(extractApiError(err, "Login failed"));
    }

    return response.json();
  },

  resetPassword: async (
    token: string,
    accountId: string,
    oldPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> => {
    const response = await fetch(`${BaseUrl}/accounts/${accountId}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
      throw new Error(extractApiError(result, "Failed to reset password"));
    }
  },
};
