import { BookKeepClient } from '../client';
import {
  Transaction,
  CreateTransactionRequest,
  QuickSaleRequest,
  QuickExpenseRequest,
  TransactionFilter,
  DailySummary,
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
  AccountFilter,
  AccountType,
} from '../types';

export class TransactionsApi {
  constructor(private client: BookKeepClient) {}

  async list(filter?: TransactionFilter) {
    return this.client.get<Transaction[]>('/transactions', filter);
  }

  async get(id: string) {
    return this.client.get<Transaction>(`/transactions/${id}`);
  }

  async create(data: CreateTransactionRequest) {
    return this.client.post<Transaction>('/transactions', data);
  }

  async quickSale(data: QuickSaleRequest) {
    return this.client.post<Transaction>('/transactions/quick-sale', data);
  }

  async quickExpense(data: QuickExpenseRequest) {
    return this.client.post<Transaction>('/transactions/quick-expense', data);
  }

  async void(id: string) {
    return this.client.post<{ message: string }>(`/transactions/${id}/void`);
  }

  async getDailySummary(date?: string) {
    return this.client.get<DailySummary>('/transactions/daily-summary', { date });
  }
}

export class AccountsApi {
  constructor(private client: BookKeepClient) {}

  async list(filter?: AccountFilter) {
    return this.client.get<Account[]>('/accounts', filter);
  }

  async get(id: string) {
    return this.client.get<Account>(`/accounts/${id}`);
  }

  async create(data: CreateAccountRequest) {
    return this.client.post<Account>('/accounts', data);
  }

  async update(id: string, data: UpdateAccountRequest) {
    return this.client.put<Account>(`/accounts/${id}`, data);
  }

  async delete(id: string) {
    return this.client.delete(`/accounts/${id}`);
  }

  async getChartOfAccounts() {
    return this.client.get<Account[]>('/accounts/chart');
  }

  async getByType(type: AccountType) {
    return this.client.get<Account[]>(`/accounts/type/${type}`);
  }

  async initialize() {
    return this.client.post<{ message: string }>('/accounts/initialize');
  }
}
