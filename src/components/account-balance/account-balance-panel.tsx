import { StyleSheet, View } from "react-native";
import { useTranslation } from "@/i18n/localization-provider";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppPalette, Spacing } from "@/constants/theme";
import { useLocalization } from "@/i18n/localization-provider";
import type { AccountBalanceRow } from "@/lib/database";

import { buildBalanceTotals, formatBalanceMoney } from "./balance-formatters";

type AccountBalancePanelProps = {
  rows: AccountBalanceRow[];
};

export function AccountBalancePanel({ rows }: AccountBalancePanelProps) {
  const { languageTag } = useLocalization();
  const { t } = useTranslation();
  const totals = buildBalanceTotals(rows, t("common.total"));

  if (rows.length === 0) {
    return (
      <ThemedView style={styles.emptyState}>
        <ThemedText type="subtitle">{t("balance.noAccounts")}</ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.emptyText}
        >
          {t("balance.noAccountsDescription")}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.rows}>
        {rows.map((row) => (
          <AccountBalanceCard key={row.account_id} locale={languageTag} row={row} />
        ))}
      </View>

      <ThemedView type="backgroundSelected" style={styles.totalCard}>
        <AccountBalanceContent locale={languageTag} row={totals} />
      </ThemedView>
    </View>
  );
}

function AccountBalanceCard({ locale, row }: { locale: string; row: AccountBalanceRow }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <AccountBalanceContent locale={locale} row={row} />
    </ThemedView>
  );
}

function AccountBalanceContent({ locale, row }: { locale: string; row: AccountBalanceRow }) {
  const { t } = useTranslation();
  return (
    <View style={styles.cardContent}>
      <View style={styles.cardHeader}>
        <View style={styles.accountTitleRow}>
          <ThemedText type="smallBold" style={styles.accountName}>
            {row.account_name}
          </ThemedText>
          {row.is_default === 1 && (
            <ThemedText
              numberOfLines={1}
              type="smallBold"
              themeColor="textSecondary"
              style={styles.defaultLabel}
            >
              {t("admin.defaultAccount")}
            </ThemedText>
          )}
        </View>
        <ThemedText type="subtitle" style={styles.balanceAmount}>
          $ {formatBalanceMoney(row.balance_total, locale)}
        </ThemedText>
      </View>

      <View style={styles.metricGrid}>
        <BalanceMetric
          label={t("balance.income")}
          locale={locale}
          tone="income"
          value={row.income_total}
        />
        <BalanceMetric
          label={t("balance.expenses")}
          locale={locale}
          tone="expense"
          value={row.expense_total}
        />
        <BalanceMetric
          label={t("balance.incomingTransfers")}
          locale={locale}
          value={row.transfer_in_total}
        />
        <BalanceMetric
          label={t("balance.outgoingTransfers")}
          locale={locale}
          value={row.transfer_out_total}
        />
      </View>
    </View>
  );
}

function BalanceMetric({
  label,
  locale,
  tone,
  value,
}: {
  label: string;
  locale: string;
  tone?: "expense" | "income";
  value: number;
}) {
  const color =
    tone === "income"
      ? AppPalette.incomeGreen
      : tone === "expense"
        ? AppPalette.brandOrange
        : undefined;

  return (
    <View style={styles.metric}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText
        type="smallBold"
        style={[styles.metricValue, color ? { color } : null]}
      >
        $ {formatBalanceMoney(value, locale)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  accountName: {
    fontSize: 18,
    lineHeight: 24,
    minWidth: 0,
  },
  accountTitleRow: {
    alignItems: "baseline",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
    minWidth: 0,
  },
  balanceAmount: {
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  cardContent: {
    gap: Spacing.three,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  defaultLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    gap: Spacing.two,
    justifyContent: "center",
    padding: Spacing.four,
  },
  emptyText: {
    textAlign: "center",
  },
  metric: {
    gap: Spacing.half,
    minWidth: 0,
  },
  metricGrid: {
    columnGap: Spacing.three,
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: Spacing.two,
  },
  metricValue: {
    fontVariant: ["tabular-nums"],
  },
  panel: {
    gap: Spacing.three,
  },
  rows: {
    gap: Spacing.two,
  },
  totalCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
});
