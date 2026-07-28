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

export type ClientTabParamList = {
  Home: undefined;
  Agenda: undefined;
  Services: { category?: string } | undefined;
  Profile: { openScreen?: 'history' } | undefined;
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

function ClientTabs() {
  const insets = useSafeAreaInsets();
  // Android edge-to-edge: sobe a tab bar acima do gesto/nav do sistema (+5px de folga)
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

export function ClientNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientTabs" component={ClientTabs} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="Plan">
        {({ navigation }) => <MyPlanScreen onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="AnamnesisBridge" component={AnamnesisBridgeScreen} />
    </Stack.Navigator>
  );
}
