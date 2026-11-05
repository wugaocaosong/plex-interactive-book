STATIONS = ["总站", "天枢", "望舒", "瑶光", "开阳", "玉衡", "天璇", "摇光"]
ROUTES = [[0,1], [0,2], [1,3], [2,3], [2,4], [3,5], [4,5], [4,6], [5,7], [6,7]]
PACKAGES = [12, 5, 8, 3, 9, 6, 4, 7]

def build_adj_list(n, routes):
    """返回 n 个列表，第 i 个装 i 的全部邻居"""
    ...  # TODO：写完后把这行删掉

def build_adj_matrix(n, routes):
    """返回 n×n 的 0/1 矩阵"""
    ...  # TODO

# ==== 自检（报错说明还没写完，很正常）====
g = build_adj_list(8, ROUTES)
print("望舒的邻居:", g[2], "(应为 [0, 3, 4])")
print("总站的邻居:", g[0], "(应为 [1, 2])")
m = build_adj_matrix(8, ROUTES)
print("matrix[2][4] =", m[2][4], "matrix[4][2] =", m[4][2])
print("边数 =", sum(sum(row) for row in m) // 2, "(应为 10)")
