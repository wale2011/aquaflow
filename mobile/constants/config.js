// AquaFlow Production API - AWS Server
// NOTE: Port 80 must be open in AWS Security Group (launch-wizard-1)
// To open it: AWS Console → EC2 → Security Groups → launch-wizard-1 → Inbound rules
// Add: HTTP port 80 from 0.0.0.0/0

export const API_BASE_URL = 'http://3.145.208.89/api';

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
