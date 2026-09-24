import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';

type ChartCardProps = {
  children: ReactNode;
  title: string;
};

export function ChartCard({ children, title }: ChartCardProps) {
  return (
    <ThemedView type="surfaceMuted" style={styles.card}>
      <ThemedText type="smallBold" style={styles.title}>
        {title}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  title: {
    fontSize: 16,
    lineHeight: 20,
  },
});
