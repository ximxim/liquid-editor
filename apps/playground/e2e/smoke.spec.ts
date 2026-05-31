import { expect, test } from "./fixtures";

test("playground renders the harness-ok placeholder", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("harness-status")).toHaveText("harness-ok");
});
