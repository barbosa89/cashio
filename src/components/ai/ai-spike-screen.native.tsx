import {
  requestRecordingPermissionsAsync,
  useAudioStream,
} from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ControlSize, MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/localization-provider";
import {
  cancelSpikeInference,
  cancelSpikeDownload,
  deleteSpikeTemporaryFile,
  downloadAndVerifySpikeArtifacts,
  inspectSpikeArtifacts,
  loadSpikeModel,
  stopAndReleaseSpikeModel,
  runAudioProbe,
  runImageProbe,
  runTextProbe,
  saveSpikeWav,
  type ArtifactInspection,
  type SpikeDownloadProgress,
} from "@/lib/ai/spike.native";
import { createPcm16Wav } from "@/lib/ai/wav";

const MAX_RECORDING_MS = 30_000;

type BusyAction =
  | "audio"
  | "download"
  | "image"
  | "load"
  | "record"
  | "release"
  | "text"
  | null;

function formatBytes(bytes: number) {
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}

export function AISpikeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [artifacts, setArtifacts] = useState<ArtifactInspection[]>(() =>
    inspectSpikeArtifacts(),
  );
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [downloadProgress, setDownloadProgress] =
    useState<SpikeDownloadProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState("");
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const audioUriRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const systemUiOpenRef = useRef(false);
  const pcmChunksRef = useRef<Uint8Array[]>([]);
  const sampleRateRef = useRef(16_000);
  const channelsRef = useRef(1);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isStreaming, stream } = useAudioStream({
    channels: 1,
    encoding: "int16",
    onBuffer: (buffer) => {
      pcmChunksRef.current.push(new Uint8Array(buffer.data).slice());
      sampleRateRef.current = buffer.sampleRate;
      channelsRef.current = buffer.channels;
    },
    sampleRate: 16_000,
  });
  const allArtifactsPresent =
    artifacts.length > 0 && artifacts.every((artifact) => artifact.present);
  const presentArtifactCount = artifacts.filter((artifact) => artifact.present).length;
  const isInferenceRunning =
    busyAction === "text" || busyAction === "audio" || busyAction === "image";
  const controlsLocked = busyAction !== null || isStreaming;

  useEffect(
    () => {
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active" || systemUiOpenRef.current) {
          return;
        }
        cancelSpikeDownload();
        stream.stop();
        setModelReady(false);
        void stopAndReleaseSpikeModel();
      });

      return () => {
        mountedRef.current = false;
        subscription.remove();
        if (stopTimerRef.current) {
          clearTimeout(stopTimerRef.current);
        }
        cancelSpikeDownload();
        stream.stop();
        deleteSpikeTemporaryFile(audioUriRef.current);
        void stopAndReleaseSpikeModel();
      };
    },
    [stream],
  );

  async function runAction(action: BusyAction, task: () => Promise<unknown>) {
    setBusyAction(action);
    setErrorMessage("");
    try {
      const value = await task();
      if (value !== undefined && mountedRef.current) {
        setResult(JSON.stringify(value, null, 2));
      }
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(
          error instanceof Error ? error.message : t("errors.generic"),
        );
      }
    } finally {
      if (mountedRef.current) {
        if (action === "download") {
          setDownloadProgress(null);
        }
        setBusyAction(null);
        setArtifacts(inspectSpikeArtifacts());
      }
    }
  }

  function handleDownload() {
    void runAction("download", async () => {
      const nextArtifacts = await downloadAndVerifySpikeArtifacts(
        (progress) => {
          if (mountedRef.current) {
            setDownloadProgress(progress);
          }
        },
      );
      return nextArtifacts;
    });
  }

  async function startRecording() {
    setErrorMessage("");
    systemUiOpenRef.current = true;
    let permission;
    try {
      permission = await requestRecordingPermissionsAsync();
    } finally {
      systemUiOpenRef.current = false;
    }
    if (!permission.granted) {
      setErrorMessage(t("aiSpike.microphoneDenied"));
      return;
    }

    deleteSpikeTemporaryFile(audioUri);
    audioUriRef.current = null;
    setAudioUri(null);
    pcmChunksRef.current = [];
    await stream.start();
    stopTimerRef.current = setTimeout(() => {
      stopRecording();
    }, MAX_RECORDING_MS);
  }

  function stopRecording() {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    stream.stop();

    if (pcmChunksRef.current.length === 0) {
      setErrorMessage(t("aiSpike.emptyRecording"));
      return;
    }

    try {
      const wav = createPcm16Wav(
        pcmChunksRef.current,
        sampleRateRef.current,
        channelsRef.current,
      );
      const nextAudioUri = saveSpikeWav(wav);
      audioUriRef.current = nextAudioUri;
      setAudioUri(nextAudioUri);
      pcmChunksRef.current = [];
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.generic"),
      );
    }
  }

  async function pickAndRunImageProbe() {
    systemUiOpenRef.current = true;
    let selection;
    try {
      selection = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        exif: false,
        mediaTypes: "images",
        quality: 0.8,
        selectionLimit: 1,
      });
    } finally {
      systemUiOpenRef.current = false;
    }
    if (selection.canceled || !selection.assets[0]) {
      return undefined;
    }
    return runImageProbe(selection.assets[0].uri);
  }

  async function loadModel() {
    const loadResult = await loadSpikeModel();
    if (mountedRef.current) {
      setModelReady(true);
    }
    return loadResult;
  }

  async function releaseModel() {
    try {
      await stopAndReleaseSpikeModel();
    } finally {
      if (mountedRef.current) {
        setModelReady(false);
      }
    }
  }

  return (
    <ThemedView type="canvas" style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={t("accessibility.backToTransactions")}
              accessibilityRole="button"
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView
                type="surfaceRaised"
                style={[styles.iconButton, { borderColor: theme.border }]}
              >
                <AppIcon color={theme.text} name="arrow-left" size={22} />
              </ThemedView>
            </Pressable>
            <View style={styles.headerCopy}>
              <ThemedText type="title">{t("aiSpike.title")}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t("aiSpike.subtitle")}
              </ThemedText>
            </View>
          </View>

          <ThemedView type="primaryContainer" style={styles.notice}>
            <AppIcon color={theme.primary} name="tool" size={20} />
            <ThemedText type="small" style={styles.noticeCopy}>
              {t("aiSpike.developmentWarning")}
            </ThemedText>
          </ThemedView>

          <ThemedView type="surface" style={styles.panel}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionTitleRow}>
                <AppIcon color={theme.text} name="hard-drive" size={20} />
                <ThemedText type="heading">{t("aiSpike.artifacts")}</ThemedText>
              </View>
              <ThemedView type="surfaceMuted" style={styles.countBadge}>
                <ThemedText type="caption" themeColor="textSecondary">
                  {t("aiSpike.artifactCount", {
                    count: presentArtifactCount,
                    total: artifacts.length,
                  })}
                </ThemedText>
              </ThemedView>
            </View>
            <View style={[styles.artifactList, { borderColor: theme.border }]}>
              {artifacts.map((artifact, index) => (
                <View
                  key={artifact.fileName}
                  style={[
                    styles.artifactRow,
                    index > 0 && {
                      borderTopColor: theme.border,
                      borderTopWidth: 1,
                    },
                  ]}
                >
                  <View style={styles.artifactCopy}>
                    <ThemedText type="smallBold" selectable>
                      {artifact.fileName}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {formatBytes(artifact.byteSize)} /{" "}
                      {formatBytes(artifact.expectedByteSize)}
                    </ThemedText>
                  </View>
                  <View style={styles.statusLabel}>
                    <AppIcon
                      color={artifact.present ? theme.success : theme.warning}
                      name={artifact.present ? "check-circle" : "alert-circle"}
                      size={16}
                    />
                    <ThemedText
                      type="smallBold"
                      themeColor={artifact.present ? "success" : "warning"}
                    >
                      {t(
                        artifact.present
                          ? "aiSpike.present"
                          : "aiSpike.missing",
                      )}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
            {downloadProgress ? (
              <View style={styles.progressBlock}>
                <View
                  accessibilityRole="progressbar"
                  accessibilityValue={{
                    max: 100,
                    min: 0,
                    now: Math.round(downloadProgress.fraction * 100),
                  }}
                  style={[
                    styles.progressTrack,
                    { backgroundColor: theme.surfaceMuted },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: theme.primary,
                        width: `${Math.max(0, Math.min(downloadProgress.fraction, 1)) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <ThemedText type="caption" selectable themeColor="textSecondary">
                  {downloadProgress.artifactFileName} ·{" "}
                  {Math.round(downloadProgress.fraction * 100)}%
                </ThemedText>
              </View>
            ) : null}
            <View style={styles.actions}>
              <SpikeButton
                busy={busyAction === "download"}
                disabled={controlsLocked}
                icon="download-cloud"
                label={
                  busyAction === "download"
                    ? t("aiSpike.downloading")
                    : t("aiSpike.download")
                }
                onPress={handleDownload}
                primary
              />
              {busyAction === "download" ? (
                <SpikeButton
                  icon="x"
                  label={t("common.cancel")}
                  onPress={cancelSpikeDownload}
                />
              ) : null}
            </View>
          </ThemedView>

          <ThemedView type="surface" style={styles.panel}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionTitleRow}>
                <AppIcon color={theme.text} name="cpu" size={20} />
                <ThemedText type="heading">{t("aiSpike.runtime")}</ThemedText>
              </View>
              <View style={styles.statusLabel}>
                <AppIcon
                  color={modelReady ? theme.success : theme.textSecondary}
                  name={modelReady ? "check-circle" : "circle"}
                  size={16}
                />
                <ThemedText
                  type="smallBold"
                  themeColor={modelReady ? "success" : "textSecondary"}
                >
                  {t(
                    modelReady
                      ? "aiSpike.modelStatusReady"
                      : "aiSpike.modelStatusReleased",
                  )}
                </ThemedText>
              </View>
            </View>
            <ThemedText themeColor="textSecondary">
              {t("aiSpike.runtimeDescription")}
            </ThemedText>
            <View style={styles.actionGroup}>
              <ThemedText type="smallBold">
                {t("aiSpike.modelControls")}
              </ThemedText>
              <View style={styles.actions}>
                <SpikeButton
                  busy={busyAction === "load"}
                  disabled={!allArtifactsPresent || controlsLocked || modelReady}
                  icon="play"
                  label={
                    busyAction === "load"
                      ? t("aiSpike.loading")
                      : t("aiSpike.load")
                  }
                  onPress={() => void runAction("load", loadModel)}
                  primary
                />
                <SpikeButton
                  busy={busyAction === "release"}
                  disabled={controlsLocked || !modelReady}
                  icon="power"
                  label={t("aiSpike.release")}
                  onPress={() =>
                    void runAction("release", releaseModel)
                  }
                />
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.actionGroup}>
              <ThemedText type="smallBold">
                {t("aiSpike.probeControls")}
              </ThemedText>
              <SpikeButton
                busy={busyAction === "text"}
                disabled={controlsLocked || !modelReady}
                icon="type"
                label={t("aiSpike.textProbe")}
                onPress={() => void runAction("text", runTextProbe)}
              />
              <View style={styles.actions}>
                <SpikeButton
                  busy={busyAction === "record"}
                  disabled={busyAction !== null}
                  icon={isStreaming ? "square" : "mic"}
                  label={
                    isStreaming
                      ? t("aiSpike.stopRecording")
                      : t("aiSpike.recordAudio")
                  }
                  onPress={() =>
                    isStreaming
                      ? stopRecording()
                      : void runAction("record", startRecording)
                  }
                />
                <SpikeButton
                  busy={busyAction === "audio"}
                  disabled={!audioUri || controlsLocked || !modelReady}
                  icon="volume-2"
                  label={t("aiSpike.audioProbe")}
                  onPress={() =>
                    audioUri
                      ? void runAction("audio", () => runAudioProbe(audioUri))
                      : undefined
                  }
                />
              </View>
              <SpikeButton
                busy={busyAction === "image"}
                disabled={controlsLocked || !modelReady}
                icon="image"
                label={t("aiSpike.imageProbe")}
                onPress={() => void runAction("image", pickAndRunImageProbe)}
              />
              {isInferenceRunning ? (
                <SpikeButton
                  icon="x"
                  label={t("aiSpike.cancelInference")}
                  onPress={() => void cancelSpikeInference()}
                />
              ) : null}
            </View>
          </ThemedView>

          {errorMessage ? (
            <ThemedView
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              type="surfaceMuted"
              style={[styles.message, { borderColor: theme.danger }]}
            >
              <AppIcon color={theme.danger} name="alert-triangle" size={20} />
              <ThemedText selectable style={styles.messageCopy}>
                {errorMessage}
              </ThemedText>
            </ThemedView>
          ) : null}

          {result ? (
            <ThemedView type="surfaceMuted" style={styles.resultPanel}>
              <View style={styles.sectionTitleRow}>
                <AppIcon color={theme.success} name="check-circle" size={20} />
                <ThemedText type="heading">{t("aiSpike.result")}</ThemedText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <ThemedText selectable type="code" style={styles.resultText}>
                  {result}
                </ThemedText>
              </ScrollView>
            </ThemedView>
          ) : null}
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

function SpikeButton({
  busy,
  disabled,
  icon,
  label,
  onPress,
  primary,
}: Readonly<{
  busy?: boolean;
  disabled?: boolean;
  icon: React.ComponentProps<typeof AppIcon>["name"];
  label: string;
  onPress: () => void;
  primary?: boolean;
}>) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonPressable,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <ThemedView
        type={primary ? "primary" : "surfaceMuted"}
        style={styles.button}
      >
        {busy ? (
          <ActivityIndicator color={primary ? theme.onPrimary : theme.text} size="small" />
        ) : (
          <AppIcon
            color={primary ? theme.onPrimary : theme.text}
            name={icon}
            size={18}
          />
        )}
        <ThemedText
          type="smallBold"
          themeColor={primary ? "onPrimary" : "text"}
        >
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  actionGroup: {
    gap: Spacing.two,
  },
  artifactList: {
    borderRadius: Radius.control,
    borderWidth: 1,
    overflow: "hidden",
  },
  artifactCopy: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  artifactRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  button: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Radius.control,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: Platform.OS === "android" ? 48 : 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  buttonPressable: {
    flexBasis: 160,
    flexGrow: 1,
  },
  countBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  container: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: Radius.control,
    borderWidth: 1,
    height: ControlSize.default,
    justifyContent: "center",
    width: ControlSize.default,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  message: {
    alignItems: "flex-start",
    borderLeftWidth: 1,
    borderRadius: Radius.control,
    flexDirection: "row",
    gap: Spacing.two,
    padding: Spacing.three,
  },
  messageCopy: {
    flex: 1,
  },
  notice: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Radius.control,
    flexDirection: "row",
    gap: Spacing.two,
    padding: Spacing.three,
  },
  noticeCopy: {
    flex: 1,
  },
  panel: {
    borderCurve: "continuous",
    borderRadius: Radius.card,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
  progressBlock: {
    gap: Spacing.one,
  },
  progressFill: {
    borderRadius: Radius.pill,
    height: "100%",
  },
  progressTrack: {
    borderRadius: Radius.pill,
    height: 8,
    overflow: "hidden",
  },
  resultPanel: {
    borderCurve: "continuous",
    borderRadius: Radius.card,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  resultText: {
    lineHeight: 20,
    paddingBottom: Spacing.one,
  },
  safeArea: {
    alignSelf: "center",
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: "100%",
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  statusLabel: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.one,
  },
});
