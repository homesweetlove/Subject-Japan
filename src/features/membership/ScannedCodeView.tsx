import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { ScannedCode } from "./scannedCode";

export function ScannedCodeView({ code }: { code: ScannedCode }) {
  const { bits, width, kind } = code;
  const qr = kind === "qr";
  const height = qr ? width : Math.ceil(width / 3);
  const margin = qr ? 4 : Math.max(12, Math.ceil(width * 0.12));
  const path = useMemo(() => {
    const segments = [];
    for (let start = 0; start < bits.length; start += width) {
      for (const run of bits.slice(start, start + width).matchAll(/1+/g)) {
        const length = run[0].length;
        segments.push(
          `M${run.index} ${start / width}h${length}v${qr ? 1 : height}h-${length}z`,
        );
      }
    }
    return segments.join("");
  }, [bits, width, qr, height]);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={qr ? "저장한 QR 코드" : "저장한 바코드"}
      style={{
        backgroundColor: "white",
        width: "100%",
        aspectRatio: qr ? 1 : 2.7,
      }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`${-margin} ${qr ? -margin : -4} ${width + margin * 2} ${height + (qr ? margin * 2 : 8)}`}
      >
        <Path d={path} fill="black" />
      </Svg>
    </View>
  );
}
