"""Original page-specific teaching instructions. No scoring or hidden answer keys."""
STAGES = [
    {'id': 'start', 'title': '学习起点', 'minutes': 3},
    {'id': 'challenge', 'title': '三门挑战', 'minutes': 7},
    {'id': 'intuition', 'title': '拆解直觉', 'minutes': 8},
    {'id': 'python', 'title': 'Python 补学', 'minutes': 10},
    {'id': 'experiment', 'title': '批量实验', 'minutes': 7},
    {'id': 'practice', 'title': '编程与测验', 'minutes': 8},
    {'id': 'reflection', 'title': '回顾', 'minutes': 2},
]
# slug, stage, activity, goal, CTA, server question, short prompt, layered hints
LESSONS = [
 ('start','start','profile','找到自己的学习起点，了解这节课要解决的问题。','查看学习路线','MH030001','先不用证明自己会编程。你可以跳过自评，从选择一扇门开始。',['先读三个目标。','不知道的知识留到 Python 补学时再看。']),
 ('rules','challenge','rules','判断小E能打开哪些门，并说清两个排除条件。','验证开门规则','MH030002','小E知道核心在哪里。哪两类门是他不能打开的？',['先排除你的初选门。','还要排除核心所在门；两个条件必须同时满足。']),
 ('choose','challenge','story','先作一次选择，留下自己的直觉。','进入三门挑战','MH030002','没有线索时，三扇门都可以选。先选门，再提出预测。',['先不要尝试猜测核心的隐藏位置。','一次输赢不能判断策略优劣。']),
 ('predict','challenge','story','在揭晓前记录预测与理由，再比较结果。','继续这轮挑战','MH030002','你认为换门更好、不换更好，还是一样？可以写下理由，也可以跳过。',['注意小E不是随机打开任意一扇门。','先保留你的想法，后面用枚举核对。']),
 ('cases','intuition','cases','固定初选，逐一比较三个等可能的核心位置。','展开三种情况','MH030003','固定初选后，把核心分别放在三个位置。哪几种情况下换门会获奖？',['不要把主持人的两种合法开法算成两种核心位置。','初选正确的一种情况可分成两条主持人路径，各占这一情况的一半。']),
 ('explain','intuition','explain','用初选正确／错误解释换门的理论结果。','推演概率关系','MH030003','试着说出：换门获奖，恰好对应最开始发生了什么？',['把初选正确和初选错误分开讨论。','初选错误时，小E排除另一扇空门，剩下的就是核心。']),
 ('variables','python','micro','区分赋值与比较，计算是否获奖及频率。','运行变量示例','MH030001','程序里的 0、1、2 对应画面中的 1、2、3 号门。改变 final 再运行看看。',['= 保存一个值，== 比较两个值。','先判断 total 是否为零，再计算 wins / total。']),
 ('conditions','python','micro','用 and 同时排除初选门与核心门。','运行条件示例','MH030002','逐个检查 door。它必须既不是初选门，也不是核心门。',['分别代入 first 和 prize 检查条件。','试试把 and 改成 or，观察允许开门的列表。']),
 ('repeat','python','micro','观察循环次数和固定种子的作用。','运行循环示例','MH030003','固定种子让你能复现实验，不会让这个数字变得更幸运。',['range(10) 会重复执行十次。','同一程序、同一种子会产生同一串伪随机选择。']),
 ('single-run','python','single','核对一次 Python 实际返回的初选、开门和换门记录。','运行一次试验','MH030003','先检查一条真实记录，再把试验次数放大。',['检查 opened 既不是 first，也不是 prize。','换门应排除 first 和 opened。']),
 ('compare','experiment','simulation','比较频率与理论概率，观察有限样本的波动。','打开批量实验','MH030001','先作预测，再运行。曲线每一步都更接近理论线吗？',['让两种策略共用同一批试验条件。','更多试验不保证每一步误差都变小。']),
 ('practice','practice','exercises','完成填空、修错和策略修改三道编程任务。','开始编程练习','MH030003','先做最小修改，再测试。提示可以逐层打开。',['先核对函数的输入和返回值。','错误用例能告诉你应回看变量、条件还是换门逻辑。']),
 ('quiz','practice','quiz','用四道问题检查规则、初选情况、波动和策略解释。','开始理解自测','MH030002','猜中奖品不算知识得分。答错可以看反馈再试一次。',['规则题需要特别注意“始终”两个字。','如果只凭“两扇门”判断各一半，回看枚举页。']),
 ('reflection','reflection','progress','比较最初预测与最终解释，决定下一步补学内容。','查看学习报告','MH030003','你最开始怎样想，现在怎样解释？请把主持人的规则写进理由。',['先写初选正确和错误的两种情况。','报告列出学习证据，不会替你评判反思文字是否正确。']),
]

MICRO = {
 'variables': ('变量与比较', 'prize = 2\nfirst = 0\nfinal = 2\nwins = 3\ntotal = 10\nwon = final == prize\nfrequency = wins / total if total else 0\nprint("是否获奖：", won)\nprint("本次频率：", frequency)\n'),
 'conditions': ('主持人条件', 'prize = 0\nfirst = 1\nallowed = []\nfor door in [0, 1, 2]:\n    if door != first and door != prize:\n        allowed.append(door)\nprint("允许打开的门（程序编号）：", allowed)\n'),
 'repeat': ('循环与随机选择', 'import random\nrng = random.Random(2026)\nfor trial in range(10):\n    prize = rng.choice([0, 1, 2])\n    print("第", trial + 1, "次，核心程序编号：", prize)\n'),
}
