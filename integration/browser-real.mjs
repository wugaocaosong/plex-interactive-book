import { chromium, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const credentials = JSON.parse(
  await readFile(new URL("output/plex-test-session.json", root), "utf8"),
);
const exercises = JSON.parse(
  await readFile(new URL("web/public/learning/exercises.json", root), "utf8"),
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(
    (process.env.PLEX_INTEGRATION_URL || "http://127.0.0.1:5193") +
      "/read/unit/monty/start",
  );
  await page.getByRole("button", { name: "学习活动", exact: true }).click();
  await page.getByText("登录／查看 PLEX 学习画像", { exact: true }).click();
  await page.getByLabel("PLEX 学生账号").fill(credentials.username);
  await page.getByLabel("密码", { exact: true }).fill(credentials.password);
  await Promise.all([
    page.waitForEvent("domcontentloaded"),
    page.getByRole("button", { name: "登录 PLEX", exact: true }).click(),
  ]);
  await page.getByRole("button", { name: "学习活动", exact: true }).click();
  await page.getByText("登录／查看 PLEX 学习画像", { exact: true }).click();
  await expect(page.locator(".plex-profile")).toContainText(
    "画像来自 PLEX 服务端",
  );
  await page.getByRole("button", { name: "编程练习", exact: true }).click();
  await page.locator(".unit-exercise-list>button").first().click();
  await page
    .getByLabel("完整示例代码")
    .fill(exercises.find((e) => e.id === "monty-frequency").solution);
  await page.getByText("小E在线辅导与 PLEX 正式提交", { exact: true }).click();
  await page.getByRole("button", { name: "在线提交当前代码" }).click();
  await expect(page.locator(".plex-coach")).toContainText(
    "服务端作答已记录：通过",
    { timeout: 90000 },
  );
  await page
    .getByLabel("完整示例代码")
    .fill(
      "def solve(prize, final, wins, total):\n    return [prize == final, wins / 0]",
    );
  await page.getByRole("button", { name: "在线提交当前代码" }).click();
  await expect(page.locator(".plex-coach")).toContainText(
    "服务端作答已记录：尚未通过",
    { timeout: 90000 },
  );
  await page.getByLabel("辅导方式").selectOption("explain_error");
  await page
    .getByLabel("我想问")
    .fill(
      "计算频率时出现 ZeroDivisionError，请结合这次服务器运行记录解释，不要直接给出完整解法。",
    );
  await page.getByRole("button", { name: "请小E辅导" }).click();
  await expect(page.locator(".plex-coach .unit-explanation")).toBeVisible({
    timeout: 90000,
  });
  const coach = await page.locator(".plex-coach .unit-explanation").innerText();
  await page.screenshot({
    path: new URL("output/playwright/v03-plex-real.png", root).pathname.replace(
      /^\/(\w:)/,
      "$1",
    ),
    fullPage: true,
  });
  const report = {
    realHTTP: true,
    proxy: true,
    login: true,
    profile: true,
    referenceSubmitted: true,
    errorSubmitted: true,
    coach,
    errors,
  };
  await writeFile(
    new URL("output/plex-browser-real.json", root),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  expect(errors).toEqual([]);
} finally {
  await browser.close();
}
