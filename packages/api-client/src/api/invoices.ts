import { BookKeepClient } from '../client';
import {
  Invoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  RecordPaymentRequest,
  SendInvoiceRequest,
  GenerateEWayBillRequest,
  InvoiceFilter,
  InvoicePayment,
  EInvoiceResponse,
  EWayBillResponse,
} from '../types';

export class InvoicesApi {
  constructor(private client: BookKeepClient) {}

  async list(filter?: InvoiceFilter) {
    return this.client.get<Invoice[]>('/invoices', filter);
  }

  async get(id: string) {
    return this.client.get<Invoice>(`/invoices/${id}`);
  }

  async create(data: CreateInvoiceRequest) {
    return this.client.post<Invoice>('/invoices', data);
  }

  async update(id: string, data: UpdateInvoiceRequest) {
    return this.client.put<Invoice>(`/invoices/${id}`, data);
  }

  async delete(id: string) {
    return this.client.delete(`/invoices/${id}`);
  }

  async send(id: string, data: SendInvoiceRequest) {
    return this.client.post<{ message: string }>(`/invoices/${id}/send`, data);
  }

  async recordPayment(id: string, data: RecordPaymentRequest) {
    return this.client.post<InvoicePayment>(`/invoices/${id}/payments`, data);
  }

  async getPayments(id: string) {
    return this.client.get<InvoicePayment[]>(`/invoices/${id}/payments`);
  }

  async generateEInvoice(id: string) {
    return this.client.post<EInvoiceResponse>(`/invoices/${id}/e-invoice`);
  }

  async cancelEInvoice(id: string, reason: string) {
    return this.client.post<{ message: string }>(`/invoices/${id}/e-invoice/cancel`, { reason });
  }

  async generateEWayBill(id: string, data: GenerateEWayBillRequest) {
    return this.client.post<EWayBillResponse>(`/invoices/${id}/eway-bill`, data);
  }

  async cancelEWayBill(id: string, reason: string) {
    return this.client.post<{ message: string }>(`/invoices/${id}/eway-bill/cancel`, { reason });
  }

  async downloadPDF(id: string): Promise<Blob> {
    const response = await this.client.getAxiosInstance().get(`/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async duplicate(id: string) {
    return this.client.post<Invoice>(`/invoices/${id}/duplicate`);
  }

  async convertToInvoice(id: string) {
    return this.client.post<Invoice>(`/invoices/${id}/convert`);
  }

  async markAsSent(id: string) {
    return this.client.post<Invoice>(`/invoices/${id}/mark-sent`);
  }

  async cancel(id: string, reason?: string) {
    return this.client.post<Invoice>(`/invoices/${id}/cancel`, { reason });
  }
}
