// API client para mobile
import axios from 'axios';
import { auth } from './firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { Platform } from 'react-native';
import type {
  Appointment,
  AvailableSlots,
  PaymentHistoryItem,
  PaymentMethod,
  Plan,
  Service,
  Subscription,
  Voucher,
  PackagePurchase,
} from '../types/commercial';
import { looksLikePhoneName } from './userDisplay';

// Base do backend (rotas são "flat", sem prefixo /api).
// Dev: iOS simulator usa localhost; em device físico/Android troque por IP da máquina.
// Prod: deploy no Fly.io.
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
export const API_URL = configuredApiUrl || (__DEV__
  ? Platform.OS === 'android' ? 'http://10.0.2.2:3333' : 'http://localhost:3333'
  : 'https://charme-bela.fly.dev');

if (__DEV__) {
  console.log(`[API] baseURL = ${API_URL}`);
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Anexa o ID token do Firebase (quando houver usuário logado)
api.interceptors.request.use(
  async (config) => {
    try {
      const current = auth.currentUser;
      if (current) {
        const token = await current.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // segue sem token
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Em 401, encerra a sessão Firebase (o AuthContext reage via onAuthStateChanged)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && auth.currentUser) {
      try {
        await firebaseSignOut(auth);
      } catch {
        // ignora
      }
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'CLIENT' | 'ADMIN' | 'MANAGER';
  isActive: boolean;
  firebaseUid?: string;
  profileImageUrl?: string;
  clubWelcomeSeenAt?: string | null;
  expoPushToken?: string | null;
  pushAllEnabled?: boolean;
  appointmentRemindersEnabled?: boolean;
  subscription?: any;
  anamnesisForm?: any;
}

// ============================================
// USUÁRIOS / SYNC COM FIREBASE
// ============================================

function unwrap<T = any>(data: any): T {
  // Backend responde ora { success, data }, ora o objeto direto
  if (data && typeof data === 'object' && 'data' in data && 'success' in data) {
    return data.data as T;
  }
  return data as T;
}

export async function getUserByFirebaseUid(firebaseUid: string): Promise<User> {
  const response = await api.get(`/users/firebase/${firebaseUid}`);
  return unwrap<User>(response.data);
}

export async function createUser(data: {
  name: string;
  email: string;
  phone?: string;
  firebaseUid?: string;
  role?: 'CLIENT' | 'MANAGER';
}): Promise<User> {
  const response = await api.post('/users', data);
  return unwrap<User>(response.data);
}

export async function updateUser(
  userId: string,
  data: {
    name?: string;
    phone?: string;
    email?: string;
    clubWelcomeSeenAt?: string | null;
    expoPushToken?: string | null;
    pushAllEnabled?: boolean;
    appointmentRemindersEnabled?: boolean;
  },
): Promise<User> {
  const response = await api.put(`/users/${userId}`, data);
  return unwrap<User>(response.data);
}

// Busca o usuário no backend pelo UID do Firebase; se não existir, cria.
export async function getOrCreateUserFromFirebase(firebaseUser: {
  uid: string;
  email: string;
  displayName?: string;
  phone?: string;
}): Promise<User> {
  try {
    return await getUserByFirebaseUid(firebaseUser.uid);
  } catch (error: any) {
    if (error?.response?.status && error.response.status !== 404) {
      throw error;
    }
    const rawName = firebaseUser.displayName?.trim();
    const name =
      rawName && !looksLikePhoneName(rawName) ? rawName : 'Cliente';
    return await createUser({
      name,
      email: firebaseUser.email,
      phone: firebaseUser.phone,
      firebaseUid: firebaseUser.uid,
    });
  }
}

// ============================================
// AGENDAMENTOS
// ============================================
export async function getAppointments(params?: { userId?: string; excludeHidden?: boolean }): Promise<Appointment[]> {
  const response = await api.get('/appointments', { params });
  return unwrap<Appointment[]>(response.data);
}

export async function createAppointment(data: {
  userId: string;
  serviceId: string;
  startTime: string;
  origin: 'SUBSCRIPTION' | 'SINGLE' | 'VOUCHER';
  voucherId?: string;
  paymentAmount?: number;
  notes?: string;
}): Promise<Appointment> {
  const response = await api.post('/appointments', data);
  return unwrap<Appointment>(response.data);
}

export async function cancelAppointment(id: string, cancelReason?: string): Promise<any> {
  const response = await api.put(`/appointments/${id}/cancel`, { canceledBy: 'client', cancelReason });
  return response.data;
}

export async function rescheduleAppointment(id: string, newStartTime: string): Promise<Appointment> {
  const response = await api.put(`/appointments/${id}/reschedule`, { newStartTime });
  return unwrap<Appointment>(response.data);
}

// ============================================
// SERVIÇOS / PLANOS
// ============================================
export async function getServices(): Promise<Service[]> {
  const response = await api.get('/services');
  return unwrap<Service[]>(response.data);
}

export async function getPlans(): Promise<Plan[]> {
  const response = await api.get('/plans');
  return unwrap<Plan[]>(response.data);
}

export type BannerLocation = 'LANDING' | 'CLIENT';

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  location: BannerLocation;
  isActive: boolean;
  sortOrder: number;
  linkPath?: string | null;
  machineKind?: 'LASER' | 'CRYO' | null;
  updatedAt?: string;
}

export type DayMarker = {
  date: string;
  closed: boolean;
  closedReason?: string;
  markers: Array<'LASER' | 'CRYO'>;
  laserExclusive: boolean;
  released: { LASER: boolean; CRYO: boolean };
};

export async function getBanners(params?: {
  location?: BannerLocation;
  activeOnly?: boolean;
}): Promise<Banner[]> {
  const response = await api.get('/banners', {
    params: {
      ...(params?.location ? { location: params.location } : {}),
      ...(params?.activeOnly ? { activeOnly: 'true' } : {}),
    },
  });
  return unwrap<Banner[]>(response.data);
}

export async function getAvailableSlots(date: string, serviceId?: string): Promise<AvailableSlots> {
  const response = await api.get('/schedule/available', { params: { date, serviceId } });
  return unwrap<AvailableSlots>(response.data);
}

export async function getAvailableDays(
  from: string,
  to: string,
  serviceId?: string,
): Promise<{ days: Array<{ date: string }> }> {
  const response = await api.get('/schedule/available-days', { params: { from, to, serviceId } });
  return unwrap<{ days: Array<{ date: string }> }>(response.data);
}

export async function getDayMarkers(from: string, to: string): Promise<{ days: DayMarker[] }> {
  const response = await api.get('/schedule/day-markers', { params: { from, to } });
  return unwrap<{ days: DayMarker[] }>(response.data);
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  try {
    const response = await api.get(`/subscriptions/user/${userId}`);
    return unwrap<Subscription>(response.data);
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}

export async function getVouchers(userId: string): Promise<Voucher[]> {
  const response = await api.get(`/vouchers/user/${userId}`);
  return unwrap<Voucher[]>(response.data);
}

export async function createCheckoutSession(userId: string, planId: string) {
  const response = await api.post('/payments/subscribe', { userId, planId });
  return unwrap<{
    paymentId: string;
    sessionId: string;
    url: string | null;
    invoiceUrl: string | null;
    pixCopyPaste: string | null;
    pixQrBase64: string | null;
    expiresAt?: string | null;
    amount: number;
    description: string;
  }>(response.data);
}

export async function createPaymentSession(
  userId: string,
  serviceId: string,
  appointmentId?: string,
  customAmount?: number,
  customDescription?: string,
  packagePurchaseId?: string,
) {
  const response = await api.post('/payments/checkout', {
    userId,
    serviceId,
    appointmentId,
    customAmount,
    customDescription,
    packagePurchaseId,
  });
  return unwrap<{
    paymentId: string;
    sessionId: string;
    url: string | null;
    invoiceUrl: string | null;
    pixCopyPaste: string | null;
    pixQrBase64: string | null;
    expiresAt?: string | null;
    amount: number;
    description: string;
  }>(response.data);
}

export async function getPackagePurchases(userId?: string, status?: string) {
  try {
    const response = await api.get('/packages/purchases', { params: { userId, status } });
    return unwrap<PackagePurchase[]>(response.data);
  } catch (error) {
    // Backend antigo ainda sem /packages — não derruba a home inteira.
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function getPackagePurchase(id: string) {
  const response = await api.get(`/packages/purchases/${id}`);
  return unwrap<PackagePurchase>(response.data);
}

export async function createPackagePurchase(data: {
  userId: string;
  serviceId: string;
  slots?: Array<{ startTime: string } | string>;
  paidAtClinic?: boolean;
  notes?: string;
}) {
  const response = await api.post('/packages/purchases', data);
  return unwrap<PackagePurchase>(response.data);
}

export async function schedulePackageSessions(
  purchaseId: string,
  slots: Array<{ startTime: string } | string>,
  opts?: { notes?: string; adminExtended?: boolean },
) {
  const response = await api.post(`/packages/purchases/${purchaseId}/sessions`, { slots, ...opts });
  return unwrap<PackagePurchase>(response.data);
}

export async function changePlan(userId: string, newPlanId: string): Promise<Subscription> {
  const response = await api.put(`/subscriptions/${userId}/change-plan`, { newPlanId });
  return unwrap<Subscription>(response.data);
}

export async function cancelSubscription(userId: string, cancelReason?: string): Promise<Subscription> {
  const response = await api.put(`/subscriptions/${userId}/cancel`, { cancelReason });
  return unwrap<Subscription>(response.data);
}

export async function reactivateSubscription(userId: string): Promise<Subscription> {
  const response = await api.put(`/subscriptions/${userId}/reactivate`);
  return unwrap<Subscription>(response.data);
}

export async function pauseSubscription(userId: string): Promise<Subscription> {
  const response = await api.put(`/subscriptions/${userId}/pause`);
  return unwrap<Subscription>(response.data);
}

export async function createPortalSession(userId: string) {
  const response = await api.post('/payments/manage', { userId });
  return unwrap<{ url: string }>(response.data);
}

export async function getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  try {
    const response = await api.get(`/payments/methods/${userId}`);
    return unwrap<PaymentMethod[]>(response.data);
  } catch (error: any) {
    if (error?.response?.status === 404) return [];
    throw error;
  }
}

export async function getPaymentHistory(userId: string): Promise<PaymentHistoryItem[]> {
  try {
    const response = await api.get(`/payments/history/${userId}`);
    return unwrap<PaymentHistoryItem[]>(response.data);
  } catch (error: any) {
    if (error?.response?.status === 404) return [];
    throw error;
  }
}

export async function getPaymentStatus(paymentId: string) {
  const response = await api.get(`/payments/status/${paymentId}`);
  return unwrap<{ paymentId: string; status: string; paid: boolean; billingType: string; value: number; invoiceUrl: string | null }>(
    response.data,
  );
}

export async function abandonCheckout(data: {
  userId?: string;
  appointmentId?: string;
  packagePurchaseId?: string;
  paymentId?: string;
}) {
  const response = await api.post('/payments/abandon', data);
  return unwrap<{ released: boolean; message: string }>(response.data);
}

export async function getAnamnesis(userId: string): Promise<any | null> {
  try {
    const response = await api.get(`/anamnesis/user/${userId}`);
    return unwrap(response.data);
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}

export async function saveAnamnesis(
  userId: string,
  data: {
    personalData?: Record<string, unknown>;
    lifestyleData?: Record<string, unknown>;
    healthData?: Record<string, unknown>;
    objectivesData?: Record<string, unknown>;
    termsAccepted?: boolean;
    schemaVersion?: number;
  },
) {
  const current = await getAnamnesis(userId);
  const payload = {
    personalData: data.personalData || {},
    lifestyleData: data.lifestyleData || {},
    healthData: data.healthData || {},
    objectivesData: data.objectivesData || {},
    termsAccepted: data.termsAccepted === true,
    schemaVersion: data.schemaVersion ?? 2,
  };
  const response = current
    ? await api.put(`/anamnesis/user/${userId}`, payload)
    : await api.post('/anamnesis', { userId, ...payload });
  return unwrap(response.data);
}

/** @deprecated Prefer saveAnamnesis with schemaVersion 2 */
export async function saveMinimalAnamnesis(userId: string, data: Record<string, any>) {
  return saveAnamnesis(userId, {
    ...data,
    termsAccepted: true,
    schemaVersion: 2,
  });
}

// ============================================
// NOTIFICAÇÕES
// ============================================

export interface AppNotification {
  id: string;
  userId?: string | null;
  type: string;
  title: string;
  message: string;
  icon: string;
  priority: string;
  read: boolean;
  readAt?: string;
  metadata?: unknown;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getNotifications(params?: {
  userId?: string;
  unreadOnly?: boolean;
  limit?: number;
}): Promise<AppNotification[]> {
  const response = await api.get('/notifications', { params });
  return unwrap<AppNotification[]>(response.data);
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  const response = await api.get('/notifications/unread-count', { params: { userId } });
  const data = unwrap<{ count: number }>(response.data);
  return data?.count ?? 0;
}

export async function markNotificationAsRead(id: string): Promise<AppNotification> {
  const response = await api.put(`/notifications/${id}/read`);
  return unwrap<AppNotification>(response.data);
}

export async function markAllNotificationsAsRead(userId: string): Promise<{ count: number }> {
  const response = await api.put('/notifications/mark-all-read', { userId });
  return unwrap<{ count: number }>(response.data);
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}

export async function clearAllNotifications(userId: string): Promise<{ count: number }> {
  const response = await api.delete('/notifications/clear-all', { params: { userId } });
  return unwrap<{ count: number }>(response.data);
}

export default api;
