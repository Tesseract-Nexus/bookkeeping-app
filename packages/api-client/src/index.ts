import { BookKeepClient, ClientConfig, TokenStorage } from './client';
import { AuthApi } from './api/auth';
import { CustomersApi, VendorsApi, PartiesApi } from './api/customers';
import { TransactionsApi, AccountsApi } from './api/transactions';
import { InvoicesApi } from './api/invoices';
import { ReportsApi } from './api/reports';
import { TenantsApi } from './api/tenants';
import { UsersApi } from './api/users';
import { NotificationsApi } from './api/notifications';

export * from './types';
export * from './client';
export * from './api';

export interface BookKeepApiConfig extends ClientConfig {
  tokenStorage?: TokenStorage;
}

export class BookKeepApi {
  private client: BookKeepClient;

  public auth: AuthApi;
  public customers: CustomersApi;
  public vendors: VendorsApi;
  public parties: PartiesApi;
  public transactions: TransactionsApi;
  public accounts: AccountsApi;
  public invoices: InvoicesApi;
  public reports: ReportsApi;
  public tenants: TenantsApi;
  public users: UsersApi;
  public notifications: NotificationsApi;

  constructor(config: BookKeepApiConfig) {
    this.client = new BookKeepClient(
      {
        baseURL: config.baseURL,
        timeout: config.timeout,
        headers: config.headers,
      },
      config.tokenStorage
    );

    this.auth = new AuthApi(this.client);
    this.customers = new CustomersApi(this.client);
    this.vendors = new VendorsApi(this.client);
    this.parties = new PartiesApi(this.client);
    this.transactions = new TransactionsApi(this.client);
    this.accounts = new AccountsApi(this.client);
    this.invoices = new InvoicesApi(this.client);
    this.reports = new ReportsApi(this.client);
    this.tenants = new TenantsApi(this.client);
    this.users = new UsersApi(this.client);
    this.notifications = new NotificationsApi(this.client);
  }

  setAuthToken(token: string): void {
    this.client.setAuthToken(token);
  }

  clearAuthToken(): void {
    this.client.clearAuthToken();
  }

  getClient(): BookKeepClient {
    return this.client;
  }
}

// Default export
export default BookKeepApi;

// Create singleton helper
let defaultApi: BookKeepApi | null = null;

export function createApi(config: BookKeepApiConfig): BookKeepApi {
  defaultApi = new BookKeepApi(config);
  return defaultApi;
}

export function getApi(): BookKeepApi {
  if (!defaultApi) {
    throw new Error('API not initialized. Call createApi() first.');
  }
  return defaultApi;
}
