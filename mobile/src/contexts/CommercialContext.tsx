import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import {
  getAppointments,
  getPlans,
  getServices,
  getSubscription,
  getVouchers,
} from '../lib/api';
import type { Appointment, Plan, Service, Subscription, Voucher } from '../types/commercial';
import { getApiErrorMessage } from '../types/commercial';

interface CommercialContextValue {
  services: Service[];
  appointments: Appointment[];
  plans: Plan[];
  subscription: Subscription | null;
  vouchers: Voucher[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CommercialContext = createContext<CommercialContextValue | null>(null);

export function CommercialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    setError(null);
    try {
      const [nextServices, nextAppointments, nextPlans, nextSubscription, nextVouchers] = await Promise.all([
        getServices(),
        getAppointments({ userId: user.id, excludeHidden: true }),
        getPlans(),
        getSubscription(user.id),
        getVouchers(user.id),
      ]);
      setServices(nextServices);
      setAppointments(nextAppointments);
      setPlans(nextPlans);
      setSubscription(nextSubscription);
      setVouchers(nextVouchers.filter((voucher) => !voucher.isUsed));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Não foi possível carregar seus dados'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      void refresh();
      return;
    }
    setServices([]);
    setAppointments([]);
    setPlans([]);
    setSubscription(null);
    setVouchers([]);
    setError(null);
    setLoading(false);
  }, [refresh, user?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user?.id) void refresh();
    });
    return () => subscription.remove();
  }, [refresh, user?.id]);

  const value = useMemo(
    () => ({ services, appointments, plans, subscription, vouchers, loading, refreshing, error, refresh }),
    [services, appointments, plans, subscription, vouchers, loading, refreshing, error, refresh],
  );

  return <CommercialContext.Provider value={value}>{children}</CommercialContext.Provider>;
}

export function useCommercial() {
  const context = useContext(CommercialContext);
  if (!context) throw new Error('useCommercial deve ser usado dentro de CommercialProvider');
  return context;
}
