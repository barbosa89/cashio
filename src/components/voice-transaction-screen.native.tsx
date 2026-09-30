import {
  requestRecordingPermissionsAsync,
  useAudioStream,
} from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { TransactionEditorScreen } from "@/components/transaction-editor-screen";
import {
  ControlSize,
  MaxPhoneContentWidth,
  Radius,
  Spacing,
} from "@/constants/theme";
import { useCashioData } from "@/hooks/use-cashio-data";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/localization-provider";
import {
  cancelLocalInference,
  cancelLocalModelDownload,
  deleteLocalModelArtifacts,
  deleteVoiceTemporaryFile,
  downloadAndVerifyLocalModelArtifacts,
  inspectLocalModelArtifacts,
  loadLocalModel,
  runLocalAudioTransactionExtraction,
  saveVoiceWav,
  stopAndReleaseLocalModel,
  type LocalModelDownloadProgress,
} from "@/lib/ai/local-model.native";
import {
  canReviewTransactionExtraction,
  resolveTransactionDraft,
  type ResolvedTransactionDraft,
} from "@/lib/ai/transaction-draft";
import { createPcm16Wav } from "@/lib/ai/wav";

const MAX_RECORDING_MS = 30_000;
const MODEL_DOWNLOAD_GB = "3.61";

type VoiceState =
  | "idle"
  | "downloading"
  | "preparing"
  | "recording"
  | "processing"
  | "error";

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDuration(milliseconds: number) {
  return `0:${String(Math.floor(milliseconds / 1000)).padStart(2, "0")}`;
}

function isAppInactive() {
  return (
    AppState.currentState === "background" ||
    AppState.currentState === "inactive"
  );
}

function deleteVoiceFileSafely(uri: string | null) {
  try {
    deleteVoiceTemporaryFile(uri);
  } catch {
    // Model and microphone teardown must continue even if cache cleanup fails.
  }
}

export function VoiceTransactionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ accountId?: string }>();
  const { accounts, categories, isLoading, tags } = useCashioData();
  const preferredAccountId = Number(params.accountId);
  const validPreferredAccountId =
    Number.isInteger(preferredAccountId) && preferredAccountId > 0
      ? preferredAccountId
      : null;
  const [artifactsReady, setArtifactsReady] = useState(() =>
    inspectLocalModelArtifacts().every((artifact) => artifact.present),
  );
  const [draft, setDraft] = useState<ResolvedTransactionDraft | null>(null);
  const [downloadProgress, setDownloadProgress] =
    useState<LocalModelDownloadProgress | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const audioUriRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStartedAtRef = useRef(0);
  const pcmChunksRef = useRef<Uint8Array[]>([]);
  const sampleRateRef = useRef(16_000);
  const channelsRef = useRef(1);
  const cancelledRef = useRef(false);
  const downloadCancelledRef = useRef(false);
  const finishingRef = useRef(false);
  const mountedRef = useRef(true);
  const modelOwnerRef = useRef(Symbol("voice-transaction"));
  const operationGenerationRef = useRef(0);
  const translationRef = useRef(t);
  const systemUiOpenRef = useRef(false);
  const { stream } = useAudioStream({
    channels: 1,
    encoding: "int16",
    onBuffer: (buffer) => {
      pcmChunksRef.current.push(new Uint8Array(buffer.data).slice());
      sampleRateRef.current = buffer.sampleRate;
      channelsRef.current = buffer.channels;
    },
    sampleRate: 16_000,
  });

  useEffect(() => {
    translationRef.current = t;
  }, [t]);

  useEffect(() => {
    mountedRef.current = true;
    const subscription = AppState.addEventListener("change", (state) => {
      if (
        state === "active" ||
        (state === "inactive" && systemUiOpenRef.current)
      ) {
        return;
      }
      operationGenerationRef.current += 1;
      clearRecordingTimers();
      cancelledRef.current = true;
      downloadCancelledRef.current = true;
      cancelLocalModelDownload(modelOwnerRef.current);
      stream.stop();
      pcmChunksRef.current = [];
      deleteVoiceFileSafely(audioUriRef.current);
      audioUriRef.current = null;
      void cancelLocalInference(modelOwnerRef.current)
        .catch(() => undefined)
        .finally(() => stopAndReleaseLocalModel(modelOwnerRef.current))
        .catch(() => undefined);
      if (mountedRef.current) {
        setErrorMessage(translationRef.current("voiceTransaction.interrupted"));
        setVoiceState("error");
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.remove();
      clearRecordingTimers();
      operationGenerationRef.current += 1;
      cancelLocalModelDownload(modelOwnerRef.current);
      stream.stop();
      pcmChunksRef.current = [];
      deleteVoiceFileSafely(audioUriRef.current);
      void cancelLocalInference(modelOwnerRef.current)
        .catch(() => undefined)
        .finally(() => stopAndReleaseLocalModel(modelOwnerRef.current))
        .catch(() => undefined);
    };
  }, [stream]);

  function clearRecordingTimers() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    intervalRef.current = null;
    stopTimerRef.current = null;
  }

  function openManualEntry() {
    router.replace({
      pathname: "/new-transaction",
      params: validPreferredAccountId
        ? { accountId: String(validPreferredAccountId) }
        : {},
    });
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  async function handleDownload() {
    const generation = ++operationGenerationRef.current;
    setErrorMessage("");
    downloadCancelledRef.current = false;
    setVoiceState("downloading");
    try {
      const artifacts = await downloadAndVerifyLocalModelArtifacts(
        (progress) => {
          if (
            mountedRef.current &&
            operationGenerationRef.current === generation
          ) {
            setDownloadProgress(progress);
          }
        },
        modelOwnerRef.current,
      );
      if (!mountedRef.current || operationGenerationRef.current !== generation) return;
      setArtifactsReady(artifacts.every((artifact) => artifact.present));
      setDownloadProgress(null);
      setVoiceState("idle");
    } catch {
      if (!mountedRef.current || operationGenerationRef.current !== generation) return;
      setDownloadProgress(null);
      if (downloadCancelledRef.current) {
        setVoiceState("idle");
        return;
      }
      setErrorMessage(t("voiceTransaction.downloadFailed"));
      setVoiceState("error");
    }
  }

  function handleCancelDownload() {
    downloadCancelledRef.current = true;
    cancelLocalModelDownload(modelOwnerRef.current);
  }

  async function handleRemoveModel() {
    setVoiceState("preparing");
    try {
      await deleteLocalModelArtifacts(modelOwnerRef.current);
      if (!mountedRef.current) return;
      setArtifactsReady(false);
      setVoiceState("idle");
    } catch {
      if (!mountedRef.current) return;
      setErrorMessage(t("voiceTransaction.removeFailed"));
      setVoiceState("error");
    }
  }

  async function startRecording() {
    const generation = ++operationGenerationRef.current;
    cancelledRef.current = false;
    setErrorMessage("");
    setVoiceState("preparing");
    try {
      const loadResult = await loadLocalModel(modelOwnerRef.current);
      if (
        !mountedRef.current ||
        generation !== operationGenerationRef.current ||
        isAppInactive()
      ) {
        await stopAndReleaseLocalModel(modelOwnerRef.current);
        return;
      }
      if (!loadResult.multimodalSupport.audio) {
        throw new Error("audio unsupported");
      }
      systemUiOpenRef.current = true;
      let permission;
      try {
        permission = await requestRecordingPermissionsAsync();
      } finally {
        systemUiOpenRef.current = false;
      }
      if (!permission.granted) {
        await stopAndReleaseLocalModel(modelOwnerRef.current);
        setErrorMessage(t("voiceTransaction.microphoneDenied"));
        setVoiceState("error");
        return;
      }

      if (
        !mountedRef.current ||
        generation !== operationGenerationRef.current ||
        isAppInactive()
      ) {
        await stopAndReleaseLocalModel(modelOwnerRef.current);
        return;
      }

      pcmChunksRef.current = [];
      finishingRef.current = false;
      setElapsedMs(0);
      recordingStartedAtRef.current = Date.now();
      await stream.start();
      if (
        !mountedRef.current ||
        generation !== operationGenerationRef.current ||
        isAppInactive()
      ) {
        stream.stop();
        await stopAndReleaseLocalModel(modelOwnerRef.current);
        return;
      }
      setVoiceState("recording");
      intervalRef.current = setInterval(() => {
        setElapsedMs(Date.now() - recordingStartedAtRef.current);
      }, 250);
      stopTimerRef.current = setTimeout(() => {
        void finishRecording();
      }, MAX_RECORDING_MS);
    } catch {
      await stopAndReleaseLocalModel(modelOwnerRef.current).catch(() => undefined);
      pcmChunksRef.current = [];
      if (
        !mountedRef.current ||
        cancelledRef.current ||
        generation !== operationGenerationRef.current
      ) {
        return;
      }
      setArtifactsReady(
        inspectLocalModelArtifacts().every((artifact) => artifact.present),
      );
      setErrorMessage(t("voiceTransaction.modelLoadFailed"));
      setVoiceState("error");
    }
  }

  async function finishRecording() {
    if (finishingRef.current) return;
    finishingRef.current = true;
    clearRecordingTimers();
    stream.stop();
    setVoiceState("processing");
    if (pcmChunksRef.current.length === 0) {
      await stopAndReleaseLocalModel(modelOwnerRef.current).catch(() => undefined);
      finishingRef.current = false;
      if (mountedRef.current) {
        setErrorMessage(t("voiceTransaction.emptyRecording"));
        setVoiceState("error");
      }
      return;
    }

    const generation = operationGenerationRef.current;
    try {
      const wav = createPcm16Wav(
        pcmChunksRef.current,
        sampleRateRef.current,
        channelsRef.current,
      );
      const audioUri = saveVoiceWav(wav);
      audioUriRef.current = audioUri;
      pcmChunksRef.current = [];
      const result = await runLocalAudioTransactionExtraction(
        audioUri,
        modelOwnerRef.current,
      );
      if (
        cancelledRef.current ||
        generation !== operationGenerationRef.current
      ) {
        return;
      }
      if (!canReviewTransactionExtraction(result.extraction)) {
        throw new Error("The recording did not contain one complete transaction.");
      }
      const nextDraft = resolveTransactionDraft(
        result.extraction,
        { accounts, categories, tags },
        { today: localDate() },
      );
      if (
        mountedRef.current &&
        !cancelledRef.current &&
        generation === operationGenerationRef.current
      ) {
        setDraft(nextDraft);
      }
    } catch {
      if (mountedRef.current && !cancelledRef.current) {
        setErrorMessage(t("voiceTransaction.processingFailed"));
        setVoiceState("error");
      }
    } finally {
      try {
        deleteVoiceFileSafely(audioUriRef.current);
      } finally {
        audioUriRef.current = null;
        pcmChunksRef.current = [];
        await stopAndReleaseLocalModel(modelOwnerRef.current).catch(() => undefined);
        finishingRef.current = false;
      }
    }
  }

  async function cancelProcessing() {
    operationGenerationRef.current += 1;
    cancelledRef.current = true;
    await cancelLocalInference(modelOwnerRef.current).catch(() => undefined);
    deleteVoiceFileSafely(audioUriRef.current);
    audioUriRef.current = null;
    pcmChunksRef.current = [];
    await stopAndReleaseLocalModel(modelOwnerRef.current).catch(() => undefined);
    if (!mountedRef.current) return;
    setErrorMessage(t("voiceTransaction.cancelled"));
    setVoiceState("error");
  }

  if (draft) {
    const warningMessages = draft.warnings.map((warning) =>
      t(`voiceTransaction.warning.${warning}`),
    );
    const reviewNotice =
      warningMessages.length > 0
        ? `${t("voiceTransaction.reviewNeedsAttention")}\n${warningMessages.map((message) => `- ${message}`).join("\n")}`
        : t("voiceTransaction.reviewComplete");

    return (
      <TransactionEditorScreen
        formKey="voice-draft"
        initialValues={draft.values}
        onSaved={() => router.replace("/")}
        reviewNotice={reviewNotice}
        title={t("voiceTransaction.reviewTitle")}
      />
    );
  }

  const isDownloading = voiceState === "downloading";
  const isPreparing = voiceState === "preparing";
  const isProcessing = voiceState === "processing";
  const isRecording = voiceState === "recording";
  const statusTitle = isRecording
    ? t("voiceTransaction.listening")
    : isProcessing
      ? t("voiceTransaction.processing")
      : isPreparing
        ? t("voiceTransaction.preparing")
        : artifactsReady
          ? t("voiceTransaction.ready")
          : t("voiceTransaction.setupTitle");
  const statusDescription = isRecording
    ? t("voiceTransaction.listeningHint")
    : isProcessing
      ? t("voiceTransaction.processingHint")
      : artifactsReady
        ? t("voiceTransaction.readyHint")
        : t("voiceTransaction.setupDescription", { size: MODEL_DOWNLOAD_GB });

  return (
    <ThemedView type="canvas" style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={t("accessibility.backToTransactions")}
              accessibilityRole="button"
              onPress={goBack}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView
                type="surface"
                style={[styles.backButton, { borderColor: theme.border }]}
              >
                <AppIcon color={theme.text} name="arrow-left" size={22} />
              </ThemedView>
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              {t("voiceTransaction.title")}
            </ThemedText>
          </View>

          <ThemedView type="surface" style={styles.panel}>
            <ThemedView
              type={isRecording ? "primaryContainer" : "surfaceMuted"}
              style={styles.statusIcon}
            >
              {isPreparing || isProcessing ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <AppIcon
                  color={isRecording ? theme.primary : theme.textSecondary}
                  name={isRecording ? "square" : "mic"}
                  size={28}
                />
              )}
            </ThemedView>
            <View style={styles.statusCopy}>
              <ThemedText type="heading" style={styles.centerText}>
                {statusTitle}
              </ThemedText>
              <ThemedText
                themeColor="textSecondary"
                style={styles.centerText}
              >
                {statusDescription}
              </ThemedText>
            </View>

            {isRecording ? (
              <ThemedText type="title" style={styles.timer}>
                {formatDuration(Math.min(elapsedMs, MAX_RECORDING_MS))}
              </ThemedText>
            ) : null}

            {isDownloading ? (
              <View style={styles.progressGroup}>
                <View
                  accessibilityLabel={t("voiceTransaction.downloadProgress", {
                    percent: Math.round((downloadProgress?.fraction ?? 0) * 100),
                  })}
                  accessibilityRole="progressbar"
                  accessibilityValue={{
                    max: 100,
                    min: 0,
                    now: Math.round((downloadProgress?.fraction ?? 0) * 100),
                  }}
                  style={[styles.progressTrack, { backgroundColor: theme.surfaceMuted }]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: theme.primary,
                        width: `${Math.round((downloadProgress?.fraction ?? 0) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <ThemedText type="caption" themeColor="textSecondary">
                  {t("voiceTransaction.downloadProgress", {
                    percent: Math.round((downloadProgress?.fraction ?? 0) * 100),
                  })}
                </ThemedText>
                <SecondaryButton
                  label={t("common.cancel")}
                  onPress={handleCancelDownload}
                />
              </View>
            ) : !artifactsReady ? (
              <PrimaryButton
                icon="download"
                label={t("voiceTransaction.downloadModel")}
                onPress={() => void handleDownload()}
              />
            ) : isRecording ? (
              <PrimaryButton
                icon="square"
                label={t("voiceTransaction.stopRecording")}
                onPress={() => void finishRecording()}
              />
            ) : isProcessing ? (
              <SecondaryButton
                label={t("voiceTransaction.cancelProcessing")}
                onPress={() => void cancelProcessing()}
              />
            ) : isPreparing ? null : (
              <PrimaryButton
                disabled={isLoading}
                icon="mic"
                label={t("voiceTransaction.startRecording")}
                onPress={() => void startRecording()}
              />
            )}
          </ThemedView>

          {errorMessage ? (
            <ThemedView
              accessibilityLiveRegion="polite"
              type="surfaceMuted"
              style={styles.message}
            >
              <AppIcon color={theme.danger} name="alert-circle" size={20} />
              <ThemedText style={styles.messageText}>{errorMessage}</ThemedText>
            </ThemedView>
          ) : null}

          <View style={styles.secondaryActions}>
            <SecondaryButton
              label={t("voiceTransaction.manualEntry")}
              onPress={openManualEntry}
            />
            {artifactsReady && voiceState === "idle" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void handleRemoveModel()}
                style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
              >
                <ThemedText type="caption" themeColor="textSecondary">
                  {t("voiceTransaction.removeModel")}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

function PrimaryButton({
  disabled,
  icon,
  label,
  onPress,
}: Readonly<{
  disabled?: boolean;
  icon: "download" | "mic" | "square";
  label: string;
  onPress: () => void;
}>) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: pressed ? theme.primaryPressed : theme.primary },
        disabled && styles.disabled,
      ]}
    >
      <AppIcon color={theme.onPrimary} name={icon} size={20} />
      <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: Readonly<{ label: string; onPress: () => void }>) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        { borderColor: theme.border },
        pressed && { backgroundColor: theme.surfaceMuted },
      ]}
    >
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderRadius: Radius.control,
    borderWidth: 1,
    height: ControlSize.default,
    justifyContent: "center",
    width: ControlSize.default,
  },
  centerText: { textAlign: "center" },
  container: { flex: 1 },
  disabled: { opacity: 0.5 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  message: {
    alignItems: "flex-start",
    borderRadius: Radius.control,
    flexDirection: "row",
    gap: Spacing.two,
    padding: Spacing.three,
  },
  messageText: { flex: 1 },
  panel: {
    alignItems: "center",
    borderRadius: Radius.card,
    gap: Spacing.four,
    minHeight: 390,
    padding: Spacing.four,
    paddingTop: Spacing.five,
  },
  pressed: { opacity: 0.7 },
  primaryButton: {
    alignItems: "center",
    borderRadius: Radius.control,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: ControlSize.large,
    paddingHorizontal: Spacing.four,
    width: "100%",
  },
  progressFill: { borderRadius: Radius.pill, height: "100%" },
  progressGroup: { alignItems: "center", gap: Spacing.three, width: "100%" },
  progressTrack: {
    borderRadius: Radius.pill,
    height: 8,
    overflow: "hidden",
    width: "100%",
  },
  safeArea: {
    gap: Spacing.four,
    maxWidth: MaxPhoneContentWidth,
    paddingHorizontal: Spacing.four,
    width: "100%",
  },
  scrollContent: { alignItems: "center", paddingBottom: Spacing.five },
  secondaryActions: { alignItems: "center", gap: Spacing.three },
  secondaryButton: {
    alignItems: "center",
    borderRadius: Radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: ControlSize.default,
    paddingHorizontal: Spacing.four,
  },
  statusCopy: { gap: Spacing.two },
  statusIcon: {
    alignItems: "center",
    borderRadius: Radius.pill,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  textButton: {
    minHeight: ControlSize.compact,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  timer: { fontVariant: ["tabular-nums"], textAlign: "center" },
  title: { flex: 1 },
});
