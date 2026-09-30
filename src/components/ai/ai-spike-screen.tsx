import { StyleSheet, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxPhoneContentWidth, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/localization-provider";

export function AISpikeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <ThemedView type="canvas" style={styles.container}>
      <View style={styles.content}>
        <View style={styles.heading}>
          <View style={[styles.icon, { backgroundColor: theme.primaryContainer }]}>
            <AppIcon color={theme.primary} name="cpu" size={24} />
          </View>
          <ThemedText type="title" style={styles.title}>
            {t("aiSpike.title")}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.description}>
            {t("aiSpike.nativeOnly")}
          </ThemedText>
        </View>
        <ThemedView
          type="surfaceMuted"
          style={styles.note}
        >
          <AppIcon color={theme.textSecondary} name="smartphone" size={20} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.noteCopy}>
            {t("aiSpike.nativeBuildHint")}
          </ThemedText>
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  content: {
    gap: Spacing.four,
    maxWidth: MaxPhoneContentWidth,
    padding: Spacing.four,
    width: "100%",
  },
  description: {
    textAlign: "center",
  },
  heading: {
    alignItems: "center",
    gap: Spacing.two,
  },
  icon: {
    alignItems: "center",
    borderRadius: Radius.card,
    height: 52,
    justifyContent: "center",
    marginBottom: Spacing.one,
    width: 52,
  },
  note: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Radius.control,
    flexDirection: "row",
    gap: Spacing.two,
    padding: Spacing.three,
  },
  noteCopy: {
    flex: 1,
  },
  title: {
    textAlign: "center",
  },
});
