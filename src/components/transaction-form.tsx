import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    Pressable,
    StyleSheet,
    TextInput,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import CurrencyInput from "react-native-currency-input";
import DropDownPicker from "react-native-dropdown-picker";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useCashioData } from "@/hooks/use-cashio-data";
import { useTheme } from "@/hooks/use-theme";
import { CashioValidationError } from "@/lib/cashio-repository";
import type { Category, TransactionType } from "@/lib/database";

type TransactionFormProps = {
  onSaved?: () => void;
};

export type TransactionFormHandle = {
  reset: () => void;
};

function canUseCategory(category: Category, transactionType: TransactionType) {
  return (
    category.type === null ||
    category.type === "both" ||
    category.type === transactionType
  );
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
    new Date().toISOString().slice(0, 10),
  );
  const [categorySearch, setCategorySearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
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
    () =>
      availableCategories.map((category) => ({
        label: category.description,
        value: category.id,
      })),
    [availableCategories],
  );

  const tagItems = useMemo(
    () => tags.map((tag) => ({ label: tag.description, value: tag.id })),
    [tags],
  );

  const categorySearchMatchesExisting = useMemo(
    () =>
      categories.some(
        (category) =>
          category.description.trim().toLocaleLowerCase() ===
          categorySearch.trim().toLocaleLowerCase(),
      ),
    [categories, categorySearch],
  );

  const tagSearchMatchesExisting = useMemo(
    () =>
      tags.some(
        (tag) =>
          tag.description.trim().toLocaleLowerCase() ===
          tagSearch.trim().toLocaleLowerCase(),
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
    setMessage("");
    setIsSaving(false);
    setTransactionDate(new Date().toISOString().slice(0, 10));
  }

  useImperativeHandle(ref, () => ({ reset: resetForm }));

  async function handleCreateCategory() {
    try {
      const created = await addCategory({
        description: categorySearch,
        type: transactionType,
      });
      if (created) {
        setSelectedCategoryId(created.id);
        setCategorySearch("");
        setIsCategoryOpen(false);
        setMessage(`Categoría "${created.description}" creada.`);
      }
    } catch (error) {
      handleError(error);
    }
  }

  async function handleCreateTag() {
    try {
      const created = await addTag({ description: tagSearch });
      if (created) {
        setSelectedTagIds((current) => [...current, created.id]);
        setTagSearch("");
        setIsTagsOpen(false);
        setMessage(`Tag "${created.description}" creado.`);
      }
    } catch (error) {
      handleError(error);
    }
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

      <Field label="Fecha">
        <TextInput
          onChangeText={setTransactionDate}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.backgroundSelected },
          ]}
          value={transactionDate}
        />
      </Field>

      <Field
        label="Categoría"
        style={[styles.dropdownField, { zIndex: isCategoryOpen ? 30 : 10 }]}
      >
        <DropDownPicker<number>
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
          items={categoryItems}
          labelStyle={styles.dropdownLabel}
          listItemContainerStyle={styles.dropdownItem}
          listItemLabelStyle={{ color: theme.text }}
          listMode="SCROLLVIEW"
          maxHeight={220}
          onChangeSearchText={setCategorySearch}
          onOpen={() => setIsTagsOpen(false)}
          onSelectItem={() => setCategorySearch("")}
          open={isCategoryOpen}
          placeholder="Buscar o seleccionar"
          placeholderStyle={{ color: theme.textSecondary }}
          searchPlaceholder="Buscar o crear"
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
          setValue={setSelectedCategoryId}
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
        {!!categorySearch.trim() && !categorySearchMatchesExisting && (
          <ActionButton
            label={`Crear "${categorySearch.trim()}"`}
            onPress={handleCreateCategory}
          />
        )}
      </Field>

      <Field
        label="Tags"
        style={[styles.dropdownField, { zIndex: isTagsOpen ? 30 : 10 }]}
      >
        <DropDownPicker<number>
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
          items={tagItems}
          labelStyle={styles.dropdownLabel}
          listItemContainerStyle={styles.dropdownItem}
          listItemLabelStyle={{ color: theme.text }}
          listMode="SCROLLVIEW"
          maxHeight={220}
          mode="BADGE"
          multiple
          multipleText={`${selectedTagIds.length} tags seleccionados`}
          onChangeSearchText={setTagSearch}
          onOpen={() => setIsCategoryOpen(false)}
          onSelectItem={() => setTagSearch("")}
          open={isTagsOpen}
          placeholder="Buscar o seleccionar"
          placeholderStyle={{ color: theme.textSecondary }}
          searchPlaceholder="Buscar o crear"
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
          setValue={setSelectedTagIds}
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
        {!!tagSearch.trim() && !tagSearchMatchesExisting && (
          <ActionButton
            label={`Crear "${tagSearch.trim()}"`}
            onPress={handleCreateTag}
          />
        )}
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
  dropdownItem: {
    minHeight: 44,
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
