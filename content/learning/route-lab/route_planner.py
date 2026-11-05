# -*- coding: utf-8 -*-
"""星航驿站 · 配送规划

第 9–11 章综合实验的参考实现：一张航线图、一张包裹表，
走完建图 → 遍历 → 排序 → 调度四步，输出一份配送建议。
"""

STATIONS = ["总站", "天枢", "望舒", "瑶光", "开阳", "玉衡", "天璇", "摇光"]
ROUTES = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5], [4, 6], [5, 7], [6, 7]]
PACKAGES = [12, 5, 8, 3, 9, 6, 4, 7]


def build_adj_list(n: int, routes: list[list[int]]) -> list[list[int]]:
    """返回 n 个列表，第 i 个装 i 的全部邻居"""
    graph = [[] for _ in range(n)]
    for a, b in routes:
        graph[a].append(b)
        graph[b].append(a)
    return graph


def build_adj_matrix(n: int, routes: list[list[int]]) -> list[list[int]]:
    """返回 n×n 的 0/1 矩阵"""
    matrix = [[0] * n for _ in range(n)]
    for a, b in routes:
        matrix[a][b] = 1
        matrix[b][a] = 1
    return matrix


def bfs_shortest(graph: list[list[int]], start: int) -> list[int]:
    """从 start 出发，返回每一站的最少跳数；不可达记 -1"""
    hops = [-1] * len(graph)
    hops[start] = 0
    queue = [start]
    head = 0
    while head < len(queue):
        node = queue[head]
        head += 1
        for nxt in graph[node]:
            if hops[nxt] == -1:
                hops[nxt] = hops[node] + 1
                queue.append(nxt)
    return hops


def bubble_sort_desc(nums: list[int]) -> list[int]:
    """冒泡排序（降序），返回新数组，不改原数据"""
    arr = list(nums)
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - 1 - i):
            if arr[j] < arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr


def binary_search(nums: list[int], target: int) -> int:
    """在升序数组里找 target，返回下标；找不到返回 -1"""
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1


def dispatch_plan() -> list[int]:
    """返回配送顺序：包裹量大的先送，同量时近的先送"""
    graph = build_adj_list(len(STATIONS), ROUTES)
    hops = bfs_shortest(graph, 0)
    return sorted(range(len(STATIONS)), key=lambda i: (-PACKAGES[i], hops[i]))


def main() -> None:
    print("== 1. 建图 ==")
    graph = build_adj_list(len(STATIONS), ROUTES)
    print("邻接表：")
    for i, neighbors in enumerate(graph):
        names = "、".join(STATIONS[j] for j in neighbors)
        print(f"  {STATIONS[i]} → {names}")
    matrix = build_adj_matrix(len(STATIONS), ROUTES)
    edges = sum(sum(row) for row in matrix) // 2
    print(f"邻接矩阵共记录 {edges} 条航线（矩阵对称，取一半）")

    print()
    print("== 2. 广度优先遍历：最少跳数 ==")
    hops = bfs_shortest(graph, 0)
    for i, h in enumerate(hops):
        print(f"  {STATIONS[0]} → {STATIONS[i]}：{h} 跳")

    print()
    print("== 3. 冒泡排序：包裹量降序 ==")
    print(f"  排序前：{PACKAGES}")
    print(f"  排序后：{bubble_sort_desc(PACKAGES)}")

    print()
    print("== 4. 综合调度 ==")
    print("配送顺序建议（包裹量优先，同量就近）：")
    for rank, i in enumerate(dispatch_plan(), start=1):
        print(f"  第{rank}站  {STATIONS[i]}（{PACKAGES[i]} 份，{hops[i]} 跳可达）")

    order = sorted(range(len(STATIONS)), key=lambda i: hops[i])
    sorted_hops = [hops[i] for i in order]
    pos = binary_search(sorted_hops, 2)
    hit = STATIONS[order[pos]]
    print()
    print(f"二分查找恰好 2 跳可达的驿站：{hit}")


if __name__ == "__main__":
    main()
