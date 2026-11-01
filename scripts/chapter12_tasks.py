"""Original exercises, separate from the existing 27 assessed exercises."""
import json
from pathlib import Path

PREFIX='chapter_divide_and_conquer/'
def task(key,title,section,description,starter,solution,hints,cases):
    return dict(id='ch12-'+key,group='第 12 章 · 分治探险',title=title,kind='章节动手练习',sectionId=PREFIX+section,
                description=description,starter=starter,solution=solution,hints=[*hints,solution],tests=[dict(args=a,expected=e) for a,e in cases])

TASKS=[
task('merge','合并能源补给线','divide_and_conquer',
     '输入两个升序整数列表，返回合并后的升序列表，保留重复值。例如 [1,3] 和 [2,3] → [1,2,3,3]。',
     'def solve(left, right):\n    # 比较两组最前面的未处理元素\n    return []\n',
     'def solve(left, right):\n    out = []\n    i = j = 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            out.append(left[i]); i += 1\n        else:\n            out.append(right[j]); j += 1\n    return out + left[i:] + right[j:]\n',
     ['每次取较小的那一个；两组内部已经有序。','用两个索引分别前进，最后接上没有处理完的一组。'],
     [([[1,3],[2,3]],[1,2,3,3]),([[],[]],[]),([[],[2]],[2]),([[1],[]],[1]),([[-3,2],[-2,2]],[-3,-2,2,2])]),
task('search','找到目标信号','binary_search_recur',
     '输入升序且不重复的整数列表和目标，返回目标索引；找不到返回 -1。例如 [1,3,6,8], 6 → 2。',
     'def solve(nums, target):\n    def find(left, right):\n        # 区间为空时返回 -1，否则比较中点\n        return -1\n    return find(0, len(nums) - 1)\n',
     'def solve(nums, target):\n    def find(left, right):\n        if left > right: return -1\n        mid = (left + right) // 2\n        if nums[mid] == target: return mid\n        if nums[mid] < target: return find(mid + 1, right)\n        return find(left, mid - 1)\n    return find(0, len(nums) - 1)\n',
     ['只继续查找仍可能包含目标的那半个区间。','左右边界不能保留已经比较过的中点；先判断空区间。'],
     [([[1,3,6,8],6],2),([[],1],-1),([[2],2],0),([[2],3],-1),([[1,3,6],1],0),([[1,3,6],6],2),([[1,3,6],2],-1)]),
task('tree','重建空间站连接树','build_binary_tree_problem',
     '输入同一棵树的前序和中序列表（编号唯一且合法），输出 [根, 左子树, 右子树]，空树用 None。例如 [2,1,3], [1,2,3] → [2,[1,None,None],[3,None,None]]。',
     'def solve(preorder, inorder):\n    # 找根、切出左右部分，再分别重建\n    return None\n',
     'def solve(preorder, inorder):\n    if not preorder: return None\n    root = preorder[0]\n    split = inorder.index(root)\n    return [root, solve(preorder[1:split+1], inorder[:split]), solve(preorder[split+1:], inorder[split+1:])]\n',
     ['前序的第一个编号就是当前根；它在中序中的左右两边就是子树。','中序根左侧的元素数决定前序左子树切片的长度。'],
     [([[],[]],None),([[1],[1]],[1,None,None]),([[2,1,3],[1,2,3]],[2,[1,None,None],[3,None,None]]),([[1,2,3],[3,2,1]],[1,[2,[3,None,None],None],None])]),
task('hanoi','规划能源环搬运','hanota_problem',
     '输入环数 n（0–5），返回从 A 搬到 C 的移动列表，每项为 [源柱,目标柱]。例如 n=1 → [["A","C"]]，n=0 → []。',
     'def solve(n):\n    moves = []\n    def move(count, source, buffer, target):\n        # 先搬上面的小环，再搬最大环，最后搬回小环\n        pass\n    move(n, "A", "B", "C")\n    return moves\n',
     'def solve(n):\n    moves = []\n    def move(count, source, buffer, target):\n        if count == 0: return\n        move(count-1, source, target, buffer)\n        moves.append([source,target])\n        move(count-1, buffer, source, target)\n    move(n,"A","B","C")\n    return moves\n',
     ['先把上方 n-1 个环送到缓冲柱，才可以移动最大的环。','递归调用时柱子的角色会交换；0 个环不用移动。'],
     [([0],[]),([1],[['A','C']]),([2],[['A','B'],['A','C'],['B','C']]),([3],[['A','C'],['A','B'],['C','B'],['A','C'],['B','A'],['B','C'],['A','C']])]),
task('power','快速幂补给计算','exercises',
     '输入整数 x 和非负整数 n，返回 x 的 n 次幂；用一次递归计算半规模结果。例如 3,5 → 243，7,0 → 1。',
     'def solve(x, n):\n    # 先处理 n=0，再计算一次半规模幂\n    return 0\n',
     'def solve(x, n):\n    if n == 0: return 1\n    half = solve(x, n // 2)\n    return half * half * (x if n % 2 else 1)\n',
     ['把 xⁿ 拆成两个相同的半规模结果，奇数指数还剩一个 x。','只求一次 half；n=0 的结果是 1。'],
     [([7,0],1),([3,5],243),([2,6],64),([0,3],0),([-2,3],-8),([-2,4],16)])
]

# Both running and judging use the same function; the demo is only free execution.
for entry in TASKS:
    args=entry['tests'][0]['args']
    demo='\nif __name__ == "__main__":\n    # 修改下面的输入，观察返回结果\n    print(solve('+', '.join(repr(a) for a in args)+'))\n'
    entry['starter']+=demo
    entry['solution']+=demo

def publish():
    for entry in TASKS:
        for case in entry['tests']:
            scope={};exec(entry['solution'],scope)
            assert scope['solve'](*case['args'])==case['expected'], entry['id']
    out=Path(__file__).resolve().parents[1]/'web/public/chapter12/tasks.json'
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(TASKS,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

if __name__=='__main__':
    publish()
    print(f'Chapter 12: {len(TASKS)} reference solutions passed, {sum(len(t["tests"]) for t in TASKS)} cases')
