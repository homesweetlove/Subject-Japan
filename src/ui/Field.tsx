import { TextInput, View } from "react-native";
import { Label } from "./components";
import { useTheme } from "./theme";
export function Field({
  label,
  value,
  onChange,
  numeric = false,
  editable = true,
  multiline = false,
  maxLength = 100,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  editable?: boolean;
  multiline?: boolean;
  maxLength?: number;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Label size={13} muted>
        {label}
      </Label>
      <TextInput
        editable={editable}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        maxLength={maxLength}
        keyboardType={numeric ? "decimal-pad" : "default"}
        multiline={multiline}
        style={{
          color: c.ink,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: 12,
          padding: 13,
          fontSize: 16,
          minHeight: multiline ? 110 : 48,
        }}
      />
    </View>
  );
}
