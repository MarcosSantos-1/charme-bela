import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import {
  getAppointments,
  getPlans,
  getServices,
  getSubscription,
  getVouchers,
  type Banner,
} from '../lib/api';
import type { Appointment, Plan, Service, Subscription, Voucher } from '../types/commercial';
import { getApiErrorMessage } from '../types/commercial';
import {
  bannersSignature,
  isBannerCacheFresh,
  loadClientBanners,
  readCachedClientBanners,
} from '../lib/bannerCache';

interface CommercialContextValue {
  services: Service[];
  appointments: Appointment[];
  plans: Plan[];
  subscription: Subscription | null;
  vouchers: Voucher[];
  /** Banners da home (CLIENT) — prontos após o loading do gate. */
  clientBanners: Banner[];
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
  const [clientBanners, setClientBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bannersFetchedAtRef = useRef(0);
  const bannersSigRef = useRef('');

  const applyBannersIfChanged = useCallback((banners: Banner[], fetchedAt: number) => {
    const sig = bannersSignature(banners);
    bannersFetchedAtRef.current = fetchedAt;
    if (sig === bannersSigRef.current) return;
    bannersSigRef.current = sig;
    setClientBanners(banners);
  }, []);

  const refreshBanners = useCallback(
    async (forceNetwork = false) => {
      const result = await loadClientBanners({ forceNetwork });
      applyBannersIfChanged(result.banners, result.fetchedAt);
    },
    [applyBannersIfChanged],
  );

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

      // Pull-to-refresh: força rede nos banners (sem limpar UI antes)
      await refreshBanners(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Não foi possível carregar seus dados'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, refreshBanners]);

  /** Primeira carga: cache de banners + rede comercial em paralelo, só libera loading no fim. */
  const bootstrap = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    // Hidrata banners do disco imediatamente (sem flash vazio se já houver cache)
    const cached = await readCachedClientBanners();
    if (cached?.banners?.length) {
      applyBannersIfChanged(cached.banners, cached.fetchedAt);
    }

    try {
      const forceBanners = !cached || !isBannerCacheFresh(cached.fetchedAt);
      const commercialPromise = Promise.all([
        getServices(),
        getAppointments({ userId: user.id, excludeHidden: true }),
        getPlans(),
        getSubscription(user.id),
        getVouchers(user.id),
      ]);
      const bannersPromise = refreshBanners(forceBanners).catch((err) => {
        console.warn('[Commercial] banners no bootstrap', err);
      });

      const [[nextServices, nextAppointments, nextPlans, nextSubscription, nextVouchers]] = await Promise.all([
        commercialPromise,
        bannersPromise,
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
    }
  }, [user?.id, applyBannersIfChanged, refreshBanners]);

  useEffect(() => {
    if (user?.id) {
      void bootstrap();
      return;
    }
    setServices([]);
    setAppointments([]);
    setPlans([]);
    setSubscription(null);
    setVouchers([]);
    setClientBanners([]);
    bannersSigRef.current = '';
    bannersFetchedAtRef.current = 0;
    setError(null);
    setLoading(false);
  }, [bootstrap, user?.id]);

  // Volta ao app: revalida dados; banners só se o cache estiver velho (sem limpar UI)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !user?.id) return;
      void (async () => {
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

          if (!isBannerCacheFresh(bannersFetchedAtRef.current)) {
            await refreshBanners(true);
          }
        } catch {
          // silencioso em background
        }
      })();
    });
    return () => sub.remove();
  }, [user?.id, refreshBanners]);

  const value = useMemo(
    () => ({
      services,
      appointments,
      plans,
      subscription,
      vouchers,
      clientBanners,
      loading,
      refreshing,
      error,
      refresh,
    }),
    [services, appointments, plans, subscription, vouchers, clientBanners, loading, refreshing, error, refresh],
  );

  return <CommercialContext.Provider value={value}>{children}</CommercialContext.Provider>;
}

export function useCommercial() {
  const context = useContext(CommercialContext);
  if (!context) throw new Error('useCommercial deve ser usado dentro de CommercialProvider');
  return context;
}
