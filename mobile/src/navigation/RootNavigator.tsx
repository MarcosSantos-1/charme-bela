import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Image, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { ClientNavigator } from './ClientNavigator';
import { ONBOARDING_SEEN_KEY } from '../screens/OnboardingScreen';
import { brand } from '../theme/brand';
import { logoSource, preloadOnboardingAssets } from '../assets/brandAssets';

export function RootNavigator() {
  const { user, loading } = useAuth();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((v) => setOnboardingSeen(v === 'true'))
      .catch(() => setOnboardingSeen(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Só pré-carrega onboarding se ainda for mostrar (primeiro acesso)
        const seen = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
        if (seen !== 'true') {
          await preloadOnboardingAssets();
        }
      } catch {
        // segue mesmo se o prefetch falhar
      } finally {
        if (!cancelled) setAssetsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || onboardingSeen === null || !assetsReady) {
    return (
      <View style={styles.loading}>
        <Image source={logoSource} style={styles.loadingLogo} resizeMode="contain" />
        <ActivityIndicator size="small" color={brand.rose} style={styles.spinner} />
        <Text style={styles.loadingText}>Charme & Bela</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <ClientNavigator />
      ) : (
        <AuthNavigator initialRouteName={onboardingSeen ? 'Access' : 'Onboarding'} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brand.background,
  },
  loadingLogo: {
    width: 96,
    height: 96,
    marginBottom: 20,
  },
  spinner: {
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: brand.muted,
    letterSpacing: 1,
  },
});
