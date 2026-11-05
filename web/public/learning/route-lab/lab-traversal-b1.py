STATIONS = ["总站", "天枢", "望舒", "瑶光", "开阳", "玉衡", "天璇", "摇光"]
ROUTES = [[0,1], [0,2], [1,3], [2,3], [2,4], [3,5], [4,5], [4,6], [5,7], [6,7]]
PACKAGES = [12, 5, 8, 3, 9, 6, 4, 7]

graph = [[] for _ in STATIONS]
for a, b in ROUTES:
    graph[a].append(b); graph[b].append(a)

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

# ---- 试运行：把 0 改成别的起点试试 ----
hops = bfs_shortest(graph, 0)
for i, h in enumerate(hops):
    print(STATIONS[i], h, "跳")
