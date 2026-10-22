import { test, expect } from "@playwright/test";

test("missing FX never invents KRW values and manual edits supersede a pending response", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "나중에 입력하기", exact: true })
    .click();
  await page.getByRole("tab", { name: "결제", exact: true }).click();
  await expect(
    page.getByText("원화 환산을 보려면 환율을 입력하거나 가져와 주세요.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("약 ₩900", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "동전·더치페이", exact: true })
    .click();
  await expect(
    page.getByText("원화 환산을 보려면 결제·할인에서 환율을 입력해 주세요.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "결제·할인", exact: true }).click();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("https://api.frankfurter.dev/**", async (route) => {
    await gate;
    await route
      .fulfill({
        contentType: "application/json",
        body: JSON.stringify([
          { base: "JPY", quote: "KRW", rate: 10, date: "2026-10-22" },
        ]),
      })
      .catch(() => {});
  });
  const request = page.waitForRequest("https://api.frankfurter.dev/**");
  await page
    .getByRole("button", { name: "최신 환율 새로고침", exact: true })
    .click();
  await request;
  const field = page.getByRole("textbox", {
    name: "현재 환율 (100 JPY → KRW)",
    exact: true,
  });
  await field.fill("850");
  await page.getByRole("button", { name: "환율 저장", exact: true }).click();
  await expect(
    page.getByText("환율을 기기에 저장했어요.", { exact: true }),
  ).toBeVisible();
  release();
  await page.reload();
  await page.getByRole("tab", { name: "결제", exact: true }).click();
  await expect(field).toHaveValue("850");
});
