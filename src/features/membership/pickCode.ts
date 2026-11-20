import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { toByteArray } from "base64-js";
import { decode } from "jpeg-js";
import { recognizeCode } from "./recognize";

export async function pickCode(source: "camera" | "library") {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 1,
  };
  if (
    source === "camera" &&
    !(await ImagePicker.requestCameraPermissionsAsync()).granted
  ) {
    throw new Error(
      "촬영하려면 카메라 권한을 허용하거나 사진에서 등록해 주세요.",
    );
  }
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  const tempUris = new Set([asset.uri]);
  try {
    const scale = Math.min(1, 1800 / Math.max(asset.width, asset.height));
    const resize =
      scale < 1
        ? [
            {
              resize: {
                width: Math.max(1, Math.round(asset.width * scale)),
                height: Math.max(1, Math.round(asset.height * scale)),
              },
            },
          ]
        : [];
    const image = await manipulateAsync(asset.uri, resize, {
      format: SaveFormat.JPEG,
      compress: 0.95,
      base64: true,
    });
    tempUris.add(image.uri);
    if (!image.base64) throw new Error("사진을 읽지 못했어요.");
    const { data, width, height } = decode(toByteArray(image.base64), {
      useTArray: true,
      formatAsRGBA: false,
      maxResolutionInMP: 4,
      maxMemoryUsageInMB: 96,
    });
    const pixels = new Uint8ClampedArray(width * height);
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = (data[i * 3] + 2 * data[i * 3 + 1] + data[i * 3 + 2]) / 4;
    }
    return recognizeCode(pixels, width, height);
  } finally {
    for (const uri of tempUris) {
      try {
        if (uri.startsWith("blob:")) URL.revokeObjectURL(uri);
        else if (uri.startsWith("file://") && uri.startsWith(Paths.cache.uri))
          new File(uri).delete();
      } catch {
        /* Cache cleanup is best effort. */
      }
    }
  }
}
