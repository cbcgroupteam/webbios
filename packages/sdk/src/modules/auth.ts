import { ApiClient } from '../client';

/**
 * Provides authentication-related methods to interact with the API.
 */
export class AuthModule {
  constructor(private client: ApiClient) {}

  /**
   * Authenticates a user with email and password.
   * 
   * @param email - The user's email address.
   * @param password - The user's password.
   * @returns A promise resolving to the authentication response containing the token.
   */
  async login(email: string, password: string) {
    return this.client.post('/auth/login', { email, password });
  }

  /**
   * Retrieves the current authenticated user's profile and permissions.
   * 
   * @returns A promise resolving to the user profile and their associated permissions.
   */
  async me() {
    return this.client.get('/auth/me');
  }

  /**
   * Updates the authenticated user's profile.
   */
  async updateProfile(data: { firstName: string; lastName: string; avatarUrl?: string }) {
    return this.client.post('/auth/update-profile', data);
  }

  /**
   * Changes the user's password.
   */
  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.client.post('/auth/change-password', data);
  }
}
