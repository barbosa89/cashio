const AI_PROFILES = new Set(["development", "ai-spike", "voice-mvp"]);

const aiEnabled =
  AI_PROFILES.has(process.env.EAS_BUILD_PROFILE) ||
  process.env.EXPO_PUBLIC_ENABLE_AI_SPIKE === "true" ||
  process.env.EXPO_PUBLIC_ENABLE_VOICE_TRANSACTIONS === "true";

module.exports = {
  dependencies: {
    "llama.rn": aiEnabled
      ? {}
      : {
          platforms: {
            android: null,
            ios: null,
          },
        },
  },
};