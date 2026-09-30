export function isVoiceTransactionEnabled() {
  return __DEV__ || process.env.EXPO_PUBLIC_ENABLE_VOICE_TRANSACTIONS === "true";
}
