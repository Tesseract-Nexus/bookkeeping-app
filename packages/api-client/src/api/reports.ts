import { BookKeepClient } from '../client';
import {
  DashboardSummary,
  ProfitLossReport,
  BalanceSheet,
  GSTSummary,
  ReceivablesAgingReport,
  CashFlowReport,
} from '../types';

export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
}

export interface BalanceSheetParams {
  as_of?: string;
}

export interface GSTReportParams extends DateRangeParams {
  type?: 'gstr1' | 'gstr3b' | 'gstr2a';
}

export interface AgingReportParams {
  type?: 'receivables' | 'payables';
}

export class ReportsApi {
  constructor(private client: BookKeepClient) {}

  async getDashboard() {
    return this.client.get<DashboardSummary>('/reports/dashboard');
  }

  async getProfitLoss(params?: DateRangeParams) {
    return this.client.get<ProfitLossReport>('/reports/profit-loss', params);
  }

  async getBalanceSheet(params?: BalanceSheetParams) {
    return this.client.get<BalanceSheet>('/reports/balance-sheet', params);
  }

  async getGSTReport(params?: GSTReportParams) {
    return this.client.get<any>('/reports/gst', params);
  }

  async getGSTSummary(month?: number, year?: number) {
    return this.client.get<GSTSummary>('/reports/gst-summary', { month, year });
  }

  async getAgingReport(params?: AgingReportParams) {
    return this.client.get<ReceivablesAgingReport>('/reports/aging', params);
  }

  async getReceivablesAging() {
    return this.client.get<ReceivablesAgingReport>('/reports/receivables-aging');
  }

  async getPayablesAging() {
    return this.client.get<ReceivablesAgingReport>('/reports/payables-aging');
  }

  async getCashFlow(params?: DateRangeParams) {
    return this.client.get<CashFlowReport>('/reports/cash-flow', params);
  }

  async getGSTR1(month: number, year: number, format: 'json' | 'excel' = 'json') {
    if (format === 'excel') {
      const response = await this.client.getAxiosInstance().get('/reports/gstr1', {
        params: { month, year, format },
        responseType: 'blob',
      });
      return response.data as Blob;
    }
    return this.client.get<any>('/reports/gstr1', { month, year, format });
  }

  async getGSTR3B(month: number, year: number) {
    return this.client.get<any>('/reports/gstr3b', { month, year });
  }
}
