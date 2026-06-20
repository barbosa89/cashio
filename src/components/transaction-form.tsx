import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
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

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DROPDOWN_LIST_MODE, Spacing } from "@/constants/theme";
import { useCashioData } from "@/hooks/use-cashio-data";
import { useTheme } from "@/hooks/use-theme";
import { CashioValidationError } from "@/lib/cashio-repository";
import type { Category, TransactionType } from "@/lib/database";

type TransactionFormProps = {
  onSaved?: () => void;
};

type DropdownValue = number | string;

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
function TransactionForm({ onSaved }, ref) {
  const theme = useTheme();
  const { categories, tags, isLoading, addCategory, addTag, addTransaction } =
    useCashioData();
  const [transactionType, setTransactionType] =
    useState<TransactionType>("expense");
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
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const selectedTagBadgeBackground = theme.text;
  const selectedTagTextColor = theme.background;

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

  function handleError(error: unknown) {
    if (error instanceof CashioValidationError) {
      setMessage(error.message);
      return;
    }
    setMessage("No se pudo completar la acción.");
  }

  function resetForm() {
    setTransactionType("expense");
    setAmount(null);
    setDescription("");
    setSelectedCategoryId(null);
    setSelectedTagIds([]);
    setCategorySearch("");
    setTagSearch("");
    setIsCategoryOpen(false);
    setIsTagsOpen(false);
    setIsDatePickerOpen(false);
    setMessage("");
    setIsSaving(false);
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
        setMessage(`Categoría "${existingCategory.description}" seleccionada.`);
        return;
      }

      setMessage(
        `La categoría "${existingCategory.description}" no aplica para este tipo de registro.`,
      );
      return;
    }

    try {
      const created = await addCategory({
        description,
        type: transactionType,
      });
      if (created) {
        setSelectedCategoryId(created.id);
        setCategorySearch("");
        setIsCategoryOpen(false);
        setMessage(`Categoría "${created.description}" creada y seleccionada.`);
      }
    } catch (error) {
      handleError(error);
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
      setMessage(`Tag "${existingTag.description}" seleccionado.`);
      return;
    }

    try {
      const created = await addTag({ description });
      if (created) {
        setSelectedTagIds((current) =>
          current.includes(created.id) ? current : [...current, created.id],
        );
        setTagSearch("");
        setIsTagsOpen(false);
        setMessage(`Tag "${created.description}" creado y seleccionado.`);
      }
    } catch (error) {
      handleError(error);
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
        type: transactionType,
        amount: amount ?? 0,
        description,
        transactionDate,
        categoryId: selectedCategoryId ?? 0,
        tagIds: selectedTagIds,
      });
      resetForm();
      setMessage("Transacción guardada.");
      onSaved?.();
    } catch (error) {
      handleError(error);
    } finally {
      setIsSaving(false);
    }
  }

  function closeDropdowns() {
    setIsCategoryOpen(false);
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
    <ThemedView type="backgroundElement" style={styles.panel}>
      {(isCategoryOpen || isTagsOpen) && (
        <Pressable
          accessibilityLabel="Cerrar selector"
          onPress={closeDropdowns}
          style={styles.dropdownBackdrop}
        />
      )}

      <ThemedView type="backgroundSelected" style={styles.segmentedControl}>
        <SegmentButton
          active={transactionType === "expense"}
          label="Egreso"
          onPress={() => setTransactionType("expense")}
        />
        <SegmentButton
          active={transactionType === "income"}
          label="Ingreso"
          onPress={() => setTransactionType("income")}
        />
      </ThemedView>

      <Field label="Monto">
        <CurrencyInput
          delimiter="."
          keyboardType="numeric"
          minValue={0}
          onChangeValue={setAmount}
          placeholder="$ 0"
          placeholderTextColor={theme.textSecondary}
          precision={0}
          prefix="$ "
          separator=","
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.backgroundSelected },
          ]}
          value={amount}
        />
      </Field>

      <Field label="Fecha">
        <Pressable
          accessibilityLabel="Seleccionar fecha de la transacción"
          onPress={openDatePicker}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <View
            style={[
              styles.dateInput,
              { borderColor: theme.backgroundSelected },
            ]}
          >
            <ThemedText style={styles.dateInputText}>
              {transactionDate}
            </ThemedText>
            <AppIcon color={theme.text} name="calendar" size={20} />
          </View>
        </Pressable>
        {isDatePickerOpen && Platform.OS === "ios" && (
          <ThemedView type="background" style={styles.datePickerPanel}>
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
                <ThemedText type="smallBold">Cancelar</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={applyDraftDate}
                style={({ pressed }) => [styles.datePickerAction, pressed && styles.pressed]}
              >
                <ThemedText type="smallBold">Aplicar</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        )}
      </Field>

      <Field label="Descripción">
        <TextInput
          onChangeText={setDescription}
          placeholder="Opcional"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.backgroundSelected },
          ]}
          value={description}
        />
      </Field>

      <Field
        label="Categoría"
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
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
            },
          ]}
          customItemContainerStyle={[
            styles.dropdownCustomItem,
            { borderTopColor: theme.backgroundSelected },
          ]}
          customItemLabelStyle={styles.dropdownCustomItemText}
          items={categoryItems}
          labelStyle={styles.dropdownLabel}
          listItemContainerStyle={styles.dropdownItem}
          listItemLabelStyle={{ color: theme.text }}
          listMode={DROPDOWN_LIST_MODE}
          maxHeight={220}
          modalAnimationType="slide"
          modalContentContainerStyle={[
            styles.dropdownModal,
            { backgroundColor: theme.background },
          ]}
          onChangeSearchText={setCategorySearch}
          onOpen={() => setIsTagsOpen(false)}
          onSelectItem={handleSelectCategory}
          open={isCategoryOpen}
          placeholder="Buscar o seleccionar categoría"
          placeholderStyle={{ color: theme.textSecondary }}
          renderListItem={(props) => (
            <DropdownListItem
              createLabel="Crear categoría"
              itemProps={props}
            />
          )}
          searchPlaceholder="Buscar categoría"
          searchPlaceholderTextColor={theme.textSecondary}
          searchable
          searchTextInputProps={{ value: categorySearch }}
          searchTextInputStyle={[
            styles.dropdownSearchInput,
            {
              borderColor: theme.backgroundSelected,
              color: theme.text,
            },
          ]}
          selectedItemContainerStyle={{
            backgroundColor: theme.backgroundSelected,
          }}
          selectedItemLabelStyle={{ color: theme.text, fontWeight: "700" }}
          setOpen={setIsCategoryOpen}
          setValue={setCategoryDropdownValue}
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
            },
          ]}
          textStyle={{ color: theme.text }}
          value={selectedCategoryId}
          zIndex={isCategoryOpen ? 3000 : 1000}
          zIndexInverse={1000}
        />
      </Field>

      <Field
        label="Tags"
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
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
            },
          ]}
          customItemContainerStyle={[
            styles.dropdownCustomItem,
            { borderTopColor: theme.backgroundSelected },
          ]}
          customItemLabelStyle={styles.dropdownCustomItemText}
          items={tagItems}
          labelStyle={styles.dropdownLabel}
          listItemContainerStyle={styles.dropdownItem}
          listItemLabelStyle={{ color: theme.text }}
          listMode={DROPDOWN_LIST_MODE}
          maxHeight={220}
          modalAnimationType="slide"
          modalContentContainerStyle={[
            styles.dropdownModal,
            { backgroundColor: theme.background },
          ]}
          mode="BADGE"
          multiple
          multipleText={`${selectedTagIds.length} tags seleccionados`}
          onChangeSearchText={setTagSearch}
          onOpen={() => setIsCategoryOpen(false)}
          onSelectItem={handleSelectTags}
          open={isTagsOpen}
          placeholder="Buscar o seleccionar tags"
          placeholderStyle={{ color: theme.textSecondary }}
          renderListItem={(props) => (
            <DropdownListItem
              createLabel="Crear tag"
              itemProps={props}
            />
          )}
          searchPlaceholder="Buscar tag"
          searchPlaceholderTextColor={theme.textSecondary}
          searchable
          searchTextInputProps={{ value: tagSearch }}
          searchTextInputStyle={[
            styles.dropdownSearchInput,
            {
              borderColor: theme.backgroundSelected,
              color: theme.text,
            },
          ]}
          selectedItemContainerStyle={{
            backgroundColor: theme.backgroundSelected,
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
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
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
        label={isSaving ? "Guardando..." : "Guardar transacción"}
        onPress={handleSaveTransaction}
        primary
      />
    </ThemedView>
  );
});

function DropdownListItem({
  createLabel,
  itemProps,
}: {
  createLabel: string;
  itemProps: RenderListItemPropsInterface<DropdownValue>;
}) {
  const theme = useTheme();
  const disabled = itemProps.disabled || itemProps.selectable === false;
  const displayLabel = itemProps.custom
    ? `${createLabel} "${itemProps.label.trim()}"`
    : itemProps.label;

  function handlePress() {
    const onPressItem = itemProps.onPress as unknown as (
      item: ItemType<DropdownValue>,
      custom: boolean,
    ) => void;

    onPressItem(itemProps.item, itemProps.custom);
  }

  return (
    <Pressable
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
      {itemProps.custom && (
        <AppIcon color={theme.text} name="plus" size={16} />
      )}
      <ThemedText
        type={itemProps.custom || itemProps.isSelected ? "smallBold" : "small"}
        style={[
          styles.dropdownListItemText,
          itemProps.listItemLabelStyle,
          itemProps.custom && itemProps.customItemLabelStyle,
          itemProps.isSelected && itemProps.selectedItemLabelStyle,
          disabled && itemProps.disabledItemLabelStyle,
        ]}
      >
        {displayLabel}
      </ThemedText>
      {itemProps.isSelected && !itemProps.custom && <itemProps.TickIconComponent />}
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
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.segmentButton, pressed && styles.pressed]}
    >
      <ThemedView
        type={active ? "background" : "backgroundSelected"}
        style={styles.segmentButtonInner}
      >
        <ThemedText
          type="smallBold"
          themeColor={active ? "text" : "textSecondary"}
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
        type={primary ? "backgroundSelected" : "background"}
        style={styles.actionButton}
      >
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: Spacing.two,
    gap: Spacing.three,
    padding: Spacing.three,
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
    borderRadius: Spacing.two,
    flexDirection: "row",
    gap: Spacing.one,
    padding: Spacing.one,
  },
  segmentButton: {
    flex: 1,
  },
  segmentButtonInner: {
    alignItems: "center",
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
  },
  field: {
    gap: Spacing.two,
  },
  dropdownField: {
    position: "relative",
  },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dateInput: {
    alignItems: "center",
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
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
    borderRadius: Spacing.two,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  dropdownLabel: {
    fontWeight: "700",
  },
  dropdownMenu: {
    borderRadius: Spacing.two,
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
    minHeight: 44,
  },
  dropdownCustomItemText: {
    fontWeight: "700",
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
    borderRadius: Spacing.two,
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
