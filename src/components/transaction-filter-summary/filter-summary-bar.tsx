import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import {
  formatFilterSummaryMoney,
  type TransactionFilterSummary,
} from './filter-summary-formatters';

type FilterSummaryBarProps = {
  summary: TransactionFilterSummary;
};

export function FilterSummaryBar({ summary }: FilterSummaryBarProps) {
  const theme = useTheme();
  const netColor =
    summary.net > 0
      ? AppPalette.incomeGreen
      : summary.net < 0
        ? AppPalette.brandOrange
        : theme.text;

  return (
    <ThemedView type="backgroundSelected" style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold" style={styles.title}>
          Resultado filtrado
        </ThemedText>
      </View>
      <View style={styles.metricRow}>
        <SummaryMetric
          color={AppPalette.incomeGreen}
          label="Ingresos"
          value={summary.income}
        />
        <SummaryMetric
          color={AppPalette.brandOrange}
          label="Egresos"
          value={summary.expense}
        />
        <SummaryMetric color={netColor} label="Neto" value={summary.net} />
      </View>
    </ThemedView>
  );
}

function SummaryMetric({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
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
        $ {formatFilterSummaryMoney(value)}
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    flexDirection: 'row',
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
