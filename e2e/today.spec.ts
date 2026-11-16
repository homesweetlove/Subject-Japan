import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

// Real JMA responses (captured 2026-09-27), re-dated so "today" is the test run's date.
const jstDay = (offset: number) =>
  new Date(Date.now() + 9 * 3600000 + offset * 86400000)
    .toISOString()
    .slice(0, 10);
const shiftDates = (raw: string) => {
  let out = raw;
  for (let i = 6; i >= 0; i--) {
    const from = new Date(Date.parse("2026-09-27T00:00:00Z") + i * 86400000)
      .toISOString()
      .slice(0, 10);
    out = out.split(from).join(`@@${i}@@`);
  }
  return out.replace(/@@(\d)@@/g, (_, i) => jstDay(Number(i)));
};
const forecast = shiftDates(
  readFileSync("tests/fixtures/jma-forecast-130000.json", "utf8"),
);
const amedas = readFileSync("tests/fixtures/jma-amedas-44132.json", "utf8");

test("today: weather only after choosing a city, next trip, shortcuts and native-only alerts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:4173")) external.push(r.url());
  });
  await page.route("https://www.jma.go.jp/bosai/**", (route) => {
    const url = route.request().url();
    if (url.endsWith("/forecast/data/forecast/130000.json"))
      return route.fulfill({ contentType: "application/json", body: forecast });
    if (url.endsWith("/amedas/data/latest_time.txt"))
      return route.fulfill({
        contentType: "text/plain",
        body: `${jstDay(0)}T09:30:00+09:00`,
      });
    if (url.includes("/amedas/data/point/44132/"))
      return route.fulfill({ contentType: "application/json", body: amedas });
    if (url.endsWith("/quake/data/list.json"))
      return route.fulfill({
        json: [{
          eid: "test-quake",
          at: new Date(Date.now() - 60000).toISOString(),
          anm: "千葉県東方沖",
          mag: "4.1",
          maxi: "3",
        }],
      });
    return route.fulfill({ status: 404 });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "나중에 입력하기", exact: true })
    .click();
  await expect(page.getByText("오늘의 여행", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "앱이 꺼져 있어도 받는 알림은 Android·iPhone 전용 앱에서 사용할 수 있어요.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.waitForTimeout(300);
  expect(external).toEqual([]);

  await page.getByRole("button", { name: "도쿄", exact: true }).click();
  await expect(page.getByText("21°", { exact: true })).toBeVisible();
  await expect(page.getByText("도쿄 날씨", { exact: true })).toBeVisible();
  await expect(page.getByText(/気象庁ホームページ/)).toBeVisible();
  await expect(page.getByText("최대 진도 3 · 규모 4.1", { exact: true })).toBeVisible();
  await expect(page.getByText(/千葉県東方沖/)).toBeVisible();
  // City selection enables fixed weather endpoints and the public quake feed.
  expect(external.sort()).toEqual([
    "https://www.jma.go.jp/bosai/amedas/data/latest_time.txt",
    expect.stringMatching(/\/amedas\/data\/point\/44132\/\d{8}_09\.json$/),
    "https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json",
    "https://www.jma.go.jp/bosai/quake/data/list.json",
  ]);

  // Forecasts are cached, while recent earthquakes are checked again on reload.
  await page.reload();
  await expect(page.getByText("21°", { exact: true })).toBeVisible();
  await expect(page.getByText("최대 진도 3 · 규모 4.1", { exact: true })).toBeVisible();
  expect(external.filter((url) => !url.endsWith("/quake/data/list.json"))).toHaveLength(3);
  expect(external.filter((url) => url.endsWith("/quake/data/list.json"))).toHaveLength(2);

  await page
    .getByRole("button", { name: "일정 추가하기", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "일정 이름", exact: true })
    .fill("스시 예약");
  const tomorrow = new Date(Date.now() + 86400000 + 9 * 3600000)
    .toISOString()
    .slice(0, 10);
  await page
    .getByRole("textbox", {
      name: "일본 날짜·시각 (YYYY-MM-DD HH:mm)",
      exact: true,
    })
    .fill(`${tomorrow} 19:00`);
  await page.getByRole("button", { name: "일정 추가", exact: true }).click();
  await page.getByRole("tab", { name: "오늘", exact: true }).click();
  await expect(page.getByText("스시 예약", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "스시 예약 일정 보기", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "일정 이름", exact: true }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "오늘", exact: true }).click();
  await page
    .getByRole("button", { name: "긴급 SOS", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("긴급 상황 & 재난 대응", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
