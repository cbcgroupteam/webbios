import { ApiClient, WebbiSDKOptions } from './client';
import { AuthModule } from './modules/auth';
import { DashboardModule } from './modules/dashboard';
import { ProductsModule } from './modules/products';
import { MenusModule } from './modules/menus';
import { PermissionsModule } from './modules/permissions';
import { RolesModule } from './modules/roles';
import { PlatformModule } from './modules/platform';
import { AdminUpdatesClient } from './modules/admin/updates';
import { SettingsModule } from './modules/settings';
import { WebhooksModule } from './modules/webhooks';
import { MediaModule } from './modules/media';
import { UsersModule } from './modules/users';
import { AuditLogsModule } from './modules/auditLogs';
import { ApiKeysModule } from './modules/apiKeys';

/**
 * The main entry point for the WebbiOS SDK.
 * Provides unified access to all API modules.
 */
export class WebbiSDK {
  /** The core API client instance */
  public client: ApiClient;
  /** Authentication module */
  public auth: AuthModule;
  /** Dashboard module */
  public dashboard: DashboardModule;
  /** Products module */
  public products: ProductsModule;
  /** Menus module */
  public menus: MenusModule;
  /** Permissions module */
  public permissions: PermissionsModule;
  /** Roles module */
  public roles: RolesModule;
  /** Platform module */
  public platform: PlatformModule;
  /** Admin Updates module */
  public adminUpdates: AdminUpdatesClient;
  /** Settings module */
  public settings: SettingsModule;
  public webhooks: WebhooksModule;
  public media: MediaModule;
  public users: UsersModule;
  public auditLogs: AuditLogsModule;
  public apiKeys: ApiKeysModule;

  /**
   * Initializes a new WebbiSDK instance.
   * 
   * @param options - Configuration options for the SDK.
   */
  constructor(options?: WebbiSDKOptions) {
    this.client = new ApiClient(options);

    // Initialize modules
    this.auth = new AuthModule(this.client);
    this.dashboard = new DashboardModule(this.client);
    this.products = new ProductsModule(this.client);
    this.menus = new MenusModule(this.client);
    this.permissions = new PermissionsModule(this.client);
    this.roles = new RolesModule(this.client);
    this.platform = new PlatformModule(this.client);
    this.adminUpdates = new AdminUpdatesClient(this.client);
    this.settings = new SettingsModule(this.client);
    this.webhooks = new WebhooksModule(this.client);
    this.media = new MediaModule(this.client);
    this.users = new UsersModule(this.client);
    this.auditLogs = new AuditLogsModule(this.client);
    this.apiKeys = new ApiKeysModule(this.client);
  }

  /**
   * Updates the authentication token across the entire SDK.
   * 
   * @param token - The new JWT access token.
   */
  setToken(token: string) {
    this.client.setToken(token);
  }

  /**
   * Sets a callback to be triggered when an authentication error occurs.
   * 
   * @param callback - The function to call on auth error.
   */
  onAuthError(callback: () => void) {
    this.client.setRefreshCallback(callback);
  }
}

export * from './client';
export * from './modules/auth';
export * from './modules/dashboard';
export * from './modules/products';
export * from './modules/menus';
export * from './modules/platform';
export * from './modules/settings';
export * from './modules/webhooks';
export * from './modules/users';
export * from './modules/auditLogs';
export * from './modules/apiKeys';
