import { useState, type ComponentProps } from "react";
import { View } from "react-native";
import { SubNav } from "../../ui/components";
import { TranslateScreen } from "./TranslateScreen";
import { MediaTranslate } from "./MediaTranslate";
export function TranslationHub(props: ComponentProps<typeof TranslateScreen>) {
  const [mode, setMode] = useState<"text" | "camera" | "voice">("text");
  return (
    <View style={{ gap: 22 }}>
      <SubNav
        items={[
          { key: "text", label: "텍스트", icon: "create-outline" },
          { key: "camera", label: "카메라 번역", icon: "camera-outline" },
          { key: "voice", label: "음성 대화", icon: "mic-outline" },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === "text" ? (
        <TranslateScreen {...props} />
      ) : (
        <MediaTranslate
          key={mode}
          mode={mode}
          state={props.state}
          onRecord={props.onRecord}
          onFavorite={props.onFavorite}
        />
      )}
    </View>
  );
}
