import { expect, test, type Page } from "@playwright/test";

async function expectNodeFitsWidth(page: Page, selector: string) {
  const fits = await page.locator(selector).evaluate((node) => {
    const element = node as HTMLElement;
    return element.scrollWidth <= element.clientWidth + 1;
  });

  expect(fits, `Expected ${selector} not to overflow horizontally`).toBeTruthy();
}

test("панели управления помещаются на мобильной ширине", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Фильтры" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Инспектор" })).toBeVisible();
  await expectNodeFitsWidth(page, ".map-toolbar");

  await page.getByRole("button", { name: "Фильтры" }).click();
  await expect(page.getByRole("heading", { name: "Фильтры" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Подогнать карту" })).toBeVisible();
  await expectNodeFitsWidth(page, ".filters-actions");

  await page.getByRole("button", { name: "Инспектор" }).click();
  await expect(page.getByRole("button", { name: "Сбросить скрытие" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Показать выборку" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Скрыть выборку" })).toBeVisible();
  await expectNodeFitsWidth(page, ".list-bulk-actions");
});
