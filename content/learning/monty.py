"""PLEX original 45-minute lesson. Upstream textbooks are references, not copied text."""
PAGES = [
 ('start','学习起点：三扇舱门','profile', '''# 三扇舱门：直觉可靠吗？

星舰需要一枚能源核心。三扇舱门背后，只有一间存放核心。小E知道它在哪里，但你只能先选一扇门。

这节课约 **45 分钟**。你将先作预测，再用图解和 Python 核对自己的想法。

## 你将能做到

- 说清小E开门必须遵守的规则。
- 用“初选正确／初选错误”解释换门策略。
- 读懂变量、条件和重复试验的基本代码。
- 区分一次获奖、试验频率与理论概率。

可以查看 PLEX 学习画像，也可以跳过登录和自评直接开始。阅读进度、练习结果和画像分别记录。'''),
 ('rules','任务规则：小E知道什么？','story', '''# 小E的开门约定

1. 核心等概率放在 1、2、3 号舱门中的一扇后面。
2. 你先选一扇，暂时不开。
3. 小E知道核心的位置，**始终打开一扇你没选的空门**。
4. 如果有两扇可开的空门，小E等概率选择其中一扇。
5. 小E每次都会让你决定：保留初选，还是换到另一扇未开的门。

小E不是随便开一扇门。后面的概率结论依赖这些约定。'''),
 ('choose','第一轮：做出你的选择','story', '''# 先选一扇舱门

没有线索时，你选中核心的机会是三分之一。先选择，不急着看答案。

小E打开空门以后，还剩两扇关着的门。你觉得换门更好、不换更好，还是一样？把预测留在实验中。

**这道预测不计分。** 我们要观察直觉如何随着证据改变，而不是惩罚第一次猜错。'''),
 ('predict','揭晓前：把理由说出来','story', '''# 不只猜结果，也说理由

想一想：小E为什么能保证打开空门？他掌握的信息与你一样吗？

在小黑板上画三扇门，圈出初选，再叉掉小E打开的门。不要提前画出奖品。

选择换门或保留，观察一次结果。**换门后失败，不代表换门策略更差；获奖也不代表已经理解了概率。**'''),
 ('cases','枚举：把核心放在三个位置','story', '''# 固定初选 1 号门，分别考虑三种情况

| 核心位置 | 小E会打开 | 保留初选 | 换门 |
| --- | --- | --- | --- |
| 1 号 | 2 或 3 号空门 | 获奖 | 未获奖 |
| 2 号 | 3 号空门 | 未获奖 | 获奖 |
| 3 号 | 2 号空门 | 未获奖 | 获奖 |

三个核心位置等可能。保留初选在一种情况下获奖；换门在两种情况下获奖。你也可以固定初选 2 号或 3 号，重新画这张表。'''),
 ('explain','解释：空门不是白白消失','story', '''# 换门获奖，恰好对应“最开始选错了”

初选正确的机会是 **1/3**，初选错误的机会是 **2/3**。

当初选错误时，另外两扇门是一扇空门、一扇奖品门。小E必须打开空门，因此剩下的一扇就是奖品门。

所以，在本课规定的规则下：**一直保留初选，理论胜率为 1/3；一直换门，理论胜率为 2/3。**

“剩下两扇门”不能单独推出各一半：还要考虑其中一扇门是怎样被排除的。'''),
 ('variables','Python 补学：变量与比较','exercises', '''# 用名字保存一次选择

```python
prize = 2        # 程序内部用 0、1、2 表示三扇门
first = 0
won = first == prize
print(won)      # False
```

`=` 给变量赋值；`==` 比较两个值是否相等，结果为 `True` 或 `False`。界面里的 1、2、3 号门对应程序的 0、1、2。

累计赢了 `wins` 次，做了 `total` 次试验，频率是 `wins / total`。零次试验时不能除以零，本课约定显示 0 并注明尚无试验。'''),
 ('conditions','Python 补学：条件决定选择','exercises', '''# 主持人能打开哪扇门？

```python
allowed = []
for door in [0, 1, 2]:
    if door != first and door != prize:
        allowed.append(door)
```

`!=` 表示不相等；`and` 要求两个条件同时成立。门既不能是初选门，也不能是奖品门。

`allowed` 是列表，`append` 将一扇符合条件的门加入列表。初选正确时有两扇合法空门；初选错误时只有一扇。'''),
 ('repeat','Python 补学：循环与随机选择','simulation', '''# 让计算机重复试验

```python
import random
rng = random.Random(2026)
for trial in range(10):
    prize = rng.choice([0, 1, 2])
    print(prize)
```

`range(10)` 让循环执行十次；`choice` 从列表中随机选一个值。种子 2026 用于复现这一组伪随机试验，不代表这个数字更幸运。

我们对换门和不换门使用**同一组核心位置、初选和开门结果**，避免比较两份不同的试验。'''),
 ('single-run','运行一次：把选择写成程序','simulation', '''# 先核对一次，再运行一千次

程序的 `choose_door(first, opened, switch)` 函数接收初选门、已打开门和是否换门，返回最后选择的门。

不换门时返回 `first`。换门时遍历三扇门，找出既不是初选、也不是已打开的那一扇。

实验提供完整的 Python 程序与运行记录。修改后重新运行才会产生新结果；教学动画不会假装自动跟随任意代码变化。'''),
 ('compare','批量实验：频率会波动','simulation', '''# 10 次、100 次、1000 次，会有什么不同？

先写下预测，再逐档增加试验次数。观察换门与不换门的累计获奖频率。

曲线的水平参考线是理论概率，不是强制目标。小样本可能偏离很多，更多试验也不保证每一步都更接近理论值。

结果表和回放来自本次 Python 实际运行。运行失败或记录不符合规则时，应先修复程序，不能继续展示旧结果作为新结果。'''),
 ('practice','编程任务：填空、修错、修改','exercises', '''# 三个小任务

1. **填空**：判断是否获奖，并计算获奖频率。
2. **修错**：修复主持人的开门条件。
3. **修改**：实现换门策略，累计同一批试验的获奖次数。

每题都有题意、样例、测试及三层提示。先尝试，再逐层查看；测试通过表示满足本题用例，不等于证明所有输入都正确。

本机测试不需要登录。登录后可主动在线提交，并让小E依据服务器记录检查思路。'''),
 ('quiz','自测：解释比猜中更重要','quiz', '''# 四个问题，检查你的理解

自测包括主持人规则、初选情况、频率波动和策略解释。每题 1 分，可以重试并阅读反馈。

完成标准：三道编程练习通过测试；四道自测至少答对三题，且主持人规则题正确。抽中奖品次数不参与评分。

尚未完成也可以继续翻阅。你可以随时回到薄弱知识点补学。'''),
 ('reflection','回顾：你的直觉发生了什么变化？','progress', '''# 用自己的话解释

请补全这句话：**我最开始认为……；现在我认为……；因为小E必须……。**

试着向同学解释：如果小E不知道奖品位置、随便开门，这还属于本课的同一个实验吗？哪些假设需要重新检查？

在学习面板中保存反思，查看阅读、实验、练习与自测的独立记录。把值得保留的图画导出，或用 JSON 备份全部本机学习记录。

## 本单元来源

本单元故事、中文讲解、程序和练习由 PLEX 编写。基础知识组织参考 [Think Python 第三版](https://greenteapress.com/wp/think-python-3rd-edition/)；三门规则核对参考 [伊利诺伊大学教学材料](https://discovery.cs.illinois.edu/guides/Classic-Problems/Monty-Hall-Problem-Interactive-Game-and-Solution/)。原《Hello 算法》正文与来源记录仍完整保留。'''),
]

EXERCISES = [
 dict(id='monty-frequency', group='三门概率问题', title='获奖与频率', kind='填空', sectionId='unit/monty/variables', serverRef='PLEX-MH-001',
 description='实现 solve(prize, final, wins, total)，返回 [本次是否获奖, wins / total]。门编号为 0–2；wins、total 是非负整数且 wins <= total。total 为 0 时频率返回 0。例：solve(2, 2, 3, 10) 返回 [True, 0.3]。',
 starter='def solve(prize, final, wins, total):\n    won = False  # 填空：比较两扇门\n    frequency = 0  # 填空：处理零次试验\n    return [won, frequency]\n',
 solution='def solve(prize, final, wins, total):\n    return [prize == final, wins / total if total else 0]\n',
 hints=['一次获奖是门编号相等；频率是累计获奖次数除以累计试验次数。','使用 == 比较；先判断 total 是否为 0，再做除法。'],
 tests=[dict(args=[2,2,3,10],expected=[True,0.3]),dict(args=[0,1,0,0],expected=[False,0]),dict(args=[1,1,1,1],expected=[True,1]),dict(args=[2,0,2,4],expected=[False,0.5])]),
 dict(id='monty-host', group='三门概率问题', title='主持人不能开错门', kind='修复错误', sectionId='unit/monty/conditions', serverRef='PLEX-MH-002',
 description='实现 solve(prize, first)，按升序返回小E允许打开的门编号列表。编号为 0–2，必须同时排除初选门和奖品门。例：solve(0, 0) 返回 [1, 2]；solve(0, 1) 返回 [2]。',
 starter='def solve(prize, first):\n    return [d for d in [0, 1, 2] if d != first or d != prize]\n',
 solution='def solve(prize, first):\n    return [d for d in [0, 1, 2] if d != first and d != prize]\n',
 hints=['合法空门必须同时满足两个排除条件。','or 只要求一个条件成立；用 and 要求两个都成立。'],
 tests=[dict(args=[p,f],expected=[d for d in range(3) if d != p and d != f]) for p in range(3) for f in range(3)]),
 dict(id='monty-strategy', group='三门概率问题', title='换门并累计获奖', kind='修改代码', sectionId='unit/monty/practice', serverRef='PLEX-MH-003',
 description='实现 solve(trials, switch)。trials 中每项为 [prize, first, opened]，均符合三门规则。switch 为 True 时换到另一扇未开的门，为 False 时保留初选；返回累计获奖次数。空列表返回 0。例：[[0,0,1],[1,0,2],[2,0,1]] 换门获奖 2 次，不换门获奖 1 次。',
 starter='def solve(trials, switch):\n    wins = 0\n    for prize, first, opened in trials:\n        final = first  # 增加换门逻辑\n        if final == prize:\n            wins += 1\n    return wins\n',
 solution='def solve(trials, switch):\n    wins = 0\n    for prize, first, opened in trials:\n        final = first\n        if switch:\n            for door in [0, 1, 2]:\n                if door != first and door != opened:\n                    final = door\n        if final == prize:\n            wins += 1\n    return wins\n',
 hints=['循环内先决定最后选择，再判断是否获奖。','换门时排除 first 和 opened；获奖才让 wins 加一。'],
 tests=[dict(args=[[],True],expected=0),dict(args=[[[0,0,1],[1,0,2],[2,0,1]],True],expected=2),dict(args=[[[0,0,1],[1,0,2],[2,0,1]],False],expected=1),dict(args=[[[0,2,1],[1,2,0],[2,2,0]],True],expected=2),dict(args=[[[2,1,0]],True],expected=1)])
]
QUESTIONS = [
 ('主持人规则','在本课的经典规则中，小E必须怎么开门？',['始终打开一扇未被初选的空门，并提供换门机会','随机打开任意一扇门','只在玩家初选正确时提供换门机会'],0,'主持人知道核心位置，排除空门并始终提供换门机会是结论的前提。'),
 ('初选情况','如果最初选中了空门，按本课规则换门会怎样？',['必定得到核心','仍然只能随机猜测','必定进入另一间空舱'],0,'小E必须打开另一扇空门，剩下的未选门就是核心所在。'),
 ('频率波动','换门试验做了 10 次，只赢了 5 次。合理的解释是？',['本课理论一定错误','有限次试验的频率可能偏离理论概率','下一次一定获奖来补足比例'],1,'单次试验不负责补足比例；频率会波动，不能据十次结果推翻理论。'),
 ('策略解释','经典规则下，一直换门的理论胜率为什么是 2/3？',['因为任何两扇关着的门都等可能','因为初选错误的概率是 2/3，而初选错误时换门会获奖','因为小E总是直接指明奖品门'],1,'换门获奖恰好对应最初选错；两扇门的数量本身不能推出各一半。')
]
