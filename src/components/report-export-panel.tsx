import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/i18n/localization-provider';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { translateError, translateErrorDescriptor } from '@/i18n/errors';
import { capitalizeLocalized, formatMonthName } from '@/i18n/formatters';
import { useLocalization } from '@/i18n/localization-provider';
import type { MonthlySummaryRow, Transaction } from '@/lib/database';
import {
  buildMonthlyReportCsv,
  formatReportMonth,
  getCurrentMonthKey,
  validateMonthlyReportRange,
  type MonthlyReportRange,
} from '@/lib/report-csv';
import { exportMonthlyReportFile } from '@/lib/report-export';

type ReportExportPanelProps = {
  defaultMonth: string;
  initialBalance: number;
  isLoading: boolean;
  monthlySummaries: MonthlySummaryRow[];
  transactions: Transaction[];
};

type RangeBoundary = keyof MonthlyReportRange;

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function ReportExportPanel({
  defaultMonth,
  initialBalance,
  isLoading,
  monthlySummaries,
  transactions,
}: ReportExportPanelProps) {
  const { languageTag } = useLocalization();
  const { t } = useTranslation();
  const currentMonth = getCurrentMonthKey();
  const currentYear = Number(currentMonth.slice(0, 4));
  const [range, setRange] = useState<MonthlyReportRange>({
    startMonth: defaultMonth,
    endMonth: defaultMonth,
  });
  const [pickerBoundary, setPickerBoundary] = useState<RangeBoundary | null>(null);
  const [pickerYear, setPickerYear] = useState(currentYear);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState('');
  const validationError = validateMonthlyReportRange(range, currentMonth);
  const validationMessage = validationError
    ? translateErrorDescriptor(validationError, t)
    : '';
  const isExportDisabled = isLoading || isExporting || !!validationError;
  const exportButtonLabel = isLoading
    ? t('reports.loadingData')
    : isExporting
      ? t('reports.generating')
      : t('reports.export');
  const minimumYear = useMemo(
    () =>
      transactions.reduce((earliestYear, transaction) => {
        const transactionYear = Number(transaction.transaction_date.slice(0, 4));
        return Number.isInteger(transactionYear)
          ? Math.min(earliestYear, transactionYear)
          : earliestYear;
      }, currentYear),
    [currentYear, transactions]
  );

  function openMonthPicker(boundary: RangeBoundary) {
    setPickerBoundary(boundary);
    setPickerYear(Number(range[boundary].slice(0, 4)) || currentYear);
    setMessage('');
  }

  function selectMonth(value: string) {
    if (!pickerBoundary) {
      return;
    }

    setRange((currentRange) => ({
      ...currentRange,
      [pickerBoundary]: value,
    }));
    setPickerBoundary(null);
    setMessage('');
  }

  async function handleExport() {
    if (isLoading) {
      return;
    }

    if (validationError) {
      setMessage(validationMessage);
      return;
    }

    setIsExporting(true);
    setMessage('');

    try {
      const report = buildMonthlyReportCsv({
        currentMonth,
        initialBalance,
        localization: { locale: languageTag, t },
        monthlySummaries,
        range,
        transactions,
      });
      await exportMonthlyReportFile(report);
      setMessage(t('reports.generated', { count: report.transactionCount }));
    } catch (error) {
      setMessage(translateError(error, t));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <View style={styles.container}>
      <ThemedView type="backgroundElement" style={styles.panel}>
        <View style={styles.intro}>
          <ThemedText type="smallBold" style={styles.title}>
            {t('reports.exportMovements')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('reports.description')}
          </ThemedText>
        </View>

        <MonthField
          label={t('reports.startMonth')}
          onPress={() => openMonthPicker('startMonth')}
          value={formatReportMonth(range.startMonth, languageTag)}
        />
        <MonthField
          label={t('reports.endMonth')}
          onPress={() => openMonthPicker('endMonth')}
          value={formatReportMonth(range.endMonth, languageTag)}
        />

        {!!validationMessage && (
          <ThemedText type="small" themeColor="textSecondary">
            {validationMessage}
          </ThemedText>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={isExportDisabled}
          onPress={() => void handleExport()}
          style={({ pressed }) => [
            styles.exportButton,
            isExportDisabled && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon color={AppPalette.foregroundInverse} name="download" size={20} />
          <ThemedText type="smallBold" style={styles.exportButtonText}>
            {exportButtonLabel}
          </ThemedText>
        </Pressable>
      </ThemedView>

      {!!message && (
        <ThemedView type="backgroundSelected" style={styles.message}>
          <ThemedText type="smallBold">{message}</ThemedText>
        </ThemedView>
      )}

      <MonthPickerModal
        currentMonth={currentMonth}
        maximumYear={currentYear}
        minimumYear={minimumYear}
        onChangeYear={setPickerYear}
        onClose={() => setPickerBoundary(null)}
        onSelect={selectMonth}
        selectedMonth={pickerBoundary ? range[pickerBoundary] : defaultMonth}
        visible={pickerBoundary !== null}
        year={pickerYear}
      />
    </View>
  );
}

function MonthField({ label, onPress, value }: { label: string; onPress: () => void; value: string }) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        accessibilityLabel={`${label}: ${value}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <ThemedView
          type="background"
          style={[styles.monthField, { borderColor: theme.backgroundSelected }]}
        >
          <ThemedText type="smallBold">{value}</ThemedText>
          <AppIcon color={theme.text} name="calendar" size={20} />
        </ThemedView>
      </Pressable>
    </View>
  );
}

function MonthPickerModal({
  currentMonth,
  maximumYear,
  minimumYear,
  onChangeYear,
  onClose,
  onSelect,
  selectedMonth,
  visible,
  year,
}: {
  currentMonth: string;
  maximumYear: number;
  minimumYear: number;
  onChangeYear: (year: number) => void;
  onClose: () => void;
  onSelect: (month: string) => void;
  selectedMonth: string;
  visible: boolean;
  year: number;
}) {
  const theme = useTheme();
  const { languageTag } = useLocalization();
  const { t } = useTranslation();
  const monthLabels = Array.from({ length: 12 }, (_, index) =>
    capitalizeLocalized(
      formatMonthName(year, index + 1, languageTag),
      languageTag,
    ),
  );

  return (
    <Modal
      accessibilityViewIsModal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityLabel={t('accessibility.closeMonthSelector')}
          accessibilityRole="button"
          onPress={onClose}
          style={styles.modalDismissArea}
        />
        <View style={styles.modalCard}>
          <ThemedView
            type="backgroundElement"
            style={[styles.modalPanel, { borderColor: theme.backgroundSelected }]}
          >
            <View style={styles.yearSelector}>
              <Pressable
                accessibilityLabel={t('accessibility.previousYear')}
                accessibilityRole="button"
                disabled={year <= minimumYear}
                onPress={() => onChangeYear(year - 1)}
                style={({ pressed }) => [
                  styles.yearButton,
                  year <= minimumYear && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <AppIcon color={theme.text} name="chevron-left" size={24} />
              </Pressable>
              <ThemedText type="subtitle" style={styles.yearLabel}>
                {year}
              </ThemedText>
              <Pressable
                accessibilityLabel={t('accessibility.nextYear')}
                accessibilityRole="button"
                disabled={year >= maximumYear}
                onPress={() => onChangeYear(year + 1)}
                style={({ pressed }) => [
                  styles.yearButton,
                  year >= maximumYear && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <AppIcon color={theme.text} name="chevron-right" size={24} />
              </Pressable>
            </View>

            <View style={styles.monthGrid}>
              {monthLabels.map((label, index) => {
                const value = monthKey(year, index + 1);
                const isDisabled = value > currentMonth;
                const isSelected = value === selectedMonth;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isDisabled, selected: isSelected }}
                    disabled={isDisabled}
                    key={value}
                    onPress={() => onSelect(value)}
                    style={({ pressed }) => [
                      styles.monthButtonPressable,
                      isDisabled && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedView
                      type={isSelected ? 'backgroundSelected' : 'background'}
                      style={[styles.monthButton, { borderColor: theme.backgroundSelected }]}
                    >
                      <ThemedText type={isSelected ? 'smallBold' : 'small'}>{label}</ThemedText>
                    </ThemedView>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView type="backgroundSelected" style={styles.closeButton}>
                <ThemedText type="smallBold">{t('common.cancel')}</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    width: '100%',
  },
  panel: {
    borderRadius: Spacing.two,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  intro: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  field: {
    gap: Spacing.two,
  },
  monthField: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  exportButton: {
    alignItems: 'center',
    backgroundColor: AppPalette.brandOrange,
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  exportButtonText: {
    color: AppPalette.foregroundInverse,
  },
  message: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  modalPanel: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: '100%',
  },
  modalCard: {
    maxWidth: MaxContentWidth,
    position: 'relative',
    width: '100%',
    zIndex: 1,
  },
  modalDismissArea: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  yearSelector: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  yearButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  yearLabel: {
    fontSize: 24,
    lineHeight: 30,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  monthButtonPressable: {
    width: '31%',
  },
  monthButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.one,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
