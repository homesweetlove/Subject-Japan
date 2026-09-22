import { test, expect } from "@playwright/test";

test("profile → personalized phrase → favorites → reload → edit → clear", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const external: string[] = [];
  page.on("request", (req) => {
    if (
      !req.url().startsWith("http://127.0.0.1:4173") &&
      !req.url().startsWith("data:")
    )
      external.push(req.url());
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "닉네임", exact: true })
    .fill("여행자");
  await page
    .getByRole("textbox", { name: "상의 사이즈", exact: true })
    .fill("44");
  await page
    .getByRole("textbox", { name: "하의 사이즈", exact: true })
    .fill("28 inch");
  await page
    .getByRole("textbox", { name: "신발 사이즈", exact: true })
    .fill("24 cm");
  await page
    .getByRole("button", { name: "내 여행 시작하기", exact: true })
    .click();
  await expect(
    page.getByText("말이 통하는 여행", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "사이즈/재고", exact: true }).click();
  await page
    .getByRole("button", { name: "이 제품 44 사이즈도 있나요?", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "번역할 문장", exact: true }),
  ).toHaveValue("이 제품 44 사이즈도 있나요?");
  await page
    .getByRole("button", { name: "즐겨찾기 저장", exact: true })
    .click();
  await page
    .getByRole("button", { name: "번역 결과 복사", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("この商品の44サイズはありますか？");
  await page
    .getByRole("button", { name: "번역문 크게 보기", exact: true })
    .click();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page
    .getByRole("button", { name: "원문과 번역문 바꾸기", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "번역할 문장", exact: true }),
  ).toHaveValue("この商品の44サイズはありますか？");
  await page.reload();
  await page.getByRole("tab", { name: "즐겨찾기", exact: true }).click();
  await expect(
    page.getByText("この商品の44サイズはありますか？", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "사용자 페이지", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "상의 사이즈", exact: true }),
  ).toHaveValue("44");
  await page
    .getByRole("textbox", { name: "상의 사이즈", exact: true })
    .fill("M");
  await page.getByRole("radio", { name: "다크", exact: true }).click();
  await page
    .getByRole("button", { name: "변경사항 저장", exact: true })
    .click();
  await page.getByRole("button", { name: "사이즈/재고", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "이 제품 M 사이즈도 있나요?",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "이 제품 M 사이즈도 있나요?", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/translate-dark.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "최근 기록", exact: true }).click();
  await page
    .getByRole("button", { name: "최근 기록 지우기", exact: true })
    .click();
  await page
    .getByRole("button", { name: "최근 기록 삭제 확인", exact: true })
    .click();
  await page.getByRole("tab", { name: "즐겨찾기", exact: true }).click();
  await expect(
    page.getByText("この商品の44サイズはありますか？", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "사용자 페이지", exact: true })
    .click();
  await page
    .getByRole("button", { name: "기기에 저장한 모든 정보 삭제", exact: true })
    .click();
  await page.getByRole("button", { name: "모두 삭제", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "상의 사이즈", exact: true }),
  ).toHaveValue("");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("small screen, explicit fallback, manual Japanese and navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "나중에 입력하기", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "번역할 문장", exact: true })
    .fill("내일 몇 시에 문을 여나요?");
  await page.getByRole("button", { name: "번역하기", exact: true }).click();
  await expect(
    page.getByText(
      "자유 입력 번역은 Android·iPhone 전용 앱에서 사용할 수 있어요. 여기서는 아래 여행 문장을 이용해 주세요.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "번역할 문장", exact: true })
    .fill("免税はできますか？");
  await page.getByRole("button", { name: "번역하기", exact: true }).click();
  await expect(
    page.getByText("면세가 가능한가요?", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/translate-light.png",
    fullPage: true,
  });
  const expand = page.getByRole("button", {
    name: "번역문 크게 보기",
    exact: true,
  });
  await expand.scrollIntoViewIfNeeded();
  const bounds = await expand.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  await expand.click();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  for (const [name, title] of [
    ["IC CARD", "이동을 더 가볍게"],
    ["PAY", "결제 전, 한 번 더"],
  ]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  }
  await page.getByRole("tab", { name: "TRANSLATE", exact: true }).click();
  await page.getByRole("button", { name: "사이즈/재고", exact: true }).click();
  await page
    .getByRole("button", { name: "상의 사이즈 등록하기", exact: true })
    .click();
  await expect(page.getByText("내 옷 사이즈", { exact: true })).toBeVisible();
});

test("coupons: filter, official conditions, local save, reload and reset", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "나중에 입력하기", exact: true })
    .click();
  await page.getByRole("tab", { name: "COUPON", exact: true }).click();
  await page.getByRole("button", { name: "일반 고객용", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "돈키호테 상세 보기", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "매장·혜택 검색", exact: true })
    .fill("유니클로");
  await page
    .getByRole("button", { name: "유니클로 일본 상세 보기", exact: true })
    .click();
  await expect(
    page.getByText("발급일을 포함해 31일 · 개인별 발급일에 따라 다름", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("https://faq.uniqlo.com/articles/faq/100005203", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "이 혜택 저장", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "이 혜택 저장 해제", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "혜택 상세 닫기", exact: true })
    .click();
  await page.reload();
  await page.getByRole("tab", { name: "COUPON", exact: true }).click();
  await page
    .getByRole("button", { name: "저장한 혜택만", exact: true })
    .click();
  await expect(page.getByText("1개의 혜택", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "유니클로 일본 저장 해제", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "사용자 페이지", exact: true })
    .click();
  await page.getByRole("radio", { name: "다크", exact: true }).click();
  await page
    .getByRole("button", { name: "변경사항 저장", exact: true })
    .click();
  await page
    .getByRole("button", { name: "외국인·방문객용", exact: true })
    .click();
  await page
    .getByRole("button", { name: "다이마루 도쿄 상세 보기", exact: true })
    .click();
  await expect(
    page.getByText(
      "일본 입국 후 6개월 미만인 외국 국적 고객. 여권 제시가 필요합니다.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "혜택 상세 닫기", exact: true })
    .click();
  await page
    .getByRole("button", { name: "사용자 페이지", exact: true })
    .click();
  await page
    .getByRole("button", { name: "기기에 저장한 모든 정보 삭제", exact: true })
    .click();
  await page.getByRole("button", { name: "모두 삭제", exact: true }).click();
  await page
    .getByRole("button", { name: "나중에 입력하기", exact: true })
    .click();
  await page.getByRole("tab", { name: "COUPON", exact: true }).click();
  await page
    .getByRole("button", { name: "저장한 혜택만", exact: true })
    .click();
  await expect(
    page.getByText("조건에 맞는 혜택이 없어요", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
