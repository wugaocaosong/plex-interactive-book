STATIONS = ["总站", "天枢", "望舒", "瑶光", "开阳", "玉衡", "天璇", "摇光"]
ROUTES = [[0,1], [0,2], [1,3], [2,3], [2,4], [3,5], [4,5], [4,6], [5,7], [6,7]]
PACKAGES = [12, 5, 8, 3, 9, 6, 4, 7]

def build_adj_list(n: int, routes: list[list[int]]) -> list[list[int]]:
    """返回 n 个列表，第 i 个装 i 的全部邻居"""
    graph = [[] for _ in range(n)]
    for a, b in routes:
        graph[a].append(b)
        graph[b].append(a)
    return graph

# ---- 试运行：改成你的想法，再点运行 ----
graph = build_adj_list(len(STATIONS), ROUTES)
for i, neighbors in enumerate(graph):
    print(STATIONS[i], "→", neighbors)
