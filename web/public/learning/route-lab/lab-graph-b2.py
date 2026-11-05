STATIONS = ["总站", "天枢", "望舒", "瑶光", "开阳", "玉衡", "天璇", "摇光"]
ROUTES = [[0,1], [0,2], [1,3], [2,3], [2,4], [3,5], [4,5], [4,6], [5,7], [6,7]]
PACKAGES = [12, 5, 8, 3, 9, 6, 4, 7]

def build_adj_matrix(n: int, routes: list[list[int]]) -> list[list[int]]:
    """返回 n×n 的 0/1 矩阵"""
    matrix = [[0] * n for _ in range(n)]
    for a, b in routes:
        matrix[a][b] = 1
        matrix[b][a] = 1
    return matrix

# ---- 试运行 ----
matrix = build_adj_matrix(len(STATIONS), ROUTES)
print("总站那一行:", matrix[0])
print("边数 =", sum(sum(row) for row in matrix) // 2, "(应为 10)")
