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

CAPACITY = 20   # 快递员一趟最多带 20 份

def plan_trips(packages, capacity):
    """返回若干趟，每趟是一个站名列表"""
    ...  # TODO：先把包裹量降序排，再「装不下就开下一趟」

# 写好后取消注释并运行：
# for t, trip in enumerate(plan_trips(PACKAGES, CAPACITY), 1):
#     print(f"第 {t} 趟:", " → ".join(trip))
# 第 2、3 问把方案和理由写进实验报告。
