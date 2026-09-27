import { StyleSheet, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { formatMoney } from "@/components/monthly-charts";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  useLocalization,
  useTranslation,
} from "@/i18n/localization-provider";

type BalanceSummaryProps = {
  balance: number;
  expense: number;
  income: number;
  openingBalance: number;
  openingBalanceLabel: string;
  showTransfers: boolean;
  transferIn: number;
  transferOut: number;
  variant?: "compact" | "detailed";
};

export function BalanceSummary({
  balance,
  expense,
  income,
  openingBalance,
  openingBalanceLabel,
  showTransfers,
  transferIn,
  transferOut,
  variant = "detailed",
}: Readonly<BalanceSummaryProps>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { languageTag } = useLocalization();
  const hasTransfers = showTransfers && (transferIn > 0 || transferOut > 0);

  if (variant === "compact") {
    return (
      <View style={styles.summaryWrap}>
        <ThemedView type="surfaceMuted" style={styles.compactPanel}>
          <View style={styles.compactMainRow}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t("dashboard.balance")}
            </ThemedText>
            <ThemedText selectable type="display" style={styles.compactAmount}>
              $ {formatMoney(balance, languageTag)}
            </ThemedText>
          </View>

          <View style={styles.compactMetrics}>
            <SummaryMetric
              label={openingBalanceLabel}
              value={`$ ${formatMoney(openingBalance, languageTag)}`}
            />
            <SummaryMetric
              label={t("balance.income")}
              themeColor="success"
              value={`$ ${formatMoney(income, languageTag)}`}
            />
            <SummaryMetric
              label={t("balance.expenses")}
              themeColor="danger"
              value={`$ ${formatMoney(expense, languageTag)}`}
            />
          </View>

          {hasTransfers ? (
            <View style={[styles.compactTransfers, { borderTopColor: theme.border }]}>
              {transferIn > 0 ? (
                <TransferMetric
                  amount={`$ ${formatMoney(transferIn, languageTag)}`}
                  color={theme.success}
                  icon="arrow-down-left"
                  label={t("balance.incomingTransfers")}
                />
              ) : null}
              {transferOut > 0 ? (
                <TransferMetric
                  amount={`$ ${formatMoney(transferOut, languageTag)}`}
                  color={theme.danger}
                  icon="arrow-up-right"
                  label={t("balance.outgoingTransfers")}
                />
              ) : null}
            </View>
          ) : null}
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={styles.summaryWrap}>
      <ThemedView type="surfaceMuted" style={styles.detailedPanel}>
        <View style={styles.detailedMainRow}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t("dashboard.balance")}
          </ThemedText>
          <ThemedText selectable type="display">
            $ {formatMoney(balance, languageTag)}
          </ThemedText>
        </View>
        <View style={[styles.openingRow, { borderTopColor: theme.border }]}>
          <ThemedText type="smallBold" style={styles.detailLabel}>
            {openingBalanceLabel}
          </ThemedText>
          <ThemedText selectable type="smallBold" style={styles.detailAmount}>
            $ {formatMoney(openingBalance, languageTag)}
          </ThemedText>
        </View>
        <View style={styles.detailedMetrics}>
          <SummaryMetric
            label={t("balance.income")}
            themeColor="success"
            value={`$ ${formatMoney(income, languageTag)}`}
          />
          <SummaryMetric
            label={t("balance.expenses")}
            themeColor="danger"
            value={`$ ${formatMoney(expense, languageTag)}`}
          />
        </View>
        {hasTransfers && transferIn > 0 ? (
          <View style={styles.detailRow}>
            <ThemedText type="smallBold" style={styles.detailLabel}>
              {t("balance.incomingTransfers")}
            </ThemedText>
            <ThemedText selectable type="smallBold" style={styles.detailAmount}>
              $ {formatMoney(transferIn, languageTag)}
            </ThemedText>
          </View>
        ) : null}
        {hasTransfers && transferOut > 0 ? (
          <View style={styles.detailRow}>
            <ThemedText type="smallBold" style={styles.detailLabel}>
              {t("balance.outgoingTransfers")}
            </ThemedText>
            <ThemedText selectable type="smallBold" style={styles.detailAmount}>
              $ {formatMoney(transferOut, languageTag)}
            </ThemedText>
          </View>
        ) : null}
      </ThemedView>
    </View>
  );
}

function SummaryMetric({
  label,
  themeColor,
  value,
}: Readonly<{
  label: string;
  themeColor?: "danger" | "success";
  value: string;
}>) {
  return (
    <View style={styles.metric}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText selectable type="smallBold" themeColor={themeColor}>
        {value}
      </ThemedText>
    </View>
  );
}

function TransferMetric({
  amount,
  color,
  icon,
  label,
}: Readonly<{
  amount: string;
  color: string;
  icon: "arrow-down-left" | "arrow-up-right";
  label: string;
}>) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${amount}`}
      style={styles.transferMetric}
    >
      <AppIcon color={color} name={icon} size={16} />
      <View style={styles.transferCopy}>
        <ThemedText type="caption" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText selectable type="smallBold" style={{ color }}>
          {amount}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryWrap: {
    flexShrink: 0,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  compactPanel: {
    borderCurve: "continuous",
    borderRadius: Radius.card,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  compactMainRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  compactAmount: {
    flexShrink: 1,
    textAlign: "right",
  },
  compactMetrics: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  compactTransfers: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  transferMetric: {
    alignItems: "flex-start",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.one,
    minWidth: 0,
  },
  transferCopy: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  detailedPanel: {
    borderCurve: "continuous",
    borderRadius: Radius.card,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  detailedMainRow: {
    alignItems: "flex-start",
    gap: Spacing.one,
  },
  openingRow: {
    borderTopWidth: 1,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
    paddingTop: Spacing.two,
  },
  detailedMetrics: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  metric: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  detailRow: {
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  detailLabel: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  detailAmount: {
    flexShrink: 0,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "right",
  },
});
