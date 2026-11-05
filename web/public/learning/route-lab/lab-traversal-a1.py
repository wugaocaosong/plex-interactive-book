STATIONS = ["总站", "天枢", "望舒", "瑶光", "开阳", "玉衡", "天璇", "摇光"]
ROUTES = [[0,1], [0,2], [1,3], [2,3], [2,4], [3,5], [4,5], [4,6], [5,7], [6,7]]
PACKAGES = [12, 5, 8, 3, 9, 6, 4, 7]

graph = [[] for _ in STATIONS]
for a, b in ROUTES:
    graph[a].append(b); graph[b].append(a)

def bfs_with_path(graph, start, goal):
    """返回 (跳数表, 从 start 到 goal 的路线)"""
    hops = [-1] * len(graph)
    hops[start] = 0
    parent = [-1] * len(graph)   # 我是从谁那儿第一次到达的
    queue = [start]
    head = 0
    ...  # TODO：照 9.3 写循环，入队时写 parent[nxt] = cur
    # TODO：结束后从 goal 顺着 parent 回溯到 start，反转成路线
    return hops, []

# ==== 自检 ====
hops, path = bfs_with_path(graph, 0, 7)
print("总站到摇光:", hops[7], "跳 (应为 4)")
print("路线:", " → ".join(STATIONS[i] for i in path) if path else "(还没写出来)")
