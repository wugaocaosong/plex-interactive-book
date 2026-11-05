STATIONS = ["总站", "天枢", "望舒", "瑶光", "开阳", "玉衡", "天璇", "摇光"]
ROUTES = [[0,1], [0,2], [1,3], [2,3], [2,4], [3,5], [4,5], [4,6], [5,7], [6,7]]
PACKAGES = [12, 5, 8, 3, 9, 6, 4, 7]

# 第 1 问：删掉 4 条边之后的航线表
ROUTES_CUT = ROUTES[:6]   # 删掉 [4,5] [4,6] [5,7] [6,7]
graph_cut = [[] for _ in STATIONS]
for a, b in ROUTES_CUT:
    graph_cut[a].append(b); graph_cut[b].append(a)

def reachable(graph, start):
    """返回从 start 出发能到达的编号集合"""
    ...  # TODO：直接复用 9.3 的 BFS 也行

# 写好后取消注释并运行（第 2、3 问把结论记进报告）：
# print("可达:", sorted(reachable(graph_cut, 0)))
# print("不可达:", [STATIONS[i] for i in range(8) if i not in reachable(graph_cut, 0)])
