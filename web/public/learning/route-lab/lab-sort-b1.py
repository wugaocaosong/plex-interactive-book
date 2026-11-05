STATIONS = ["总站", "天枢", "望舒", "瑶光", "开阳", "玉衡", "天璇", "摇光"]
ROUTES = [[0,1], [0,2], [1,3], [2,3], [2,4], [3,5], [4,5], [4,6], [5,7], [6,7]]
PACKAGES = [12, 5, 8, 3, 9, 6, 4, 7]

def bubble_sort_desc(nums: list[int]) -> list[int]:
    """冒泡排序（降序），返回新数组，不改原数据"""
    arr = list(nums)
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - 1 - i):
            if arr[j] < arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

# ---- 试运行：把 < 改成 > 再跑一次，看方向怎么翻 ----
print("排序前:", PACKAGES)
print("排序后:", bubble_sort_desc(PACKAGES))
