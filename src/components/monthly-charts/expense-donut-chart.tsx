import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTranslation } from '@/i18n/localization-provider';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ChartCard } from './chart-card';
import { type CategoryChartPoint, getTopCategoriesWithOther } from './chart-formatters';
import { ChartLegend } from './chart-legend';

const DONUT_CHART_SIZE = 168;
const DONUT_CHART_STROKE_WIDTH = 36;

type ExpenseDonutChartProps = {
  data: CategoryChartPoint[];
  total: number;
};

export function ExpenseDonutChart({ data, total }: ExpenseDonutChartProps) {
  const { t } = useTranslation();
  const pieData = getTopCategoriesWithOther(data, 5, t('charts.other'));

  return (
    <ChartCard title={t('charts.expensesByCategory')}>
      <View style={styles.row}>
        <DonutChart data={pieData} total={total} />
        <ChartLegend data={pieData} total={total} />
      </View>
    </ChartCard>
  );
}

function DonutChart({ data, total }: ExpenseDonutChartProps) {
  const theme = useTheme();
  const center = DONUT_CHART_SIZE / 2;
  const radius = (DONUT_CHART_SIZE - DONUT_CHART_STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  return (
    <View style={styles.frame}>
      <Svg
        height={DONUT_CHART_SIZE}
        viewBox={`0 0 ${DONUT_CHART_SIZE} ${DONUT_CHART_SIZE}`}
        width={DONUT_CHART_SIZE}
      >
        <Circle
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          stroke={theme.surface}
          strokeWidth={DONUT_CHART_STROKE_WIDTH}
        />
        <G transform={`rotate(-90 ${center} ${center})`}>
          {data.map((item) => {
            const sliceLength =
              total > 0 ? (item.amount / total) * circumference : 0;
            const dashOffset = -currentOffset;
            currentOffset += sliceLength;

            return (
              <Circle
                key={item.label}
                cx={center}
                cy={center}
                fill="none"
                r={radius}
                stroke={item.color}
                strokeDasharray={[sliceLength, circumference - sliceLength]}
                strokeDashoffset={dashOffset}
                strokeWidth={DONUT_CHART_STROKE_WIDTH}
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  frame: {
    height: DONUT_CHART_SIZE,
    width: DONUT_CHART_SIZE,
  },
});
