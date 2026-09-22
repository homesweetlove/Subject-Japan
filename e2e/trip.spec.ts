import { test, expect } from "@playwright/test";

test("five regions, countdown editing, guide persistence and reset", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "나중에 입력하기", exact: true })
    .click();
  await page.getByRole("tab", { name: "TRIP", exact: true }).click();
  for (const region of ["도쿄", "오사카", "후쿠오카", "삿포로", "나고야"])
    await page.getByRole("button", { name: region, exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "출발역", exact: true }),
  ).toHaveValue("메이테츠 나고야");
  await page
    .getByRole("textbox", { name: "이용 터미널", exact: true })
    .fill("T1 국제선");
  const tomorrow = new Date(Date.now() + 86400000 + 9 * 3600000)
    .toISOString()
    .slice(0, 10);
  await page
    .getByRole("textbox", { name: "열차 출발 날짜 (일본)", exact: true })
    .fill(tomorrow);
  await page
    .getByRole("textbox", { name: "확인한 막차 시각 (일본)", exact: true })
    .fill("23:00");
  await page
    .getByRole("button", { name: "막차 타이머 저장", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("공식 시간표");
  await page
    .getByRole("checkbox", {
      name: "공식 시간표의 날짜·출발역·공항 방향을 확인했어요",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "막차 타이머 저장", exact: true })
    .click();
  await expect(
    page.getByText("메이테츠 나고야 → 주부 센트레아 NGO", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "TRIP", exact: true }).click();
  await expect(
    page.getByText("메이테츠 나고야 → 주부 센트레아 NGO", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "메이테츠 나고야 막차 수정", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "확인한 막차 시각 (일본)", exact: true })
    .fill("22:00");
  await page
    .getByRole("checkbox", {
      name: "공식 시간표의 날짜·출발역·공항 방향을 확인했어요",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "막차 변경 저장", exact: true })
    .click();
  await expect(
    page.getByText("메이테츠 나고야 → 주부 센트레아 NGO", { exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "공연 티켓팅", exact: true }).click();
  await page
    .getByRole("checkbox", {
      name: "아티스트 공식 공지와 판매처를 확인했어요",
      exact: true,
    })
    .click();
  await page.reload();
  await page.getByRole("tab", { name: "TRIP", exact: true }).click();
  await page.getByRole("button", { name: "공연 티켓팅", exact: true }).click();
  await expect(
    page.getByRole("checkbox", {
      name: "아티스트 공식 공지와 판매처를 확인했어요",
      exact: true,
    }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("tab", { name: "COUPON", exact: true }).click();
  await page
    .getByRole("textbox", { name: "매장·혜택 검색", exact: true })
    .fill("빅카메라");
  await page
    .getByRole("button", { name: "빅카메라·코지마 상세 보기", exact: true })
    .click();
  await expect(
    page.getByText("게시된 종료일: 2026-10-31 (일본 시간)", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "혜택 상세 닫기", exact: true })
    .click();
  await page
    .getByRole("button", { name: "게스트·VIP 패스트트랙", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "한큐 VIP 우선 면세 수속 펼치기",
      exact: true,
    })
    .click();
  await page
    .getByRole("checkbox", {
      name: "가입·승급 규약과 본인 실적을 확인했어요",
      exact: true,
    })
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
  await page.getByRole("tab", { name: "TRIP", exact: true }).click();
  await expect(
    page.getByText("메이테츠 나고야 → 주부 센트레아 NGO", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "공연 티켓팅", exact: true }).click();
  await expect(
    page.getByRole("checkbox", {
      name: "아티스트 공식 공지와 판매처를 확인했어요",
      exact: true,
    }),
  ).toHaveAttribute("aria-checked", "false");
  expect(errors).toEqual([]);
});
