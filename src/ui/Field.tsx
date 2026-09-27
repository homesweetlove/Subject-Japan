import { useState } from "react";
import { TextInput, View } from "react-native";
import { Label } from "./components";
import { radius, useTheme } from "./theme";
export function Field({
  label,
  value,
  onChange,
  numeric = false,
  editable = true,
  multiline = false,
  maxLength = 100,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  editable?: boolean;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  const c = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Label size={13} weight="600" muted>
        {label}
      </Label>
      <TextInput
        editable={editable}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        keyboardType={numeric ? "decimal-pad" : "default"}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          color: editable ? c.ink : c.muted,
          backgroundColor: focused ? c.surface : c.soft,
          borderColor: focused ? c.accent : "transparent",
          borderWidth: 1.5,
          outlineWidth: 0,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          minHeight: multiline ? 110 : 50,
        }}
      />
    </View>
  );
}
