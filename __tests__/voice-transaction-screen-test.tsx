import { fireEvent, render, screen } from "@testing-library/react-native";

import { VoiceTransactionScreen } from "@/components/voice-transaction-screen.native";

let mockArtifactsReady = false;
const mockDownload = jest.fn();
const mockLoadModel = jest.fn();
const mockRequestPermission = jest.fn();
const mockStream = { start: jest.fn(), stop: jest.fn() };

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    canGoBack: () => true,
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({}),
}));

jest.mock("expo-audio", () => ({
  requestRecordingPermissionsAsync: () => mockRequestPermission(),
  useAudioStream: () => ({ stream: mockStream }),
}));

jest.mock("@/components/app-icon", () => {
  const { View } = jest.requireActual("react-native");
  return { AppIcon: () => <View /> };
});

jest.mock("@/components/transaction-editor-screen", () => ({
  TransactionEditorScreen: () => null,
}));

jest.mock("@/lib/ai/local-model.native", () => ({
  cancelLocalInference: jest.fn().mockResolvedValue(undefined),
  cancelLocalModelDownload: jest.fn(),
  deleteLocalModelArtifacts: jest.fn().mockResolvedValue(undefined),
  deleteVoiceTemporaryFile: jest.fn(),
  downloadAndVerifyLocalModelArtifacts: (...args: unknown[]) => mockDownload(...args),
  inspectLocalModelArtifacts: () => [{ present: mockArtifactsReady }],
  loadLocalModel: () => mockLoadModel(),
  runLocalAudioTransactionExtraction: jest.fn(),
  saveVoiceWav: jest.fn(),
  stopAndReleaseLocalModel: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/hooks/use-cashio-data", () => ({
  useCashioData: () => ({ accounts: [], categories: [], tags: [] }),
}));

jest.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    border: "#ccc",
    danger: "#c00",
    onPrimary: "#000",
    primary: "#f70",
    primaryPressed: "#e60",
    surfaceMuted: "#eee",
    surfaceRaised: "#fff",
    text: "#000",
    textSecondary: "#666",
  }),
}));

jest.mock("@/i18n/localization-provider", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("VoiceTransactionScreen", () => {
  beforeEach(() => {
    mockArtifactsReady = false;
    mockDownload.mockReset();
    mockLoadModel.mockReset();
    mockRequestPermission.mockReset();
    mockStream.start.mockReset();
    mockStream.stop.mockReset();
  });

  test("requires an explicit model download and keeps manual entry available", async () => {
    mockDownload.mockResolvedValue([{ present: true }]);
    await render(<VoiceTransactionScreen />);

    expect(
      screen.getByRole("button", { name: "voiceTransaction.downloadModel" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "voiceTransaction.manualEntry" }),
    ).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "voiceTransaction.downloadModel" }),
    );

    expect(await screen.findByText("voiceTransaction.ready")).toBeOnTheScreen();
  });

  test("shows a recoverable error when microphone permission is denied", async () => {
    mockArtifactsReady = true;
    mockLoadModel.mockResolvedValue({ multimodalSupport: { audio: true } });
    mockRequestPermission.mockResolvedValue({ granted: false });
    await render(<VoiceTransactionScreen />);

    await fireEvent.press(
      screen.getByRole("button", { name: "voiceTransaction.startRecording" }),
    );

    expect(
      await screen.findByText("voiceTransaction.microphoneDenied"),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "voiceTransaction.manualEntry" }),
    ).toBeOnTheScreen();
  });
});
