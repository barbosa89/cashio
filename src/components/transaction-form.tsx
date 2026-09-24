import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
    type ComponentProps,
    type ReactNode,
} from "react";
import {
    Keyboard,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import CurrencyInput from "react-native-currency-input";
import DropDownPicker, {
  type ItemType,
  type RenderListItemPropsInterface,
} from "react-native-dropdown-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "@/i18n/localization-provider";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppPalette, DROPDOWN_LIST_MODE, Radius, Spacing } from "@/constants/theme";
import { useCashioData } from "@/hooks/use-cashio-data";
import { useTheme } from "@/hooks/use-theme";
import { translateError } from "@/i18n/errors";
import { getNumberSeparators } from "@/i18n/formatters";
import { useLocalization } from "@/i18n/localization-provider";
import type { Account, Category, TransactionType } from "@/lib/database";

type TransactionFormProps = {
  initialAccountId?: number | null;
  onSaved?: () => void;
};

type DropdownValue = number | string;

const SEARCHABLE_DROPDOWN_FLAT_LIST_PROPS = {
  keyboardShouldPersistTaps: "always" as const,
};

export type TransactionFormHandle = {
  reset: () => void;
};

function normalizeLookup(value: string) {
  return value.trim().toLocaleLowerCase();
}

function canUseCategory(category: Category, transactionType: TransactionType) {
  return (
    category.type === null ||
    category.type === "both" ||
    category.type === transactionType
  );
}

function getDefaultAccountId(accounts: Account[]) {
  return accounts.find((account) => account.is_default === 1)?.id ?? accounts[0]?.id ?? null;
}

function getPreferredAccountId(accounts: Account[], initialAccountId?: number | null) {
  if (
    initialAccountId &&
    accounts.some((account) => account.id === initialAccountId)
  ) {
    return initialAccountId;
  }

  return getDefaultAccountId(accounts);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

export const TransactionForm = forwardRef<TransactionFormHandle, TransactionFormProps>(
function TransactionForm({ initialAccountId = null, onSaved }, ref) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { languageTag } = useLocalization();
  const { t } = useTranslation();
  const numberSeparators = getNumberSeparators(languageTag);
  const { accounts, categories, tags, isLoading, addCategory, addTag, addTransaction } =
    useCashioData();
  const [transactionType, setTransactionType] =
    useState<TransactionType>("expense");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedDestinationAccountId, setSelectedDestinationAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(() =>
    formatDateValue(new Date()),
  );
  const [draftTransactionDate, setDraftTransactionDate] = useState(() =>
    new Date(),
  );
  const [categorySearch, setCategorySearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isDestinationAccountOpen, setIsDestinationAccountOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const isCreatingCategoryRef = useRef(false);
  const isCreatingTagRef = useRef(false);
  const appliedInitialAccountIdRef = useRef<number | null | undefined>(undefined);
  const selectedTagBadgeBackground = theme.text;
  const selectedTagTextColor = theme.background;
  const dropdownModalContentStyle = useMemo(
    () => [
      styles.dropdownModal,
      {
        backgroundColor: theme.background,
        paddingBottom:
          Spacing.three +
          Math.max(
            insets.bottom,
            Platform.OS === "android" ? Spacing.five : 0,
          ),
      },
    ],
    [insets.bottom, theme.background],
  );

  const accountItems = useMemo(
    (): Array<ItemType<DropdownValue>> =>
      accounts.map((account) => ({
        label: account.name,
        value: account.id,
      })),
    [accounts],
  );

  const destinationAccountItems = useMemo(
    (): Array<ItemType<DropdownValue>> =>
      accounts
        .filter((account) => account.id !== selectedAccountId)
        .map((account) => ({
          label: account.name,
          value: account.id,
        })),
    [accounts, selectedAccountId],
  );

  const availableCategories = useMemo(
    () =>
      categories.filter((category) =>
        canUseCategory(category, transactionType),
      ),
    [categories, transactionType],
  );

  const categoryItems = useMemo(
    (): Array<ItemType<DropdownValue>> =>
      availableCategories.map((category) => ({
        label: category.description,
        value: category.id,
      })),
    [availableCategories],
  );

  const tagItems = useMemo(
    (): Array<ItemType<DropdownValue>> =>
      tags.map((tag) => ({ label: tag.description, value: tag.id })),
    [tags],
  );

  const categorySearchMatchesExisting = useMemo(
    () =>
      categories.some(
        (category) =>
          normalizeLookup(category.description) ===
          normalizeLookup(categorySearch),
      ),
    [categories, categorySearch],
  );

  const tagSearchMatchesExisting = useMemo(
    () =>
      tags.some(
        (tag) =>
          normalizeLookup(tag.description) === normalizeLookup(tagSearch),
      ),
    [tags, tagSearch],
  );

  useEffect(() => {
    const selectedCategory = categories.find(
      (category) => category.id === selectedCategoryId,
    );
    if (
      selectedCategory &&
      !canUseCategory(selectedCategory, transactionType)
    ) {
      setSelectedCategoryId(null);
    }
  }, [categories, selectedCategoryId, transactionType]);

  useEffect(() => {
    if (accounts.length === 0) {
      return;
    }

    if (appliedInitialAccountIdRef.current !== initialAccountId) {
      appliedInitialAccountIdRef.current = initialAccountId;
      setSelectedAccountId(getPreferredAccountId(accounts, initialAccountId));
      return;
    }

    if (selectedAccountId && accounts.some((account) => account.id === selectedAccountId)) {
      return;
    }

    setSelectedAccountId(getDefaultAccountId(accounts));
  }, [accounts, initialAccountId, selectedAccountId]);

  useEffect(() => {
    if (transactionType === "income") {
      setSelectedDestinationAccountId(null);
      setIsDestinationAccountOpen(false);
      return;
    }

    if (
      selectedDestinationAccountId &&
      selectedDestinationAccountId === selectedAccountId
    ) {
      setSelectedDestinationAccountId(null);
    }
  }, [selectedAccountId, selectedDestinationAccountId, transactionType]);

  function handleError(error: unknown) {
    setMessage(translateError(error, t));
  }

  function resetForm() {
    setTransactionType("expense");
    setSelectedAccountId(getPreferredAccountId(accounts, initialAccountId));
    setSelectedDestinationAccountId(null);
    setAmount(null);
    setDescription("");
    setSelectedCategoryId(null);
    setSelectedTagIds([]);
    setCategorySearch("");
    setTagSearch("");
    setIsAccountOpen(false);
    setIsCategoryOpen(false);
    setIsDestinationAccountOpen(false);
    setIsTagsOpen(false);
    setIsDatePickerOpen(false);
    setMessage("");
    setIsSaving(false);
    setIsCreatingCategory(false);
    setIsCreatingTag(false);
    isCreatingCategoryRef.current = false;
    isCreatingTagRef.current = false;
    const today = new Date();
    setDraftTransactionDate(today);
    setTransactionDate(formatDateValue(today));
  }

  useImperativeHandle(ref, () => ({ reset: resetForm }));

  function setCategoryDropdownValue(
    nextValue: (currentValue: DropdownValue | null) => DropdownValue | null,
  ) {
    setSelectedCategoryId((currentValue) => {
      const next = nextValue(currentValue);

      if (typeof next === "number" || next === null) {
        return next;
      }

      return currentValue;
    });
  }

  function setAccountDropdownValue(
    nextValue: (currentValue: DropdownValue | null) => DropdownValue | null,
  ) {
    setSelectedAccountId((currentValue) => {
      const next = nextValue(currentValue);

      if (typeof next === "number" || next === null) {
        return next;
      }

      return currentValue;
    });
  }

  function setDestinationAccountDropdownValue(
    nextValue: (currentValue: DropdownValue | null) => DropdownValue | null,
  ) {
    setSelectedDestinationAccountId((currentValue) => {
      const next = nextValue(currentValue);

      if (typeof next === "number" || next === null) {
        return next;
      }

      return currentValue;
    });
  }

  function setTagDropdownValues(
    nextValue: (currentValue: DropdownValue[] | null) => DropdownValue[] | null,
  ) {
    setSelectedTagIds((currentValue) => {
      const next = nextValue(currentValue);

      if (!Array.isArray(next)) {
        return [];
      }

      return next.filter((value): value is number => typeof value === "number");
    });
  }

  async function handleCreateCategoryFromText(value: string) {
    const description = value.trim();
    if (!description) {
      return;
    }

    const existingCategory = categories.find(
      (category) =>
        normalizeLookup(category.description) === normalizeLookup(description),
    );

    if (existingCategory) {
      if (canUseCategory(existingCategory, transactionType)) {
        setSelectedCategoryId(existingCategory.id);
        setCategorySearch("");
        setIsCategoryOpen(false);
        setMessage(t("transaction.categorySelected", { name: existingCategory.description }));
        return;
      }

      setMessage(
        t("transaction.categoryNotApplicable", { name: existingCategory.description }),
      );
      return;
    }

    if (isCreatingCategoryRef.current) {
      return;
    }

    isCreatingCategoryRef.current = true;
    setIsCreatingCategory(true);

    try {
      const created = await addCategory({
        description,
        type: transactionType,
      });
      if (created) {
        setSelectedCategoryId(created.id);
        setCategorySearch("");
        setIsCategoryOpen(false);
        setMessage(t("transaction.categoryCreated", { name: created.description }));
      }
    } catch (error) {
      handleError(error);
    } finally {
      isCreatingCategoryRef.current = false;
      setIsCreatingCategory(false);
    }
  }

  async function handleCreateTagFromText(value: string) {
    const description = value.trim();
    if (!description) {
      return;
    }

    const existingTag = tags.find(
      (tag) => normalizeLookup(tag.description) === normalizeLookup(description),
    );

    if (existingTag) {
      setSelectedTagIds((current) =>
        current.includes(existingTag.id) ? current : [...current, existingTag.id],
      );
      setTagSearch("");
      setIsTagsOpen(false);
      setMessage(t("transaction.tagSelected", { name: existingTag.description }));
      return;
    }

    if (isCreatingTagRef.current) {
      return;
    }

    isCreatingTagRef.current = true;
    setIsCreatingTag(true);

    try {
      const created = await addTag({ description });
      if (created) {
        setSelectedTagIds((current) =>
          current.includes(created.id) ? current : [...current, created.id],
        );
        setTagSearch("");
        setIsTagsOpen(false);
        setMessage(t("transaction.tagCreated", { name: created.description }));
      }
    } catch (error) {
      handleError(error);
    } finally {
      isCreatingTagRef.current = false;
      setIsCreatingTag(false);
    }
  }

  function handleSelectCategory(item: ItemType<DropdownValue>) {
    if (typeof item.value === "string") {
      void handleCreateCategoryFromText(String(item.label ?? item.value));
      return;
    }

    setCategorySearch("");
  }

  function handleSelectTags(items: Array<ItemType<DropdownValue>>) {
    const customItem = items.find((item) => typeof item.value === "string");

    if (customItem) {
      void handleCreateTagFromText(String(customItem.label ?? customItem.value ?? ""));
      return;
    }

    setTagSearch("");
  }

  async function handleSaveTransaction() {
    setIsSaving(true);
    setMessage("");

    try {
      await addTransaction({
        accountId: selectedAccountId ?? 0,
        type: transactionType,
        amount: amount ?? 0,
        description,
        destinationAccountId:
          transactionType === "expense" ? selectedDestinationAccountId : null,
        transactionDate,
        categoryId: selectedCategoryId ?? 0,
        tagIds: selectedTagIds,
      });
      resetForm();
      setMessage(t("transaction.saved"));
      onSaved?.();
    } catch (error) {
      handleError(error);
    } finally {
      setIsSaving(false);
    }
  }

  function closeDropdowns() {
    setIsAccountOpen(false);
    setIsCategoryOpen(false);
    setIsDestinationAccountOpen(false);
    setIsTagsOpen(false);
  }

  function openDatePicker() {
    closeDropdowns();
    const currentDate = parseDateValue(transactionDate);

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        display: "default",
        mode: "date",
        onDismiss: () => undefined,
        onNeutralButtonPress: () => undefined,
        onValueChange: (_event, selectedDate) => {
          setTransactionDate(formatDateValue(selectedDate));
        },
        value: currentDate,
      });
      return;
    }

    setDraftTransactionDate(currentDate);
    setIsDatePickerOpen(true);
  }

  function applyDraftDate() {
    setTransactionDate(formatDateValue(draftTransactionDate));
    setIsDatePickerOpen(false);
  }

  return (
    <ThemedView type="surface" style={styles.panel}>
      {(isAccountOpen || isCategoryOpen || isDestinationAccountOpen || isTagsOpen) && (
        <Pressable
          accessibilityLabel={t("accessibility.closeSelector")}
          onPress={closeDropdowns}
          style={styles.dropdownBackdrop}
        />
      )}

      <ThemedView type="surfaceMuted" style={styles.segmentedControl}>
        <SegmentButton
          active={transactionType === "expense"}
          icon="arrow-up-right"
          label={t("common.expense")}
          onPress={() => setTransactionType("expense")}
          tone="expense"
        />
        <SegmentButton
          active={transactionType === "income"}
          icon="arrow-down-left"
          label={t("common.income")}
          onPress={() => setTransactionType("income")}
          tone="income"
        />
      </ThemedView>

      <Field
        label={t("transaction.account")}
        style={[styles.dropdownField, { zIndex: isAccountOpen ? 40 : 10 }]}
      >
        <DropDownPicker<DropdownValue>
          ArrowDownIconComponent={({ style }) => (
            <View style={style}>
              <AppIcon color={theme.text} name="chevron-down" size={22} />
            </View>
          )}
          ArrowUpIconComponent={({ style }) => (
            <View style={style}>
              <AppIcon color={theme.text} name="chevron-up" size={22} />
            </View>
          )}
          CloseIconComponent={({ style }) => (
            <View style={style}>
              <AppIcon color={theme.text} name="x" size={24} />
            </View>
          )}
          TickIconComponent={({ style }) => (
            <View style={style}>
              <AppIcon color={theme.text} name="check" size={20} />
            </View>
          )}
          dropDownContainerStyle={[
            styles.dropdownMenu,
            {
              backgroundColor: theme.surfaceRaised,
              borderColor: theme.border,
            },
          ]}
          items={accountItems}
          labelStyle={styles.dropdownLabel}
          listItemContainerStyle={styles.dropdownItem}
          listItemLabelStyle={{ color: theme.text }}
          listMode={DROPDOWN_LIST_MODE}
          modalAnimationType="slide"
          modalContentContainerStyle={dropdownModalContentStyle}
          onOpen={() => {
            setIsCategoryOpen(false);
            setIsDestinationAccountOpen(false);
            setIsTagsOpen(false);
          }}
          open={isAccountOpen}
          placeholder={t("transaction.selectAccount")}
          placeholderStyle={{ color: theme.textSecondary }}
          selectedItemContainerStyle={{
            backgroundColor: theme.primaryContainer,
          }}
          selectedItemLabelStyle={{ color: theme.text, fontWeight: "700" }}
          setOpen={setIsAccountOpen}
          setValue={setAccountDropdownValue}
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.surfaceRaised,
              borderColor: theme.border,
            },
          ]}
          textStyle={{ color: theme.text }}
          value={selectedAccountId}
          zIndex={isAccountOpen ? 4000 : 1000}
          zIndexInverse={1000}
        />
      </Field>

      <Field label={t("transaction.amount")}>
        <CurrencyInput
          delimiter={numberSeparators.delimiter}
          keyboardType="numeric"
          minValue={0}
          onChangeValue={setAmount}
          placeholder="$ 0"
          placeholderTextColor={theme.textSecondary}
          precision={0}
          prefix="$ "
          separator={numberSeparators.separator}
          style={[
            styles.input,
            styles.amountInput,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceRaised },
          ]}
          value={amount}
        />
      </Field>

      <Field label={t("transaction.date")}>
        {Platform.OS === "web" ? (
          <TextInput
            accessibilityLabel={t("accessibility.selectTransactionDate")}
            inputMode="numeric"
            onChangeText={setTransactionDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              { borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceRaised },
            ]}
            value={transactionDate}
          />
        ) : (
          <Pressable
            accessibilityLabel={t("accessibility.selectTransactionDate")}
            accessibilityRole="button"
            onPress={openDatePicker}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View
              style={[
                styles.dateInput,
                { borderColor: theme.border, backgroundColor: theme.surfaceRaised },
              ]}
            >
              <ThemedText style={styles.dateInputText}>
                {transactionDate}
              </ThemedText>
              <AppIcon color={theme.text} name="calendar" size={20} />
            </View>
          </Pressable>
        )}
        {isDatePickerOpen && Platform.OS === "ios" && (
          <ThemedView type="surfaceRaised" style={styles.datePickerPanel}>
            <DateTimePicker
              display="spinner"
              mode="date"
              onValueChange={(_event, selectedDate) =>
                setDraftTransactionDate(selectedDate)
              }
              value={draftTransactionDate}
            />
            <View style={styles.datePickerActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsDatePickerOpen(false)}
                style={({ pressed }) => [styles.datePickerAction, pressed && styles.pressed]}
              >
                <ThemedText type="smallBold">{t("common.cancel")}</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={applyDraftDate}
                style={({ pressed }) => [styles.datePickerAction, pressed && styles.pressed]}
              >
                <ThemedText type="smallBold">{t("common.apply")}</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        )}
      </Field>

      <Field label={t("transaction.description")}>
        <TextInput
          onChangeText={setDescription}
          placeholder={t("common.optional")}
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceRaised },
          ]}
          value={description}
        />
      </Field>

      <Field
        label={t("transaction.category")}
        style={[styles.dropdownField, { zIndex: isCategoryOpen ? 30 : 10 }]}
      >
        <DropDownPicker<DropdownValue>
          addCustomItem={!!categorySearch.trim() && !categorySearchMatchesExisting}
          ArrowDownIconComponent={({ style }) => (
            <View style={style}>
              <AppIcon color={theme.text} name="chevron-down" size={22} />
            </View>
          )}
          ArrowUpIconComponent={({ style }) => (
            <View style={style}>
              <AppIcon color={theme.text} name="chevron-up" size={22} />
            </View>
          )}
          CloseIconComponent={({ style }) => (
            <View style={style}>
              <AppIcon color={theme.text} name="x" size={24} />
            </View>
          )}
          TickIconComponent={({ style }) => (
            <View style={style}>
              <AppIcon color={theme.text} name="check" size={20} />
            </View>
          )}
          dropDownContainerStyle={[
            styles.dropdownMenu,
            {
              backgroundColor: theme.surfaceRaised,
              borderColor: theme.border,
            },
          ]}
          customItemContainerStyle={[
            styles.dropdownCustomItem,
            { borderTopColor: theme.border },
          ]}
          flatListProps={SEARCHABLE_DROPDOWN_FLAT_LIST_PROPS}
          items={categoryItems}
          labelStyle={styles.dropdownLabel}
          listItemContainerStyle={styles.dropdownItem}
          listItemLabelStyle={{ color: theme.text }}
          listMode={DROPDOWN_LIST_MODE}
          maxHeight={220}
          modalAnimationType="slide"
          modalContentContainerStyle={dropdownModalContentStyle}
          onChangeSearchText={setCategorySearch}
          onOpen={() => {
            setIsAccountOpen(false);
            setIsDestinationAccountOpen(false);
            setIsTagsOpen(false);
          }}
          onSelectItem={handleSelectCategory}
          open={isCategoryOpen}
          placeholder={t("transaction.searchOrSelectCategory")}
          placeholderStyle={{ color: theme.textSecondary }}
          renderListItem={(props) => (
            <DropdownListItem
              createLabel={t("transaction.createCategory")}
              isCreatingCustomItem={isCreatingCategory}
              itemProps={props}
              onCreateCustomItem={(value) =>
                void handleCreateCategoryFromText(value)
              }
            />
          )}
          searchPlaceholder={t("transaction.searchCategory")}
          searchPlaceholderTextColor={theme.textSecondary}
          searchable
          searchTextInputProps={{ value: categorySearch }}
          searchTextInputStyle={[
            styles.dropdownSearchInput,
            {
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          selectedItemContainerStyle={{
            backgroundColor: theme.primaryContainer,
          }}
          selectedItemLabelStyle={{ color: theme.text, fontWeight: "700" }}
          setOpen={setIsCategoryOpen}
          setValue={setCategoryDropdownValue}
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.surfaceRaised,
              borderColor: theme.border,
            },
          ]}
          textStyle={{ color: theme.text }}
          value={selectedCategoryId}
          zIndex={isCategoryOpen ? 3000 : 1000}
          zIndexInverse={1000}
        />
      </Field>

      {transactionType === "expense" && (
        <Field
          label={t("transaction.destinationAccount")}
          style={[
            styles.dropdownField,
            { zIndex: isDestinationAccountOpen ? 30 : 10 },
          ]}
        >
          <DropDownPicker<DropdownValue>
            ArrowDownIconComponent={({ style }) => (
              <View style={style}>
                <AppIcon color={theme.text} name="chevron-down" size={22} />
              </View>
            )}
            ArrowUpIconComponent={({ style }) => (
              <View style={style}>
                <AppIcon color={theme.text} name="chevron-up" size={22} />
              </View>
            )}
            CloseIconComponent={({ style }) => (
              <View style={style}>
                <AppIcon color={theme.text} name="x" size={24} />
              </View>
            )}
            TickIconComponent={({ style }) => (
              <View style={style}>
                <AppIcon color={theme.text} name="check" size={20} />
              </View>
            )}
            dropDownContainerStyle={[
              styles.dropdownMenu,
              {
                backgroundColor: theme.surfaceRaised,
                borderColor: theme.border,
              },
            ]}
            items={destinationAccountItems}
            labelStyle={styles.dropdownLabel}
            listItemContainerStyle={styles.dropdownItem}
            listItemLabelStyle={{ color: theme.text }}
            listMode={DROPDOWN_LIST_MODE}
            modalAnimationType="slide"
            modalContentContainerStyle={dropdownModalContentStyle}
            onOpen={() => {
              setIsAccountOpen(false);
              setIsCategoryOpen(false);
              setIsTagsOpen(false);
            }}
            open={isDestinationAccountOpen}
            placeholder={t("transaction.optionalTransfer")}
            placeholderStyle={{ color: theme.textSecondary }}
            selectedItemContainerStyle={{
              backgroundColor: theme.primaryContainer,
            }}
            selectedItemLabelStyle={{ color: theme.text, fontWeight: "700" }}
            setOpen={setIsDestinationAccountOpen}
            setValue={setDestinationAccountDropdownValue}
            style={[
              styles.dropdown,
              {
                backgroundColor: theme.surfaceRaised,
                borderColor: theme.border,
              },
            ]}
            textStyle={{ color: theme.text }}
            value={selectedDestinationAccountId}
            zIndex={isDestinationAccountOpen ? 3000 : 1000}
            zIndexInverse={1000}
          />
        </Field>
      )}

      <Field
        label={t("common.tags")}
        style={[styles.dropdownField, { zIndex: isTagsOpen ? 30 : 10 }]}
      >
        <DropDownPicker<DropdownValue>
          addCustomItem={!!tagSearch.trim() && !tagSearchMatchesExisting}
          ArrowDownIconComponent={({ style }) => (
            <View style={style}>
              <AppIcon color={theme.text} name="chevron-down" size={22} />
            </View>
          )}
          ArrowUpIconComponent={({ style }) => (
            <View style={style}>
              <AppIcon color={theme.text} name="chevron-up" size={22} />
            </View>
          )}
          CloseIconComponent={({ style }) => (
            <View style={style}>
              <AppIcon color={theme.text} name="x" size={24} />
            </View>
          )}
          TickIconComponent={({ style }) => (
            <View style={style}>
              <AppIcon color={theme.text} name="check" size={20} />
            </View>
          )}
          badgeStyle={[
            styles.dropdownBadge,
            { backgroundColor: selectedTagBadgeBackground },
          ]}
          badgeTextStyle={[
            styles.dropdownBadgeText,
            { color: selectedTagTextColor },
          ]}
          dropDownContainerStyle={[
            styles.dropdownMenu,
            {
              backgroundColor: theme.surfaceRaised,
              borderColor: theme.border,
            },
          ]}
          customItemContainerStyle={[
            styles.dropdownCustomItem,
            { borderTopColor: theme.border },
          ]}
          flatListProps={SEARCHABLE_DROPDOWN_FLAT_LIST_PROPS}
          items={tagItems}
          labelStyle={styles.dropdownLabel}
          listItemContainerStyle={styles.dropdownItem}
          listItemLabelStyle={{ color: theme.text }}
          listMode={DROPDOWN_LIST_MODE}
          maxHeight={220}
          modalAnimationType="slide"
          modalContentContainerStyle={dropdownModalContentStyle}
          mode="BADGE"
          multiple
          multipleText={t("transaction.selectedTags", { count: selectedTagIds.length })}
          onChangeSearchText={setTagSearch}
          onOpen={() => {
            setIsAccountOpen(false);
            setIsCategoryOpen(false);
            setIsDestinationAccountOpen(false);
          }}
          onSelectItem={handleSelectTags}
          open={isTagsOpen}
          placeholder={t("transaction.searchOrSelectTags")}
          placeholderStyle={{ color: theme.textSecondary }}
          renderListItem={(props) => (
            <DropdownListItem
              createLabel={t("transaction.createTag")}
              isCreatingCustomItem={isCreatingTag}
              itemProps={props}
              onCreateCustomItem={(value) => void handleCreateTagFromText(value)}
            />
          )}
          searchPlaceholder={t("transaction.searchTag")}
          searchPlaceholderTextColor={theme.textSecondary}
          searchable
          searchTextInputProps={{ value: tagSearch }}
          searchTextInputStyle={[
            styles.dropdownSearchInput,
            {
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          selectedItemContainerStyle={{
            backgroundColor: theme.primaryContainer,
          }}
          selectedItemLabelStyle={{
            color: selectedTagTextColor,
            fontWeight: "700",
          }}
          setOpen={setIsTagsOpen}
          setValue={setTagDropdownValues}
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.surfaceRaised,
              borderColor: theme.border,
            },
          ]}
          textStyle={{
            color:
              selectedTagIds.length > 0 ? selectedTagTextColor : theme.text,
          }}
          value={selectedTagIds}
          showBadgeDot={false}
          zIndex={isTagsOpen ? 3000 : 1000}
          zIndexInverse={1000}
        />
      </Field>

      {!!message && (
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      )}

      <ActionButton
        disabled={isSaving || isLoading}
        label={isSaving ? t("common.saving") : t("transaction.save")}
        onPress={handleSaveTransaction}
        primary
      />
    </ThemedView>
  );
});

function DropdownListItem({
  createLabel,
  isCreatingCustomItem,
  itemProps,
  onCreateCustomItem,
}: {
  createLabel: string;
  isCreatingCustomItem?: boolean;
  itemProps: RenderListItemPropsInterface<DropdownValue>;
  onCreateCustomItem?: (value: string) => void;
}) {
  const { t } = useTranslation();
  const disabled =
    itemProps.disabled ||
    itemProps.selectable === false ||
    (itemProps.custom && isCreatingCustomItem);
  const displayLabel = itemProps.custom
    ? isCreatingCustomItem
      ? t("transaction.creating")
      : `${createLabel} "${itemProps.label.trim()}"`
    : itemProps.label;
  const isBusy = !!(itemProps.custom && isCreatingCustomItem);

  function handlePress() {
    if (itemProps.custom && onCreateCustomItem) {
      Keyboard.dismiss();
      onCreateCustomItem(String(itemProps.label ?? itemProps.value ?? ""));
      return;
    }

    const onPressItem = itemProps.onPress as unknown as (
      item: ItemType<DropdownValue>,
      custom: boolean,
    ) => void;

    onPressItem(itemProps.item, itemProps.custom);
  }

  return (
    <Pressable
      accessibilityLabel={String(displayLabel)}
      accessibilityRole="button"
      accessibilityState={{
        busy: isBusy,
        disabled,
        selected: itemProps.isSelected,
      }}
      disabled={disabled}
      onLayout={({ nativeEvent }) =>
        itemProps.setPosition(itemProps.value, nativeEvent.layout.y)
      }
      onPress={handlePress}
      style={({ pressed }) => [
        itemProps.listItemContainerStyle,
        itemProps.custom && itemProps.customItemContainerStyle,
        itemProps.isSelected && itemProps.selectedItemContainerStyle,
        disabled && itemProps.disabledItemContainerStyle,
        pressed && styles.pressed,
      ]}
    >
      {itemProps.custom ? (
        <View style={styles.dropdownCreateButton}>
          <AppIcon
            color={AppPalette.foregroundOnBrand}
            name={isCreatingCustomItem ? "loader" : "plus"}
            size={20}
          />
          <ThemedText
            type="smallBold"
            style={styles.dropdownCreateButtonText}
          >
            {displayLabel}
          </ThemedText>
        </View>
      ) : (
        <>
          <ThemedText
            type={itemProps.isSelected ? "smallBold" : "small"}
            style={[
              styles.dropdownListItemText,
              itemProps.listItemLabelStyle,
              itemProps.isSelected && itemProps.selectedItemLabelStyle,
              disabled && itemProps.disabledItemLabelStyle,
            ]}
          >
            {displayLabel}
          </ThemedText>
          {itemProps.isSelected && <itemProps.TickIconComponent />}
        </>
      )}
    </Pressable>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, style]}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </View>
  );
}

function SegmentButton({
  active,
  icon,
  label,
  onPress,
  tone,
}: {
  active: boolean;
  icon: ComponentProps<typeof AppIcon>["name"];
  label: string;
  onPress: () => void;
  tone: "expense" | "income";
}) {
  const theme = useTheme();
  const color = tone === "expense" ? theme.danger : theme.success;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.segmentButton, pressed && styles.pressed]}
    >
      <ThemedView
        type="surfaceRaised"
        style={[
          styles.segmentButtonInner,
          { borderColor: active ? color : "transparent" },
          active && { backgroundColor: `${color}24` },
        ]}
      >
        <AppIcon
          color={active ? color : theme.textSecondary}
          name={icon}
          size={18}
        />
        <ThemedText
          type="smallBold"
          style={active && { color }}
          themeColor={active ? undefined : "textSecondary"}
        >
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function ActionButton({
  disabled,
  label,
  onPress,
  primary,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <ThemedView
        type={primary ? "primary" : "surfaceMuted"}
        style={[
          styles.actionButton,
          primary && { backgroundColor: theme.primary },
        ]}
      >
        <ThemedText type="smallBold" themeColor={primary ? "onPrimary" : "text"}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderCurve: "continuous",
    borderRadius: Radius.card,
    gap: Spacing.four,
    padding: Spacing.four,
    position: "relative",
  },
  dropdownBackdrop: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },
  segmentedControl: {
    borderRadius: Radius.control,
    flexDirection: "row",
    gap: Spacing.one,
    padding: Spacing.one,
  },
  segmentButton: {
    flex: 1,
  },
  segmentButtonInner: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.control,
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "center",
    minHeight: 44,
    paddingVertical: Spacing.two,
  },
  field: {
    gap: Spacing.two,
  },
  dropdownField: {
    position: "relative",
  },
  input: {
    borderRadius: Radius.control,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  amountInput: {
    fontSize: 28,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    minHeight: 64,
  },
  dateInput: {
    alignItems: "center",
    borderRadius: Radius.control,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dateInputText: {
    fontSize: 16,
  },
  datePickerPanel: {
    borderRadius: Spacing.two,
    overflow: "hidden",
    paddingBottom: Spacing.two,
  },
  datePickerActions: {
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.two,
  },
  datePickerAction: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dropdown: {
    borderRadius: Radius.control,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  dropdownLabel: {
    fontWeight: "700",
  },
  dropdownMenu: {
    borderRadius: Radius.control,
    borderWidth: 1,
  },
  dropdownModal: {
    padding: Spacing.three,
  },
  dropdownItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 44,
  },
  dropdownListItemText: {
    flex: 1,
  },
  dropdownCustomItem: {
    borderTopWidth: 1,
    minHeight: 72,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  dropdownCreateButton: {
    alignItems: "center",
    backgroundColor: AppPalette.brandOrange,
    borderRadius: Spacing.two,
    flex: 1,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dropdownCreateButtonText: {
    color: AppPalette.foregroundOnBrand,
    flexShrink: 1,
    textAlign: "center",
  },
  dropdownSearchInput: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 40,
  },
  dropdownBadge: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  dropdownBadgeText: {
    fontWeight: "700",
  },
  actionButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Radius.control,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
