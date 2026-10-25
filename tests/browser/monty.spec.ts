import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const open = async (page: any, mode = "三门挑战") => {
  await page.getByRole("button", { name: "学习活动", exact: true }).click();
  await page
    .getByRole("navigation", { name: "三门学习活动" })
    .getByRole("button", { name: mode, exact: true })
    .click();
};
for (const width of [390, 820, 1440])
  test(`Monty story, board, restore and both reader modes ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/read/unit/monty/choose");
    await expect(page.locator(".book-holder")).not.toHaveClass(/loading/);
    await open(page);
    await page
      .getByRole("button", { name: "选择1号舱门", exact: true })
      .click();
    await page.getByRole("button", { name: "提交预测，打开空门" }).click();
    await expect(page.locator(".monty-story")).toContainText("号空门");
    await page
      .getByRole("button", { name: "换到另一扇门", exact: true })
      .click();
    await expect(page.locator(".unit-explanation")).toContainText("初选");
    await page.getByRole("button", { name: "把这轮画到小黑板" }).click();
    await page.getByRole("button", { name: "插入三门状态图" }).click();
    await page.getByLabel("板书文字").fill("初选错误时换门获奖");
    await page.getByRole("button", { name: "添加文字", exact: true }).click();
    const canvas = page.locator(".blackboard-canvas");
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + 30, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(box.x + 90, box.y + 60, { steps: 8 });
    await page.mouse.up();
    await expect(canvas.locator("polyline")).toHaveCount(1);
    await page.getByRole("button", { name: "清空（可撤销）" }).click();
    await expect(canvas.locator("[data-mark]")).toHaveCount(0);
    await page.getByRole("button", { name: "撤销", exact: true }).click();
    await expect(canvas.locator("[data-mark]")).toHaveCount(3);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出 PNG" }).click();
    expect((await download).suggestedFilename()).toContain(".png");
    await page.screenshot({ path: `output/playwright/v03-board-${width}.png` });
    await page.getByRole("button", { name: "关闭", exact: true }).click();
    await page.getByRole("button", { name: "更多阅读工具" }).click();
    await page.getByRole("button", { name: "切换阅读模式" }).click();
    await expect(page.getByLabel("连续正文")).toBeVisible();
    await open(page, "小黑板");
    await expect(
      page
        .locator(".blackboard-canvas text")
        .filter({ hasText: "初选错误时换门获奖" }),
    ).toHaveCount(1);
    await page.getByRole("button", { name: "关闭", exact: true }).click();
    await page.reload();
    await expect(page.getByLabel("连续正文")).toBeVisible();
    await open(page);
    await expect(page.locator(".unit-explanation")).toContainText("你的预测");
    expect(errors).toEqual([]);
  });

test("actual seeded Python simulations validate all records and repeat exactly", async ({
  page,
}) => {
  await page.goto("/read/unit/monty/compare");
  await open(page, "批量实验");
  await page.getByRole("button", { name: "运行 Python 试验" }).click();
  await expect(page.locator(".monty-simulation .unit-status")).toContainText(
    "1000 次真实 Python",
    { timeout: 90000 },
  );
  await page.screenshot({ path: "output/playwright/v03-simulation.png" });
  const report = await page.evaluate(async () => {
    const code = await fetch("/learning/monty-simulation.py").then((r) =>
      r.text(),
    );
    const results: any[] = [];
    const worker = new Worker("/python-worker.js", { type: "module" });
    let id = 0;
    const send = (body: any) =>
      new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(Error("worker timeout")), 90000);
        worker.onmessage = ({ data }) => {
          if (["ready", "done", "error"].includes(data.type)) {
            clearTimeout(timer);
            resolve(data);
          }
        };
        worker.onerror = (e) => reject(Error(e.message));
        worker.postMessage({ ...body, requestId: ++id, runId: id });
      });
    try {
      await send({ type: "init" });
      for (const count of [10, 100, 1000, 10000]) {
        const body = {
          type: "simulate",
          code,
          path: "monty.py",
          count,
          seed: 2026,
        };
        const a = (await send(body)).simulation,
          b = (await send(body)).simulation;
        results.push({
          count,
          same: JSON.stringify(a) === JSON.stringify(b),
          valid: a.trials.every(
            (t: any) =>
              t.opened !== t.prize &&
              t.opened !== t.first &&
              t.switch !== t.first &&
              t.switch !== t.opened,
          ),
          counts:
            a.trials.filter((t: any) => t.stayWon).length === a.stayWins &&
            a.stayWins + a.switchWins === count,
        });
      }
    } finally {
      worker.terminate();
    }
    return results;
  });
  expect(report).toEqual(
    [10, 100, 1000, 10000].map((count) => ({
      count,
      same: true,
      valid: true,
      counts: true,
    })),
  );
});

test("four-question H5P records rule answer, grades, retries and restores", async ({
  page,
}) => {
  await page.goto("/h5p-player.html?activity=monty-hall");
  const frame = page.frameLocator("#activity iframe");
  const content = JSON.parse(
    readFileSync("content/h5p/monty-hall/content/content.json", "utf8"),
  );
  for (let i = 0; i < 4; i++) {
    const choices = frame.getByRole("radio").filter({ visible: true });
    await expect(choices).toHaveCount(3);
    await choices.nth([0, 0, 1, 1][i]).click();
    await frame
      .getByRole("button", { name: "检查答案", exact: true })
      .filter({ visible: true })
      .click();
    if (i < 3)
      await frame
        .getByRole("button", { name: "下一页", exact: true })
        .first()
        .click();
  }
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("plex:h5p:monty-hall:v1") || "{}")
            .score,
      ),
    )
    .toBe(4);
  const scores = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("plex:h5p:monty-hall:v1") || "{}")
        .questionScores,
  );
  expect(scores).toEqual([1, 1, 1, 1]);
  await page.reload();
  await expect(frame.locator(".h5p-multichoice").first()).toBeAttached();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("plex:h5p:monty-hall:v1") || "{}")
            .score,
      ),
    )
    .toBe(4);
});

// An impatient reader can open an activity while the initial manifest is pending.
test("opening a learning activity survives delayed initial book loading", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/book/manifest.json", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/read/unit/monty/compare", {
    waitUntil: "domcontentloaded",
  });
  await open(page, "批量实验");
  await expect(
    page.getByRole("button", { name: "运行 Python 试验" }),
  ).toBeVisible();
  release();
  await expect(page.locator(".book-holder")).not.toHaveClass(/loading/);
  await expect(
    page.getByRole("button", { name: "运行 Python 试验" }),
  ).toBeVisible();
});
