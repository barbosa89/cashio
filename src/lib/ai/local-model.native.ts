import {
  cancelSpikeInference,
  cancelSpikeDownload,
  deleteLocalModelArtifacts as deleteArtifacts,
  downloadAndVerifySpikeArtifacts,
  loadSpikeModel,
  runAudioTransactionExtraction,
  stopAndReleaseSpikeModel,
  type LocalModelOwner,
} from "@/lib/ai/spike.native";

export {
  deleteSpikeTemporaryFile as deleteVoiceTemporaryFile,
  inspectSpikeArtifacts as inspectLocalModelArtifacts,
  saveSpikeWav as saveVoiceWav,
  type ArtifactInspection as LocalArtifactInspection,
  type SpikeDownloadProgress as LocalModelDownloadProgress,
} from "@/lib/ai/spike.native";

export function cancelLocalModelDownload(owner: LocalModelOwner) {
  return cancelSpikeDownload(owner);
}

export function deleteLocalModelArtifacts(owner: LocalModelOwner) {
  return deleteArtifacts(owner);
}

export function downloadAndVerifyLocalModelArtifacts(
  onProgress: Parameters<typeof downloadAndVerifySpikeArtifacts>[0],
  owner: LocalModelOwner,
) {
  return downloadAndVerifySpikeArtifacts(onProgress, owner);
}

export function cancelLocalInference(owner: LocalModelOwner) {
  return cancelSpikeInference(owner);
}

export function loadLocalModel(owner: LocalModelOwner) {
  return loadSpikeModel(owner);
}

export function runLocalAudioTransactionExtraction(
  audioUri: string,
  owner: LocalModelOwner,
) {
  return runAudioTransactionExtraction(audioUri, owner);
}

export function stopAndReleaseLocalModel(owner: LocalModelOwner) {
  return stopAndReleaseSpikeModel(owner);
}

export type { LocalModelOwner };
