import { test, expect } from "@playwright/test";
import ts from "typescript";
import { readFileSync } from "node:fs";
const source = ts.transpileModule(
  ["learning-scope.ts", "monty-hall.ts", "lesson-state.ts", "blackboard-model.ts", "learning-store.ts"]
    .map((f) =>
      readFileSync("web/.vitepress/theme/" + f, "utf8").replace(
        /^import[\s\S]*?from\s*["'][^"']+["'];?\s*/gm,
        "",
      ),
    )
    .join("\n"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  },
).outputText;
async function api(page: any, operation: string) {
  return page.evaluate(
    async ({ source, operation }: any) => {
      const url = URL.createObjectURL(
        new Blob([source], { type: "text/javascript" }),
      );
      const store = await import(url);
      URL.revokeObjectURL(url);
      return new Function("store", "return (async()=>{" + operation + "})()")(
        store,
      );
    },
    { source, operation },
  );
}
const openProfile = async (page: any) => {
  await page.getByTestId("lesson-entry").click();
  await page.locator(".all-activities summary").click();
  await page.getByText("登录／查看 PLEX 学习画像", { exact: true }).click();
};

test("guest migration, accounts, backups and returning to guest never mix records or tokens", async ({
  page,
}) => {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const body = route.request().postDataJSON();
    const data = url.pathname.endsWith("/login")
      ? {
          id: body.username === "one" ? 101 : 202,
          username: body.username,
          role: "student",
          access_token: "sensitive-access",
          refresh_token: "sensitive-refresh",
        }
      : url.pathname.endsWith("/profile")
        ? {
            dimensions: {
              knowledge_foundation: { value: "来自服务端的示例画像" },
            },
          }
        : null;
    await route.fulfill({ json: { code: 0, data } });
  });
  await page.goto("/read/unit/monty/start");
  await api(
    page,
    "await store.putLearning('blackboard:unit/monty/start',{version:1,sectionId:'unit/monty/start',marks:[],updatedAt:new Date().toISOString()});await store.putLearning('draft:guest',{code:'guest code'});",
  );
  const signIn = async (name: string) => {
    await openProfile(page);
    await page.getByLabel("PLEX 学生账号").fill(name);
    await page.getByLabel("密码", { exact: true }).fill("test-only");
    await Promise.all([
      page.waitForEvent("domcontentloaded"),
      page
        .getByRole("button", { name: /^登录 PLEX$|重新登录／切换账号/ })
        .click(),
    ]);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(sessionStorage.getItem("plex-account") || "{}").username,
        ),
      )
      .toBe(name);
    await expect(
      page.getByTestId("lesson-entry"),
    ).toBeVisible();
  };
  await signIn("one");
  expect(
    await api(page, "return await store.getLearning('draft:guest',null)"),
  ).toBeNull();
  await openProfile(page);
  await page.getByRole("button", { name: "复制访客学习记录到此账号" }).click();
  await page.getByRole("button", { name: "确认复制这些记录" }).click();
  await expect(page.locator(".plex-profile")).toContainText("已复制访客记录");
  await api(
    page,
    "await store.putLearning('draft:guest',{code:'account one'});",
  );
  const backup = await api(page, "return await store.exportBackup()");
  expect(backup.version).toBe(3);
  expect(JSON.stringify(backup)).not.toContain("sensitive-");
  expect(backup.records.some((r: any) => r.id.startsWith("blackboard:"))).toBe(
    true,
  );
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await signIn("two");
  expect(
    await api(page, "return await store.getLearning('draft:guest',null)"),
  ).toBeNull();
  await openProfile(page);
  await Promise.all([
    page.waitForEvent("domcontentloaded"),
    page.getByRole("button", { name: "退出到访客" }).click(),
  ]);
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("plex-account")))
    .toBeNull();
  await page.waitForLoadState();
  expect(
    await api(page, "return await store.getLearning('draft:guest',null)"),
  ).toEqual({ code: "guest code" });
});

test("offline login keeps local story available", async ({ page }) => {
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 503,
      json: { code: 50301, message: "服务暂不可用" },
    }),
  );
  await page.goto("/read/unit/monty/start");
  await openProfile(page);
  await page.getByLabel("PLEX 学生账号").fill("sample");
  await page.getByLabel("密码", { exact: true }).fill("test");
  await page.getByRole("button", { name: "登录 PLEX", exact: true }).click();
  await expect(page.locator(".plex-profile")).toContainText("服务暂不可用");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByTestId("lesson-entry").click();
  await page.locator(".all-activities summary").click();
  await page.getByRole("button", { name: "三门挑战", exact: true }).click();
  await page.getByRole("button", { name: "选择1号舱门", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "提交预测，打开空门" }),
  ).toBeVisible();
});

test("expired refresh clears profile, keeps account scope and reports re-login", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "plex-account",
      JSON.stringify({ id: 303, username: "expired" }),
    );
    sessionStorage.setItem(
      "plex-session",
      JSON.stringify({ access_token: "expired", refresh_token: "expired" }),
    );
  });
  let calls = 0;
  await page.route("**/api/v1/**", async (route) => {
    calls++;
    return route.fulfill({
      status: 401,
      json: { code: 40101, message: "expired" },
    });
  });
  await page.goto("/read/unit/monty/start");
  await openProfile(page);
  await expect(page.locator(".plex-profile")).toContainText("登录已失效");
  expect(
    await page.evaluate(() => sessionStorage.getItem("plex-session")),
  ).toBeNull();
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("plex-account")!).id,
    ),
  ).toBe(303);
  expect(calls).toBe(2);
  await expect(page.locator(".profile-data")).toHaveCount(0);
});

test("version conflict and quota are visible without substituting a model reply", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "plex-account",
      JSON.stringify({ id: 404, username: "quota" }),
    );
    sessionStorage.setItem(
      "plex-session",
      JSON.stringify({ access_token: "test", refresh_token: "test" }),
    );
  });
  let version = "new";
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/profile"))
      return route.fulfill({ json: { code: 0, data: { dimensions: {} } } });
    if (path.endsWith("/context"))
      return route.fulfill({
        json: {
          code: 0,
          data: {
            task_source: "server",
            task: { ref: "bank-42", version, title: "服务端题目" },
          },
        },
      });
    if (path.includes("/practice-submissions/"))
      return route.fulfill({
        status: 409,
        json: { code: 40901, message: "题目已更新，请重新加载" },
      });
    return route.fulfill({
      status: 429,
      json: { code: 42901, message: "今日辅导额度已用完，请稍后重试" },
    });
  });
  await page.goto("/read/unit/monty/practice");
  await page.getByTestId("lesson-entry").click();
  await page.locator(".all-activities summary").click();
  await page.getByRole("button", { name: "编程练习", exact: true }).click();
  await page.locator(".unit-exercise-list>button").first().click();
  await page.getByText("小E在线辅导与 PLEX 正式提交", { exact: true }).click();
  await page.getByRole("button", { name: "在线提交当前代码" }).click();
  await expect(page.locator(".plex-coach")).toContainText("题目已更新");
  await page.getByRole("button", { name: "请小E辅导" }).click();
  await expect(page.locator(".plex-coach")).toContainText("额度已用完");
  await expect(page.locator(".plex-coach .unit-explanation")).toHaveCount(0);
});

test("online context, duplicate submit identity, cancellation and model failure are explicit", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "plex-account",
      JSON.stringify({ id: 101, username: "test" }),
    );
    sessionStorage.setItem(
      "plex-session",
      JSON.stringify({
        access_token: "test-access",
        refresh_token: "test-refresh",
      }),
    );
  });
  const submitted: any[] = [],
    asked: any[] = [];
  let version = "server-v1",
    fail = false;
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().postDataJSON();
    if (path.endsWith("/profile"))
      return route.fulfill({ json: { code: 0, data: { dimensions: {} } } });
    if (path.endsWith("/context"))
      return route.fulfill({
        json: {
          code: 0,
          data: {
            task_source: "server",
            task: { ref: "bank-321", version, title: "服务端三门题" },
          },
        },
      });
    if (path.includes("/practice-submissions/")) {
      submitted.push(body);
      return route.fulfill({
        json: {
          code: 0,
          data: {
            id: body.request_id,
            code: body.code,
            result: { all_passed: false },
          },
        },
      });
    }
    if (path.endsWith("/ask")) {
      asked.push(body);
      await new Promise((r) => setTimeout(r, 300));
      return route.fulfill({
        json: {
          code: 0,
          data: {
            request_id: body.request_id,
            status: "safe_fallback",
            generation_mode: "rules",
            summary: "模型暂不可用，请重试",
            next_step: "检查一个边界输入",
          },
        },
      });
    }
    if (path.endsWith("/cancel"))
      return route.fulfill({
        json: { code: 0, data: { status: "cancelled" } },
      });
    return route.fulfill({
      status: 401,
      json: { code: 40101, message: "登录已失效" },
    });
  });
  await page.goto("/read/unit/monty/practice");
  await page.getByTestId("lesson-entry").click();
  await page.locator(".all-activities summary").click();
  await page.getByRole("button", { name: "编程练习", exact: true }).click();
  await page.locator(".unit-exercise-list>button").first().click();
  await page.getByText("小E在线辅导与 PLEX 正式提交", { exact: true }).click();
  await page.getByRole("button", { name: "在线提交当前代码" }).click();
  await expect(page.locator(".plex-coach")).toContainText("服务端作答已记录");
  await page.getByRole("button", { name: "在线提交当前代码" }).click();
  await expect.poll(() => submitted.length).toBe(2);
  expect(submitted[0].request_id).toBe(submitted[1].request_id);
  expect(submitted[0].question_version).toBe("server-v1");
  expect(submitted[0]).not.toHaveProperty("results");
  await page.getByRole("button", { name: "请小E辅导" }).click();
  await expect(page.locator(".plex-coach")).toContainText(
    "服务端规则提示（非模型生成）",
  );
  expect(asked[0].submission_id).toBe(submitted[0].request_id);
  expect(asked[0]).not.toHaveProperty("score");
  await page.getByRole("button", { name: "请小E辅导" }).click();
  await page.getByRole("button", { name: "取消辅导" }).click();
  await expect(page.locator(".plex-coach")).toContainText("服务端已确认取消");
});
