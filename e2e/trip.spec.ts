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
  await page.getByRole("tab", { name: "여행", exact: true }).click();
  await page.getByRole("button", { name: "공항 막차", exact: true }).click();
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
  await page.getByRole("tab", { name: "여행", exact: true }).click();
  await page.getByRole("button", { name: "공항 막차", exact: true }).click();
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
  await page.getByRole("tab", { name: "여행", exact: true }).click();
  await page.getByRole("button", { name: "공연 티켓팅", exact: true }).click();
  await expect(
    page.getByRole("checkbox", {
      name: "아티스트 공식 공지와 판매처를 확인했어요",
      exact: true,
    }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("tab", { name: "카드·쿠폰", exact: true }).click();
  await page.getByRole("button", { name: "쿠폰·혜택", exact: true }).click();
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
  await page.getByRole("button", { name: "게스트·VIP", exact: true }).click();
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
  await page.getByRole("tab", { name: "여행", exact: true }).click();
  await page.getByRole("button", { name: "공항 막차", exact: true }).click();
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

test("backup copies to the clipboard and restores only after validation and confirmation", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page
    .getByRole("button", { name: "나중에 입력하기", exact: true })
    .click();
  await page.getByRole("tab", { name: "여행", exact: true }).click();
  await page.getByRole("button", { name: "일정·예약", exact: true }).click();
  await page
    .getByRole("textbox", { name: "일정 이름", exact: true })
    .fill("료칸 체크인");
  await page
    .getByRole("textbox", {
      name: "일본 날짜·시각 (YYYY-MM-DD HH:mm)",
      exact: true,
    })
    .fill("2026-10-04 15:00");
  await page.getByRole("button", { name: "일정 추가", exact: true }).click();
  await page
    .getByRole("button", { name: "디지털 & 백업", exact: true })
    .click();
  await page
    .getByRole("button", { name: "여행 데이터 백업", exact: true })
    .click();
  await page
    .getByRole("button", { name: "내 데이터 백업 복사", exact: true })
    .click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(copied).tripItems).toHaveLength(1);

  // Foreign clipboard content is rejected without touching saved data.
  await page.evaluate(() => navigator.clipboard.writeText("not a backup"));
  await page
    .getByRole("button", { name: "클립보드에서 백업 불러오기", exact: true })
    .click();
  await expect(
    page.getByText("Subject Japan 백업 형식이 아니에요.", { exact: true }),
  ).toBeVisible();

  await page.evaluate(
    (raw) =>
      navigator.clipboard.writeText(
        JSON.stringify({ ...JSON.parse(raw), tripItems: [] }),
      ),
    copied,
  );
  await page
    .getByRole("button", { name: "클립보드에서 백업 불러오기", exact: true })
    .click();
  await expect(page.getByText(/일정 0개/)).toBeVisible();
  await page
    .getByRole("button", { name: "현재 데이터를 백업으로 대체", exact: true })
    .click();
  await expect(
    page.getByText("백업을 복원했어요. 클립보드의 백업 데이터도 지웠어요.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "일정·예약", exact: true }).click();
  await expect(page.getByText("료칸 체크인", { exact: true })).toHaveCount(0);
});
