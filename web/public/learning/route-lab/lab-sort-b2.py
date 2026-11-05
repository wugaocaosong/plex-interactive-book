STATIONS = ["总站", "天枢", "望舒", "瑶光", "开阳", "玉衡", "天璇", "摇光"]
ROUTES = [[0,1], [0,2], [1,3], [2,3], [2,4], [3,5], [4,5], [4,6], [5,7], [6,7]]
PACKAGES = [12, 5, 8, 3, 9, 6, 4, 7]

def binary_search(nums: list[int], target: int) -> int:
    """在升序数组里找 target，返回下标；找不到返回 -1"""
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

# ---- 试运行：跳数表来自实验二（0 1 1 2 2 3 3 4）----
hops = [0, 1, 1, 2, 2, 3, 3, 4]
idx = binary_search(hops, 2)
print("恰好 2 跳的驿站:", idx, "→", STATIONS[idx] if idx >= 0 else "无")
print("恰好 5 跳的驿站:", binary_search(hops, 5), "(应为 -1)")
