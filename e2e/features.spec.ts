import { test, expect } from "@playwright/test";
test("nearby query consent, coarse coordinates, store matching and permission-free fallback", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 35.681234, longitude: 139.767891 });
  const queries: string[] = [];
  await page.route("https://overpass-api.de/api/interpreter", async (route) => {
    queries.push(
      new URLSearchParams(route.request().postData() ?? "").get("data") ?? "",
    );
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        elements: [
          {
            type: "node",
            id: 1,
            lat: 35.681,
            lon: 139.768,
            tags: { name: "ユニクロ 東京" },
          },
        ],
      }),
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "나중에 입력하기", exact: true })
    .click();
  await page.getByRole("tab", { name: "쿠폰", exact: true }).click();
  await page.getByRole("button", { name: "주변 매장", exact: true }).click();
  expect(queries).toHaveLength(0);
  await page
    .getByRole("button", {
      name: "위치 전송에 동의하고 주변 검색",
      exact: true,
    })
    .click();
  await expect(page.getByText("ユニクロ 東京", { exact: true })).toBeVisible();
  expect(queries).toHaveLength(1);
  expect(queries[0]).toContain("35.681,139.768");
  expect(queries[0]).not.toContain("35.681234");
  await page.unroute("https://overpass-api.de/api/interpreter");
  await page.route("https://overpass-api.de/api/interpreter", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page
    .getByRole("button", {
      name: "위치 전송에 동의하고 주변 검색",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(
      "주변 매장 서버가 응답하지 않아요. 잠시 후 다시 시도해 주세요.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("ユニクロ 東京", { exact: true })).toHaveCount(0);
  await context.clearPermissions();
  await page.setViewportSize({ width: 320, height: 740 });
  await page
    .getByRole("button", {
      name: "위치 권한 없이 지역·매장으로 찾기",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "오사카", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "찾을 매장 이름", exact: true }),
  ).toHaveValue("ビックカメラ");
  await expect(
    page.getByRole("button", {
      name: "선택한 지역의 매장을 지도에서 찾기",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("payment calculation, persisted FX, itinerary edit and full reset", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "나중에 입력하기", exact: true })
    .click();
  await page.getByRole("tab", { name: "결제", exact: true }).click();
  await page
    .getByRole("textbox", { name: "현재 환율 (100 JPY → KRW)", exact: true })
    .fill("900");
  await page.getByRole("button", { name: "환율 저장", exact: true }).click();
  await page
    .getByRole("textbox", { name: "상품 금액 (엔)", exact: true })
    .fill("11000");
  await page
    .getByRole("button", {
      name: "새 방식: 세금 내고 출국 때 돌려받기",
      exact: true,
    })
    .click();
  await expect(page.getByText("₩90,000", { exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "게스트·매장 할인 (%)", exact: true })
    .fill("5");
  await page
    .getByRole("textbox", { name: "추가 쿠폰 할인 (%)", exact: true })
    .fill("7");
  await expect(
    page.getByText("두 할인을 함께 쓸 수 있는지 확인해 주세요.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "두 할인 중복 사용 가능 확인", exact: true })
    .click();
  await expect(page.getByText("₩79,515", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "결제", exact: true }).click();
  await expect(
    page.getByRole("textbox", {
      name: "현재 환율 (100 JPY → KRW)",
      exact: true,
    }),
  ).toHaveValue("900");
  await page.getByRole("tab", { name: "여행", exact: true }).click();
  await page.getByRole("button", { name: "일정·예약", exact: true }).click();
  await page
    .getByRole("textbox", { name: "일정 이름", exact: true })
    .fill("호텔 체크인");
  await page
    .getByRole("textbox", {
      name: "일본 날짜·시각 (YYYY-MM-DD HH:mm)",
      exact: true,
    })
    .fill("2026-10-03 15:00");
  await page
    .getByRole("textbox", { name: "예약번호", exact: true })
    .fill("ABC123");
  await page.getByRole("button", { name: "일정 추가", exact: true }).click();
  await expect(
    page.getByText("예약번호 ABC123", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "호텔 체크인 완료", exact: true })
    .click();
  await page.reload();
  await page.getByRole("tab", { name: "여행", exact: true }).click();
  await page.getByRole("button", { name: "일정·예약", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "호텔 체크인 완료", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "호텔 체크인 수정", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "일정 이름", exact: true })
    .fill("숙소 도착");
  await page
    .getByRole("button", { name: "일정 수정 저장", exact: true })
    .click();
  await expect(page.getByText("숙소 도착", { exact: true })).toBeVisible();
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
  await page.getByRole("tab", { name: "결제", exact: true }).click();
  await expect(
    page.getByRole("textbox", {
      name: "현재 환율 (100 JPY → KRW)",
      exact: true,
    }),
  ).toHaveValue("");
  await page.getByRole("tab", { name: "여행", exact: true }).click();
  await page.getByRole("button", { name: "일정·예약", exact: true }).click();
  await expect(
    page.getByText("첫 일정을 추가해 보세요. 최대 200개를 저장할 수 있어요.", {
      exact: true,
    }),
  ).toBeVisible();
});
test("native feature fallback, authored formal phrases and no automatic network requests", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:4173") &&
      !r.url().startsWith("data:")
    )
      external.push(r.url());
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "나중에 입력하기", exact: true })
    .click();
  await page.getByRole("tab", { name: "번역", exact: true }).click();
  await page.getByRole("button", { name: "매우 정중", exact: true }).click();
  await page
    .getByRole("button", { name: "카드로 결제할 수 있나요?", exact: true })
    .click();
  await page
    .getByRole("button", { name: "선택한 문장 크게 보기", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("カードでお支払いすることは可能でしょうか？", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "닫기", exact: true })
    .click();
  await page.getByRole("button", { name: "카메라 번역", exact: true }).click();
  await page
    .getByRole("button", { name: "카메라로 촬영", exact: true })
    .click();
  await expect(
    page.getByText("사진 번역은 전용 Android·iPhone 앱에서 사용할 수 있어요.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "음성 대화", exact: true }).click();
  await page
    .getByRole("button", { name: "한국어로 말하기", exact: true })
    .click();
  await expect(
    page.getByText("이 기능은 전용 Android·iPhone 앱에서 사용할 수 있어요.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "카드", exact: true }).click();
  await page
    .getByRole("button", { name: "교통카드 NFC 읽기", exact: true })
    .click();
  await expect(
    page.getByText("이 기기는 NFC를 지원하지 않아요.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "쿠폰", exact: true }).click();
  await page.getByRole("button", { name: "주변 매장", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "위치 전송에 동의하고 주변 검색",
      exact: true,
    }),
  ).toBeVisible();
  // Rate auto-refresh is opt-in, so opening PAY must stay offline too.
  await page.getByRole("tab", { name: "결제", exact: true }).click();
  await expect(
    page.getByText("계산은 똑똑하게", { exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(500);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

