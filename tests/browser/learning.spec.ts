import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("study mode, annotations, settings and persisted drafts share the reader", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/read/chapter_searching/binary_search");
  await expect(page.locator(".book-holder")).not.toHaveClass(/loading/);
  await page.getByRole("button", {name:"更多阅读工具"}).click();
  await page.getByRole("button", { name: "切换阅读模式" }).click();
  await expect(page.getByLabel("连续正文")).toBeVisible();
  await page
    .locator(".study-article")
    .first()
    .locator("p[data-block]")
    .first()
    .evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      getSelection()!.removeAllRanges();
      getSelection()!.addRange(range);
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
  await page.getByLabel("批注内容").fill("这里记录二分查找的有序前提");
  await page.getByRole("button", { name: "保存批注", exact: true }).click();
  await page.getByRole("button", {name:"更多阅读工具"}).click();
  await page.getByRole("button", { name: "学习笔记", exact: true }).click();
  await expect(page.getByLabel("编辑笔记")).toHaveValue(
    "这里记录二分查找的有序前提",
  );
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page
    .locator(".study-article")
    .first()
    .getByRole("button", { name: "查看 / 运行" })
    .first()
    .click();
  await expect(page.locator('.content-dialog[aria-modal="true"]')).toBeVisible();
  await expect(page.locator(".study-panel")).toHaveCount(0);
  await expect(page.getByLabel("完整示例代码")).toContainText("binary_search");
  await page.getByLabel("完整示例代码").fill('print("持久草稿")');
  await page.getByRole("button", { name: "运行 Python", exact: true }).click();
  await expect(page.getByLabel("运行结果")).toContainText("持久草稿", {
    timeout: 90000,
  });
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("连续正文")).toBeVisible();
  await page
    .locator(".study-article")
    .first()
    .getByRole("button", { name: "查看 / 运行" })
    .first()
    .click();
  await expect(page.getByLabel("完整示例代码")).toContainText("持久草稿");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", {name:"更多阅读工具"}).click();
  await page.getByRole("button", { name: "切换阅读模式" }).click();
  await expect(page.locator(".book-holder")).toBeVisible();
  expect(errors).toEqual([]);
});

test("algorithm prediction, persisted state, exercise grading and tiered hints", async ({
  page,
}) => {
  await page.goto("/read/chapter_searching/binary_search");
  await expect(page.locator(".book-holder")).not.toHaveClass(/loading/);
  await page.getByRole("button", {name:"更多阅读工具"}).click();
  await page.getByRole("button", { name: "打开学习实验室" }).click();
  await expect(page.getByLabel("选择算法实验")).toHaveValue("binary");
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.locator(".prediction")).toBeVisible();
  await page.getByRole("button", { name: "跳过，查看解释" }).click();
  await expect(page.locator(".lab-explanation")).toContainText("检查中点");
  await page.getByRole("button", { name: "编程练习 · 24 题" }).click();
  await expect(page.locator(".exercise-catalog button")).toHaveCount(24);
  await page
    .locator(".exercise-catalog")
    .getByRole("button", { name: /中点计算/ })
    .click();
  const exercise = JSON.parse(
    readFileSync("web/public/learning/exercises.json", "utf8"),
  ).find((e: any) => e.id === "practice-3-1");
  await expect(page.getByLabel("完整示例代码")).toContainText("___");
  await page.getByRole("button", { name: "检查答案", exact: true }).click();
  await expect(page.locator(".test-results")).toContainText("通过 1 / 6", {
    timeout: 90000,
  });
  await page.getByLabel("完整示例代码").fill(exercise.solution);
  await page.getByRole("button", { name: "检查答案", exact: true }).click();
  await expect(page.locator(".test-results")).toContainText("通过 6 / 6", {
    timeout: 90000,
  });
  await page.getByRole("button", { name: "提示 1：思路" }).click();
  await expect(page.locator(".code-panel")).toContainText(exercise.hints[0]);
  await page.screenshot({
    path: "output/playwright/v02-practice.png",
    fullPage: true,
  });
});

// Each exercise has its own cold-start budget and independently reported result.
const exercises = JSON.parse(readFileSync("web/public/learning/exercises.json", "utf8"));
for (const exercise of exercises) test(`Python reference and rejected starter: ${exercise.id}`, async ({ page }) => {
  test.setTimeout(205000);
  await page.goto("/");
  const report = await page.evaluate(async (exercise) => {
    const grade = (code: string) => new Promise<any>((resolve) => {
      const worker = new Worker("/python-worker.js", { type: "module" });
      let ready = false;
      let timer: ReturnType<typeof setTimeout>;
      const done = (value: any) => {
        clearTimeout(timer); worker.terminate(); resolve(value);
      };
      timer = setTimeout(() => done({ initializationError: "init timeout" }), 90000);
      worker.onmessage = ({ data }) => {
        if (data.type === "ready") {
          ready = true; clearTimeout(timer);
          timer = setTimeout(() => done({ timeout: true }), 10000);
          worker.postMessage({ type: "check", code, path: "exercise.py", tests: exercise.tests });
        }
        if (data.type === "result" || data.type === "error")
          done(ready ? data : { initializationError: data });
      };
      worker.onerror = (e) => done({ initializationError: e.message });
      worker.postMessage({ type: "init" });
    });
    return { reference: await grade(exercise.solution), starter: await grade(exercise.starter) };
  }, exercise);
  expect(report.reference.initializationError).toBeUndefined();
  expect(report.starter.initializationError).toBeUndefined();
  expect(report.reference.results).toHaveLength(exercise.tests.length);
  expect(report.reference.results.every((r: any) => r.passed)).toBe(true);
  expect(!!report.starter.timeout || report.starter.type === "error" ||
    report.starter.results?.some((r: any) => !r.passed)).toBe(true);
});
