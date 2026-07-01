import { useMemo } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppPalette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MonthlySummaryRow } from '@/lib/database';

import { ChartCard } from './chart-card';
import {
  buildAnnualAxisTicks,
  buildAnnualIncomeExpenseSeries,
  formatCompactAmount,
  getAnnualMaxValue,
  type AnnualChartPoint,
} from './chart-formatters';

type AnnualIncomeExpenseBarsProps = {
  monthlySummaries: MonthlySummaryRow[];
  year: number;
};

export function AnnualIncomeExpenseBars({
  monthlySummaries,
  year,
}: AnnualIncomeExpenseBarsProps) {
  const data = useMemo(
    () => buildAnnualIncomeExpenseSeries(monthlySummaries, year),
    [monthlySummaries, year]
  );
  const maxValue = useMemo(() => getAnnualMaxValue(data), [data]);

  if (maxValue === 0) {
    return <AnnualEmptyChart year={year} />;
  }

  const ticks = buildAnnualAxisTicks(maxValue);

  return (
    <ChartCard title={`Ingresos y egresos ${year}`}>
      <AnnualLegend />
      <View style={styles.chartBody}>
        <View style={styles.axis}>
          {ticks.map((tick) => (
            <ThemedText
              key={tick}
              type="small"
              themeColor="textSecondary"
              style={styles.axisLabel}
            >
              {formatCompactAmount(tick)}
            </ThemedText>
          ))}
        </View>
        <View style={styles.plot}>
          <AnnualGrid />
          <View style={styles.months}>
            {data.map((item) => (
              <AnnualMonthBars item={item} key={item.month} maxValue={maxValue} />
            ))}
          </View>
        </View>
      </View>
    </ChartCard>
  );
}

function AnnualEmptyChart({ year }: { year: number }) {
  return (
    <ChartCard title={`Ingresos y egresos ${year}`}>
      <ThemedText themeColor="textSecondary" style={styles.emptyText}>
        Sin movimientos en {year}.
      </ThemedText>
    </ChartCard>
  );
}

function AnnualLegend() {
  return (
    <View style={styles.legend}>
      <LegendItem color={AppPalette.incomeGreen} label="Ingresos" />
      <LegendItem color={AppPalette.brandOrange} label="Egresos" />
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function AnnualGrid() {
  const theme = useTheme();

  return (
    <View pointerEvents="none" style={styles.grid}>
      {[0, 1, 2, 3].map((line) => (
        <View
          key={line}
          style={[styles.gridLine, { backgroundColor: theme.background }]}
        />
      ))}
    </View>
  );
}

function AnnualMonthBars({
  item,
  maxValue,
}: {
  item: AnnualChartPoint;
  maxValue: number;
}) {
  const incomeHeight = getBarHeight(item.income, maxValue);
  const expenseHeight = getBarHeight(item.expense, maxValue);

  return (
    <View style={styles.monthGroup}>
      <View style={styles.barGroup}>
        <View
          accessibilityLabel={`${item.label} ingresos ${formatCompactAmount(item.income)}`}
          style={[
            styles.monthBar,
            { backgroundColor: AppPalette.incomeGreen, height: incomeHeight },
          ]}
        />
        <View
          accessibilityLabel={`${item.label} egresos ${formatCompactAmount(item.expense)}`}
          style={[
            styles.monthBar,
            { backgroundColor: AppPalette.brandOrange, height: expenseHeight },
          ]}
        />
      </View>
      <ThemedText
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        numberOfLines={1}
        type="small"
        themeColor="textSecondary"
        style={styles.monthLabel}
      >
        {item.label}
      </ThemedText>
    </View>
  );
}

function getBarHeight(value: number, maxValue: number): DimensionValue {
  if (value <= 0 || maxValue <= 0) {
    return '0%';
  }

  return `${Math.max((value / maxValue) * 100, 4)}%`;
}

const styles = StyleSheet.create({
  emptyText: {
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  legendSwatch: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  chartBody: {
    flexDirection: 'row',
    gap: Spacing.one,
    minHeight: 216,
  },
  axis: {
    justifyContent: 'space-between',
    paddingBottom: 22,
    width: 36,
  },
  axisLabel: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'right',
  },
  plot: {
    flex: 1,
    minWidth: 0,
  },
  grid: {
    bottom: 22,
    justifyContent: 'space-between',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  gridLine: {
    height: 1,
    opacity: 0.72,
    width: '100%',
  },
  months: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
  },
  monthGroup: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.one,
    minWidth: 0,
  },
  barGroup: {
    alignItems: 'flex-end',
    flex: 1,
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    minHeight: 172,
    width: '100%',
  },
  monthBar: {
    borderRadius: 4,
    minWidth: 4,
    width: 7,
  },
  monthLabel: {
    fontSize: 9,
    includeFontPadding: false,
    lineHeight: 12,
    minHeight: 12,
    textAlign: 'center',
    width: '100%',
  },
});
