"""PLEX 三门模拟：相同条件比较两种策略，返回每次真实记录。"""
import random


def choose_door(first, opened, switch):
    if not switch:
        return first
    for door in [0, 1, 2]:
        if door != first and door != opened:
            return door


def simulate(count=1000, seed=2026):
    rng = random.Random(seed)
    trials = []
    stay_wins = 0
    switch_wins = 0
    for _ in range(count):
        prize = rng.choice([0, 1, 2])
        first = rng.choice([0, 1, 2])
        allowed = [door for door in [0, 1, 2]
                   if door != first and door != prize]
        opened = rng.choice(allowed)
        stay = choose_door(first, opened, False)
        change = choose_door(first, opened, True)
        stay_won = stay == prize
        switch_won = change == prize
        stay_wins += int(stay_won)
        switch_wins += int(switch_won)
        trials.append(dict(prize=prize, first=first, opened=opened,
                           stay=stay, switch=change,
                           stayWon=stay_won, switchWon=switch_won))
    return dict(count=count, seed=seed, stayWins=stay_wins,
                switchWins=switch_wins, trials=trials)


if __name__ == '__main__':
    result = simulate()
    print('不换门：', result['stayWins'], '/', result['count'])
    print('换门：', result['switchWins'], '/', result['count'])
