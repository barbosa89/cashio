export type LocalModelArtifact = {
  byteSize: number;
  capability: "multimodal_model" | "multimodal_projector";
  fileName: string;
  id: string;
  license: string;
  sha256: string;
  url: string;
  version: string;
};

const MODEL_REVISION = "66a399f68ddd113b06dff02fca9523e55465d11d";
const MODEL_REPOSITORY = "unsloth/gemma-4-E2B-it-qat-GGUF";
const MODEL_BASE_URL = `https://huggingface.co/${MODEL_REPOSITORY}/resolve/${MODEL_REVISION}`;

export const LOCAL_AI_SPIKE_MANIFEST = {
  id: "gemma-4-e2b-it-qat-q4-k-xl",
  llamaRnVersion: "0.13.0-rc.6",
  repository: MODEL_REPOSITORY,
  revision: MODEL_REVISION,
  artifacts: [
    {
      byteSize: 2_620_370_976,
      capability: "multimodal_model",
      fileName: "gemma-4-E2B-it-qat-UD-Q4_K_XL.gguf",
      id: "gemma-4-e2b-it-qat-q4-k-xl-model",
      license: "Apache-2.0 (model card; legal review required)",
      sha256: "e531007218dfab990486a5de7676a6932d6ea8dea233d1f698d7c21cf8a16889",
      url: `${MODEL_BASE_URL}/gemma-4-E2B-it-qat-UD-Q4_K_XL.gguf?download=true`,
      version: MODEL_REVISION,
    },
    {
      byteSize: 985_654_080,
      capability: "multimodal_projector",
      fileName: "mmproj-F16.gguf",
      id: "gemma-4-e2b-it-qat-mmproj-f16",
      license: "Apache-2.0 (model card; legal review required)",
      sha256: "13c8966d1635d02e6727f27402880614906fa291850c07feda18dbcddf2291b6",
      url: `${MODEL_BASE_URL}/mmproj-F16.gguf?download=true`,
      version: MODEL_REVISION,
    },
  ] satisfies readonly LocalModelArtifact[],
} as const;

export const LOCAL_AI_SPIKE_DOWNLOAD_BYTES =
  LOCAL_AI_SPIKE_MANIFEST.artifacts.reduce(
    (total, artifact) => total + artifact.byteSize,
    0,
  );
