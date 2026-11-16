import { test, type Page } from "@playwright/test";

/**
 * Not a test: it walks the web build and saves one picture per screen so a
 * design change can be looked at without a device. Each step is best effort,
 * so one renamed control does not lose the other pictures.
 */
const out = "screens-out";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const field = (page: Page, name: string) =>
  page.getByRole("textbox", { name, exact: true });
const tab = (page: Page, name: string) =>
  page.getByRole("tab", { name, exact: true });

async function step(label: string, run: () => Promise<void>) {
  try {
    await run();
  } catch (error) {
    console.log(`skipped: ${label}: ${String(error).split("\n")[0]}`);
  }
}
async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage });
}

test("capture every main screen", async ({ page }) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(8_000);
  await page.goto("/");

  await step("onboarding", async () => {
    await shot(page, "01-start");
    await field(page, "닉네임").fill("여행자");
    await field(page, "상의 사이즈").fill("M");
    await field(page, "하의 사이즈").fill("30");
    await field(page, "신발 사이즈").fill("260");
    await shot(page, "02-profile-filled", true);
    await button(page, "내 여행 시작하기").click();
  });

  await step("today", async () => {
    await tab(page, "오늘").click();
    await shot(page, "10-today");
    await shot(page, "11-today-full", true);
  });

  await step("translate", async () => {
    await tab(page, "번역").click();
    await shot(page, "20-translate");
    await button(page, "사이즈/재고").click();
    await button(page, "이 제품 M 사이즈도 있나요?").click();
    await shot(page, "21-translate-phrase", true);
  });
  await step("show screen", async () => {
    await button(page, "선택한 문장 크게 보기").click();
    await shot(page, "22-show");
    await button(page, "はい (네)").click();
    await shot(page, "23-show-answer");
    await button(page, "직원 쪽으로 뒤집기").click();
    await shot(page, "24-show-facing");
    await button(page, "내 쪽으로 되돌리기").click();
    await button(page, "입어 봐도 될까요?").click();
    await shot(page, "25-show-follow-up");
    await button(page, "닫기").click();
  });
  await step("today after showing", async () => {
    await tab(page, "오늘").click();
    await shot(page, "12-today-last-shown");
  });

  await step("pay", async () => {
    await tab(page, "결제").click();
    await shot(page, "30-pay");
    await field(page, "현재 환율 (100 JPY → KRW)").fill("940");
    await button(page, "환율 저장").click();
    await field(page, "상품 금액 (엔)").fill("11000");
    await shot(page, "31-pay-filled", true);
  });
  await step("tax-free guide", async () => {
    await button(page, "새 면세 안내").click();
    await shot(page, "32-taxfree", true);
  });

  await step("trip menu", async () => {
    await tab(page, "여행").click();
    await shot(page, "40-trip-menu");
    await field(page, "여행 기능 찾기").fill("택시");
    await shot(page, "41-trip-search");
    await field(page, "여행 기능 찾기").fill("");
  });
  await step("trip dining", async () => {
    await button(page, "식당 주문·알레르기").click();
    await shot(page, "42-trip-dining");
  });
  await step("trip emergency", async () => {
    await button(page, "긴급 SOS").first().click();
    await shot(page, "43-emergency", true);
  });

  await step("wallet", async () => {
    await tab(page, "카드·쿠폰").click();
    await shot(page, "50-wallet-transit");
    await button(page, "멤버십").click();
    await shot(page, "51-wallet-membership");
    await button(page, "쿠폰·혜택").click();
    await shot(page, "52-wallet-coupons");
  });

  await step("profile and dark theme", async () => {
    await button(page, "사용자 페이지").click();
    await shot(page, "60-profile", true);
    await page.getByRole("radio", { name: "다크", exact: true }).click();
    await button(page, "변경사항 저장").click();
    await tab(page, "오늘").click();
    await shot(page, "70-today-dark");
    await tab(page, "여행").click();
    await shot(page, "71-trip-menu-dark");
    await tab(page, "결제").click();
    await shot(page, "72-pay-dark");
  });
});
