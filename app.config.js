const { expo } = require("./app.json");

const AI_PROFILES = new Set(["development", "ai-spike", "voice-mvp"]);
const AI_PLUGINS = new Set([
  "expo-asset",
  "expo-audio",
  "expo-image-picker",
  "llama.rn",
]);

module.exports = ({ config }) => {
  const baseConfig = { ...config, ...expo };
  const aiEnabled =
    AI_PROFILES.has(process.env.EAS_BUILD_PROFILE) ||
    process.env.EXPO_PUBLIC_ENABLE_AI_SPIKE === "true" ||
    process.env.EXPO_PUBLIC_ENABLE_VOICE_TRANSACTIONS === "true";

  return {
    ...baseConfig,
    android: aiEnabled
      ? baseConfig.android
      : {
          ...baseConfig.android,
          blockedPermissions: [
            ...(baseConfig.android.blockedPermissions ?? []),
            "android.permission.MODIFY_AUDIO_SETTINGS",
            "android.permission.RECORD_AUDIO",
          ],
        },
    plugins: aiEnabled
      ? baseConfig.plugins
      : baseConfig.plugins.filter((plugin) => {
          const name = Array.isArray(plugin) ? plugin[0] : plugin;
          return !AI_PLUGINS.has(name);
        }),
  };
};
