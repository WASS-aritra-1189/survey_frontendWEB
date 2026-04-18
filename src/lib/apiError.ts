/**
 * Extracts the most specific error message from the backend API response.
 *
 * Backend error shapes:
 *  - CustomException:   { success: false, messageId, data: { message: string } }
 *  - HttpException:     { success: false, messageId, data: { errors: string[] } }
 *  - Plain NestJS:      { message: string } or { message: string[] }
 */
export function extractApiError(result: any, fallback: string): string {
  if (!result) return fallback;

  // CustomException shape: data.message
  if (result.data?.message && typeof result.data.message === "string") {
    return result.data.message;
  }

  // Validation / HttpException shape: data.errors[]
  if (Array.isArray(result.data?.errors) && result.data.errors.length > 0) {
    return result.data.errors[0];
  }

  // Plain NestJS exception: message string or array
  if (typeof result.message === "string") return result.message;
  if (Array.isArray(result.message) && result.message.length > 0) return result.message[0];

  return fallback;
}
