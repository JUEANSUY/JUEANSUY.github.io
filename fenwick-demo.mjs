// 树状数组（Binary Indexed Tree / Fenwick Tree）演示逻辑；不修改传入的原数组。

export function lowbit(x) {
  return x & -x;
}

export function buildTimeline(initialNums, operations) {
  if (!Array.isArray(initialNums) || initialNums.length < 1 || initialNums.length > 10 ||
      !initialNums.every((val) => Number.isInteger(val) && val >= -100 && val <= 100)) {
    throw new TypeError('原数组长度须在 1 到 10 之间，元素须为整数。');
  }

  const n = initialNums.length;
  const nums = [...initialNums];
  const tree = new Array(n + 1).fill(0);

  const add = (index, delta) => {
    let curr = index;
    while (curr <= n) {
      tree[curr] += delta;
      curr += lowbit(curr);
    }
  };

  const frames = [];

  const snapshot = (action, info) => {
    frames.push({
      step: frames.length,
      action,
      nums: [...nums],
      tree: [...tree],
      ...info,
    });
  };

  // 1. 初始建树过程
  snapshot('init', {
    activeNums: [],
    activeTree: [],
    operationDesc: '初始化',
    message: `初始数组长度为 ${n}。树状数组内部使用 1-based 下标，区间长度由 lowbit(x) 确定。准备将各元素插入树状数组。`,
  });

  for (let i = 0; i < n; i++) {
    const treeIdx = i + 1;
    const val = nums[i];
    const affected = [];
    let curr = treeIdx;
    while (curr <= n) {
      tree[curr] += val;
      affected.push(curr);
      curr += lowbit(curr);
    }
    snapshot('build_step', {
      activeNums: [i],
      activeTree: affected,
      operationDesc: `建树插入 nums[${i}] = ${val}`,
      message: `将 nums[${i}] = ${val} 累加至树状数组（下标 ${treeIdx}）。通过 x += lowbit(x) 向后沿父节点链更新：[${affected.join(' -> ')}]。`,
    });
  }

  snapshot('ready', {
    activeNums: [],
    activeTree: [],
    operationDesc: '建树完成',
    message: `树状数组构建完成。每个 tree[x] 覆盖长度为 lowbit(x) 的左开右闭区间 (x - lowbit(x), x]。`,
  });

  // 2. 依次执行演示操作
  const ops = Array.isArray(operations) ? operations : [];
  for (const op of ops) {
    if (op.type === 'sum') {
      const { left, right } = op;
      // sumRange(left, right) = prefix(right + 1) - prefix(left)
      const rIdx = right + 1;
      const lIdx = left;

      // prefix(rIdx)
      const rNodes = [];
      let rSum = 0;
      let curr = rIdx;
      while (curr > 0) {
        rSum += tree[curr];
        rNodes.push(curr);
        curr -= lowbit(curr);
      }

      // prefix(lIdx)
      const lNodes = [];
      let lSum = 0;
      curr = lIdx;
      while (curr > 0) {
        lSum += tree[curr];
        lNodes.push(curr);
        curr -= lowbit(curr);
      }

      const ans = rSum - lSum;

      snapshot('query_sum', {
        activeNums: Array.from({ length: right - left + 1 }, (_, k) => left + k),
        activeTree: [...rNodes, ...lNodes],
        queryLeft: left,
        queryRight: right,
        queryResult: ans,
        operationDesc: `查询区间和 sumRange(${left}, ${right})`,
        message: `查询区间 [${left}, ${right}] 的元素和：前缀和 prefix(${rIdx}) 经节点 [${rNodes.join(' + ')}] 得 ${rSum}；` +
                 (lIdx > 0 ? `扣除 prefix(${lIdx}) 经节点 [${lNodes.join(' + ')}] 的 ${lSum}；` : '左端为 0 无需扣除；') +
                 `最终区间和为 ${rSum} - ${lSum} = ${ans}。`,
      });
    } else if (op.type === 'update') {
      const { index, val } = op;
      const oldVal = nums[index];
      const delta = val - oldVal;
      nums[index] = val;

      const treeIdx = index + 1;
      const affected = [];
      let curr = treeIdx;
      while (curr <= n) {
        tree[curr] += delta;
        affected.push(curr);
        curr += lowbit(curr);
      }

      snapshot('update_val', {
        activeNums: [index],
        activeTree: affected,
        updateIndex: index,
        updateOldVal: oldVal,
        updateNewVal: val,
        updateDelta: delta,
        operationDesc: `单点修改 update(${index}, ${val})`,
        message: `将 nums[${index}] 由 ${oldVal} 修改为 ${val}（差值 delta = ${delta >= 0 ? '+' : ''}${delta}）。` +
                 `原数组下标 ${index} 对应树下标 ${treeIdx}；通过 x += lowbit(x) 向后修改受影响的树节点：[${affected.join(' -> ')}]。`,
      });
    }
  }

  return { frames, finalNums: [...nums], finalTree: [...tree] };
}

export const scenarios = {
  classic: {
    nums: [1, 3, 5, 7, 9],
    operations: [
      { type: 'sum', left: 0, right: 2 },
      { type: 'update', index: 1, val: 2 },
      { type: 'sum', left: 0, right: 2 },
      { type: 'sum', left: 1, right: 4 },
    ],
  },
  power_of_two: {
    nums: [2, 4, 6, 8],
    operations: [
      { type: 'sum', left: 0, right: 3 },
      { type: 'update', index: 0, val: 5 },
      { type: 'sum', left: 0, right: 1 },
    ],
  },
  single_update: {
    nums: [3, 2, 4, 5, 1, 6],
    operations: [
      { type: 'update', index: 2, val: 10 },
      { type: 'sum', left: 1, right: 4 },
      { type: 'update', index: 4, val: 8 },
    ],
  },
};

function initDemo(doc) {
  const select = doc.querySelector('#fenwick-scenario');
  if (!select) return;
  const numsContainer = doc.querySelector('#fenwick-nums');
  const treeContainer = doc.querySelector('#fenwick-tree');
  const previous = doc.querySelector('#fenwick-prev');
  const next = doc.querySelector('#fenwick-next');
  const reset = doc.querySelector('#fenwick-reset');
  const status = doc.querySelector('#fenwick-status');
  const opBadge = doc.querySelector('#fenwick-op-badge');
  const stepDisplay = doc.querySelector('#fenwick-step');

  let timeline;
  let position = 0;

  function render() {
    const frame = timeline.frames[position];

    // 渲染原数组 nums
    const numsFragment = doc.createDocumentFragment();
    frame.nums.forEach((val, idx) => {
      const box = doc.createElement('div');
      box.className = 'fenwick-cell fenwick-num-cell';
      if (frame.activeNums.includes(idx)) box.dataset.active = 'true';
      box.innerHTML = `<span class="fenwick-val">${val}</span><span class="fenwick-sub">idx[${idx}]</span>`;
      box.setAttribute('aria-label', `原数组下标 ${idx}，当前值 ${val}`);
      numsFragment.appendChild(box);
    });
    numsContainer.replaceChildren(numsFragment);

    // 渲染树状数组 tree（1-based 下标 1..n）
    const treeFragment = doc.createDocumentFragment();
    for (let x = 1; x < frame.tree.length; x++) {
      const val = frame.tree[x];
      const lb = lowbit(x);
      const box = doc.createElement('div');
      box.className = 'fenwick-cell fenwick-tree-cell';
      if (frame.activeTree.includes(x)) box.dataset.active = 'true';
      box.innerHTML = `<span class="fenwick-val">${val}</span><span class="fenwick-sub">tree[${x}]<br>lowbit=${lb}</span>`;
      box.setAttribute('aria-label', `树状数组下标 ${x}，覆盖长度 ${lb}，区间和 ${val}`);
      treeFragment.appendChild(box);
    }
    treeContainer.replaceChildren(treeFragment);

    opBadge.textContent = frame.operationDesc;
    stepDisplay.textContent = `${position + 1} / ${timeline.frames.length}`;
    status.textContent = frame.message;

    previous.disabled = position === 0;
    next.disabled = position === timeline.frames.length - 1;
  }

  function restart() {
    const scenario = scenarios[select.value] || scenarios.classic;
    timeline = buildTimeline(scenario.nums, scenario.operations);
    position = 0;
    render();
  }

  select.addEventListener('change', restart);
  previous.addEventListener('click', () => { if (position > 0) { position--; render(); } });
  next.addEventListener('click', () => { if (position < timeline.frames.length - 1) { position++; render(); } });
  reset.addEventListener('click', restart);
  restart();
  doc.querySelector('#fenwick-controls').hidden = false;
}

if (typeof document !== 'undefined') initDemo(document);
