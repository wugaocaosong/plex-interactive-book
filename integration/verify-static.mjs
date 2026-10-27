import { chromium, expect } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
const origin = process.env.PLEX_STATIC_URL || "http://127.0.0.1:5195";
const output = process.env.PLEX_STATIC_REPORT || "output/v03-static-smoke.json";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const failures = [],
  external = [];
page.on("pageerror", (e) => failures.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400)
    failures.push(`${r.status()} ${new URL(r.url()).pathname}`);
});
await context.route("**/*", (route) => {
  if (new URL(route.request().url()).origin !== origin) {
    external.push(route.request().url());
    return route.abort();
  }
  return route.continue();
});
try {
  await page.goto(origin + "/");
  await page.getByRole("button", { name: "翻开这本书" }).click();
  await expect(page.locator(".book-holder")).not.toHaveClass(/loading/);
  await expect(page.locator(".section-heading h1")).toHaveText("扉页");
  await page.goto(origin + "/read/unit/monty/choose");
  await page.getByTestId("lesson-entry").click();
  await page.locator(".all-activities summary").click();
  await page.getByRole("button", { name: "三门挑战", exact: true }).click();
  await page.getByRole("button", { name: "选择1号舱门", exact: true }).click();
  await page.getByLabel("我的预测").selectOption("换门更好");
  await page.getByRole("button", { name: "提交预测，打开空门" }).click();
  await page.getByRole("button", { name: "换到另一扇门", exact: true }).click();
  await expect(page.locator(".unit-explanation")).toContainText("初选");
  await page.getByRole("button", { name: "把这轮画到小黑板" }).click();
  await page.getByRole("button", { name: "插入三门状态图" }).click();
  await expect(page.locator(".blackboard-canvas [data-mark]")).toHaveCount(1);
  await page.getByRole("button", { name: "批量实验", exact: true }).click();
  await page.getByRole("button", { name: "运行 Python 试验" }).click();
  await expect(page.locator(".monty-simulation .unit-status")).toContainText(
    "1000 次真实 Python",
    { timeout: 90000 },
  );
  await page.goto(origin + "/read/chapter_searching/binary_search");
  await expect(page.locator(".book-holder")).not.toHaveClass(/loading/);
  const block = await page
    .locator(".source-stage .code-example")
    .first()
    .getAttribute("data-block");
  await page.evaluate((hash) => (location.hash = hash), block);
  await page
    .locator(".book-host")
    .getByRole("button", { name: "查看 / 运行" })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole("button", { name: "运行 Python", exact: true }).click();
  await expect(page.getByLabel("运行结果")).toContainText("索引 =  2", {
    timeout: 90000,
  });
  for (const [activity, choice] of [
    ["binary-search", "元素已经有序排列"],
    ["monty-hall", null],
  ]) {
    await page.goto(origin + "/h5p-player.html?activity=" + activity);
    const frame = page.frameLocator("#activity iframe");
    await expect(frame.locator(".h5p-multichoice").first()).toBeVisible();
    await frame.getByRole("radio").filter({ visible: true }).first().click();
    await frame
      .getByRole("button", { name: "检查答案", exact: true })
      .filter({ visible: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(
          (id) =>
            JSON.parse(localStorage.getItem("plex:h5p:" + id + ":v1") || "{}")
              .score,
          activity,
        ),
      )
      .toBe(1);
  }
  expect(failures).toEqual([]);
  expect(external).toEqual([]);
  const report = {
    status: "passed",
    origin,
    checks: [
      "cover and clean route",
      "story and persisted blackboard",
      "actual 1000-trial Pyodide simulation",
      "complete upstream Python example",
      "both real H5P players and saved scores",
    ],
    failedResources: failures,
    externalRequests: external,
  };
  await mkdir("output", { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
