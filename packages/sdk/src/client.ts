/**
 * Configuration options for the WebbiSDK initialization.
 */
export interface WebbiSDKOptions {
  /**
   * The base URL for the WebbiOS API.
   * Defaults to 'http://127.0.0.1:8787/v1/admin' in development.
   */
  endpoint?: string;
  /**
   * Optional initial authentication token (JWT).
   */
  token?: string;
}

/**
 * Core API Client for handling HTTP requests to the WebbiOS API.
 * This class wraps the native `fetch` API, injects authentication headers,
 * and handles global 401 Unauthorized responses.
 */
export class ApiClient {
  private endpoint: string;
  private token?: string;
  private refreshCallback?: () => void;

  /**
   * Initializes a new ApiClient instance.
   * @param options - Initialization configuration.
   */
  constructor(options: WebbiSDKOptions = {}) {
    this.endpoint = options.endpoint || 'http://127.0.0.1:8787/v1/admin';
    this.token = options.token;
  }

  /**
   * Sets or updates the JWT access token for subsequent requests.
   * @param token - The JWT string.
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * Registers a callback that will be triggered when an API request
   * fails with a 401 Unauthorized status code.
   * @param cb - The callback function.
   */
  setRefreshCallback(cb: () => void) {
    this.refreshCallback = cb;
  }

  /**
   * Performs a raw HTTP request to the configured API endpoint.
   * 
   * @param path - The relative API path (e.g., `/auth/me`).
   * @param options - Standard Fetch API RequestInit options.
   * @returns A promise resolving to the parsed JSON response.
   * @throws Will throw an Error if the response status is not OK (2xx).
   */
  async fetch(path: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers || {});
    
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${this.endpoint}${path}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token is invalid or expired
      if (typeof window !== 'undefined') {
        // Dispatch event for UI to handle logout if in browser
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
      if (this.refreshCallback) {
        this.refreshCallback();
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  /**
   * Performs an HTTP GET request.
   * 
   * @param path - The relative API path.
   * @param options - Additional Fetch options.
   * @returns The parsed JSON response.
   */
  async get(path: string, options?: RequestInit) {
    return this.fetch(path, { ...options, method: 'GET' });
  }

  /**
   * Performs an HTTP POST request.
   * 
   * @param path - The relative API path.
   * @param body - The request payload (will be stringified as JSON).
   * @param options - Additional Fetch options.
   * @returns The parsed JSON response.
   */
  async post(path: string, body: any, options?: RequestInit) {
    const isFormData = body instanceof FormData;
    return this.fetch(path, {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body)
    });
  }

  /**
   * Performs an HTTP PUT request.
   * 
   * @param path - The relative API path.
   * @param body - The request payload (will be stringified as JSON).
   * @param options - Additional Fetch options.
   * @returns The parsed JSON response.
   */
  async put(path: string, body: any, options?: RequestInit) {
    const isFormData = body instanceof FormData;
    return this.fetch(path, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body)
    });
  }

  /**
   * Performs an HTTP DELETE request.
   * 
   * @param path - The relative API path.
   * @param options - Additional Fetch options.
   * @returns The parsed JSON response.
   */
  async delete(path: string, options?: RequestInit) {
    return this.fetch(path, { ...options, method: 'DELETE' });
  }
}
