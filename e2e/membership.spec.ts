import { expect, test } from "@playwright/test";

test("local membership barcode persists and can be removed", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "나중에 입력하기", exact: true }).click();
  await page.getByRole("tab", { name: "카드·쿠폰", exact: true }).click();
  await page.getByRole("button", { name: "멤버십", exact: true }).click();
  await page.getByRole("textbox", { name: "멤버십 이름" }).fill("Ponta");
  await page.getByRole("textbox", { name: "바코드 번호" }).fill("ABC123456");
  await page.getByRole("button", { name: "추가", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ponta 멤버십 열기" })).toBeVisible();

  await page.reload();
  await page.getByRole("tab", { name: "카드·쿠폰", exact: true }).click();
  await page.getByRole("button", { name: "멤버십", exact: true }).click();
  await page.getByRole("button", { name: "Ponta 멤버십 열기" }).click();
  await expect(page.getByText("ABC123456", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "멤버십 삭제", exact: true }).click();
  await page.getByRole("button", { name: "삭제 확인", exact: true }).click();
  await expect(page.getByText("등록된 멤버십이 없어요.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("imports a QR screenshot and presents the same code after restart", async ({ page }) => {
  const { BarcodeFormat, QRCodeWriter, QRCodeReader, BinaryBitmap, HybridBinarizer, RGBLuminanceSource } = await import("@zxing/library");
  const { encode } = await import("jpeg-js");
  const payload = "OFFLINE-TRAVEL-QR-".repeat(16);
  const photo = new QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, 480, 480, new Map());
  const data = Buffer.alloc(480 * 480 * 4, 255);
  for (let i = 0; i < 480 * 480; i++) if (photo.get(i % 480, Math.floor(i / 480))) data.fill(0, i * 4, i * 4 + 3);
  await page.goto("/");
  await page.getByRole("button", { name: "나중에 입력하기", exact: true }).click();
  const wallet = async () => {
    await page.getByRole("tab", { name: "카드·쿠폰", exact: true }).click();
    await page.getByRole("button", { name: "멤버십", exact: true }).click();
  };
  await wallet();
  const choosing = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "사진·스크린샷에서 인식" }).click();
  await (await choosing).setFiles({ name: "pass.jpg", mimeType: "image/jpeg", buffer: encode({width:480,height:480,data}, 95).data });
  await expect(page.getByLabel("저장한 QR 코드")).toBeVisible();
  await page.getByRole("textbox", { name: "멤버십 이름" }).fill("여행 QR");
  await page.getByRole("button", { name: "추가", exact: true }).click();
  await expect(page.getByRole("button", { name: "여행 QR 멤버십 열기" })).toBeVisible();
  await page.reload();
  await wallet();
  await page.getByRole("button", { name: "여행 QR 멤버십 열기" }).click();
  const screenshot = await page.getByLabel("저장한 QR 코드").screenshot({type:"jpeg",quality:100});
  const { decode } = await import("jpeg-js");
  const {width,height,data:rgba} = decode(screenshot);
  const pixels = Uint8ClampedArray.from({length:width*height},(_,i)=>rgba[i*4]);
  expect(new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,width,height)))).getText()).toBe(payload);
});
