// 最长递增子序列（LIS）动态规划步进演示；纯纯函数，不修改传入参数。

export function buildTimeline(nums) {
  if (!Array.isArray(nums) || nums.length === 0 || !nums.every((n) => Number.isInteger(n))) {
    throw new TypeError('输入数组须为非空整数数组。');
  }

  const n = nums.length;
  const dp = new Array(n).fill(1);
  const prev = new Array(n).fill(-1); // 记录前驱索引，方便回溯路径

  const frames = [];
  const snapshot = (info) => {
    frames.push({
      step: frames.length,
      nums: [...nums],
      dp: [...dp],
      prev: [...prev],
      ...info,
    });
  };

  // 初始帧：强调手动初始化为 1
  snapshot({
    action: 'init',
    currentI: null,
    currentJ: null,
    maxLen: 1,
    bestIdx: 0,
    message: `初始化 DP 数组：每个元素自身成一个长度为 1 的子序列，dp[0..${n - 1}] 全部初始化为 1。`,
  });

  let maxLen = 1;
  let bestIdx = 0;

  for (let i = 0; i < n; i++) {
    snapshot({
      action: 'outer_start',
      currentI: i,
      currentJ: null,
      maxLen,
      bestIdx,
      message: `固定结尾元素 nums[${i}] = ${nums[i]}。向前考察所有前驱元素 nums[0..${i - 1}]。`,
    });

    for (let j = 0; j < i; j++) {
      const prevVal = dp[i];
      if (nums[j] < nums[i]) {
        const candidate = dp[j] + 1;
        if (candidate > prevVal) {
          dp[i] = candidate;
          prev[i] = j;
          if (dp[i] > maxLen) {
            maxLen = dp[i];
            bestIdx = i;
          }
          snapshot({
            action: 'update',
            currentI: i,
            currentJ: j,
            candidate,
            prevVal,
            maxLen,
            bestIdx,
            updated: true,
            message: `nums[${j}]=${nums[j]} < nums[${i}]=${nums[i]}，接在后面可得长度 dp[${j}]+1 = ${candidate} > 原 dp[${i}]=${prevVal}。更新 dp[${i}] = ${candidate}！`,
          });
        } else {
          snapshot({
            action: 'compare',
            currentI: i,
            currentJ: j,
            candidate,
            prevVal,
            maxLen,
            bestIdx,
            updated: false,
            message: `nums[${j}]=${nums[j]} < nums[${i}]=${nums[i]}，但候选长度 ${candidate} ≤ 原 dp[${i}]=${prevVal}，保持原值。`,
          });
        }
      } else if (nums[j] === nums[i]) {
        snapshot({
          action: 'skip_equal',
          currentI: i,
          currentJ: j,
          candidate: null,
          prevVal,
          maxLen,
          bestIdx,
          updated: false,
          message: `nums[${j}]=${nums[j]} == nums[${i}]=${nums[i]}。题目要求【严格递增】，相同数值不能接上，跳过。`,
        });
      } else {
        snapshot({
          action: 'skip_greater',
          currentI: i,
          currentJ: j,
          candidate: null,
          prevVal,
          maxLen,
          bestIdx,
          updated: false,
          message: `nums[${j}]=${nums[j]} > nums[${i}]=${nums[i]}，不满足递增，无法接在后面，跳过。`,
        });
      }
    }
  }

  // 重构一条最优子序列
  const seq = [];
  let curr = bestIdx;
  while (curr !== -1) {
    seq.unshift(nums[curr]);
    curr = prev[curr];
  }

  snapshot({
    action: 'done',
    currentI: bestIdx,
    currentJ: null,
    maxLen,
    bestIdx,
    seq,
    message: `遍历完成！全数组 dp 最大值为 ${maxLen}（结尾于 nums[${bestIdx}]=${nums[bestIdx]}），一条典型最长严格递增子序列为 [${seq.join(', ')}]。`,
  });

  return { frames, maxLen, seq };
}

export const scenarios = {
  standard: {
    nums: [10, 9, 2, 5, 3, 7, 101, 18],
    desc: '经典样例 [10, 9, 2, 5, 3, 7, 101, 18] · 最长长度 4，如 [2, 3, 7, 101]',
  },
  duplicates: {
    nums: [7, 7, 7, 7, 7],
    desc: '全相同元素 [7, 7, 7, 7, 7] · 严格递增陷阱，相同无法接上，长度为 1',
  },
  zigzag: {
    nums: [4, 10, 4, 3, 8, 9],
    desc: '波折起伏 [4, 10, 4, 3, 8, 9] · 最长长度 3，如 [4, 8, 9] 或 [3, 8, 9]',
  },
  decreasing: {
    nums: [9, 8, 7, 6, 5],
    desc: '单调递减 [9, 8, 7, 6, 5] · 无任何递增对，每个元素自成子序列，长度为 1',
  },
  increasing: {
    nums: [1, 3, 6, 7, 9, 12],
    desc: '单调递增 [1, 3, 6, 7, 9, 12] · 完整连续接续，最长长度 6',
  },
};

function initDemo(doc) {
  const select = doc.querySelector('#lis-scenario');
  if (!select) return;
  const gridContainer = doc.querySelector('#lis-grid');
  const previous = doc.querySelector('#lis-prev');
  const next = doc.querySelector('#lis-next');
  const reset = doc.querySelector('#lis-reset');
  const status = doc.querySelector('#lis-status');
  const currentNumDisplay = doc.querySelector('#lis-current');
  const maxDisplay = doc.querySelector('#lis-max');
  const stepDisplay = doc.querySelector('#lis-step');

  let timeline;
  let position = 0;

  function render() {
    const frame = timeline.frames[position];

    const fragment = doc.createDocumentFragment();
    for (let k = 0; k < frame.nums.length; k++) {
      const cell = doc.createElement('div');
      cell.className = 'lis-cell';
      const isTarget = frame.currentI === k;
      const isSource = frame.currentJ === k;
      const isBest = frame.action === 'done' && frame.bestIdx === k;

      if (isTarget) cell.dataset.active = 'true';
      if (isSource) cell.dataset.source = 'true';
      if (isBest) cell.dataset.best = 'true';

      cell.innerHTML = `
        <span class="lis-num">${frame.nums[k]}</span>
        <span class="lis-dp">dp=${frame.dp[k]}</span>
        <span class="lis-idx">i=${k}</span>
      `;
      cell.setAttribute('aria-label', `位置 ${k}，数值 ${frame.nums[k]}，当前 dp 值为 ${frame.dp[k]}`);
      fragment.appendChild(cell);
    }
    gridContainer.replaceChildren(fragment);

    currentNumDisplay.textContent = frame.currentI !== null ? `nums[${frame.currentI}]=${frame.nums[frame.currentI]}` : '—';
    maxDisplay.textContent = `${frame.maxLen}`;
    stepDisplay.textContent = `${position + 1} / ${timeline.frames.length}`;
    status.textContent = frame.message;

    previous.disabled = position === 0;
    next.disabled = position === timeline.frames.length - 1;
  }

  function restart() {
    const scenario = scenarios[select.value] || scenarios.standard;
    timeline = buildTimeline(scenario.nums);
    position = 0;
    render();
  }

  select.addEventListener('change', restart);
  previous.addEventListener('click', () => { if (position > 0) { position--; render(); } });
  next.addEventListener('click', () => { if (position < timeline.frames.length - 1) { position++; render(); } });
  reset.addEventListener('click', restart);
  restart();
  doc.querySelector('#lis-controls').hidden = false;
}

if (typeof document !== 'undefined') initDemo(document);
