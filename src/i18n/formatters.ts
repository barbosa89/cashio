const numberFormatters = new Map<string, Intl.NumberFormat>();
const compactNumberFormatters = new Map<string, Intl.NumberFormat>();

export function formatNumber(value: number, locale: string) {
  let formatter = numberFormatters.get(locale);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    numberFormatters.set(locale, formatter);
  }

  return formatter.format(value);
}

export function formatCompactNumber(value: number, locale: string) {
  let formatter = compactNumberFormatters.get(locale);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      compactDisplay: "short",
      maximumFractionDigits: 1,
      notation: "compact",
    });
    compactNumberFormatters.set(locale, formatter);
  }

  return formatter.format(value);
}

export function formatMonthName(
  year: number,
  month: number,
  locale: string,
  format: "long" | "short" = "long",
) {
  return new Intl.DateTimeFormat(locale, { month: format }).format(
    new Date(year, month - 1, 1),
  );
}

export function formatMonthYear(
  year: number,
  month: number,
  locale: string,
) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function capitalizeLocalized(value: string, locale: string) {
  return `${value.charAt(0).toLocaleUpperCase(locale)}${value.slice(1)}`;
}

export function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getNumberSeparators(locale: string) {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return {
    delimiter: parts.find((part) => part.type === "group")?.value ?? ",",
    separator: parts.find((part) => part.type === "decimal")?.value ?? ".",
  };
}
