import { Linking } from "react-native";
import { validTravelLink } from "./linkPolicy";
export { validTravelLink } from "./linkPolicy";
export async function openTravelLink(url: string) {
  if (!validTravelLink(url)) throw new Error("확인된 공식 링크가 아니에요.");
  try {
    await Linking.openURL(url);
  } catch {
    throw new Error(
      "페이지를 열지 못했어요. 네트워크와 브라우저를 확인해 주세요.",
    );
  }
}
