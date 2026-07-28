import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { ClientNavigator } from './ClientNavigator';
import { ONBOARDING_SEEN_KEY } from '../screens/OnboardingScreen';
import { brand } from '../theme/brand';

export function RootNavigator() {
  const { user, loading } = useAuth();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((v) => setOnboardingSeen(v === 'true'))
      .catch(() => setOnboardingSeen(false));
  }, []);

  if (loading || onboardingSeen === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={brand.rose} />
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
});
