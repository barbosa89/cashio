import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import {
  Directory,
  File,
  FileMode,
  Paths,
  type DownloadTask,
} from "expo-file-system";
import {
  getBackendDevicesInfo,
  initLlama,
  type LlamaContext,
  type NativeCompletionResultTimings,
} from "llama.rn";

import {
  LOCAL_AI_SPIKE_DOWNLOAD_BYTES,
  LOCAL_AI_SPIKE_MANIFEST,
  type LocalModelArtifact,
} from "@/lib/ai/model-manifest";
import {
  TRANSACTION_EXTRACTION_SCHEMA,
  parseSpikeTransactionExtraction,
  type SpikeTransactionExtraction,
} from "@/lib/ai/transaction-schema";

const HASH_CHUNK_BYTES = 4 * 1024 * 1024;
const SPIKE_DIRECTORY = new Directory(Paths.cache, "ai-spike");
const DOWNLOAD_DIRECTORY = new Directory(SPIKE_DIRECTORY, "downloads");
const MODEL_DIRECTORY = new Directory(SPIKE_DIRECTORY, "models");
const VERIFICATION_FILE = new File(MODEL_DIRECTORY, "verification.json");

let context: LlamaContext | null = null;
let contextOwner: symbol | null = null;
let activeDownload: DownloadTask | null = null;
let activeDownloadAbort: AbortController | null = null;
let activeDownloadOwner: symbol | null = null;
let activeLoadAbort: AbortController | null = null;
let activeLoadOwner: symbol | null = null;
let loadGeneration = 0;
let releasePromise: Promise<void> = Promise.resolve();
const SPIKE_OWNER = Symbol("ai-spike");

export type LocalModelOwner = symbol;

export type ArtifactInspection = {
  byteSize: number;
  expectedByteSize: number;
  fileName: string;
  present: boolean;
};

export type SpikeDownloadProgress = {
  artifactFileName: string;
  bytesWritten: number;
  fraction: number;
  totalBytes: number;
};

export type SpikeLoadResult = {
  androidLib: LlamaContext["androidLib"];
  backendDevices: Awaited<ReturnType<typeof getBackendDevicesInfo>>;
  devices: LlamaContext["devices"];
  gpu: boolean;
  modelLoadMs: number;
  multimodalLoadMs: number;
  multimodalSupport: { audio: boolean; vision: boolean };
  reasonNoGPU: string;
  systemInfo: string;
};

export type SpikeInferenceResult = {
  elapsedMs: number;
  extraction: SpikeTransactionExtraction;
  rawText: string;
  timings: NativeCompletionResultTimings;
};

function ensureDirectories() {
  SPIKE_DIRECTORY.create({ idempotent: true, intermediates: true });
  DOWNLOAD_DIRECTORY.create({ idempotent: true, intermediates: true });
  MODEL_DIRECTORY.create({ idempotent: true, intermediates: true });
}

function getModelFile(artifact: LocalModelArtifact) {
  return new File(MODEL_DIRECTORY, artifact.fileName);
}

function getPartialFile(artifact: LocalModelArtifact) {
  return new File(DOWNLOAD_DIRECTORY, `${artifact.fileName}.part`);
}

function verificationMetadata() {
  return {
    artifacts: LOCAL_AI_SPIKE_MANIFEST.artifacts.map((artifact) => {
      const file = getModelFile(artifact);
      return {
        byteSize: artifact.byteSize,
        fileName: artifact.fileName,
        modificationTime: file.modificationTime,
        sha256: artifact.sha256,
      };
    }),
    revision: LOCAL_AI_SPIKE_MANIFEST.revision,
  };
}

function hasCurrentVerification() {
  if (!VERIFICATION_FILE.exists) {
    return false;
  }
  try {
    return VERIFICATION_FILE.textSync() === JSON.stringify(verificationMetadata());
  } catch {
    return false;
  }
}

function yieldToUI() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new Error("The spike operation was cancelled.");
  }
}

export async function hashFileSha256(
  file: File,
  onProgress?: (bytesRead: number, totalBytes: number) => void,
  signal?: AbortSignal,
) {
  const hasher = sha256.create();
  const handle = file.open(FileMode.ReadOnly);
  const totalBytes = file.size;
  let bytesRead = 0;

  try {
    while (bytesRead < totalBytes) {
      throwIfAborted(signal);
      const chunk = handle.readBytes(
        Math.min(HASH_CHUNK_BYTES, totalBytes - bytesRead),
      );
      if (chunk.byteLength === 0) {
        throw new Error("The file ended before its reported size.");
      }
      hasher.update(chunk);
      bytesRead += chunk.byteLength;
      onProgress?.(bytesRead, totalBytes);
      await yieldToUI();
    }
  } finally {
    handle.close();
  }

  return bytesToHex(hasher.digest());
}

async function verifyArtifact(
  artifact: LocalModelArtifact,
  file: File,
  onProgress?: (bytesRead: number, totalBytes: number) => void,
  signal?: AbortSignal,
) {
  if (!file.exists || file.size !== artifact.byteSize) {
    return false;
  }

  const digest = await hashFileSha256(file, onProgress, signal);
  return digest.toLowerCase() === artifact.sha256;
}

export function inspectSpikeArtifacts(): ArtifactInspection[] {
  ensureDirectories();
  const verificationIsCurrent = hasCurrentVerification();
  return LOCAL_AI_SPIKE_MANIFEST.artifacts.map((artifact) => {
    const file = getModelFile(artifact);
    return {
      byteSize: file.exists ? file.size : 0,
      expectedByteSize: artifact.byteSize,
      fileName: artifact.fileName,
      present:
        verificationIsCurrent &&
        file.exists &&
        file.size === artifact.byteSize,
    };
  });
}

export async function downloadAndVerifySpikeArtifacts(
  onProgress: (progress: SpikeDownloadProgress) => void,
  owner: LocalModelOwner = SPIKE_OWNER,
) {
  ensureDirectories();
  if (activeDownloadAbort) {
    throw new Error("A model artifact operation is already in progress.");
  }
  const abortController = new AbortController();
  activeDownloadAbort = abortController;
  activeDownloadOwner = owner;
  let completedBytes = 0;

  try {
    if (VERIFICATION_FILE.exists) {
      VERIFICATION_FILE.delete();
    }
    for (const artifact of LOCAL_AI_SPIKE_MANIFEST.artifacts) {
      throwIfAborted(abortController.signal);
      const installedFile = getModelFile(artifact);
      const installedIsValid = await verifyArtifact(
        artifact,
        installedFile,
        (bytesRead) => {
          onProgress({
            artifactFileName: artifact.fileName,
            bytesWritten: completedBytes + bytesRead,
            fraction:
              (completedBytes + bytesRead) / LOCAL_AI_SPIKE_DOWNLOAD_BYTES,
            totalBytes: LOCAL_AI_SPIKE_DOWNLOAD_BYTES,
          });
        },
        abortController.signal,
      );
      if (installedIsValid) {
        completedBytes += artifact.byteSize;
        continue;
      }
      if (installedFile.exists) {
        installedFile.delete();
      }

      const partialFile = getPartialFile(artifact);
      if (partialFile.exists) {
        partialFile.delete();
      }

      const download = File.createDownloadTask(artifact.url, partialFile, {
        sessionType: "background",
        onProgress: ({ bytesWritten }) => {
          onProgress({
            artifactFileName: artifact.fileName,
            bytesWritten: completedBytes + bytesWritten,
            fraction:
              (completedBytes + bytesWritten) / LOCAL_AI_SPIKE_DOWNLOAD_BYTES,
            totalBytes: LOCAL_AI_SPIKE_DOWNLOAD_BYTES,
          });
        },
      });
      activeDownload = download;

      try {
        const downloadedFile = await download.downloadAsync();
        throwIfAborted(abortController.signal);
        if (!downloadedFile) {
          throw new Error("The artifact download was paused.");
        }

        const isValid = await verifyArtifact(
          artifact,
          downloadedFile,
          (bytesRead) => {
            onProgress({
              artifactFileName: artifact.fileName,
              bytesWritten: completedBytes + bytesRead,
              fraction:
                (completedBytes + bytesRead) / LOCAL_AI_SPIKE_DOWNLOAD_BYTES,
              totalBytes: LOCAL_AI_SPIKE_DOWNLOAD_BYTES,
            });
          },
          abortController.signal,
        );
        if (!isValid) {
          downloadedFile.delete();
          throw new Error(
            `Integrity verification failed for ${artifact.fileName}.`,
          );
        }

        await downloadedFile.move(installedFile, { overwrite: true });
        completedBytes += artifact.byteSize;
      } finally {
        download.release();
        if (activeDownload === download) {
          activeDownload = null;
        }
      }
    }
    VERIFICATION_FILE.create({ overwrite: true, intermediates: true });
    VERIFICATION_FILE.write(JSON.stringify(verificationMetadata()));
  } finally {
    if (activeDownloadAbort === abortController) {
      activeDownloadAbort = null;
      activeDownloadOwner = null;
    }
  }

  return inspectSpikeArtifacts();
}

export function cancelSpikeDownload(owner: LocalModelOwner = SPIKE_OWNER) {
  if (activeDownloadOwner === owner) {
    activeDownloadAbort?.abort();
    activeDownload?.cancel();
  }
}

export async function loadSpikeModel(
  owner: LocalModelOwner = SPIKE_OWNER,
): Promise<SpikeLoadResult> {
  if (activeLoadOwner) {
    throw new Error("A model load is already in progress.");
  }
  if (context && contextOwner !== owner) {
    throw new Error("The local model is in use by another operation.");
  }
  const generation = ++loadGeneration;
  activeLoadAbort?.abort();
  const loadAbort = new AbortController();
  activeLoadAbort = loadAbort;
  activeLoadOwner = owner;
  if (context) {
    const previousContext = context;
    context = null;
    contextOwner = null;
    const release = previousContext.release();
    releasePromise = release.catch(() => undefined);
    try {
      await release;
    } catch (error) {
      if (activeLoadOwner === owner) activeLoadOwner = null;
      throw error;
    }
  }
  await releasePromise;

  const [modelArtifact, projectorArtifact] = LOCAL_AI_SPIKE_MANIFEST.artifacts;
  const modelFile = getModelFile(modelArtifact);
  const projectorFile = getModelFile(projectorArtifact);
  throwIfAborted(loadAbort.signal);
  let artifactsAreValid: boolean;
  try {
    artifactsAreValid = inspectSpikeArtifacts().every(
      (artifact) => artifact.present,
    );
  } catch (error) {
    if (activeLoadOwner === owner) activeLoadOwner = null;
    throw error;
  }
  if (activeLoadAbort === loadAbort) {
    activeLoadAbort = null;
  }
  if (generation !== loadGeneration) {
    if (activeLoadOwner === owner) activeLoadOwner = null;
    throw new Error("Model loading was cancelled.");
  }
  if (
    !modelFile.exists ||
    !projectorFile.exists ||
    !artifactsAreValid
  ) {
    if (activeLoadOwner === owner) activeLoadOwner = null;
    throw new Error("Download and verify both model artifacts first.");
  }

  let backendDevices: Awaited<ReturnType<typeof getBackendDevicesInfo>>;
  try {
    backendDevices = await getBackendDevicesInfo();
  } catch (error) {
    if (activeLoadOwner === owner) activeLoadOwner = null;
    throw error;
  }
  if (generation !== loadGeneration) {
    if (activeLoadOwner === owner) activeLoadOwner = null;
    throw new Error("Model loading was cancelled.");
  }
  const modelStartedAt = performance.now();
  let nextContext: LlamaContext;
  try {
    nextContext = await initLlama({
      model: modelFile.uri,
      ctx_shift: false,
      n_ctx: 4096,
      n_gpu_layers: 99,
      no_extra_bufts: true,
      use_mmap: true,
      use_mlock: false,
    });
  } catch (error) {
    if (activeLoadOwner === owner) activeLoadOwner = null;
    throw error;
  }
  const modelLoadMs = performance.now() - modelStartedAt;
  if (generation !== loadGeneration) {
    if (activeLoadOwner === owner) activeLoadOwner = null;
    await nextContext.release();
    throw new Error("Model loading was cancelled.");
  }

  try {
    const multimodalStartedAt = performance.now();
    const multimodalInitialized = await nextContext.initMultimodal({
      path: projectorFile.uri,
      use_gpu: true,
      image_min_tokens: 70,
      image_max_tokens: 280,
    });
    const multimodalLoadMs = performance.now() - multimodalStartedAt;
    if (!multimodalInitialized) {
      throw new Error("llama.rn could not initialize the multimodal projector.");
    }

    const multimodalSupport = await nextContext.getMultimodalSupport();
    if (generation !== loadGeneration) {
      throw new Error("Model loading was cancelled.");
    }
    context = nextContext;
    contextOwner = owner;
    activeLoadOwner = null;
    return {
      androidLib: nextContext.androidLib,
      backendDevices,
      devices: nextContext.devices,
      gpu: nextContext.gpu,
      modelLoadMs,
      multimodalLoadMs,
      multimodalSupport,
      reasonNoGPU: nextContext.reasonNoGPU,
      systemInfo: nextContext.systemInfo,
    };
  } catch (error) {
    if (activeLoadOwner === owner) {
      activeLoadOwner = null;
    }
    await nextContext.release();
    throw error;
  }
}

function requireContext(owner: LocalModelOwner = SPIKE_OWNER) {
  if (!context || contextOwner !== owner) {
    throw new Error("Load the model before running an inference probe.");
  }
  return context;
}

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function runExtraction(
  messages: Parameters<LlamaContext["completion"]>[0]["messages"],
  owner: LocalModelOwner = SPIKE_OWNER,
): Promise<SpikeInferenceResult> {
  const activeContext = requireContext(owner);
  await activeContext.clearCache();
  const startedAt = performance.now();
  const result = await activeContext.completion({
    messages,
    enable_thinking: false,
    n_predict: 160,
    response_format: {
      type: "json_schema",
      json_schema: {
        strict: true,
        schema: TRANSACTION_EXTRACTION_SCHEMA,
      },
    },
    seed: 42,
    temperature: 0,
  });
  const elapsedMs = performance.now() - startedAt;
  const rawText = (result.content || result.text).trim();

  return {
    elapsedMs,
    extraction: parseSpikeTransactionExtraction(rawText),
    rawText,
    timings: result.timings,
  };
}

function extractionInstruction() {
  return [
    "Extract exactly one income, expense, or transfer from the user's input.",
    `Today is ${localDate()} in the device local time zone.`,
    "Return spoken account, destination account, category, tag, and currency names verbatim; never invent IDs.",
    "Set detectedEntryCount to 0, 1, or 2, where 2 means two or more entries.",
    "Return only the JSON object required by the response schema.",
    "Do not invent missing values; use null or an empty description.",
  ].join(" ");
}

export function runTextProbe() {
  return runExtraction([
    { role: "system", content: extractionInstruction() },
    {
      role: "user",
      content: "I spent 25000 at the supermarket today.",
    },
  ]);
}

export function runAudioProbe(audioUri: string) {
  return runAudioTransactionExtraction(audioUri);
}

export function runAudioTransactionExtraction(
  audioUri: string,
  owner: LocalModelOwner = SPIKE_OWNER,
) {
  return runExtraction([
    { role: "system", content: extractionInstruction() },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Extract the transaction spoken in this audio.",
        },
        {
          type: "input_audio",
          input_audio: { format: "wav", url: audioUri },
        },
      ],
    },
  ], owner);
}

export function runImageProbe(imageUri: string) {
  return runExtraction([
    { role: "system", content: extractionInstruction() },
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: imageUri } },
        {
          type: "text",
          text: "Extract the total transaction shown in this receipt image.",
        },
      ],
    },
  ]);
}

export async function releaseSpikeModel(
  owner: LocalModelOwner = SPIKE_OWNER,
) {
  if (
    (context && contextOwner !== owner) ||
    (!context && activeLoadOwner && activeLoadOwner !== owner)
  ) {
    return;
  }
  loadGeneration += 1;
  activeLoadAbort?.abort();
  activeLoadAbort = null;
  activeLoadOwner = null;
  const activeContext = context;
  context = null;
  contextOwner = null;
  if (!activeContext) {
    return;
  }
  const release = activeContext.release();
  releasePromise = release.catch(() => undefined);
  await release;
}

export async function cancelSpikeInference(
  owner: LocalModelOwner = SPIKE_OWNER,
) {
  if (contextOwner === owner) {
    await context?.stopCompletion();
  }
}

export async function stopAndReleaseSpikeModel(
  owner: LocalModelOwner = SPIKE_OWNER,
) {
  if (
    (context && contextOwner !== owner) ||
    (!context && activeLoadOwner && activeLoadOwner !== owner)
  ) {
    return;
  }
  loadGeneration += 1;
  activeLoadAbort?.abort();
  activeLoadAbort = null;
  activeLoadOwner = null;
  const activeContext = context;
  context = null;
  contextOwner = null;
  if (!activeContext) {
    return;
  }

  const release = (async () => {
    try {
      await activeContext.stopCompletion();
    } finally {
      await activeContext.release();
    }
  })();
  releasePromise = release.catch(() => undefined);
  await release;
}

export function saveSpikeWav(bytes: Uint8Array) {
  const output = new File(Paths.cache, `cashio-ai-spike-${Date.now()}.wav`);
  output.create({ overwrite: true, intermediates: true });
  output.write(bytes);
  return output.uri;
}

export function deleteSpikeTemporaryFile(uri: string | null) {
  if (!uri) {
    return;
  }
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}

export async function deleteLocalModelArtifacts(
  owner: LocalModelOwner = SPIKE_OWNER,
) {
  if (
    activeDownloadOwner ||
    (activeLoadOwner && activeLoadOwner !== owner) ||
    (contextOwner && contextOwner !== owner)
  ) {
    throw new Error("The local model is in use by another operation.");
  }
  await stopAndReleaseSpikeModel(owner);
  ensureDirectories();
  for (const artifact of LOCAL_AI_SPIKE_MANIFEST.artifacts) {
    const installed = getModelFile(artifact);
    const partial = getPartialFile(artifact);
    if (installed.exists) installed.delete();
    if (partial.exists) partial.delete();
  }
  if (VERIFICATION_FILE.exists) VERIFICATION_FILE.delete();
}
