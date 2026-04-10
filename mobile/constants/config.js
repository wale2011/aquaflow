// AquaFlow API endpoint
// Priority:
// 1) EXPO_PUBLIC_API_BASE_URL from EAS profile/environment
// 2) Secure fallback endpoint (trusted Let's Encrypt cert)
const RAW_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.3.136.193.228.sslip.io/api';

export const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, '');

export const LAGOS_LGAS = [
  'Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa',
  'Badagry', 'Epe', 'Eti-Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye',
  'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland',
  'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'
];

export const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export const FREQUENCY_OPTIONS = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Every 2 Weeks', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

export const BOOKING_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  en_route: 'On The Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Failed'
};

export const PAYMENT_METHODS = [
  { label: 'Cash on Delivery', value: 'cash' },
  { label: 'Bank Transfer', value: 'transfer' },
  { label: 'Card', value: 'card' },
];
