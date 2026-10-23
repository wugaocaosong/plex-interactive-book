export interface LabInput {
  values: number[];
  target: number;
  index: number;
  value: number;
  operation: "insert" | "delete";
  tree: (number | null)[];
  graph: number[][];
  start: number;
  n: number;
}
export interface LabStep {
  values: number[];
  active: number[];
  variables: Record<string, unknown>;
  explanation: string;
  lines: number[];
  nodes?: { id: number; label: string }[];
  edges?: [number, number][];
  stack?: string[];
  prediction?: { question: string; options: string[]; answer: number };
}
export interface AlgorithmLabDefinition {
  id: string;
  group: number;
  title: string;
  code: string;
}
export interface LabSession {
  input: LabInput;
  algorithm: string;
  step: number;
  predictions: Record<number, { choice: number; correct: boolean }>;
}
export const labGroups = [
  "数组与链表",
  "栈与队列",
  "二分查找",
  "排序",
  "树与图",
  "递归",
];
export const defaultInput: LabInput = {
  values: [2, 5, 8, 12, 16],
  target: 12,
  index: 2,
  value: 7,
  operation: "insert",
  tree: [1, 2, 3, 4, 5, 6, 7],
  graph: [
    [1, 2],
    [0, 3],
    [0, 3],
    [1, 2],
  ],
  start: 0,
  n: 4,
};
export const algorithms: AlgorithmLabDefinition[] = [
  {
    id: "array",
    group: 0,
    title: "数组插入／删除",
    code: "if insert:\n    for j in range(n, index, -1):\n        a[j] = a[j-1]\n    a[index] = value\nelse:\n    for j in range(index, n-1):\n        a[j] = a[j+1]\n    a.pop()",
  },
  {
    id: "linked",
    group: 0,
    title: "单链表插入／删除",
    code: "previous = find_predecessor(index)\nif insert:\n    node.next = previous.next\n    previous.next = node\nelse:\n    previous.next = previous.next.next",
  },
  {
    id: "stack",
    group: 1,
    title: "栈",
    code: "if push:\n    stack.append(value)\nelse:\n    value = stack.pop()",
  },
  {
    id: "queue",
    group: 1,
    title: "队列",
    code: "if enqueue:\n    queue.append(value)\nelse:\n    value = queue.pop(0)",
  },
  {
    id: "binary",
    group: 2,
    title: "二分查找",
    code: "left, right = 0, len(nums)-1\nwhile left <= right:\n    mid = (left+right)//2\n    if nums[mid] == target: return mid\n    if nums[mid] < target: left = mid+1\n    else: right = mid-1\nreturn -1",
  },
  {
    id: "bubble",
    group: 3,
    title: "冒泡排序",
    code: "for end in range(len(a)-1, 0, -1):\n    for j in range(end):\n        if a[j] > a[j+1]:\n            a[j], a[j+1] = a[j+1], a[j]",
  },
  {
    id: "insertion",
    group: 3,
    title: "插入排序",
    code: "for i in range(1, len(a)):\n    key, j = a[i], i-1\n    while j >= 0 and a[j] > key:\n        a[j+1] = a[j]\n        j -= 1\n    a[j+1] = key",
  },
  {
    id: "quick",
    group: 3,
    title: "快速排序",
    code: "def sort(lo, hi):\n    if lo >= hi: return\n    pivot, i = a[hi], lo\n    for j in range(lo, hi):\n        if a[j] < pivot:\n            a[i], a[j] = a[j], a[i]; i += 1\n    a[i], a[hi] = a[hi], a[i]\n    sort(lo, i-1); sort(i+1, hi)",
  },
  ...(["pre", "in", "post", "level"] as const).map((order) => ({
    id: "tree-" + order,
    group: 4,
    title: {
      pre: "树 · 前序遍历",
      in: "树 · 中序遍历",
      post: "树 · 后序遍历",
      level: "树 · 层序遍历",
    }[order],
    code:
      order === "level"
        ? "queue = [root]\nwhile queue:\n    node = queue.pop(0)\n    visit(node)\n    queue.extend(children(node))"
        : `def traverse(node):\n    if node is None: return\n${order === "pre" ? "    visit(node)\n" : ""}    traverse(node.left)\n${order === "in" ? "    visit(node)\n" : ""}    traverse(node.right)\n${order === "post" ? "    visit(node)" : ""}`,
  })),
  ...(["bfs", "dfs"] as const).map((method) => ({
    id: "graph-" + method,
    group: 4,
    title: "图 · " + method.toUpperCase(),
    code:
      method === "bfs"
        ? "queue, seen = [start], {start}\nwhile queue:\n    node = queue.pop(0)\n    visit(node)\n    for neighbor in graph[node]:\n        if neighbor not in seen:\n            seen.add(neighbor); queue.append(neighbor)"
        : "def dfs(node):\n    if node in seen: return\n    seen.add(node)\n    visit(node)\n    for neighbor in graph[node]:\n        dfs(neighbor)",
  })),
  {
    id: "factorial",
    group: 5,
    title: "递归 · 阶乘",
    code: "def factorial(n):\n    if n <= 1: return 1\n    value = factorial(n-1)\n    return n * value",
  },
  {
    id: "fibonacci",
    group: 5,
    title: "递归 · 斐波那契",
    code: "def fib(n):\n    if n < 2: return n\n    left = fib(n-1)\n    right = fib(n-2)\n    return left + right",
  },
];
function integer(value: number) {
  return Number.isInteger(value) && Math.abs(value) <= 999;
}
export function buildLab(id: string, input: LabInput): LabStep[] {
  const algorithm = algorithms.find((a) => a.id === id);
  if (!algorithm) throw Error("未知实验");
  const a = [...input.values],
    steps: LabStep[] = [];
  let comparisons = 0,
    swaps = 0,
    moves = 0;
  const emit = (
    explanation: string,
    lines: number[],
    variables: Record<string, unknown> = {},
    active: number[] = [],
    extra: Partial<LabStep> = {},
  ) => {
    const answer = steps.length % 3;
    const options = ["保持当前状态不变", "立即终止本次操作"];
    options.splice(answer, 0, explanation);
    steps.push(
      JSON.parse(
        JSON.stringify({
          values: a,
          active,
          variables: { comparisons, swaps, moves, ...variables },
          explanation,
          lines,
          ...extra,
          prediction: steps.length
            ? { question: "预测下一步操作", options, answer }
            : undefined,
        }),
      ),
    );
  };
  if (algorithm.group < 4 && (!a.every(integer) || a.length > 16))
    throw Error("请输入最多 16 个 -999 到 999 的整数");
  emit("准备完成，先观察初始状态。", [], {});
  if (id === "array" || id === "linked") {
    const inserting = input.operation === "insert",
      i = input.index;
    if (
      !Number.isInteger(i) ||
      i < 0 ||
      i > (inserting ? a.length : a.length - 1)
    )
      throw Error("操作位置越界；插入允许尾后位置，删除必须指向现有元素");
    if (inserting && (a.length === 16 || !integer(input.value)))
      throw Error("插入后最多 16 个元素，值必须是 -999 到 999 的整数");
    if (id === "array") {
      if (inserting) {
        a.push(0);
        for (let j = a.length - 1; j > i; j--) {
          a[j] = a[j - 1];
          moves++;
          emit(`将索引 ${j - 1} 的元素移到 ${j}。`, [2, 3], { index: i }, [
            j - 1,
            j,
          ]);
        }
        a[i] = input.value;
        emit(`在索引 ${i} 写入 ${input.value}。`, [4], { index: i }, [i]);
      } else {
        for (let j = i; j < a.length - 1; j++) {
          a[j] = a[j + 1];
          moves++;
          emit(`将索引 ${j + 1} 的元素左移到 ${j}。`, [6, 7], { index: i }, [
            j,
            j + 1,
          ]);
        }
        a.pop();
        emit("移除末尾重复位置，删除完成。", [8], { index: i });
      }
    } else {
      const nodes = a.map((v, i) => ({ id: i, label: String(v) })),
        edges: [number, number][] = nodes.slice(1).map((n, j) => [j, n.id]);
      const head = { id: -1, label: "哨兵" };
      const all = [head, ...nodes];
      edges.unshift([-1, 0]);
      if (!nodes.length) edges.length = 0;
      emit("从哨兵节点找到操作位置的前驱。", [1], { index: i }, [i - 1], {
        nodes: all,
        edges,
      });
      const predecessor = i - 1;
      if (inserting) {
        const node = { id: 100, label: String(input.value) };
        all.push(node);
        if (i < nodes.length) edges.push([100, i]);
        emit("先让新节点指向原后继。", [3], { index: i }, [100], {
          nodes: all,
          edges,
        });
        const old = edges.findIndex((e) => e[0] === predecessor);
        if (old >= 0) edges.splice(old, 1);
        edges.push([predecessor, 100]);
        a.splice(i, 0, input.value);
        emit(
          "再让前驱指向新节点，链表插入完成。",
          [4],
          { index: i },
          [predecessor, 100],
          { nodes: all, edges },
        );
      } else {
        for (let j = edges.length - 1; j >= 0; j--)
          if (edges[j][0] === predecessor || edges[j][0] === i)
            edges.splice(j, 1);
        if (i + 1 < nodes.length) edges.push([predecessor, i + 1]);
        a.splice(i, 1);
        emit(
          "前驱跳过目标节点，指向目标的后继。",
          [6],
          { index: i },
          [predecessor],
          { nodes: all.filter((n) => n.id !== i), edges },
        );
      }
    }
  } else if (id === "stack" || id === "queue") {
    if (input.operation === "insert") {
      if (a.length >= 16 || !integer(input.value))
        throw Error("容器最多 16 个元素，值必须是 -999 到 999 的整数");
      a.push(input.value);
      emit(
        `在${id === "stack" ? "栈顶" : "队尾"}加入 ${input.value}。`,
        [1, 2],
        { top: a.length - 1, front: 0, rear: a.length - 1 },
        [a.length - 1],
      );
    } else {
      if (!a.length) throw Error("容器为空，不能取出元素");
      const value = id === "stack" ? a.pop() : a.shift();
      emit(`取出${id === "stack" ? "栈顶" : "队首"}元素 ${value}。`, [3, 4], {
        removed: value,
        top: a.length - 1,
        front: 0,
        rear: a.length - 1,
      });
    }
  } else if (id === "binary") {
    if (!integer(input.target)) throw Error("目标必须为 -999 到 999 的整数");
    if (a.some((v, i) => i > 0 && a[i - 1] > v))
      throw Error("二分查找需要升序数组，请先修正输入");
    let left = 0,
      right = a.length - 1,
      answer = -1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      comparisons++;
      emit(
        `检查中点 ${mid}，其值为 ${a[mid]}。`,
        [2, 3],
        { left, right, mid, target: input.target },
        [mid],
      );
      if (a[mid] === input.target) {
        answer = mid;
        emit(`找到目标，返回索引 ${mid}。`, [4], { left, right, mid, answer }, [
          mid,
        ]);
        break;
      }
      if (a[mid] < input.target) {
        left = mid + 1;
        emit("目标更大，排除中点及左半区。", [5], { left, right, mid }, [
          left,
          right,
        ]);
      } else {
        right = mid - 1;
        emit("目标更小，排除中点及右半区。", [6], { left, right, mid }, [
          left,
          right,
        ]);
      }
    }
    if (answer < 0)
      emit("搜索区间为空，返回 -1。", [7], { left, right, answer });
  } else if (id === "bubble") {
    for (let end = a.length - 1; end > 0; end--)
      for (let j = 0; j < end; j++) {
        comparisons++;
        emit(`比较相邻元素 ${a[j]} 与 ${a[j + 1]}。`, [2, 3], { end, j }, [
          j,
          j + 1,
        ]);
        if (a[j] > a[j + 1]) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          swaps++;
          emit("左边较大，交换相邻元素。", [4], { end, j }, [j, j + 1]);
        }
      }
    emit("排序完成。", [], {});
  } else if (id === "insertion") {
    for (let i = 1; i < a.length; i++) {
      const key = a[i];
      let j = i - 1;
      emit(`保存待插入值 ${key}。`, [1, 2], { i, j, key }, [i]);
      while (j >= 0) {
        comparisons++;
        emit(`比较 ${a[j]} 与待插入值 ${key}。`, [3], { i, j, key }, [j]);
        if (a[j] <= key) break;
        a[j + 1] = a[j];
        moves++;
        emit("较大元素右移一位。", [4, 5], { i, j, key }, [j, j + 1]);
        j--;
      }
      a[j + 1] = key;
      emit("将待插入值写入空位。", [6], { i, j, key }, [j + 1]);
    }
    emit("排序完成。", [], {});
  } else if (id === "quick") {
    const sort = (lo: number, hi: number) => {
      if (lo >= hi) return;
      const pivot = a[hi];
      let i = lo;
      emit(`选择 ${pivot} 作为基准。`, [3], { lo, hi, pivot, i }, [hi]);
      for (let j = lo; j < hi; j++) {
        comparisons++;
        emit(
          `比较 ${a[j]} 与基准 ${pivot}。`,
          [4, 5],
          { lo, hi, pivot, i, j },
          [j, hi],
        );
        if (a[j] < pivot) {
          if (i !== j) {
            [a[i], a[j]] = [a[j], a[i]];
            swaps++;
          }
          emit("把较小元素放入左分区。", [6], { lo, hi, pivot, i, j }, [i, j]);
          i++;
        }
      }
      if (i !== hi) {
        [a[i], a[hi]] = [a[hi], a[i]];
        swaps++;
      }
      emit("基准归位，递归处理左右分区。", [7, 8], { lo, hi, pivot, i }, [i]);
      sort(lo, i - 1);
      sort(i + 1, hi);
    };
    sort(0, a.length - 1);
    emit("排序完成。", [], {});
  } else if (id.startsWith("tree-")) {
    const tree = input.tree;
    if (tree.length > 15 || !tree.every((v) => v === null || integer(v)))
      throw Error("树最多 15 个整数节点，空位使用 null");
    if (
      tree.some(
        (v, i) => v !== null && i > 0 && tree[Math.floor((i - 1) / 2)] === null,
      )
    )
      throw Error("空节点下不能存在孩子");
    const nodes = tree.flatMap((v, i) =>
        v === null ? [] : [{ id: i, label: String(v) }],
      ),
      edges: [number, number][] = nodes
        .filter((n) => n.id > 0)
        .map((n) => [Math.floor((n.id - 1) / 2), n.id]),
      order: number[] = [];
    const visit = (i: number) => {
      order.push(tree[i]!);
      emit(
        `访问节点 ${tree[i]}。`,
        [
          id === "tree-pre"
            ? 3
            : id === "tree-in"
              ? 4
              : id === "tree-post"
                ? 5
                : 4,
        ],
        { order: [...order] },
        [i],
        { nodes, edges },
      );
    };
    const dfs = (i: number) => {
      if (i >= tree.length || tree[i] === null) return;
      if (id === "tree-pre") visit(i);
      dfs(2 * i + 1);
      if (id === "tree-in") visit(i);
      dfs(2 * i + 2);
      if (id === "tree-post") visit(i);
    };
    if (id === "tree-level") {
      const q = tree.length && tree[0] !== null ? [0] : [];
      for (let k = 0; k < q.length; k++) {
        const i = q[k];
        visit(i);
        for (const c of [2 * i + 1, 2 * i + 2])
          if (c < tree.length && tree[c] !== null) q.push(c);
      }
    } else dfs(0);
    emit("遍历完成。", [], { order }, [], { nodes, edges });
  } else if (id.startsWith("graph-")) {
    const graph = input.graph;
    if (graph.length > 12 || !graph.every((row) => Array.isArray(row)))
      throw Error("图最多 12 个节点，以邻接表输入");
    for (let i = 0; i < graph.length; i++)
      for (const j of graph[i])
        if (
          !Number.isInteger(j) ||
          j < 0 ||
          j >= graph.length ||
          !graph[j].includes(i)
        )
          throw Error("无向图的邻接关系必须对称，节点编号不能越界");
    if (
      graph.length &&
      (!Number.isInteger(input.start) ||
        input.start < 0 ||
        input.start >= graph.length)
    )
      throw Error("起点越界");
    const nodes = graph.map((_, id) => ({ id, label: String(id) })),
      edges: [number, number][] = graph.flatMap((row, i) =>
        row.filter((j) => j >= i).map((j) => [i, j] as [number, number]),
      ),
      seen = new Set<number>(),
      order: number[] = [];
    const visit = (node: number) => {
      order.push(node);
      emit(
        `首次访问节点 ${node}。`,
        [4],
        { order: [...order], visited: [...seen] },
        [node],
        { nodes, edges },
      );
    };
    if (graph.length) {
      if (id === "graph-bfs") {
        const q = [input.start];
        seen.add(input.start);
        for (let k = 0; k < q.length; k++) {
          const node = q[k];
          visit(node);
          for (const n of graph[node])
            if (!seen.has(n)) {
              seen.add(n);
              q.push(n);
            }
        }
      } else {
        const dfs = (n: number) => {
          if (seen.has(n)) return;
          seen.add(n);
          visit(n);
          for (const next of graph[n]) dfs(next);
        };
        dfs(input.start);
      }
    }
    emit(
      "遍历完成；未访问节点不与起点连通。",
      [],
      { order, visited: [...seen] },
      [],
      { nodes, edges },
    );
  } else {
    if (!Number.isInteger(input.n) || input.n < 0 || input.n > 8)
      throw Error("递归输入限定为 0 到 8 的整数");
    const stack: string[] = [];
    const counts: Record<number, number> = {};
    let calls = 0;
    const call = (n: number): number => {
      calls++;
      counts[n] = (counts[n] || 0) + 1;
      stack.push(`${id}(${n})`);
      emit(
        `进入 ${id}(${n})。`,
        [1],
        {
          n,
          calls,
          repeatedCalls: Object.values(counts).reduce(
            (s, c) => s + Math.max(0, c - 1),
            0,
          ),
        },
        [],
        { stack: [...stack] },
      );
      let result: number;
      if (n < 2) {
        result = id === "factorial" ? 1 : n;
        emit(`达到基础情况，返回 ${result}。`, [2], { n, result, calls }, [], {
          stack: [...stack],
        });
      } else {
        const left = call(n - 1);
        const right = id === "factorial" ? n : call(n - 2);
        result = id === "factorial" ? left * right : left + right;
        emit(
          `当前层得到返回值 ${result}。`,
          [id === "factorial" ? 4 : 5],
          { n, left, right, result, calls },
          [],
          { stack: [...stack] },
        );
      }
      stack.pop();
      return result;
    };
    const result = call(input.n);
    emit("全部调用返回，计算完成。", [], { result, calls }, [], { stack: [] });
  }
  return steps;
}
