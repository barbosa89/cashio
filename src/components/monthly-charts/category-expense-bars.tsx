import { StyleSheet, View, type DimensionValue } from 'react-native';
import { useTranslation } from '@/i18n/localization-provider';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLocalization } from '@/i18n/localization-provider';

import { ChartCard } from './chart-card';
import { type CategoryChartPoint, formatMoney } from './chart-formatters';
import { ChartLegendSwatch } from './chart-legend';

type CategoryExpenseBarsProps = {
  data: CategoryChartPoint[];
  total: number;
};

export function CategoryExpenseBars({ data, total }: CategoryExpenseBarsProps) {
  const theme = useTheme();
  const { languageTag } = useLocalization();
  const { t } = useTranslation();
  let maxAmount = 1;

  for (const item of data) {
    if (item.amount > maxAmount) {
      maxAmount = item.amount;
    }
  }

  return (
    <ChartCard title={t('charts.accumulated')}>
      <View style={styles.list}>
        {data.map((item) => {
          const percentage =
            total > 0 ? Math.round((item.amount / total) * 100) : 0;
          const barWidth: DimensionValue = `${Math.max((item.amount / maxAmount) * 100, 4)}%`;

          return (
            <View key={item.label} style={styles.item}>
              <View style={styles.header}>
                <View style={styles.labelWrap}>
                  <ChartLegendSwatch color={item.color} />
                  <ThemedText
                    type="smallBold"
                    style={styles.label}
                    numberOfLines={1}
                  >
                    {item.label}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={styles.amount}>
                  $ {formatMoney(item.amount, languageTag)}
                </ThemedText>
              </View>
              <View style={[styles.track, { backgroundColor: theme.surface }]}>
                <View
                  style={[
                    styles.bar,
                    { backgroundColor: item.color, width: barWidth },
                  ]}
                />
              </View>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.percent}
              >
                {percentage}%
              </ThemedText>
            </View>
          );
        })}
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  item: {
    gap: Spacing.one,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  labelWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    minWidth: 0,
  },
  label: {
    flex: 1,
    minWidth: 0,
  },
  amount: {
    flexShrink: 0,
    textAlign: 'right',
  },
  track: {
    borderRadius: 6,
    height: 10,
    overflow: 'hidden',
    width: '100%',
  },
  bar: {
    borderRadius: 6,
    height: '100%',
  },
  percent: {
    textAlign: 'right',
  },
});
