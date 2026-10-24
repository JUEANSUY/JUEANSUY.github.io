// 完全背包动态规划与零钱兑换演示；不修改传入参数。

export function buildTimeline(coins, amount) {
  if (!Array.isArray(coins) || coins.length === 0 || !coins.every((c) => Number.isInteger(c) && c > 0)) {
    throw new TypeError('硬币面额须为正整数数组。');
  }
  if (!Number.isInteger(amount) || amount < 0 || amount > 30) {
    throw new TypeError('总金额须在 0 到 30 之间的整数。');
  }

  const INF = amount + 1;
  const dp = new Array(amount + 1).fill(INF);
  dp[0] = 0;

  const frames = [];
  const snapshot = (info) => {
    frames.push({
      step: frames.length,
      coins: [...coins],
      amount,
      dp: [...dp],
      ...info,
    });
  };

  // 初始帧
  snapshot({
    action: 'init',
    currentCoin: null,
    currentJ: null,
    fromJ: null,
    message: `初始化 DP 表：dp[0] = 0（凑 0 元需 0 枚），其余 dp[1..${amount}] 设为 ∞（上限 ${INF}）。`,
  });

  if (amount === 0) {
    snapshot({
      action: 'done',
      currentCoin: null,
      currentJ: 0,
      fromJ: null,
      ans: 0,
      message: '目标金额为 0 元，无需任何硬币，直接返回 0。',
    });
    return { frames, ans: 0 };
  }

  for (let i = 0; i < coins.length; i++) {
    const coin = coins[i];

    snapshot({
      action: 'coin_start',
      currentCoin: coin,
      currentJ: null,
      fromJ: null,
      message: `开始遍历面额【${coin} 元】。采用完全背包正序遍历，金额 j 从 ${coin} 到 ${amount}。`,
    });

    for (let j = coin; j <= amount; j++) {
      const fromJ = j - coin;
      const prevVal = dp[j];
      const fromVal = dp[fromJ];
      const candidate = fromVal + 1;

      if (fromVal < INF && candidate < prevVal) {
        dp[j] = candidate;
        snapshot({
          action: 'update',
          currentCoin: coin,
          currentJ: j,
          fromJ,
          prevVal,
          candidate,
          updated: true,
          message: `金额 ${j} 元：从 dp[${fromJ}]=${fromVal} 转移，使用 1 枚 ${coin} 元硬币，得 ${fromVal}+1=${candidate} < 原值 ${prevVal === INF ? '∞' : prevVal}，更新 dp[${j}] = ${candidate}！`,
        });
      } else {
        snapshot({
          action: 'keep',
          currentCoin: coin,
          currentJ: j,
          fromJ,
          prevVal,
          candidate,
          updated: false,
          message: fromVal >= INF
            ? `金额 ${j} 元：前置 dp[${fromJ}]=∞ 无法凑出，无法由此转移，保持 dp[${j}] = ${prevVal === INF ? '∞' : prevVal}。`
            : `金额 ${j} 元：转移候选 ${fromVal}+1=${candidate} ≥ 原值 ${prevVal}，保持原最优解。`,
        });
      }
    }
  }

  const finalVal = dp[amount];
  const ans = finalVal >= INF ? -1 : finalVal;

  snapshot({
    action: 'done',
    currentCoin: null,
    currentJ: amount,
    fromJ: null,
    ans,
    message: ans === -1
      ? `全部硬币遍历完毕。dp[${amount}] 仍为 ∞，说明无法凑齐 ${amount} 元，返回 -1。`
      : `全部硬币遍历完毕。凑齐 ${amount} 元所需的最少硬币数为 dp[${amount}] = ${ans} 枚。`,
  });

  return { frames, ans };
}

export const scenarios = {
  standard: {
    coins: [1, 2, 5],
    amount: 11,
    desc: '经典样例 [1, 2, 5] 凑 11 元 · 最少 3 枚 (5+5+1)',
  },
  greedy_trap: {
    coins: [1, 3, 4],
    amount: 6,
    desc: '贪心陷阱 [1, 3, 4] 凑 6 元 · 贪心 4+1+1=3 枚，DP 找出 3+3=2 枚',
  },
  unreachable: {
    coins: [2],
    amount: 3,
    desc: '无法凑整 [2] 凑 3 元 · 奇数不可达返回 -1',
  },
  larger_first: {
    coins: [2, 5, 10],
    amount: 14,
    desc: '大面额组合 [2, 5, 10] 凑 14 元 · 最少 4 枚 (10+2+2)',
  },
  zero_amount: {
    coins: [1, 2, 5],
    amount: 0,
    desc: '边界金额 0 元 · 无需硬币返回 0',
  },
};

function initDemo(doc) {
  const select = doc.querySelector('#coin-scenario');
  if (!select) return;
  const gridContainer = doc.querySelector('#coin-grid');
  const previous = doc.querySelector('#coin-prev');
  const next = doc.querySelector('#coin-next');
  const reset = doc.querySelector('#coin-reset');
  const status = doc.querySelector('#coin-status');
  const coinDisplay = doc.querySelector('#coin-current');
  const amountDisplay = doc.querySelector('#coin-target');
  const stepDisplay = doc.querySelector('#coin-step');

  let timeline;
  let position = 0;

  function render() {
    const frame = timeline.frames[position];
    const INF = frame.amount + 1;

    const fragment = doc.createDocumentFragment();
    for (let j = 0; j <= frame.amount; j++) {
      const cell = doc.createElement('div');
      cell.className = 'coin-cell';
      const val = frame.dp[j];
      const isTarget = frame.currentJ === j;
      const isFrom = frame.fromJ === j;

      if (isTarget) cell.dataset.active = 'true';
      if (isFrom) cell.dataset.source = 'true';
      if (val === 0) cell.dataset.zero = 'true';
      else if (val >= INF) cell.dataset.inf = 'true';
      else cell.dataset.valid = 'true';

      cell.innerHTML = `
        <span class="coin-val">${val >= INF ? '∞' : val}</span>
        <span class="coin-idx">j=${j}</span>
      `;
      cell.setAttribute('aria-label', `金额 ${j} 元，最少硬币数 ${val >= INF ? '无法凑出' : val}`);
      fragment.appendChild(cell);
    }
    gridContainer.replaceChildren(fragment);

    coinDisplay.textContent = frame.currentCoin ? `${frame.currentCoin} 元` : '—';
    amountDisplay.textContent = frame.currentJ !== null ? `${frame.currentJ} 元` : '—';
    stepDisplay.textContent = `${position + 1} / ${timeline.frames.length}`;
    status.textContent = frame.message;

    previous.disabled = position === 0;
    next.disabled = position === timeline.frames.length - 1;
  }

  function restart() {
    const scenario = scenarios[select.value] || scenarios.standard;
    timeline = buildTimeline(scenario.coins, scenario.amount);
    position = 0;
    render();
  }

  select.addEventListener('change', restart);
  previous.addEventListener('click', () => { if (position > 0) { position--; render(); } });
  next.addEventListener('click', () => { if (position < timeline.frames.length - 1) { position++; render(); } });
  reset.addEventListener('click', restart);
  restart();
  doc.querySelector('#coin-controls').hidden = false;
}

if (typeof document !== 'undefined') initDemo(document);
