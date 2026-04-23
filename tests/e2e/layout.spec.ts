import { expect, test, type Page } from "@playwright/test";

async function expectNodeFitsWidth(page: Page, selector: string) {
  const fits = await page.locator(selector).evaluate((node) => {
    const element = node as HTMLElement;
    return element.scrollWidth <= element.clientWidth + 1;
  });

  expect(fits, `Expected ${selector} not to overflow horizontally`).toBeTruthy();
}

async function expectNodeSupportsHorizontalOverflow(page: Page, selector: string) {
  const supports = await page.locator(selector).evaluate((node) => {
    const element = node as HTMLElement;
    const style = window.getComputedStyle(element);
    const hasOverflow = element.scrollWidth > element.clientWidth + 1;
    return !hasOverflow || style.overflowX === "auto" || style.overflowX === "scroll";
  });

  expect(supports, `Expected ${selector} to fit width or allow horizontal scrolling`).toBeTruthy();
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

async function expectNodeFitsViewportHeight(page: Page, selector: string) {
  const fits = await page.locator(selector).evaluate((node) => {
    const element = node as HTMLElement;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= viewportHeight + 1;
  });

  expect(fits, `Expected ${selector} to fit into viewport height`).toBeTruthy();
}

async function expectScrollableVertically(page: Page, selector: string) {
  const scrolls = await page.locator(selector).evaluate((node) => {
    const element = node as HTMLElement;
    return element.scrollHeight > element.clientHeight;
  });

  expect(scrolls, `Expected ${selector} to be vertically scrollable`).toBeTruthy();
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

  const expandToolbarButton = page.getByRole("button", { name: "Развернуть нижнюю панель" });
  if (await expandToolbarButton.count()) {
    await expandToolbarButton.click({ force: true });
  }

  await expect(page.getByRole("button", { name: "Фильтры", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Список", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Подогнать", exact: true })).toBeVisible();

  await expectNodeSupportsHorizontalOverflow(page, ".map-toolbar");

  await page.getByRole("button", { name: "Фильтры", exact: true }).click({ force: true });
  await expect(page.getByRole("heading", { name: "Фильтры" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Подогнать карту" })).toBeVisible();
  await expectNodeFitsWidth(page, ".filters-actions");
  await page.getByRole("button", { name: "Закрыть фильтры" }).click({ force: true });

  await page.getByRole("button", { name: "Список", exact: true }).click();
  await expect(page.getByRole("button", { name: "Сбросить скрытие" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Показать выборку" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Скрыть выборку" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Показать отмеченные" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Скрыть отмеченные" })).toBeVisible();
  await expectAllNodesFitWidth(page, ".list-bulk-actions");
});

test("мобильные панели: комбинации состояний, скролл и закрытие", async ({ page, browserName }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Матрица состояний проверяется только в мобильных проектах.");
  test.skip(browserName !== "chromium", "Нужна поддержка mobile viewport в Chromium.");

  await page.goto("/");

  await expectNodeFitsViewportHeight(page, ".timeline-panel");
  await expectNodeFitsViewportHeight(page, ".map-toolbar");
  await expectNodeSupportsHorizontalOverflow(page, ".timeline-panel");
  await expectNodeSupportsHorizontalOverflow(page, ".map-toolbar");

  const expandHudButton = page.getByRole("button", { name: "Развернуть верхнюю панель" });
  if (await expandHudButton.count()) {
    await expandHudButton.click({ force: true });
  }
  await expect(page.getByPlaceholder("Поиск по ID, сенсору, треку, дате, overlay")).toBeVisible();

  const expandToolbarButton = page.getByRole("button", { name: "Развернуть нижнюю панель" });
  if (await expandToolbarButton.count()) {
    await expandToolbarButton.click({ force: true });
  }
  await expect(page.getByRole("button", { name: "Фильтры", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Фильтры", exact: true }).click({ force: true });
  await expect(page.getByRole("heading", { name: "Фильтрация" })).toBeVisible();
  await expectScrollableVertically(page, ".drawer.is-open .drawer-frame");

  await page.getByRole("button", { name: "Закрыть открытые панели" }).click({ force: true });
  if (await page.getByRole("heading", { name: "Фильтрация" }).count()) {
    await page.keyboard.press("Escape");
  }

  await page.getByRole("button", { name: "Список", exact: true }).click({ force: true });
  await expect(page.getByRole("button", { name: "Закрыть правую панель" })).toBeVisible();

  await page.getByRole("button", { name: "Закрыть правую панель" }).click();

  await page.getByRole("button", { name: "Список", exact: true }).click({ force: true });
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Фильтры", exact: true }).click({ force: true });
  await expect(page.getByRole("heading", { name: "Фильтрация" })).toBeVisible();
  await page.getByRole("button", { name: "Список", exact: true }).click({ force: true });
  await expect(page.getByRole("button", { name: "Закрыть правую панель" })).toBeVisible();
});

test("стандартный сценарий: фильтрация, список и детали", async ({ page }) => {
  await page.goto("/");

  const expandToolbarButton = page.getByRole("button", { name: "Развернуть нижнюю панель" });
  if (await expandToolbarButton.count()) {
    await expandToolbarButton.click({ force: true });
  }
  const timelineCollapseButton = page.getByRole("button", { name: "Свернуть таймлайн" });
  if (await timelineCollapseButton.count()) {
    await timelineCollapseButton.click();
  }
  await page.getByRole("button", { name: "Список" }).click({ force: true });
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

  const expandToolbarButton = page.getByRole("button", { name: "Развернуть нижнюю панель" });
  if (await expandToolbarButton.count()) {
    await expandToolbarButton.click({ force: true });
  }
  const timelineCollapseButton = page.getByRole("button", { name: "Свернуть таймлайн" });
  if (await timelineCollapseButton.count()) {
    await timelineCollapseButton.click();
  }
  await page.getByRole("button", { name: "Список" }).click({ force: true });
  const firstCheckbox = page.locator(".record-row-select input").first();
  await expect(firstCheckbox).toBeVisible();
  await firstCheckbox.check({ force: true });

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

  const collapseTimelineButton = page.getByRole("button", { name: "Свернуть таймлайн" });
  if (await collapseTimelineButton.count()) {
    await collapseTimelineButton.click();
  }
  const expandTimelineButton = page.getByRole("button", { name: "Развернуть таймлайн" });
  if (await expandTimelineButton.count()) {
    await expandTimelineButton.click();
  }
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
  const toggle = page.locator(".timeline-panel-control").first();
  const wasCollapsedInitially = await panel.evaluate((node) => node.classList.contains("is-collapsed"));
  const initialHeight = (await panel.boundingBox())?.height ?? 0;
  expect(initialHeight).toBeGreaterThan(30);

  await toggle.click({ force: true });
  const afterFirstToggleCollapsed = await panel.evaluate((node) => node.classList.contains("is-collapsed"));
  expect(afterFirstToggleCollapsed).toBe(!wasCollapsedInitially);
  const collapsedHeight = (await panel.boundingBox())?.height ?? 0;
  await expect(page.locator(".timeline-bars")).toBeVisible();
  expect(collapsedHeight).toBeLessThanOrEqual(initialHeight);

  await toggle.click({ force: true });
  const afterSecondToggleCollapsed = await panel.evaluate((node) => node.classList.contains("is-collapsed"));
  expect(afterSecondToggleCollapsed).toBe(wasCollapsedInitially);
  await expect(page.locator(".timeline-periods-panel")).toBeVisible();
  const reExpandedHeight = (await panel.boundingBox())?.height ?? 0;
  expect(reExpandedHeight).toBeGreaterThan(collapsedHeight + 4);
});
