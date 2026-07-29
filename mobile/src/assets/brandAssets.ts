/**
 * Assets de marca (versões otimizadas em mobile/assets).
 * logo-mark = flor com fundo transparente (uso em UI).
 */
export const logoSource = require('../../assets/logo-mark.png');
export const heroAutocuidadoSource = require('../../assets/hero-autocuidado.jpg');

/** Prefetch das imagens pesadas do onboarding antes de mostrar a UI. */
export async function preloadOnboardingAssets() {
  const { Asset } = await import('expo-asset');
  await Asset.loadAsync([logoSource, heroAutocuidadoSource]);
}
