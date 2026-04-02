/**
 * Authenticated API Client
 * Handles all API calls with proper credentials and error handling
 * JWT token is automatically sent via secure httpOnly cookie
 */

interface FetchOptions extends RequestInit {
    skipErrorToast?: boolean;
}

interface ApiResponse<T> {
    data?: T;
    message?: string;
    error?: string;
}

/**
 * Make authenticated API request
 * Automatically includes credentials for cookie-based JWT auth
 * @param url - API endpoint path
 * @param options - Fetch options
 * @returns Parsed response data
 */
export async function apiClient<T = any>(url: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
    const { skipErrorToast = false, ...fetchOpts } = options;

    try {
        const response = await fetch(url, {
            ...fetchOpts,
            // Always include credentials for httpOnly cookie auth
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...fetchOpts.headers,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle authentication errors
            if (response.status === 401) {
                // Token expired or invalid - redirect to login
                if (typeof window !== "undefined") {
                    window.location.href = "/login";
                }
                return { error: "Session expired. Please login again." };
            }

            return {
                error: data.message || `API Error: ${response.statusText}`,
            };
        }

        return { data };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Network error";
        console.error(`API Error (${url}):`, err);
        return { error: errorMessage };
    }
}

/**
 * GET request helper
 */
export async function apiGet<T = any>(url: string) {
    return apiClient<T>(url, { method: "GET" });
}

/**
 * POST request helper
 */
export async function apiPost<T = any>(url: string, body?: any) {
    return apiClient<T>(url, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
    });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T = any>(url: string, body?: any) {
    return apiClient<T>(url, {
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
    });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = any>(url: string) {
    return apiClient<T>(url, { method: "DELETE" });
}

/**
 * Verify current session validity
 * @returns true if session is valid, false otherwise
 */
export async function verifySession(): Promise<boolean> {
    const result = await apiGet("/api/auth/verify");
    return !result.error && result.data?.valid === true;
}

/**
 * Get current user info
 */
export async function getCurrentUser() {
    return apiGet("/api/auth/me");
}

/**
 * Logout and clear session
 */
export async function logout() {
    const result = await apiPost("/api/auth/logout");
    if (!result.error) {
        // Clear localStorage
        localStorage.removeItem("user");
        // Redirect to login
        if (typeof window !== "undefined") {
            window.location.href = "/login";
        }
    }
    return result;
}
