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
