import { expect, test, type Page } from "@playwright/test";

async function expectNodeFitsWidth(page: Page, selector: string) {
  const fits = await page.locator(selector).evaluate((node) => {
    const element = node as HTMLElement;
    return element.scrollWidth <= element.clientWidth + 1;
  });

  expect(fits, `Expected ${selector} not to overflow horizontally`).toBeTruthy();
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
  await expectNodeFitsWidth(page, ".list-bulk-actions");
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
