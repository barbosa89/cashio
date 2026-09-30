type PcmChunk = ArrayBuffer | Uint8Array;

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

export function createPcm16Wav(
  chunks: readonly PcmChunk[],
  sampleRate: number,
  channels: number,
) {
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
    throw new Error("A positive integer sample rate is required.");
  }
  if (!Number.isInteger(channels) || channels <= 0) {
    throw new Error("A positive channel count is required.");
  }

  const normalizedChunks = chunks.map((chunk) =>
    chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk),
  );
  const dataSize = normalizedChunks.reduce(
    (total, chunk) => total + chunk.byteLength,
    0,
  );
  const output = new Uint8Array(44 + dataSize);
  const view = new DataView(output.buffer);
  const bytesPerSample = 2;

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const chunk of normalizedChunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}
