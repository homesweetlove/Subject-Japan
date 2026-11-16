import type { ReactNode } from "react";
import { Modal, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { Translation } from "../domain/models";
import { Button } from "./components";
import { useTheme } from "./theme";

// React Native Web does not map the native accessibilityLanguage prop to lang.
export function translationLanguage(language: Translation["target"]) {
  const tag = language === "ja" ? "ja-JP" : "ko-KR";
  return {
    accessibilityLanguage: tag,
    ...(Platform.OS === "web" ? { lang: tag } : {}),
  };
}

/** Keep the close action reachable even at accessibility text sizes. */
export function TranslationDisplay({
  value,
  onClose,
  children,
  closeLabel = "큰 화면 닫기",
}: {
  value: Translation | null;
  onClose: () => void;
  children?: ReactNode;
  closeLabel?: string;
}) {
  const c = useTheme();
  return (
    <Modal visible={!!value} onRequestClose={onClose} animationType="fade">
      <SafeAreaProvider>
        <SafeAreaView
          accessibilityViewIsModal
          style={{ flex: 1, backgroundColor: c.bg }}
        >
          <View style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
            <Button label={closeLabel} onPress={onClose} />
          </View>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              padding: 24,
              gap: 24,
            }}
          >
            <Text
              selectable
              {...translationLanguage(value?.target ?? "ja")}
              style={{
                color: c.ink,
                fontSize: 40,
                lineHeight: 60,
                fontWeight: "700",
              }}
            >
              {value?.translated}
            </Text>
            <Text
              selectable
              {...translationLanguage(value?.source ?? "ko")}
              style={{ color: c.muted, fontSize: 18, lineHeight: 28 }}
            >
              {value?.original}
            </Text>
            {children}
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
