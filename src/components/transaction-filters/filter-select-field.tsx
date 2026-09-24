import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { StyleSheet, View } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { DROPDOWN_LIST_MODE, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type FilterSelectItem = {
  label: string;
  value: number;
};

type FilterSelectFieldProps = {
  items: FilterSelectItem[];
  label: string;
  onOpen: () => void;
  onValueChange: (value: number | null) => void;
  open: boolean;
  placeholder: string;
  resetSignal: number;
  searchPlaceholder: string;
  setOpen: Dispatch<SetStateAction<boolean>>;
  value: number | null;
  zIndex: number;
};

export function FilterSelectField({
  items,
  label,
  onOpen,
  onValueChange,
  open,
  placeholder,
  resetSignal,
  searchPlaceholder,
  setOpen,
  value,
  zIndex,
}: FilterSelectFieldProps) {
  const theme = useTheme();
  const [searchText, setSearchText] = useState("");

  const selectedValue = value ?? 0;
  const containerStyle = useMemo(
    () => [styles.field, { zIndex: open ? 30 : 10 }],
    [open],
  );

  useEffect(() => {
    setSearchText("");
  }, [resetSignal]);

  function setFilterValue(nextValue: (currentValue: number) => number | null) {
    const next = nextValue(selectedValue);
    onValueChange(next === 0 ? null : next);
  }

  return (
    <View style={containerStyle}>
      <ThemedText type="smallBold">{label}</ThemedText>
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
        items={items}
        labelStyle={styles.dropdownLabel}
        listItemContainerStyle={styles.dropdownItem}
        listItemLabelStyle={{ color: theme.text }}
        listMode={DROPDOWN_LIST_MODE}
        maxHeight={180}
        modalAnimationType="slide"
        modalContentContainerStyle={[
          styles.dropdownModal,
          { backgroundColor: theme.surface },
        ]}
        onChangeSearchText={setSearchText}
        onOpen={onOpen}
        open={open}
        placeholder={placeholder}
        placeholderStyle={{ color: theme.textSecondary }}
        searchPlaceholder={searchPlaceholder}
        searchPlaceholderTextColor={theme.textSecondary}
        searchable
        searchTextInputProps={{ value: searchText }}
        searchTextInputStyle={[
          styles.dropdownSearchInput,
          { backgroundColor: theme.surfaceRaised, borderColor: theme.border, color: theme.text },
        ]}
        selectedItemContainerStyle={{
          backgroundColor: theme.primaryContainer,
        }}
        selectedItemLabelStyle={{
          color: theme.text,
          fontWeight: "700",
        }}
        setOpen={setOpen}
        setValue={setFilterValue}
        style={[
          styles.dropdown,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
        textStyle={{ color: theme.text }}
        value={selectedValue}
        zIndex={zIndex}
        zIndexInverse={1000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    borderRadius: Radius.control,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  dropdownItem: {
    minHeight: 44,
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
  dropdownSearchInput: {
    borderRadius: Radius.control,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 40,
  },
  field: {
    gap: Spacing.two,
  },
});
