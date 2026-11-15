// Orders, reviews and customers live on the server. These helpers wrap the /api endpoints.

import { api } from './auth';
import type { PlacedOrder, CartItem, CustomerOrderInfo, Review, OrderStatus } from '../types';
import type { CustomerAccount } from './customerAuth';

// ----- orders -----
export async function submitOrder(payload: {
  items: CartItem[];
  customer: CustomerOrderInfo;
  pointsRedeemed: number;
}): Promise<{ order: PlacedOrder; customer: CustomerAccount | null }> {
  const body = {
    items: payload.items.map((i) => ({
      cartItemId: i.cartItemId,
      menuItem: { id: i.menuItem.id }, // the server re-prices everything from the published menu
      quantity: i.quantity,
      options: i.options,
      offerId: i.offerId,
    })),
    customer: payload.customer,
    pointsRedeemed: payload.pointsRedeemed,
  };
  return api<{ order: PlacedOrder; customer: CustomerAccount | null }>('/orders', { method: 'POST', body });
}

export async function fetchAdminOrders(): Promise<PlacedOrder[]> {
  return (await api<{ orders: PlacedOrder[] }>('/orders?limit=300', { auth: true })).orders;
}

export async function patchOrder(
  orderId: string,
  patch: { status?: OrderStatus; paymentStatus?: 'on_delivery' | 'unpaid' | 'paid' }
): Promise<PlacedOrder> {
  return (await api<{ order: PlacedOrder }>(`/orders/${orderId}`, { method: 'PATCH', auth: true, body: patch })).order;
}

// ----- reviews -----
export async function fetchReviews(): Promise<Review[] | undefined> {
  try {
    return (await api<{ reviews: Review[] }>('/reviews')).reviews;
  } catch {
    return undefined;
  }
}

export async function submitReview(r: { itemId: string; rating: number; userName: string; comment?: string }): Promise<Review> {
  return (await api<{ review: Review }>('/reviews', { method: 'POST', body: r })).review;
}

export async function updateReviewRemote(id: string, rating: number, comment: string): Promise<Review> {
  return (await api<{ review: Review }>(`/reviews/${id}`, { method: 'PATCH', auth: true, body: { rating, comment } })).review;
}

export async function deleteReviewRemote(id: string): Promise<void> {
  await api(`/reviews/${id}`, { method: 'DELETE', auth: true });
}

// ----- customers (staff) -----
export async function lookupCustomer(phone: string): Promise<CustomerAccount | null> {
  return (await api<{ customer: CustomerAccount | null }>(`/customers?phone=${encodeURIComponent(phone)}`, { auth: true })).customer;
}

export async function setCustomerPoints(phoneDigits: string, points: number): Promise<CustomerAccount> {
  return (await api<{ customer: CustomerAccount }>(`/customers/${phoneDigits}`, { method: 'PATCH', auth: true, body: { points } })).customer;
}
