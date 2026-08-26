import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { normalizePersonName } from './userDisplay';

export function isAppleAuthCanceled(error: unknown): boolean {
  const code = String((error as { code?: string })?.code || '');
  return code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED';
}

export function appleAuthErrorMessage(error: unknown): string {
  const code = String((error as { code?: string })?.code || '');
  const message = String((error as { message?: string })?.message || '');

  if (
    code === 'ERR_REQUEST_UNKNOWN' ||
    message.includes('error 1000') ||
    message.includes('AuthorizationError')
  ) {
    return 'A Apple recusou este login (erro 1000). No iPhone, apague o app e instale de novo com npx expo run:ios --device para o build pegar a permissão Sign in with Apple.';
  }

  return message || 'Não foi possível entrar com a Apple. Tente novamente.';
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export function appleAuthNeedsDevBuild(): boolean {
  return Constants.appOwnership === 'expo';
}

async function randomNonce(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function requestAppleIdentity(): Promise<{
  identityToken: string;
  rawNonce: string;
  fullName?: string;
}> {
  const available = await isAppleAuthAvailable();
  if (!available) {
    throw new Error('Login com Apple não está disponível neste dispositivo.');
  }

  const rawNonce = await randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('A Apple não retornou o token de identidade.');
  }

  const fullName = [
    credential.fullName?.namePrefix,
    credential.fullName?.givenName,
    credential.fullName?.middleName,
    credential.fullName?.familyName,
    credential.fullName?.nameSuffix,
  ]
    .map((part) => normalizePersonName(part))
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    identityToken: credential.identityToken,
    rawNonce,
    fullName: fullName || undefined,
  };
}
