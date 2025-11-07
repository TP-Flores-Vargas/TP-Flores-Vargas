import { test, expect } from "@playwright/test";

const drawerSelector = '[data-testid="alert-drawer"]';

test("C01 - carga tabla y abre drawer", async ({ page, baseURL }) => {
  await page.goto(baseURL || "http://localhost:5173");
  await page.getByTestId("alerts-table").waitFor();
  await page.getByTestId("alerts-row-0").click();
  await expect(page.locator(drawerSelector)).toBeVisible();
  await expect(page.getByTestId("alert-json")).toBeVisible();
});

test("C02 - toggle live y recibe evento simulado", async ({ page, baseURL }) => {
  await page.goto(baseURL || "http://localhost:5173");
  const toggle = page.getByTestId("live-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("alerts-row-0")).toBeVisible();
});

test("C03 - aplica filtros y exporta CSV", async ({ page, baseURL }) => {
  await page.goto(baseURL || "http://localhost:5173");
  await page.getByTestId("filter-severity").selectOption("High");
  await page.getByTestId("filter-attack").selectOption("PortScan");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-csv").click(),
  ]);
  expect(download.suggestedFilename()).toContain("alerts");
});
