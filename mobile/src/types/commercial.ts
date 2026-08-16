export type ServiceCategory = 'COMBO' | 'FACIAL' | 'CORPORAL' | 'MASSAGEM';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';
export type AppointmentOrigin = 'SUBSCRIPTION' | 'SINGLE' | 'VOUCHER' | 'ADMIN_CREATED' | 'PACKAGE';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | null;
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'PAUSED';

export interface PackageItemSnapshot {
  serviceId: string;
  name: string;
  durationMinutes: number;
  category: string;
  sortOrder: number;
}

export interface PackageItem {
  id?: string;
  includedServiceId: string;
  durationMinutes: number;
  sortOrder: number;
  includedService?: {
    id: string;
    name: string;
    category: ServiceCategory;
    duration: number;
  };
}

export interface Service {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  duration: number;
  price: number;
  isActive: boolean;
  machineKind?: 'LASER' | 'CRYO' | null;
  allowOnSubscription?: boolean;
  packageSessionCount?: number | null;
  installmentsAllowed?: boolean;
  packageItems?: PackageItem[];
}

export interface PackagePurchase {
  id: string;
  userId: string;
  packageServiceId: string;
  packageService?: Service;
  sessionCount: number;
  sessionsScheduled: number;
  remainingSessions: number;
  pricePaid: number;
  paymentStatus: Exclude<PaymentStatus, null>;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELED' | 'REFUNDED';
  itemsSnapshot?: PackageItemSnapshot[];
  items?: PackageItemSnapshot[];
  appointments?: Appointment[];
  paymentExpiresAt?: string | null;
  createdAt?: string;
}

export function isPackageService(service: Pick<Service, 'category'>) {
  return service.category === 'COMBO';
}

export function packageItemsOf(service: Service): Array<{ name: string; durationMinutes: number }> {
  if (service.packageItems?.length) {
    return [...service.packageItems]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        name: item.includedService?.name || 'Procedimento',
        durationMinutes: item.durationMinutes,
      }));
  }
  return [];
}

export interface Voucher {
  id: string;
  userId: string;
  type: 'FREE_TREATMENT' | 'FREE_MONTH' | 'DISCOUNT';
  description: string;
  serviceId?: string | null;
  anyService: boolean;
  discountPercent?: number | null;
  discountAmount?: number | null;
  isUsed: boolean;
  expiresAt?: string | null;
}

export interface Appointment {
  id: string;
  userId: string;
  serviceId: string;
  service: Service;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  origin: AppointmentOrigin;
  paymentStatus: PaymentStatus;
  paymentAmount?: number | null;
  paymentExpiresAt?: string | null;
  voucherId?: string | null;
  voucher?: Voucher | null;
  cancelReason?: string | null;
  packagePurchaseId?: string | null;
  packageSessionIndex?: number | null;
  packagePurchase?: {
    id: string;
    sessionCount: number;
    sessionsScheduled: number;
    status: string;
    itemsSnapshot?: PackageItemSnapshot[];
  } | null;
}

export interface Plan {
  id: string;
  name: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  description: string;
  price: number;
  maxTreatmentsPerMonth: number;
  maxTreatmentsPerWeek: number;
  maxFacialPerMonth?: number | null;
  services: Service[];
  isActive: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan: Plan;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string | null;
  minimumCommitmentEnd?: string | null;
  canceledAt?: string | null;
  currentMonthUsage: { totalTreatments: number };
  limits: { maxPerMonth: number; maxPerDay: number };
  remaining: { thisMonth: number; byMonth?: Record<string, number> };
  stripeSubscriptionId?: string | null;
  asaasSubscriptionId?: string | null;
}

export interface AvailableSlots {
  date: string;
  serviceId?: string;
  slots: string[];
  bookedSlots: string[];
  available?: boolean;
  reason?: string;
}

export interface PaymentMethod {
  id: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

export interface PaymentHistoryItem {
  id: string;
  type: 'subscription' | 'single';
  amount: number;
  totalAmount: number;
  currency: string;
  status: string;
  description: string;
  paidAt?: string | null;
  createdAt: string;
  invoicePdf?: string | null;
  hostedInvoiceUrl?: string | null;
  receiptUrl?: string | null;
}

export interface CheckoutPayload {
  paymentId: string;
  sessionId: string;
  url: string | null;
  invoiceUrl: string | null;
  pixCopyPaste: string | null;
  pixQrBase64: string | null;
  expiresAt?: string | null;
  amount: number;
  description: string;
}

export const CATEGORY_META: Record<ServiceCategory, { label: string; color: string; icon: string }> = {
  COMBO: { label: 'Pacotes', color: '#ec4899', icon: 'gift-outline' },
  FACIAL: { label: 'Faciais', color: '#8b5cf6', icon: 'face-woman-outline' },
  CORPORAL: { label: 'Corporais', color: '#3b82f6', icon: 'human' },
  MASSAGEM: { label: 'Massagens', color: '#10b981', icon: 'hand-heart-outline' },
};

export function getApiErrorMessage(error: unknown, fallback = 'Não foi possível concluir a operação') {
  const value = error as any;
  return value?.response?.data?.error || value?.response?.data?.message || value?.message || fallback;
}

/** Hold de checkout online ainda dentro dos 5 minutos. */
export function isOnlinePaymentHold(appointment: Pick<Appointment, 'origin' | 'status' | 'paymentStatus' | 'paymentExpiresAt'>) {
  if (appointment.origin === 'ADMIN_CREATED') return false;
  if (appointment.status !== 'PENDING' || appointment.paymentStatus !== 'PENDING' || !appointment.paymentExpiresAt) {
    return false;
  }
  return new Date(appointment.paymentExpiresAt).getTime() > Date.now();
}

/** Hold expirado ainda não cancelado no servidor (lag até o release). */
export function isExpiredUnpaidHold(appointment: Pick<Appointment, 'origin' | 'status' | 'paymentStatus' | 'paymentExpiresAt'>) {
  if (appointment.origin === 'ADMIN_CREATED') return false;
  if (appointment.status !== 'PENDING' || appointment.paymentStatus !== 'PENDING' || !appointment.paymentExpiresAt) {
    return false;
  }
  return new Date(appointment.paymentExpiresAt).getTime() <= Date.now();
}

/** Status efetivo para UI — hold expirado conta como Cancelado imediatamente. */
export function effectiveAppointmentStatus(
  appointment: Pick<Appointment, 'origin' | 'status' | 'paymentStatus' | 'paymentExpiresAt'>,
): AppointmentStatus {
  if (isExpiredUnpaidHold(appointment)) return 'CANCELED';
  return appointment.status;
}
