import { getNumberSeparators } from "@/i18n/formatters";

describe("getNumberSeparators", () => {
  it("falls back when formatToParts is unavailable", () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      Intl.NumberFormat.prototype,
      "formatToParts",
    );

    Object.defineProperty(Intl.NumberFormat.prototype, "formatToParts", {
      configurable: true,
      value: undefined,
    });

    try {
      expect(getNumberSeparators("en-US")).toEqual({
        delimiter: ",",
        separator: ".",
      });
      expect(getNumberSeparators("pt-BR")).toEqual({
        delimiter: ".",
        separator: ",",
      });
    } finally {
      if (descriptor) {
        Object.defineProperty(
          Intl.NumberFormat.prototype,
          "formatToParts",
          descriptor,
        );
      }
    }
  });
});
