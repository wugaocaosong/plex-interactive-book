def build_adj_list(n: int, routes: list[list[int]]) -> list[list[int]]:
    """返回 n 个列表，第 i 个装 i 的全部邻居"""
    graph = [[] for _ in range(n)]
    for a, b in routes:
        graph[a].append(b)
        graph[b].append(a)
    return graph

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

STATIONS = ["总站", "天枢", "望舒", "瑶光", "开阳", "玉衡", "天璇", "摇光"]
ROUTES = [[0,1], [0,2], [1,3], [2,3], [2,4], [3,5], [4,5], [4,6], [5,7], [6,7]]
PACKAGES = [12, 5, 8, 3, 9, 6, 4, 7]

def dispatch_plan() -> list[int]:
    """返回配送顺序：包裹量大的先送，同量时近的先送"""
    graph = build_adj_list(len(STATIONS), ROUTES)
    hops = bfs_shortest(graph, 0)
    return sorted(range(len(STATIONS)), key=lambda i: (-PACKAGES[i], hops[i]))

# ---- 试运行：把 key 里的负号挪个位置，看策略怎么变 ----
print(dispatch_plan())
