STATIONS = ["总站", "天枢", "望舒", "瑶光", "开阳", "玉衡", "天璇", "摇光"]
ROUTES = [[0,1], [0,2], [1,3], [2,3], [2,4], [3,5], [4,5], [4,6], [5,7], [6,7]]
PACKAGES = [12, 5, 8, 3, 9, 6, 4, 7]

def bubble_count(nums):
    """返回 (降序数组, 交换次数)"""
    ...  # TODO：上一节写好的版本直接搬过来

def quick_count(nums):
    """快速排序 + 交换计数器：返回 (升序数组, 交换次数)"""
    ...  # TODO：11.5 节的分区写法，别抄冒泡

# 两问都写好后取消注释并运行：
# print("冒泡:", bubble_count(PACKAGES))
# print("快排:", quick_count(PACKAGES))
# 第 2 问 count_equal、第 3 问的结论，写进实验报告。
