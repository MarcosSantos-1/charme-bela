import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { updateUser } from './api';

/** Canal Android para pushes gerais do app. */
export const DEFAULT_PUSH_CHANNEL = 'default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function resolveEasProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
      ?.projectId
  );
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DEFAULT_PUSH_CHANNEL, {
    name: 'Geral',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#ec4899',
  });
}

/**
 * Pede permissão e retorna o ExpoPushToken, ou null se indisponível.
 * Emuladores / permissão negada → null (sem throw).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      if (__DEV__) {
        console.log('[push] Simulador/emulador — push desabilitado');
      }
      return null;
    }

    await ensureAndroidChannel();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      if (__DEV__) {
        console.log('[push] Permissão negada');
      }
      return null;
    }

    const projectId = resolveEasProjectId();
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    return tokenResponse.data ?? null;
  } catch (error) {
    console.warn('[push] Falha ao registrar:', error);
    return null;
  }
}

/** Salva o token no backend para o usuário logado. */
export async function syncPushTokenToBackend(userId: string): Promise<void> {
  const token = await registerForPushNotificationsAsync();
  if (!token) return;
  try {
    await updateUser(userId, { expoPushToken: token });
  } catch (error) {
    console.warn('[push] Falha ao salvar token no backend:', error);
  }
}

/** Limpa o token no backend (logout). */
export async function clearPushTokenOnBackend(userId: string): Promise<void> {
  try {
    await updateUser(userId, { expoPushToken: null });
  } catch {
    // logout não deve falhar por causa disso
  }
}
