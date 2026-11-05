/**
 * 综合实验的三档难度
 *
 * 同一份作业，三种扶手高度：
 *   basic     跟做——代码全给，跑通即可
 *   advanced  半扶——只给函数签名和验收标准
 *   challenge 放手——换条件、加约束，自己想办法
 *
 * 页面里的正文块用 data-level 标记归属，渲染前按当前档位过滤掉不属于自己的块。
 * 过滤必须发生在分页之前（Layout.prepareAdjacent → decorateTerms），否则页数会算错。
 */

export const LAB_LEVELS = [
  { id: "basic", label: "基础", hint: "代码全给，跟做跑通" },
  { id: "advanced", label: "进阶", hint: "只给签名，自己补全" },
  { id: "challenge", label: "挑战", hint: "加约束，换条件再解" },
] as const;

export type LabLevel = (typeof LAB_LEVELS)[number]["id"];

export function isLabLevel(value: unknown): value is LabLevel {
  return LAB_LEVELS.some((level) => level.id === value);
}

export function isLabSection(id: string | undefined): boolean {
  return !!id?.startsWith("unit/lab/");
}

function labelOf(level: LabLevel): string {
  return LAB_LEVELS.find((item) => item.id === level)?.label ?? "基础";
}

/**
 * 按难度裁剪正文，并在页首插入切换条。
 * 幂等：同一份 HTML 重复调用不会叠加两条。
 */
export function decorateLabLevel(root: HTMLElement, level: LabLevel): void {
  const blocks = root.querySelectorAll<HTMLElement>("[data-level]");
  if (!blocks.length) return;

  blocks.forEach((block) => {
    if (block.dataset.level !== level) block.remove();
  });

  const heading = root.querySelector("h1");
  if (!heading || root.querySelector(".lab-level-bar")) return;

  const bar = document.createElement("div");
  bar.className = "lab-level-bar";
  bar.dataset.block = "lab-level-" + (root.dataset.section || root.closest<HTMLElement>("[data-section]")?.dataset.section || "unit").replaceAll("/", "-");
  bar.dataset.level = level;

  const label = document.createElement("span");
  label.className = "lab-level-label";
  label.textContent = "难度";

  const options = document.createElement("div");
  options.className = "lab-level-options";
  for (const item of LAB_LEVELS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = "lab-level";
    // 用 data-lab-level 而不是 data-level：后者是内容块的裁剪标记，不能被按钮占用
    button.dataset.labLevel = item.id;
    button.setAttribute("aria-pressed", String(item.id === level));
    if (item.id === level) button.classList.add("is-active");
    const name = document.createElement("b");
    name.textContent = item.label;
    const hint = document.createElement("i");
    hint.textContent = item.hint;
    button.append(name, hint);
    options.append(button);
  }

  const current = document.createElement("span");
  current.className = "lab-level-hint";
  current.textContent = `当前：${labelOf(level)}档`;

  bar.append(label, options, current);
  heading.after(bar);
}
