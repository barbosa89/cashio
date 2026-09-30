import {
  LOCAL_AI_SPIKE_DOWNLOAD_BYTES,
  LOCAL_AI_SPIKE_MANIFEST,
} from "@/lib/ai/model-manifest";
import { parseSpikeTransactionExtraction } from "@/lib/ai/transaction-schema";
import { createPcm16Wav } from "@/lib/ai/wav";

describe("local AI spike contracts", () => {
  test("pins model artifacts to immutable revisions and hashes", () => {
    expect(LOCAL_AI_SPIKE_MANIFEST.revision).toHaveLength(40);
    expect(LOCAL_AI_SPIKE_MANIFEST.artifacts).toHaveLength(2);
    expect(LOCAL_AI_SPIKE_DOWNLOAD_BYTES).toBe(3_606_025_056);

    for (const artifact of LOCAL_AI_SPIKE_MANIFEST.artifacts) {
      expect(artifact.url).toContain(LOCAL_AI_SPIKE_MANIFEST.revision);
      expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(artifact.byteSize).toBeGreaterThan(0);
    }
  });

  test("validates the constrained extraction result again in application code", () => {
    expect(
      parseSpikeTransactionExtraction(
        JSON.stringify({
          accountName: "Main",
          amount: 25_000,
          categoryName: "Food",
          currencyMention: null,
          destinationAccountName: null,
          detectedEntryCount: 1,
          description: "Supermarket",
          tagNames: [],
          transactionDate: "2026-09-28",
          type: "expense",
        }),
      ),
    ).toEqual({
      accountName: "Main",
      amount: 25_000,
      categoryName: "Food",
      currencyMention: null,
      destinationAccountName: null,
      detectedEntryCount: 1,
      description: "Supermarket",
      tagNames: [],
      transactionDate: "2026-09-28",
      type: "expense",
    });

    expect(() =>
      parseSpikeTransactionExtraction(
        JSON.stringify({
          accountName: null,
          amount: -1,
          categoryName: null,
          currencyMention: null,
          destinationAccountName: null,
          detectedEntryCount: 1,
          description: "Invalid",
          tagNames: [],
          transactionDate: "today",
          type: "expense",
        }),
      ),
    ).toThrow("failed the spike validation");

    expect(() =>
      parseSpikeTransactionExtraction(
        JSON.stringify({
          accountName: null,
          amount: 25_000,
          categoryName: null,
          currencyMention: null,
          destinationAccountName: null,
          detectedEntryCount: 1,
          description: "Supermarket",
          tagNames: [],
          transactionDate: "2026-09-28",
          type: "expense",
          untrusted: true,
        }),
      ),
    ).toThrow("failed the spike validation");

    expect(() =>
      parseSpikeTransactionExtraction(
        JSON.stringify({
          amount: 25_000,
          description: "Supermarket",
          type: "expense",
        }),
      ),
    ).toThrow("failed the spike validation");
  });

  test("wraps captured PCM16 bytes in a valid little-endian WAV container", () => {
    const wav = createPcm16Wav(
      [new Uint8Array([0, 0, 255, 127]), new Uint8Array([0, 128])],
      16_000,
      1,
    );
    const view = new DataView(wav.buffer);
    const ascii = (start: number, length: number) =>
      String.fromCharCode(...wav.slice(start, start + length));

    expect(ascii(0, 4)).toBe("RIFF");
    expect(ascii(8, 4)).toBe("WAVE");
    expect(ascii(36, 4)).toBe("data");
    expect(view.getUint32(4, true)).toBe(42);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(6);
    expect([...wav.slice(44)]).toEqual([0, 0, 255, 127, 0, 128]);
  });
});
