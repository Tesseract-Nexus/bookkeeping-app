import { BookKeepClient } from '../client';
import {
  Party,
  CreatePartyRequest,
  UpdatePartyRequest,
  PartyFilter,
  PartyLedgerResponse,
  CreateContactRequest,
  CreateBankDetailRequest,
  PartyContact,
  PartyBankDetail,
} from '../types';

export class CustomersApi {
  constructor(private client: BookKeepClient) {}

  async list(filter?: PartyFilter) {
    return this.client.get<Party[]>('/customers', { ...filter, type: 'customer' });
  }

  async get(id: string) {
    return this.client.get<Party>(`/customers/${id}`);
  }

  async create(data: CreatePartyRequest) {
    return this.client.post<Party>('/customers', { ...data, party_type: 'customer' });
  }

  async update(id: string, data: UpdatePartyRequest) {
    return this.client.put<Party>(`/customers/${id}`, data);
  }

  async delete(id: string) {
    return this.client.delete(`/customers/${id}`);
  }

  async getLedger(id: string, fromDate?: string, toDate?: string) {
    return this.client.get<PartyLedgerResponse>(`/customers/${id}/ledger`, {
      from_date: fromDate,
      to_date: toDate,
    });
  }

  async addContact(id: string, data: CreateContactRequest) {
    return this.client.post<PartyContact>(`/customers/${id}/contacts`, data);
  }

  async addBankDetail(id: string, data: CreateBankDetailRequest) {
    return this.client.post<PartyBankDetail>(`/customers/${id}/bank-details`, data);
  }
}

export class VendorsApi {
  constructor(private client: BookKeepClient) {}

  async list(filter?: PartyFilter) {
    return this.client.get<Party[]>('/vendors', { ...filter, type: 'vendor' });
  }

  async get(id: string) {
    return this.client.get<Party>(`/vendors/${id}`);
  }

  async create(data: CreatePartyRequest) {
    return this.client.post<Party>('/vendors', { ...data, party_type: 'vendor' });
  }

  async update(id: string, data: UpdatePartyRequest) {
    return this.client.put<Party>(`/vendors/${id}`, data);
  }

  async delete(id: string) {
    return this.client.delete(`/vendors/${id}`);
  }

  async getLedger(id: string, fromDate?: string, toDate?: string) {
    return this.client.get<PartyLedgerResponse>(`/vendors/${id}/ledger`, {
      from_date: fromDate,
      to_date: toDate,
    });
  }
}

export class PartiesApi {
  constructor(private client: BookKeepClient) {}

  async list(filter?: PartyFilter) {
    return this.client.get<Party[]>('/parties', filter);
  }

  async get(id: string) {
    return this.client.get<Party>(`/parties/${id}`);
  }

  async create(data: CreatePartyRequest) {
    return this.client.post<Party>('/parties', data);
  }

  async update(id: string, data: UpdatePartyRequest) {
    return this.client.put<Party>(`/parties/${id}`, data);
  }

  async delete(id: string) {
    return this.client.delete(`/parties/${id}`);
  }

  async validateGSTIN(gstin: string) {
    return this.client.get<{ gstin: string; is_valid: boolean }>(`/validate-gstin/${gstin}`);
  }
}
