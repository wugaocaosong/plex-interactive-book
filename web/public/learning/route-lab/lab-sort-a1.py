STATIONS = ["总站", "天枢", "望舒", "瑶光", "开阳", "玉衡", "天璇", "摇光"]
ROUTES = [[0,1], [0,2], [1,3], [2,3], [2,4], [3,5], [4,5], [4,6], [5,7], [6,7]]
PACKAGES = [12, 5, 8, 3, 9, 6, 4, 7]

def bubble_sort_desc_count(nums):
    """返回 (降序数组, 比较次数, 交换次数)"""
    ...  # TODO：比较和交换各加一个计数器

def lower_bound(arr, x):
    """降序数组上：第一个 >= x 的位置（找不到返回 len(arr)）"""
    ...  # TODO：注意是降序，二分方向要反着写

# ==== 自检 ====
res = bubble_sort_desc_count(PACKAGES)
print("计数版:", res, "(应为 ([12, 9, 8, 7, 6, 5, 4, 3], 28, 11))")
pos = lower_bound(sorted(PACKAGES, reverse=True), 6)
print("包裹量≥6 的驿站数:", 8 - pos, "(应为 5)")
