// Metro config do Expo com ajuste necessário para o Firebase JS SDK.
// Sem isto, o Auth quebra em runtime ("Component auth has not been registered yet").
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
