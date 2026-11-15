// Customer accounts: the phone number is verified with a one-time code sent by the server.
// The session is an HttpOnly cookie, and the loyalty balance lives on the server.

import { api } from './auth';
import type { PlacedOrder } from '../types';

export interface CustomerAccount {
  phone: string;
  name?: string;
  points: number;
  totalSpent: number;
  ordersCount: number;
  tier: 'عادي' | 'برونزي' | 'فضي' | 'ذهبي';
}

export async function fetchCustomer(): Promise<CustomerAccount | null> {
  try {
    return (await api<{ customer: CustomerAccount | null }>('/customer/me')).customer;
  } catch {
    return null;
  }
}

export async function startPhoneVerification(phone: string): Promise<void> {
  await api('/customer/otp/start', { method: 'POST', body: { phone } });
}

export async function verifyPhoneCode(phone: string, code: string): Promise<CustomerAccount> {
  return (await api<{ customer: CustomerAccount }>('/customer/otp/verify', { method: 'POST', body: { phone, code } })).customer;
}

export async function customerLogout(): Promise<void> {
  try {
    await api('/customer/logout', { method: 'POST', body: {} });
  } catch {
    /* ignore */
  }
}

export async function fetchMyOrders(): Promise<PlacedOrder[]> {
  return (await api<{ orders: PlacedOrder[] }>('/customer/orders')).orders;
}

export interface OrderLookup {
  orderId: string;
  status: 'pending' | 'preparing' | 'completed' | 'cancelled';
  statusUpdatedAt?: string;
  paymentStatus?: string;
  estimatedTime?: string;
  total: number;
}

/** Guest tracking: the order number plus the phone number used on the order. */
export async function lookupOrder(orderId: string, phone: string): Promise<OrderLookup> {
  return api<OrderLookup>(`/orders/lookup?orderId=${encodeURIComponent(orderId.trim())}&phone=${encodeURIComponent(phone.trim())}`);
}
