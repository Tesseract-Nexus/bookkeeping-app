import { BookKeepClient } from '../client';

export interface Notification {
  id: string;
  type: 'payment_reminder' | 'invoice_due' | 'payment_received' | 'team_invite' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  data?: {
    invoice_id?: string;
    customer_id?: string;
    transaction_id?: string;
  };
  created_at: string;
}

export interface NotificationsListResponse {
  notifications: Notification[];
  unread_count: number;
}

export class NotificationsApi {
  constructor(private client: BookKeepClient) {}

  async list(params?: { limit?: number; offset?: number }) {
    return this.client.get<NotificationsListResponse>('/notifications', params);
  }

  async getUnreadCount() {
    return this.client.get<{ count: number }>('/notifications/unread-count');
  }

  async markAsRead(notificationId: string) {
    return this.client.post(`/notifications/${notificationId}/read`, {});
  }

  async markAllAsRead() {
    return this.client.post('/notifications/read-all', {});
  }

  async delete(notificationId: string) {
    return this.client.delete(`/notifications/${notificationId}`);
  }
}
