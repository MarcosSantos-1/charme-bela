import { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClientHomeScreen } from '../screens/client/ClientHomeScreen';
import { AgendaScreen } from '../screens/client/AgendaScreen';
import { ServicesScreen } from '../screens/client/ServicesScreen';
import { ProfileScreen } from '../screens/client/ProfileScreen';
import { BookingScreen } from '../screens/client/BookingScreen';
import { MyPlanScreen } from '../screens/client/profile/MyPlanScreen';
import { AnamnesisBridgeScreen } from '../screens/client/profile/AnamnesisBridgeScreen';
import { AnamnesisFlow } from '../screens/anamnesis/AnamnesisFlow';
import { SubscriptionCheckScreen } from '../screens/SubscriptionCheckScreen';
import { useAuth } from '../contexts/AuthContext';
import { useCommercial } from '../contexts/CommercialContext';
import { getAnamnesis, getSubscription, updateUser } from '../lib/api';
import { brand } from '../theme/brand';
import type { Subscription } from '../types/commercial';
import { looksLikePhoneName } from '../lib/userDisplay';

export type ClientTabParamList = {
  Home: undefined;
  Agenda: undefined;
  Services: { category?: string } | undefined;
  Profile: { openScreen?: 'history' | 'anamnesis' | 'plan' } | undefined;
};

export type ClientStackParamList = {
  ClientTabs: { screen?: keyof ClientTabParamList; params?: any } | undefined;
  Booking: { serviceId: string; appointmentId?: string };
  Plan: undefined;
  AnamnesisBridge: { serviceId?: string; appointmentId?: string } | undefined;
};

const Tab = createBottomTabNavigator<ClientTabParamList>();
const Stack = createNativeStackNavigator<ClientStackParamList>();

const ICONS: Record<keyof ClientTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Agenda: 'calendar',
  Services: 'grid',
  Profile: 'person',
};

type GatePhase = 'loading' | 'anamnesis' | 'subscription' | 'ready';

function isSubscriptionActive(subscription: Subscription | null | undefined) {
  if (!subscription) return false;
  if (subscription.status === 'ACTIVE') return true;
  if (
    subscription.status === 'CANCELED' &&
    subscription.endDate &&
    new Date(subscription.endDate) > new Date()
  ) {
    return true;
  }
  return false;
}

function ClientTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + 5;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#ec4899',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          paddingTop: 6,
          paddingBottom: bottomPad,
          height: 56 + bottomPad,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name]} size={size ?? 24} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={ClientHomeScreen} options={{ title: 'Início' }} />
      <Tab.Screen name="Agenda" component={AgendaScreen} options={{ title: 'Agenda' }} />
      <Tab.Screen name="Services" component={ServicesScreen} options={{ title: 'Serviços' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

function ClientAppStack({ openPlan }: { openPlan?: boolean }) {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={openPlan ? 'Plan' : 'ClientTabs'}
    >
      <Stack.Screen name="ClientTabs" component={ClientTabs} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="Plan">
        {({ navigation }) => (
          <MyPlanScreen
            onBack={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('ClientTabs');
              }
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="AnamnesisBridge" component={AnamnesisBridgeScreen} />
    </Stack.Navigator>
  );
}

function ClientGate() {
  const { user, setUserProfile } = useAuth();
  const { subscription, loading: commercialLoading, refresh } = useCommercial();
  const [phase, setPhase] = useState<GatePhase>('loading');
  const [openPlan, setOpenPlan] = useState(false);

  const syncNameFromAnamnesis = useCallback(
    async (form: any) => {
      if (!user?.id || !form?.personalData?.fullName) return;
      const fullName = String(form.personalData.fullName).trim();
      if (!fullName || !looksLikePhoneName(user.name)) return;
      try {
        const phoneFromForm = form.personalData.phone
          ? String(form.personalData.phone).replace(/\D/g, '')
          : undefined;
        const updated = await updateUser(user.id, {
          name: fullName,
          ...(phoneFromForm && phoneFromForm.length >= 10 ? { phone: phoneFromForm } : {}),
        });
        await setUserProfile(updated);
      } catch {
        // best-effort
      }
    },
    [setUserProfile, user?.id, user?.name],
  );

  const resolveAfterAnamnesis = useCallback(async () => {
    if (!user?.id) {
      setPhase('ready');
      return;
    }
    try {
      await refresh();
      const sub = await getSubscription(user.id);
      setPhase(isSubscriptionActive(sub) ? 'ready' : 'subscription');
    } catch {
      setPhase('subscription');
    }
  }, [refresh, user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      setPhase('loading');
      try {
        const form = await getAnamnesis(user.id);
        if (cancelled) return;
        if (!form || !form.termsAccepted) {
          setPhase('anamnesis');
          return;
        }
        await syncNameFromAnamnesis(form);
        // Wait for commercial load to decide stub
      } catch {
        if (!cancelled) setPhase('anamnesis');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, syncNameFromAnamnesis]);

  useEffect(() => {
    if (phase !== 'loading') return;
    if (!user?.id || commercialLoading) return;
    (async () => {
      try {
        const form = await getAnamnesis(user.id);
        if (!form || !form.termsAccepted) {
          setPhase('anamnesis');
          return;
        }
        await syncNameFromAnamnesis(form);
        setPhase(isSubscriptionActive(subscription) ? 'ready' : 'subscription');
      } catch {
        setPhase('anamnesis');
      }
    })();
  }, [phase, user?.id, commercialLoading, subscription, syncNameFromAnamnesis]);

  if (!user) return null;

  if (phase === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={brand.rose} />
      </View>
    );
  }

  if (phase === 'anamnesis') {
    return <AnamnesisFlow user={user} onComplete={() => void resolveAfterAnamnesis()} />;
  }

  if (phase === 'subscription') {
    return (
      <SubscriptionCheckScreen
        onContinue={() => setPhase('ready')}
        onViewPlans={() => {
          setOpenPlan(true);
          setPhase('ready');
        }}
      />
    );
  }

  return <ClientAppStack openPlan={openPlan} />;
}

export function ClientNavigator() {
  return <ClientGate />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.background,
  },
});
