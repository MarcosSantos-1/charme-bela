import { useEffect, useRef } from 'react';
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

/** Motivo pelo qual o push não está ativo, para exibir/logar em diagnóstico. */
export type PushUnavailableReason =
  | 'simulator'
  | 'permission-denied'
  | 'missing-project-id'
  | 'token-error';

export type PushRegistration =
  | { token: string; reason?: undefined }
  | { token: null; reason: PushUnavailableReason; detail?: string };

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
 * Pede permissão e retorna o ExpoPushToken, ou o motivo da indisponibilidade.
 * Emuladores / permissão negada / projeto EAS ausente → token null (sem throw).
 */
export async function registerForPushNotificationsAsync(): Promise<PushRegistration> {
  if (!Device.isDevice) {
    // Simulador iOS e emulador Android não recebem push remoto da APNs/FCM.
    return { token: null, reason: 'simulator' };
  }

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return { token: null, reason: 'permission-denied' };
  }

  // O serviço de push da Expo precisa do projectId para achar as credenciais
  // APNs/FCM. Sem ele, getExpoPushTokenAsync falha em build nativo.
  const projectId = resolveEasProjectId();
  if (!projectId) {
    return { token: null, reason: 'missing-project-id' };
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!tokenResponse.data) {
      return { token: null, reason: 'token-error', detail: 'resposta sem token' };
    }
    return { token: tokenResponse.data };
  } catch (error) {
    return {
      token: null,
      reason: 'token-error',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

const UNAVAILABLE_HINTS: Record<PushUnavailableReason, string> = {
  simulator:
    'Simulador/emulador não recebe push remoto. Teste em aparelho físico (ou use sendLocalTestNotification para validar a UI).',
  'permission-denied':
    'Permissão de notificações negada. Ative em Ajustes > Charme & Bela > Notificações.',
  'missing-project-id':
    'Sem EAS projectId. Rode `npx eas init` no diretório mobile e refaça o build — sem isso o Expo não emite push token.',
  'token-error': 'Falha ao obter o Expo push token.',
};

/** Salva o token no backend para o usuário logado. */
export async function syncPushTokenToBackend(userId: string): Promise<void> {
  const result = await registerForPushNotificationsAsync();
  if (result.token === null) {
    console.log(
      `[push] Token não obtido (${result.reason}): ${UNAVAILABLE_HINTS[result.reason]}` +
        (result.detail ? ` — ${result.detail}` : ''),
    );
    return;
  }
  try {
    await updateUser(userId, { expoPushToken: result.token });
    if (__DEV__) {
      console.log(`[push] Token registrado: ${result.token}`);
    }
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

/** Payload que o backend envia em `data` (ver backend/src/utils/expoPush.ts). */
export type PushPayload = {
  notificationId?: string;
  type?: string;
  actionUrl?: string | null;
};

function readPayload(request: Notifications.NotificationRequest): PushPayload {
  return (request.content.data ?? {}) as PushPayload;
}

/**
 * Assina os eventos de push: chegada em foreground e toque na notificação
 * (inclusive quando o app estava fechado).
 */
export function usePushNotificationHandlers(handlers: {
  onReceived?: (payload: PushPayload) => void;
  onOpened?: (payload: PushPayload) => void;
}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      handlersRef.current.onReceived?.(readPayload(notification.request));
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handlersRef.current.onOpened?.(readPayload(response.notification.request));
    });

    // App aberto a partir de um push com o processo encerrado: o toque já
    // aconteceu antes do listener existir.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handlersRef.current.onOpened?.(readPayload(response.notification.request));
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);
}

/**
 * Dispara uma notificação local — único jeito de validar a UI de notificação
 * no simulador, onde push remoto não funciona.
 */
export async function sendLocalTestNotification(): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    if (requested.status !== 'granted') {
      console.log('[push] Teste local abortado: permissão negada');
      return;
    }
  }
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Teste de notificação 🔔',
      body: 'Se você está vendo isso, o handler de notificações está funcionando.',
      data: { type: 'SYSTEM_MESSAGE', actionUrl: '/cliente/agenda' } satisfies PushPayload,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
  });
}
