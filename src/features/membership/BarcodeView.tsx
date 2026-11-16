import { Text, View } from "react-native";
import { barcodeModules, barcodeRuns } from "./barcode";

export function BarcodeView({
  value,
  compact = false,
}: {
  value: string;
  compact?: boolean;
}) {
  const encoded = barcodeModules(value);
  const runs = barcodeRuns(encoded.modules);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${encoded.label} 바코드 ${encoded.value}`}
      style={{
        backgroundColor: "#FFFFFF",
        paddingHorizontal: compact ? 10 : 16,
        paddingTop: compact ? 10 : 18,
        paddingBottom: compact ? 8 : 14,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#E5E5E5",
        gap: compact ? 6 : 10,
      }}
    >
      <View
        style={{
          height: compact ? 58 : 104,
          flexDirection: "row",
          width: "100%",
          overflow: "hidden",
        }}
      >
        {runs.map((run, index) => (
          <View
            key={index}
            style={{
              flexGrow: run.width,
              flexBasis: 0,
              height: "100%",
              backgroundColor: run.bar ? "#050505" : "transparent",
            }}
          />
        ))}
      </View>
      <Text
        selectable
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          color: "#111111",
          textAlign: "center",
          fontSize: compact ? 12 : 17,
          fontWeight: "600",
          letterSpacing: compact ? 1.2 : 2,
        }}
      >
        {encoded.value}
      </Text>
      {!compact ? (
        <Text style={{ color: "#6B6B6B", textAlign: "center", fontSize: 10 }}>
          {encoded.label}
        </Text>
      ) : null}
    </View>
  );
}
