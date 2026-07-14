import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { AccessScreen } from '../screens/AccessScreen';

export type AuthStackParamList = {
  Onboarding: undefined;
  Welcome: undefined;
  Access: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  initialRouteName: keyof AuthStackParamList;
}

export function AuthNavigator({ initialRouteName }: AuthNavigatorProps) {
  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding">
        {({ navigation }) => (
          <OnboardingScreen onFinish={() => navigation.replace('Welcome')} />
        )}
      </Stack.Screen>
      <Stack.Screen name="Welcome">
        {({ navigation }) => <WelcomeScreen onGetStarted={() => navigation.navigate('Access')} />}
      </Stack.Screen>
      <Stack.Screen name="Access" component={AccessScreen} />
    </Stack.Navigator>
  );
}
