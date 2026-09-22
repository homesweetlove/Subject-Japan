import { useState, type ComponentProps } from "react";
import { View } from "react-native";
import { Choice } from "../../ui/Choice";
import { TranslateScreen } from "./TranslateScreen";
import { MediaTranslate } from "./MediaTranslate";
export function TranslationHub(props: ComponentProps<typeof TranslateScreen>) {
  const [mode, setMode] = useState<"text" | "camera" | "voice">("text");
  return (
    <View style={{ gap: 24 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["text", "camera", "voice"] as const).map((m, i) => (
          <Choice
            key={m}
            label={["텍스트", "카메라 번역", "음성 대화"][i]}
            selected={mode === m}
            onPress={() => setMode(m)}
          />
        ))}
      </View>
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
