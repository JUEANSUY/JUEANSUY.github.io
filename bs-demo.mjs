// 二分查找（Binary Search）闭区间双指针折半推演；纯函数，不修改传入参数。

export function buildTimeline(nums, target) {
  if (!Array.isArray(nums) || nums.length === 0 || !nums.every((n) => Number.isInteger(n))) {
    throw new TypeError('nums 必须为非空整数数组。');
  }
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] <= nums[i - 1]) {
      throw new TypeError('nums 必须为严格升序排列的数组。');
    }
  }
  if (!Number.isInteger(target)) {
    throw new TypeError('target 必须为整数。');
  }

  const n = nums.length;
  let left = 0;
  let right = n - 1;

  const frames = [];
  const snapshot = (info) => {
    frames.push({
      step: frames.length,
      nums: [...nums],
      target,
      left,
      right,
      ...info,
    });
  };

  snapshot({
    action: 'init',
    mid: null,
    ans: null,
    message: `初始化闭区间 [left, right] = [0, ${right}]。目标值 target = ${target}。`,
  });

  let ans = -1;
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    const midVal = nums[mid];

    snapshot({
      action: 'probe',
      mid,
      midVal,
      message: `计算中点：mid = left + (right - left) / 2 = ${left} + (${right} - ${left}) / 2 = ${mid}。中点元素 nums[${mid}] = ${midVal}。`,
    });

    if (midVal === target) {
      ans = mid;
      snapshot({
        action: 'found',
        mid,
        midVal,
        ans: mid,
        message: `nums[${mid}] === target (${midVal} === ${target})！找到目标值，返回下标 ${mid}。`,
      });
      break;
    } else if (midVal < target) {
      const prevLeft = left;
      left = mid + 1;
      snapshot({
        action: 'move_left',
        mid,
        midVal,
        prevLeft,
        newLeft: left,
        message: `nums[${mid}] = ${midVal} < target (${target})。目标值只可能在右半部分，排除 [${prevLeft}, ${mid}]，收缩区间：left = mid + 1 = ${left}。`,
      });
    } else {
      const prevRight = right;
      right = mid - 1;
      snapshot({
        action: 'move_right',
        mid,
        midVal,
        prevRight,
        newRight: right,
        message: `nums[${mid}] = ${midVal} > target (${target})。目标值只可能在左半部分，排除 [${mid}, ${prevRight}]，收缩区间：right = mid - 1 = ${right}。`,
      });
    }
  }

  if (ans === -1) {
    snapshot({
      action: 'not_found',
      mid: null,
      ans: -1,
      message: `区间发生交叉：left (${left}) > right (${right})，闭区间为空，说明数组中不存在 target = ${target}，返回 -1。`,
    });
  }

  return { frames, ans };
}

export const scenarios = {
  found_middle: {
    nums: [-1, 0, 3, 5, 9, 12],
    target: 9,
    desc: '经典命中 [-1, 0, 3, 5, 9, 12] 查找 9 · 成功返回下标 4',
  },
  found_left_edge: {
    nums: [-1, 0, 3, 5, 9, 12],
    target: -1,
    desc: '左端边界查找 -1 · 成功返回下标 0',
  },
  found_right_edge: {
    nums: [-1, 0, 3, 5, 9, 12],
    target: 12,
    desc: '右端边界查找 12 · 成功返回下标 5',
  },
  missing_between: {
    nums: [-1, 0, 3, 5, 9, 12],
    target: 2,
    desc: '中间缺失查找 2 (介于 0 与 3 之间) · 无法找到返回 -1',
  },
  missing_too_small: {
    nums: [-1, 0, 3, 5, 9, 12],
    target: -10,
    desc: '过小元素查找 -10 · 左侧出界返回 -1',
  },
  single_element_found: {
    nums: [5],
    target: 5,
    desc: '单元素存在 [5] 查找 5 · 返回下标 0',
  },
  single_element_missing: {
    nums: [5],
    target: 0,
    desc: '单元素不存在 [5] 查找 0 · 返回 -1',
  },
};

function initDemo(doc) {
  const select = doc.querySelector('#bs-scenario');
  if (!select) return;
  const gridContainer = doc.querySelector('#bs-grid');
  const previous = doc.querySelector('#bs-prev');
  const next = doc.querySelector('#bs-next');
  const reset = doc.querySelector('#bs-reset');
  const status = doc.querySelector('#bs-status');
  const leftDisplay = doc.querySelector('#bs-left');
  const rightDisplay = doc.querySelector('#bs-right');
  const midDisplay = doc.querySelector('#bs-mid');
  const stepDisplay = doc.querySelector('#bs-step');

  let timeline;
  let position = 0;

  function render() {
    const frame = timeline.frames[position];
    const fragment = doc.createDocumentFragment();

    for (let i = 0; i < frame.nums.length; i++) {
      const cell = doc.createElement('div');
      cell.className = 'bs-cell';

      const inRange = i >= frame.left && i <= frame.right;
      const isMid = frame.mid === i;
      const isFound = frame.ans === i && frame.action === 'found';

      if (isFound) cell.dataset.found = 'true';
      else if (isMid) cell.dataset.mid = 'true';
      else if (inRange) cell.dataset.candidate = 'true';
      else cell.dataset.excluded = 'true';

      const tags = [];
      if (frame.left === i) tags.push('L');
      if (frame.right === i) tags.push('R');
      if (frame.mid === i) tags.push('M');

      cell.innerHTML = `
        <span class="bs-tag">${tags.join('·') || '&nbsp;'}</span>
        <span class="bs-val">${frame.nums[i]}</span>
        <span class="bs-idx">i=${i}</span>
      `;
      fragment.appendChild(cell);
    }
    gridContainer.replaceChildren(fragment);

    leftDisplay.textContent = frame.left !== null ? `${frame.left}` : '—';
    rightDisplay.textContent = frame.right !== null ? `${frame.right}` : '—';
    midDisplay.textContent = frame.mid !== null ? `${frame.mid}` : '—';
    stepDisplay.textContent = `${position + 1} / ${timeline.frames.length}`;
    status.textContent = frame.message;

    previous.disabled = position === 0;
    next.disabled = position === timeline.frames.length - 1;
  }

  function restart() {
    const scenario = scenarios[select.value] || scenarios.found_middle;
    timeline = buildTimeline(scenario.nums, scenario.target);
    position = 0;
    render();
  }

  select.addEventListener('change', restart);
  previous.addEventListener('click', () => { if (position > 0) { position--; render(); } });
  next.addEventListener('click', () => { if (position < timeline.frames.length - 1) { position++; render(); } });
  reset.addEventListener('click', restart);
  restart();
  doc.querySelector('#bs-controls').hidden = false;
}

if (typeof document !== 'undefined') initDemo(document);
