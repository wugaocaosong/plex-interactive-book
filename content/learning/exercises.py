"""PLEX-authored exercises. Kept separate from the Hello Algo snapshot/import."""
from textwrap import dedent
EXERCISES=[]
GROUPS=[('数组与链表','chapter_array_and_linkedlist/linked_list'),('栈与队列','chapter_stack_and_queue/stack'),('二分查找','chapter_searching/binary_search'),('排序','chapter_sorting/insertion_sort'),('树与图','chapter_tree/binary_tree'),('递归','chapter_computational_complexity/iteration_and_recursion')]
def add(group,title,description,solution,starter,tests,hints):
    number=sum(e['group']==GROUPS[group][0] for e in EXERCISES)
    EXERCISES.append(dict(id=f'practice-{group+1}-{number+1}',group=GROUPS[group][0],sectionId=GROUPS[group][1],title=title,kind=['填空','修改代码','修复错误','独立实现'][number],description=description,solution=dedent(solution).strip()+'\n',starter=dedent(starter).strip()+'\n',tests=[dict(args=a,expected=e) for a,e in tests],hints=hints))

add(0,'数组遍历','补全累加语句，返回整数数组 nums 中所有元素之和；空数组返回 0。',
'''def solve(nums):
    total = 0
    for value in nums:
        total += value
    return total
''','''def solve(nums):
    total = 0
    for value in nums:
        total += ___  # 填入当前元素
    return total
''',[([[1,2,3]],6),([[]],0),([[-4,0,7]],3),([[2,2]],4)],['遍历时每次取出一个元素。','把当前元素 value 加到 total，而不是它的索引。'])
add(0,'按位置插入元素','参数 nums、index、value；在 index 处插入 value 并返回新数组。index 允许等于长度；越界返回原数组。',
'''def solve(nums, index, value):
    result = nums.copy()
    if 0 <= index <= len(result):
        result.insert(index, value)
    return result
''','''def solve(nums, index, value):
    result = nums.copy()
    result.append(value)  # 修改为按指定位置插入，处理越界
    return result
''',[([[1,3],1,2],[1,2,3]),([[],0,5],[5]),([[1],1,2],[1,2]),([[1],-1,2],[1]),([[1],3,2],[1])],['先判断插入位置是否合法。','合法范围是 0 到 len(nums)，包含尾后位置。'])

LINK='''class Node:
    def __init__(self, value, next=None):
        self.value, self.next = value, next

def build(values):
    head = None
    for value in reversed(values):
        head = Node(value, head)
    return head

def values(head):
    result = []
    while head:
        result.append(head.value)
        head = head.next
    return result

'''
delete='''def solve(nums, target):
    dummy = Node(0, build(nums))
    prev = dummy
    while prev.next:
        if prev.next.value == target:
            prev.next = prev.next.next
            break
        prev = prev.next
    return values(dummy.next)
'''
add(0,'链表删除时的指针错误','利用提供的 Node 和转换函数，删除链表中第一个 target；未找到则保持不变。输入输出用数组表示链表。',LINK+delete,LINK+delete.replace('prev.next = prev.next.next','prev = prev.next.next'),[([[1,2,3],2],[1,3]),([[1,1],1],[1]),([[],4],[]),([[2],2],[]),([[1,2],7],[1,2])],['删除节点需要改变前驱的 next。','使用哨兵节点，可以统一处理删除头节点的情况。'])
add(0,'反转单链表','用节点指针反转链表，返回反转后的值数组；使用提供的辅助函数，不调用数组 reverse。',LINK+'''def solve(nums):
    current, previous = build(nums), None
    while current:
        following = current.next
        current.next = previous
        previous, current = current, following
    return values(previous)
''',LINK+'''def solve(nums):
    # 保存后继、反转指针、向前移动
    return []
''',[([[1,2,3]],[3,2,1]),([[]],[]),([[5]],[5]),([[1,1,2]],[2,1,1])],['每次只反转一条 next 指针。','改指针前保存后继，用 previous 和 current 推进。'])
add(1,'栈的弹出操作','栈底在数组左侧。返回 [弹出值, 剩余栈]，空栈返回 [None, []]。',
'''def solve(stack):
    result = stack.copy()
    value = result.pop() if result else None
    return [value, result]
''','''def solve(stack):
    result = stack.copy()
    value = ___ if result else None
    return [value, result]
''',[([[1,2,3]],[3,[1,2]]),([[]],[None,[]]),([[7]],[7,[]])],['栈遵循后进先出。','列表 pop() 默认删除并返回末尾元素。'])
add(1,'有界队列入队','参数 queue、capacity、value；仅当队列未满时在队尾加入 value，返回新队列。容量为非负整数。',
'''def solve(queue, capacity, value):
    result = queue.copy()
    if len(result) < capacity:
        result.append(value)
    return result
''','''def solve(queue, capacity, value):
    result = queue.copy()
    result.append(value)  # 增加容量检查
    return result
''',[([[1],2,3],[1,3]),([[1,2],2,3],[1,2]),([[],0,4],[]),([[],1,4],[4])],['满队列不能继续加入元素。','只有 len(queue) 严格小于 capacity 才能入队。'])
add(1,'队列空状态判断','队首位于左侧。出队后返回 [出队值, 剩余队列]；空队列返回 [None, []]。',
'''def solve(queue):
    result = queue.copy()
    if not result:
        return [None, []]
    return [result.pop(0), result]
''','''def solve(queue):
    result = queue.copy()
    if len(result) == 1:  # 此处边界错误
        return [None, []]
    return [result.pop(0), result]
''',[([[1,2]],[1,[2]]),([[]],[None,[]]),([[8]],[8,[]])],['只有长度为 0 才是空队列。','区分空队列和仅剩一个元素的队列。'])
add(1,'括号匹配','输入仅含 ()[]{} 的字符串；判断括号是否正确匹配，空串有效。',
'''def solve(text):
    stack = []
    pairs = {')':'(', ']':'[', '}':'{'}
    for ch in text:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack
''','''def solve(text):
    # 使用栈记录尚未匹配的左括号
    return False
''',[(['([])'],True),(['([)]'],False),([''],True),(['('],False),([')'],False),(['{}[]'],True)],['最近打开的括号必须最先关闭。','遇到右括号检查栈顶，结束后栈也必须为空。'])
BINARY='''def solve(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
'''
SEARCH_TESTS=[([[1,3,5,7],5],2),([[],1],-1),([[1],1],0),([[1,3],2],-1),([[1,3,5],1],0),([[1,3,5],5],2)]
add(2,'中点计算','升序且无重复的 nums 中查找 target；找到返回索引，否则返回 -1。补全中点。',BINARY,BINARY.replace('left + (right - left) // 2','___'),SEARCH_TESTS,['中点必须是整数索引。','用 left + (right-left)//2 取得闭区间中点。'])
add(2,'降序数组查找','修改二分查找，使其支持严格降序的数组。找到返回索引，未找到返回 -1。',BINARY.replace('nums[mid] < target','nums[mid] > target'),BINARY,[([[9,7,5,1],7],1),([[9,7,5],5],2),([[9,7,5],9],0),([[],4],-1),([[9,7],8],-1)],['降序数组中，大的元素在左侧。','中点值大于目标时，应向右寻找。'])
add(2,'边界更新与死循环','修复升序数组二分查找的边界更新；每轮必须缩小搜索区间。',BINARY,BINARY.replace('left = mid + 1','left = mid').replace('right = mid - 1','right = mid'),SEARCH_TESTS,['没有命中时，中点已经可以排除。','左右边界分别更新为 mid+1 和 mid-1。'])
add(2,'查找首次出现位置','升序数组可能包含重复值；返回 target 最左侧索引，不存在返回 -1。',
'''def solve(nums, target):
    left, right, answer = 0, len(nums) - 1, -1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] >= target:
            if nums[mid] == target:
                answer = mid
            right = mid - 1
        else:
            left = mid + 1
    return answer
''','''def solve(nums, target):
    return -1
''',[([[1,2,2,2,3],2],1),([[2,2],2],0),([[],1],-1),([[1,3],2],-1),([[1],1],0)],['找到目标后仍需向左搜索。','记录候选答案，把右边界移到 mid-1。'])
INSERT='''def solve(nums):
    a = nums.copy()
    for i in range(1, len(a)):
        key, j = a[i], i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key
    return a
'''
SORT_TESTS=[([[3,1,2]],[1,2,3]),([[]],[]),([[4]],[4]),([[2,-1,2,0]],[-1,0,2,2]),([[5,4,3,2,1]],[1,2,3,4,5])]
add(3,'插入排序移动步骤','将比 key 大的元素向右移动，返回升序数组。',INSERT,INSERT.replace('a[j + 1] = a[j]','a[j + 1] = ___'),SORT_TESTS,['给 key 腾出插入位置。','把 a[j] 复制到右侧 a[j+1]。'])
BUBBLE='''def solve(nums):
    a = nums.copy()
    for end in range(len(a)-1, 0, -1):
        for j in range(end):
            if a[j] > a[j+1]:
                a[j], a[j+1] = a[j+1], a[j]
    return a
'''
add(3,'冒泡排序改为降序','修改比较条件，使冒泡排序返回降序数组。',BUBBLE.replace('a[j] > a[j+1]','a[j] < a[j+1]'),BUBBLE,[(a,list(reversed(e))) for a,e in SORT_TESTS],['降序时应该把较小元素向右移。','当左元素小于右元素时交换。'])
QUICK='''def solve(nums):
    a = nums.copy()
    def sort(lo, hi):
        if lo >= hi:
            return
        pivot, i = a[hi], lo
        for j in range(lo, hi):
            if a[j] < pivot:
                a[i], a[j] = a[j], a[i]
                i += 1
        a[i], a[hi] = a[hi], a[i]
        sort(lo, i-1)
        sort(i+1, hi)
    sort(0, len(a)-1)
    return a
'''
add(3,'快速排序分区错误','修复分区循环遗漏元素的边界错误，返回升序数组。',QUICK,QUICK.replace('range(lo, hi)','range(lo, hi-1)'),SORT_TESTS,['分区要比较除基准本身以外的所有元素。','range 的右端不包含在内，应扫描到 hi-1。'])
add(3,'归并排序','通过递归分半与合并实现升序排序，返回新数组。',
'''def solve(nums):
    if len(nums) <= 1:
        return nums.copy()
    mid = len(nums) // 2
    left, right = solve(nums[:mid]), solve(nums[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:]
''','''def solve(nums):
    return []
''',SORT_TESTS,['长度不超过 1 的数组已经有序。','分别排序左右半段，用双指针合并，再追加剩余元素。'])
PREORDER='''def solve(tree):
    result = []
    def visit(i):
        if i >= len(tree) or tree[i] is None:
            return
        result.append(tree[i])
        visit(2*i+1)
        visit(2*i+2)
    visit(0)
    return result
'''
TREE_TESTS=[([[1,2,3,4,5]],[1,2,4,5,3]),([[]],[]),([[1,None,3]],[1,3]),([[7]],[7])]
add(4,'前序遍历','二叉树用数组表示，节点 i 的左右孩子为 2i+1、2i+2，None 表示空节点。补全前序遍历。',PREORDER,PREORDER.replace('result.append(tree[i])','___  # 在访问孩子前记录节点'),TREE_TESTS,['前序顺序为根、左、右。','先 result.append(tree[i])，再递归两个孩子。'])
BFS='''def solve(graph, start):
    distance = [-1] * len(graph)
    if not graph:
        return distance
    distance[start] = 0
    queue = [start]
    for node in queue:
        for neighbor in graph[node]:
            if distance[neighbor] == -1:
                distance[neighbor] = distance[node] + 1
                queue.append(neighbor)
    return distance
'''
add(4,'BFS 求最短距离','graph 为无权图邻接表，返回 start 到每个节点的最少边数，不可达为 -1；非空图保证起点合法。',BFS,BFS.replace('distance[node] + 1','0  # 修改为从前驱距离推导'),[([[[1],[0,2],[1]],0],[0,1,2]),([[[1],[0],[]],0],[0,1,-1]),([[[]],0],[0]),([[],0],[])],['BFS 按距离逐层扩展。','第一次访问邻居时，其距离等于当前节点距离加一。'])
DFS='''def solve(graph, start):
    visited, order = set(), []
    def visit(node):
        if node in visited:
            return
        visited.add(node)
        order.append(node)
        for neighbor in graph[node]:
            visit(neighbor)
    if graph:
        visit(start)
    return order
'''
add(4,'含环图的重复访问','按邻接表给定顺序进行 DFS，返回首次访问顺序。修复含环时无限递归的问题。',DFS,DFS.replace('        visited.add(node)\n',''),[([[[1],[0,2],[1]],0],[0,1,2]),([[[1,2],[2],[0]],0],[0,1,2]),([[],0],[]),([[[]],0],[0])],['访问节点前需要判断它是否已经处理过。','递归进入邻居前，先把当前节点加入 visited。'])
add(4,'计算二叉树高度','树使用与前序题相同的数组编码。返回以边数计的高度，空树为 -1，单节点为 0。',
'''def solve(tree):
    def height(i):
        if i >= len(tree) or tree[i] is None:
            return -1
        return 1 + max(height(2*i+1), height(2*i+2))
    return height(0)
''','''def solve(tree):
    return -1
''',[([[1,2,3,4]],2),([[]],-1),([[1]],0),([[None]],-1),([[1,None,2]],1)],['节点高度由更高的孩子决定。','空节点高度设为 -1，然后返回 1+左右高度的最大值。'])
FACTORIAL='''def solve(n):
    if n <= 1:
        return 1
    return n * solve(n-1)
'''
add(5,'阶乘终止条件','输入非负整数 n，返回 n!。补全递归终止条件；0!=1。',FACTORIAL,FACTORIAL.replace('n <= 1','___'),[([0],1),([1],1),([5],120),([8],40320)],['递归必须在最小问题处停止。','n 为 0 或 1 时直接返回 1。'])
add(5,'递归求数组和','修改仅计算首元素的函数，使其递归求数组总和；空数组返回 0。',
'''def solve(nums):
    if not nums:
        return 0
    return nums[0] + solve(nums[1:])
''','''def solve(nums):
    if not nums:
        return 0
    return nums[0]
''',[([[1,2,3]],6),([[]],0),([[-2,5]],3),([[7]],7)],['整个数组的和等于首元素加其余元素的和。','递归参数必须缩小为 nums[1:]。'])
FIB='''def solve(n):
    if n < 2:
        return n
    return solve(n-1) + solve(n-2)
'''
add(5,'斐波那契边界错误','按 F(0)=0、F(1)=1 定义，修复递归边界值。',FIB,FIB.replace('return n','return 1'),[([0],0),([1],1),([2],1),([6],8),([8],21)],['两个基础值不同。','n 小于 2 时，返回 n 本身。'])
add(5,'递归二分查找','用递归在严格升序数组中查找 target；返回索引或 -1。',
'''def solve(nums, target):
    def search(left, right):
        if left > right:
            return -1
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            return search(mid+1, right)
        return search(left, mid-1)
    return search(0, len(nums)-1)
''','''def solve(nums, target):
    return -1
''',SEARCH_TESTS,['把循环状态 left、right 改为递归参数。','区间为空返回 -1，未命中时递归到排除中点后的半区。'])
