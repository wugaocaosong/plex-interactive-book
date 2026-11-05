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

PACKAGES = [12, 5, 8, 3, 9, 6, 4, 7]
STATIONS = ["总站", "天枢", "望舒", "瑶光", "开阳", "玉衡", "天璇", "摇光"]
hops = [0, 1, 1, 2, 2, 3, 3, 4]   # 来自实验二

def dispatch_plan():
    """打印配送顺序前 3 站，每行带上（包裹量, 跳数）"""
    ...  # TODO：用一次 sorted，key 返回二元组 (-包裹量, 跳数)

# ==== 自检 ====
dispatch_plan()
# 应输出：总站（12 份，0 跳）→ 开阳（9 份，2 跳）→ 望舒（8 份，1 跳）
