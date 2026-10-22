import { expect, test, type Page } from "@playwright/test";

const key = "subject-japan.local.v1";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const field = (page: Page, name: string) =>
  page.getByRole("textbox", { name, exact: true });
const tab = (page: Page, name: string) =>
  page.getByRole("tab", { name, exact: true });
const saved = (page: Page) =>
  page.evaluate(
    (storageKey) => JSON.parse(localStorage.getItem(storageKey) ?? "null"),
    key,
  );

/** Real AsyncStorage failures, without a test-only application/provider branch. */
async function failWrites(page: Page, fail: boolean) {
  await page.evaluate(
    ({ storageKey, fail }) => {
      const host = window as typeof window & {
        shoppingStorage?: { fail: boolean; attempts: number };
      };
      if (!host.shoppingStorage) {
        host.shoppingStorage = { fail: false, attempts: 0 };
        const write = Storage.prototype.setItem;
        Storage.prototype.setItem = function (name, value) {
          if (name === storageKey) {
            host.shoppingStorage!.attempts++;
            if (host.shoppingStorage!.fail)
              throw new DOMException("Storage full", "QuotaExceededError");
          }
          return write.call(this, name, value);
        };
      }
      host.shoppingStorage.fail = fail;
      host.shoppingStorage.attempts = 0;
    },
    { storageKey: key, fail },
  );
}

async function start(page: Page) {
  await page.goto("/");
  await button(page, "나중에 입력하기").click();
  await tab(page, "번역").click();
}

test("sizes retain units, trim on save, display Japanese, copy and survive reload", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await field(page, "닉네임").fill("  여행자  ");
  await field(page, "상의 사이즈").fill("  M  ");
  await field(page, "하의 사이즈").fill("28 inch");
  await field(page, "신발 사이즈").fill("24 cm");
  await button(page, "내 여행 시작하기").click();
  await tab(page, "번역").click();
  await button(page, "사이즈/재고").click();
  await button(page, "매우 정중").click();
  await button(page, "이 제품 M 사이즈도 있나요?").click();
  await button(page, "선택한 문장 크게 보기").click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("こちらの商品のMサイズはございますか？", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("こちらの商品のMサイズはございますか？", { exact: true }),
  ).toHaveAttribute("lang", "ja-JP");
  await dialog
    .getByRole("button", { name: "즐겨찾기 저장", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "즐겨찾기 해제", exact: true }),
  ).toBeEnabled();
  await dialog
    .getByRole("button", { name: "번역 결과 복사", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("こちらの商品のMサイズはございますか？");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await button(page, "이 바지 28 inch 사이즈도 있나요?").click();
  await button(page, "선택한 문장 크게 보기").click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("こちらのパンツの28 inchサイズはございますか？", {
        exact: true,
      }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "닫기", exact: true })
    .click();
  await button(page, "캐주얼").click();
  await button(page, "이 신발 24 cm 사이즈도 있나요?").click();
  await button(page, "선택한 문장 크게 보기").click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("この靴の24 cmサイズはある？", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await tab(page, "번역").click();
  await tab(page, "즐겨찾기").click();
  await expect(
    page.getByText("こちらの商品のMサイズはございますか？", { exact: true }),
  ).toBeVisible();
  await button(page, "사용자 페이지").click();
  await expect(field(page, "닉네임")).toHaveValue("여행자");
  await expect(field(page, "상의 사이즈")).toHaveValue("M");
  await expect(field(page, "하의 사이즈")).toHaveValue("28 inch");
  await expect(field(page, "신발 사이즈")).toHaveValue("24 cm");
  expect(errors).toEqual([]);
});

test("onboarding quota failure retains draft and repeated save/skip taps write once", async ({
  page,
}) => {
  await page.goto("/");
  await field(page, "상의 사이즈").fill("95");
  await failWrites(page, true);
  await button(page, "내 여행 시작하기").click();
  await expect(page.getByRole("alert")).toContainText("저장하지 못했어요");
  await expect(field(page, "상의 사이즈")).toHaveValue("95");
  expect(await saved(page)).toBeNull();
  await failWrites(page, false);
  // Both events occur before the async save resolves.
  await button(page, "내 여행 시작하기").evaluate((element) => {
    const skip = document.querySelector<HTMLElement>(
      '[aria-label="나중에 입력하기"]',
    );
    (element as HTMLElement).click();
    (element as HTMLElement).click();
    skip?.click();
  });
  await expect(button(page, "사용자 페이지")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { shoppingStorage: { attempts: number } })
          .shoppingStorage.attempts,
    ),
  ).toBe(1);
  expect((await saved(page)).profile.sizes.top).toBe("95");
  await page.reload();
  await button(page, "사용자 페이지").click();
  await expect(field(page, "상의 사이즈")).toHaveValue("95");
});

test("failed edit and reset preserve committed data, then retries persist", async ({
  page,
}) => {
  await start(page);
  await button(page, "내 사이즈 프로필 열기").click();
  await field(page, "상의 사이즈").fill("L");
  await failWrites(page, true);
  await button(page, "변경사항 저장").click();
  await expect(page.getByRole("alert")).toContainText("저장하지 못했어요");
  await expect(field(page, "상의 사이즈")).toHaveValue("L");
  expect((await saved(page)).profile.sizes.top).toBe("");
  await failWrites(page, false);
  await button(page, "변경사항 저장").click();
  await button(page, "사용자 페이지").click();
  await expect(field(page, "상의 사이즈")).toHaveValue("L");
  await failWrites(page, true);
  await button(page, "기기에 저장한 모든 정보 삭제").click();
  await button(page, "모두 삭제").click();
  await expect(page.getByRole("alert")).toContainText("삭제하지 못했어요");
  expect((await saved(page)).profile.sizes.top).toBe("L");
  await failWrites(page, false);
  await button(page, "모두 삭제").click();
  await expect(button(page, "내 여행 시작하기")).toBeVisible();
  await page.reload();
  await expect(field(page, "상의 사이즈")).toHaveValue("");
});

test("history and favorite write failures keep the phrase usable and allow retry", async ({
  page,
}) => {
  await start(page);
  await failWrites(page, true);
  await button(page, "입어 봐도 될까요?").click();
  await expect(page.getByRole("alert")).toContainText(
    "문장은 준비했지만 기록을 저장하지 못했어요",
  );
  expect((await saved(page)).history).toEqual([]);
  await button(page, "선택한 문장 크게 보기").click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("試着してもいいですか？", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "즐겨찾기 저장", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("저장하지 못했어요");
  await expect(
    dialog.getByRole("button", { name: "즐겨찾기 저장", exact: true }),
  ).toBeEnabled();
  expect((await saved(page)).favorites).toEqual([]);
  await failWrites(page, false);
  await dialog
    .getByRole("button", { name: "즐겨찾기 저장", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "즐겨찾기 해제", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await tab(page, "번역").click();
  await tab(page, "즐겨찾기").click();
  await expect(
    page.getByText("試着してもいいですか？", { exact: true }),
  ).toBeVisible();
});

test("320px dark display keeps large text scrollable and close keyboard-accessible", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await field(page, "닉네임").focus();
  await page.keyboard.press("Enter");
  await expect(field(page, "상의 사이즈")).toBeFocused();
  await field(page, "상의 사이즈").fill("M");
  await page.keyboard.press("Enter");
  await expect(field(page, "하의 사이즈")).toBeFocused();
  await page.getByRole("radio", { name: "다크", exact: true }).click();
  await button(page, "내 여행 시작하기").click();
  await tab(page, "번역").click();
  await button(page, "사이즈/재고").click();
  await button(page, "이 제품 M 사이즈도 있나요?").click();
  await button(page, "선택한 문장 크게 보기").click();
  const dialog = page.getByRole("dialog");
  const translated = dialog.getByText("この商品のMサイズはありますか？", {
    exact: true,
  });
  await expect(translated).toHaveCSS("color", "rgb(242, 239, 233)");
  // Browser text enlargement exercises reflow; OS Dynamic Type still needs a device.
  await translated.evaluate((element) => {
    (element as HTMLElement).style.fontSize = "76px";
    (element as HTMLElement).style.lineHeight = "120px";
  });
  const close = dialog.getByRole("button", { name: "닫기", exact: true });
  await expect(close).toBeInViewport();
  expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("shopping-dark-large-text.png"),
  });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(button(page, "선택한 문장 크게 보기")).toBeFocused();
});
