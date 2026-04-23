import { expect, test, type Page } from "@playwright/test";

async function expectNodeFitsWidth(page: Page, selector: string) {
  const fits = await page.locator(selector).evaluate((node) => {
    const element = node as HTMLElement;
    return element.scrollWidth <= element.clientWidth + 1;
  });

  expect(fits, `Expected ${selector} not to overflow horizontally`).toBeTruthy();
}

async function expectAllNodesFitWidth(page: Page, selector: string) {
  const nodes = page.locator(selector);
  const count = await nodes.count();

  for (let index = 0; index < count; index += 1) {
    const fits = await nodes.nth(index).evaluate((node) => {
      const element = node as HTMLElement;
      return element.scrollWidth <= element.clientWidth + 1;
    });

    expect(fits, `Expected ${selector}[${index}] not to overflow horizontally`).toBeTruthy();
  }
}

function boxesOverlap(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
) {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

test("мобильная раскладка помещается на iPhone 12 mini", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Фильтры", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Список", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Подогнать", exact: true })).toBeVisible();

  await expectNodeFitsWidth(page, ".map-toolbar");

  await page.getByRole("button", { name: "Фильтры", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Фильтры" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Подогнать карту" })).toBeVisible();
  await expectNodeFitsWidth(page, ".filters-actions");
  await page.getByRole("button", { name: "Закрыть фильтры" }).click();

  await page.getByRole("button", { name: "Список", exact: true }).click();
  await expect(page.getByRole("button", { name: "Сбросить скрытие" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Показать выборку" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Скрыть выборку" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Показать отмеченные" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Скрыть отмеченные" })).toBeVisible();
  await expectAllNodesFitWidth(page, ".list-bulk-actions");
});

test("стандартный сценарий: фильтрация, список и детали", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Список" }).click();
  await expect(page.getByRole("heading", { name: /записей/i })).toBeVisible();

  await page.getByPlaceholder("Поиск по ID, сенсору, треку, дате, overlay").fill("definitely-no-match");
  await expect(page.getByRole("heading", { name: "Ничего не найдено" })).toBeVisible();

  await page.getByPlaceholder("Поиск по ID, сенсору, треку, дате, overlay").fill("");
  await expect(page.getByRole("heading", { name: /записей/i })).toBeVisible();

  const firstScene = page.locator(".record-row-main").first();
  await expect(firstScene).toBeVisible();
  await firstScene.click();

  await expect(page.getByText("Карточка записи")).toBeVisible();
  await expect(page.getByRole("link", { name: /Скачать KML/i })).toBeVisible();
});

test("bulk-операции по отмеченным строкам работают в списке", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Список" }).click();
  const firstCheckbox = page.locator(".record-row-select input").first();
  await expect(firstCheckbox).toBeVisible();
  await firstCheckbox.check();

  await expect(page.getByText(/Отмечено 1 из/i)).toBeVisible();
  await page.getByRole("button", { name: "Скрыть отмеченные" }).click();
  await expect(page.locator(".record-row.is-hidden").first()).toBeVisible();

  await page.getByRole("button", { name: "Показать отмеченные" }).click();
  await expect(page.locator(".record-row.is-hidden")).toHaveCount(0);

  await page.getByRole("button", { name: "Снять выделение" }).click();
  await expect(page.getByText(/Отмечено 0 из/i)).toBeVisible();
});

test("ручной период timeline не перекрывает поле даты", async ({ page }) => {
  await page.goto("/");

  await page.locator(".timeline-editor summary").click();

  const firstGroup = page.locator(".timeline-period-group").first();
  const dateInput = firstGroup.locator('input[type="date"]');
  const timeInput = firstGroup.locator('input[type="time"]');

  await expect(dateInput).toBeVisible();
  await expect(timeInput).toBeVisible();

  const dateBox = await dateInput.boundingBox();
  const timeBox = await timeInput.boundingBox();

  expect(dateBox).not.toBeNull();
  expect(timeBox).not.toBeNull();
  expect(boxesOverlap(dateBox!, timeBox!)).toBeFalsy();

  await dateInput.click();
  await expect(dateInput).toBeFocused();
  await dateInput.fill("2025-12-25");
  await expect(dateInput).toHaveValue("2025-12-25");
});

test("таймлайн сворачивается до компактной линии и разворачивается обратно", async ({ page }) => {
  await page.goto("/");

  const panel = page.locator(".timeline-panel");
  const expandedHeight = (await panel.boundingBox())?.height ?? 0;
  expect(expandedHeight).toBeGreaterThan(90);

  await page.getByRole("button", { name: "Свернуть таймлайн" }).click();
  await expect(panel).toHaveClass(/is-collapsed/);
  await expect(page.locator(".timeline-periods-panel")).toHaveCount(0);
  await expect(page.locator(".timeline-bars")).toBeVisible();

  const collapsedHeight = (await panel.boundingBox())?.height ?? 0;
  expect(collapsedHeight).toBeLessThan(expandedHeight);

  await page.getByRole("button", { name: "Развернуть таймлайн" }).click();
  await expect(panel).not.toHaveClass(/is-collapsed/);
  await expect(page.locator(".timeline-periods-panel")).toBeVisible();
});
