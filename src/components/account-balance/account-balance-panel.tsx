import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, Spacing } from '@/constants/theme';
import type { AccountBalanceRow } from '@/lib/database';

import { buildBalanceTotals, formatBalanceMoney } from './balance-formatters';

type AccountBalancePanelProps = {
  monthLabel: string;
  rows: AccountBalanceRow[];
};

export function AccountBalancePanel({ monthLabel, rows }: AccountBalancePanelProps) {
  const totals = buildBalanceTotals(rows);

  if (rows.length === 0) {
    return (
      <ThemedView style={styles.emptyState}>
        <ThemedText type="subtitle">Sin cuentas</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
          Crea una cuenta para ver el balance.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.panel}>
      <ThemedText type="subtitle" style={styles.title}>
        Balance de cuentas
      </ThemedText>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.monthLabel}>
        {monthLabel}
      </ThemedText>

      <View style={styles.rows}>
        {rows.map((row) => (
          <AccountBalanceCard key={row.account_id} row={row} />
        ))}
      </View>

      <ThemedView type="backgroundSelected" style={styles.totalCard}>
        <AccountBalanceContent row={totals} />
      </ThemedView>
    </View>
  );
}

function AccountBalanceCard({ row }: { row: AccountBalanceRow }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <AccountBalanceContent row={row} />
    </ThemedView>
  );
}

function AccountBalanceContent({ row }: { row: AccountBalanceRow }) {
  return (
    <View style={styles.cardContent}>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold" style={styles.accountName}>
          {row.account_name}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.balanceAmount}>
          $ {formatBalanceMoney(row.balance_total)}
        </ThemedText>
      </View>

      <View style={styles.metricGrid}>
        <BalanceMetric label="Ingresos" tone="income" value={row.income_total} />
        <BalanceMetric label="Egresos" tone="expense" value={row.expense_total} />
        <BalanceMetric label="Traslados entran" value={row.transfer_in_total} />
        <BalanceMetric label="Traslados salen" value={row.transfer_out_total} />
      </View>
    </View>
  );
}

function BalanceMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: 'expense' | 'income';
  value: number;
}) {
  const color =
    tone === 'income'
      ? AppPalette.incomeGreen
      : tone === 'expense'
        ? AppPalette.brandOrange
        : undefined;

  return (
    <View style={styles.metric}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={[styles.metricValue, color ? { color } : null]}>
        $ {formatBalanceMoney(value)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  accountName: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    minWidth: 0,
  },
  balanceAmount: {
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  cardContent: {
    gap: Spacing.three,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.two,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
  metric: {
    gap: Spacing.half,
    minWidth: 0,
  },
  metricGrid: {
    columnGap: Spacing.three,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.two,
  },
  metricValue: {
    fontVariant: ['tabular-nums'],
  },
  monthLabel: {
    textAlign: 'center',
  },
  panel: {
    gap: Spacing.three,
  },
  rows: {
    gap: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  totalCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
});
