import { Modal, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Button, IconButton, Label, styles } from "./components";
import { useTheme } from "./theme";
import { translationLanguage } from "./TranslationDisplay";

export interface ShowCardContent {
  japanese: string;
  reading?: string;
  korean?: string;
}

/**
 * Full-screen card to hand the phone to staff. One layout for every
 * "show this" moment (dining, manners, emergencies) so it is always read
 * the same way: Japanese large, reading below, Korean meaning last.
 * The modal brings its own SafeAreaProvider: a native modal is a separate
 * root and does not receive the app's insets.
 */
export function ShowCard({
  content,
  onClose,
  heading = "직원에게 보여주세요",
  closeLabel = "닫기",
  doneLabel = "확인 완료",
}: {
  content: ShowCardContent | null;
  onClose: () => void;
  heading?: string;
  closeLabel?: string;
  doneLabel?: string;
}) {
  const c = useTheme();
  return (
    <Modal
      visible={!!content}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <SafeAreaView
          accessibilityViewIsModal
          style={{ flex: 1, backgroundColor: c.surface }}
        >
          <View
            style={[
              styles.between,
              { paddingHorizontal: 20, paddingTop: 8, flexWrap: "nowrap" },
            ]}
          >
            <Label muted size={14} weight="700" style={{ flexShrink: 1 }}>
              {heading}
            </Label>
            <IconButton name="close" label={closeLabel} onPress={onClose} />
          </View>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingHorizontal: 28,
              paddingVertical: 24,
              gap: 18,
            }}
          >
            <Text
              selectable
              {...translationLanguage("ja")}
              style={{
                color: c.ink,
                fontSize: 34,
                lineHeight: 52,
                fontWeight: "600",
              }}
            >
              {content?.japanese}
            </Text>
            {!!content?.reading && (
              <Text
                selectable
                style={{ color: c.muted, fontSize: 17, lineHeight: 27 }}
              >
                {content.reading}
              </Text>
            )}
            {!!content?.korean && (
              <View
                style={{
                  borderTopWidth: 1,
                  borderColor: c.line,
                  paddingTop: 16,
                }}
              >
                <Text
                  {...translationLanguage("ko")}
                  style={{ color: c.muted, fontSize: 14, lineHeight: 22 }}
                >
                  {content.korean}
                </Text>
              </View>
            )}
          </ScrollView>
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <Button label={doneLabel} primary onPress={onClose} />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
