import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

import { type CategoryChartPoint } from './chart-formatters';

type ChartLegendProps = {
  data: CategoryChartPoint[];
  total: number;
};

export function ChartLegend({ data, total }: ChartLegendProps) {
  return (
    <View style={styles.legend}>
      {data.map((item) => (
        <View key={item.label} style={styles.row}>
          <View style={[styles.swatch, { backgroundColor: item.color }]} />
          <ThemedText type="small" style={styles.label} numberOfLines={1}>
            {item.label}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.value}>
            {total > 0 ? `${Math.round((item.amount / total) * 100)}%` : '0%'}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

export function ChartLegendSwatch({ color }: { color: string }) {
  return <View style={[styles.swatch, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  legend: {
    gap: Spacing.one,
    width: '100%',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 22,
  },
  swatch: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  label: {
    flex: 1,
    minWidth: 0,
  },
  value: {
    minWidth: 42,
    textAlign: 'right',
  },
});
