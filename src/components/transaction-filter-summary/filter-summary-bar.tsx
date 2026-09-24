import { StyleSheet, View } from "react-native";
import { useTranslation } from "@/i18n/localization-provider";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppPalette, Spacing } from "@/constants/theme";
import { useLocalization } from "@/i18n/localization-provider";

import {
    formatFilterSummaryMoney,
    type TransactionFilterSummary,
} from "./filter-summary-formatters";

type FilterSummaryBarProps = {
  summary: TransactionFilterSummary;
};

export function FilterSummaryBar({ summary }: FilterSummaryBarProps) {
  const { languageTag } = useLocalization();
  const { t } = useTranslation();
  const hasTransfers = summary.transferIn > 0 || summary.transferOut > 0;

  return (
    <ThemedView type="primaryContainer" style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold" style={styles.title}>
          {t("filters.filteredResult")}
        </ThemedText>
      </View>
      <View style={styles.metricRow}>
        <SummaryMetric
          color={AppPalette.incomeGreen}
          label={t("filters.income")}
          locale={languageTag}
          value={summary.income}
        />
        <SummaryMetric
          color={AppPalette.brandOrange}
          label={t("filters.expenses")}
          locale={languageTag}
          value={summary.expense}
        />
      </View>
      {hasTransfers && (
        <View style={styles.metricRow}>
          <SummaryMetric
            color="#3b82f6"
            label={t("balance.incomingTransfers")}
            locale={languageTag}
            value={summary.transferIn}
          />
          <SummaryMetric
            color="#14b8a6"
            label={t("balance.outgoingTransfers")}
            locale={languageTag}
            value={summary.transferOut}
          />
        </View>
      )}
    </ThemedView>
  );
}

function SummaryMetric({
  color,
  label,
  locale,
  value,
}: {
  color: string;
  label: string;
  locale: string;
  value: number;
}) {
  return (
    <View style={styles.metric}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      <ThemedText
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        selectable
        type="smallBold"
        style={[styles.value, { color }]}
      >
        $ {formatFilterSummaryMoney(value, locale)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.two,
    gap: Spacing.one,
    marginBottom: Spacing.two,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
  metric: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  metricRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  title: {
    fontSize: 12,
    lineHeight: 16,
  },
  value: {
    fontSize: 14,
    lineHeight: 18,
  },
});
