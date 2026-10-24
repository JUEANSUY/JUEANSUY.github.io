// 单调栈推进演示与最大矩形面积计算；不修改传入的高度数组。
export function buildTimeline(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 10 ||
      !input.every((val) => Number.isInteger(val) && val >= 0 && val <= 10)) {
    throw new TypeError('柱状图高度须为包含 1 到 10 个介于 0 到 10 之间整数的数组。');
  }
  const heights = [...input];
  const n = heights.length;
  const stack = [];
  let maxArea = 0;
  const frames = [];

  const addFrame = (frame) => {
    frames.push({
      ...frame,
      stack: [...stack],
      heights: [...heights],
      maxArea,
    });
  };

  // 初始帧
  addFrame({
    step: 0,
    action: 'init',
    pointer: 0,
    curHeight: heights[0],
    highlightRect: null,
    poppedIndex: null,
    poppedHeight: null,
    message: '初始状态：单调栈为空。准备从下标 0 开始顺序扫描。',
  });

  for (let i = 0; i <= n; i++) {
    const curHeight = (i === n) ? 0 : heights[i];

    while (stack.length > 0 && curHeight < heights[stack[stack.length - 1]]) {
      const idx = stack.pop();
      const right = i;
      const height = heights[idx];
      const left = stack.length === 0 ? 0 : stack[stack.length - 1] + 1;
      const width = stack.length === 0 ? right : right - stack[stack.length - 1] - 1;
      const area = height * width;
      const isNewMax = area > maxArea;
      if (isNewMax) {
        maxArea = area;
      }

      addFrame({
        step: frames.length,
        action: 'pop',
        pointer: i,
        curHeight,
        poppedIndex: idx,
        poppedHeight: height,
        highlightRect: {
          left,
          right: right - 1,
          height,
          width,
          area,
        },
        message: i === n
          ? `哨兵 0 触发清栈：弹出下标 ${idx}（高度 ${height}）。左界 ${left}，右界 ${right - 1}，跨度 ${width}，结算面积 ${height} × ${width} = ${area}${isNewMax ? '（刷新最大面积！）' : ''}。`
          : `柱子 ${i}（高度 ${curHeight}）比栈顶（下标 ${idx}，高度 ${height}）更矮：弹出下标 ${idx}。以高度 ${height} 结算矩形：左界 ${left}，右界 ${right - 1}，跨度 ${width}，结算面积 ${height} × ${width} = ${area}${isNewMax ? '（刷新最大面积！）' : ''}。`,
      });
    }

    if (i < n) {
      stack.push(i);
      addFrame({
        step: frames.length,
        action: 'push',
        pointer: i,
        curHeight,
        poppedIndex: null,
        poppedHeight: null,
        highlightRect: null,
        message: `柱子 ${i}（高度 ${curHeight}）保持递增，下标 ${i} 入栈。当前栈内下标：[${stack.join(', ')}]。`,
      });
    }
  }

  addFrame({
    step: frames.length,
    action: 'done',
    pointer: n,
    curHeight: 0,
    poppedIndex: null,
    poppedHeight: null,
    highlightRect: null,
    message: `全部柱子扫描与哨兵清空完成，柱状图中最大的矩形面积为 ${maxArea}。`,
  });

  return { frames, maxArea };
}

export const scenarios = {
  classic: { heights: [2, 1, 5, 6, 2, 3] },
  increasing: { heights: [1, 2, 3, 4, 5] },
  decreasing: { heights: [5, 4, 3, 2, 1] },
  plateau: { heights: [2, 4, 4, 4, 2] },
  single: { heights: [4] },
};

function initDemo(doc) {
  const select = doc.querySelector('#histogram-scenario');
  if (!select) return;
  const chartElement = doc.querySelector('#histogram-chart');
  const previous = doc.querySelector('#histogram-prev');
  const next = doc.querySelector('#histogram-next');
  const reset = doc.querySelector('#histogram-reset');
  const status = doc.querySelector('#histogram-status');
  const stackDisplay = doc.querySelector('#histogram-stack');
  const currentAreaDisplay = doc.querySelector('#histogram-current-area');
  const maxAreaDisplay = doc.querySelector('#histogram-max-area');

  let timeline;
  let position = 0;

  function render() {
    const frame = timeline.frames[position];
    const scenarioHeights = frame.heights;
    const maxVal = Math.max(...scenarioHeights, 6);
    const fragment = doc.createDocumentFragment();

    chartElement.setAttribute('role', 'group');
    chartElement.setAttribute('aria-label', `单调栈步进第 ${position} 步`);

    scenarioHeights.forEach((h, idx) => {
      const col = doc.createElement('div');
      col.className = 'histogram-col';
      col.dataset.index = String(idx);

      const inStack = frame.stack.includes(idx);
      const isPopped = frame.poppedIndex === idx;
      const inRect = frame.highlightRect &&
                     idx >= frame.highlightRect.left &&
                     idx <= frame.highlightRect.right;
      const isPointer = frame.pointer === idx && frame.action !== 'done';

      if (inStack) col.dataset.inStack = 'true';
      if (isPopped) col.dataset.popped = 'true';
      if (inRect) col.dataset.inRect = 'true';
      if (isPointer) col.dataset.active = 'true';

      const bar = doc.createElement('div');
      bar.className = 'histogram-bar';
      // 高度按百分比渲染，最低保留 10px 便于查看 0 高度
      const barHeightPx = Math.max(10, Math.round((h / maxVal) * 130));
      bar.style.height = `${barHeightPx}px`;

      const heightLabel = doc.createElement('span');
      heightLabel.className = 'histogram-bar-val';
      heightLabel.textContent = String(h);
      bar.appendChild(heightLabel);

      const indexLabel = doc.createElement('span');
      indexLabel.className = 'histogram-idx-val';
      indexLabel.textContent = `[${idx}]`;

      col.appendChild(bar);
      col.appendChild(indexLabel);
      col.setAttribute('aria-label', `下标 ${idx}，高度 ${h}${inStack ? '，在栈中' : ''}${isPopped ? '，正在弹出结算' : ''}`);
      fragment.appendChild(col);
    });

    // 哨兵虚拟柱子（当指针到达 n 且处于清栈阶段）
    if (frame.pointer === scenarioHeights.length && frame.action !== 'done') {
      const sentinelCol = doc.createElement('div');
      sentinelCol.className = 'histogram-col histogram-sentinel-col';
      sentinelCol.dataset.active = 'true';
      const sentinelBar = doc.createElement('div');
      sentinelBar.className = 'histogram-bar sentinel-bar';
      sentinelBar.style.height = '10px';
      const sentinelLabel = doc.createElement('span');
      sentinelLabel.className = 'histogram-bar-val';
      sentinelLabel.textContent = '0';
      sentinelBar.appendChild(sentinelLabel);
      const sentinelIdx = doc.createElement('span');
      sentinelIdx.className = 'histogram-idx-val';
      sentinelIdx.textContent = `[${scenarioHeights.length}]哨兵`;
      sentinelCol.appendChild(sentinelBar);
      sentinelCol.appendChild(sentinelIdx);
      fragment.appendChild(sentinelCol);
    }

    chartElement.replaceChildren(fragment);

    stackDisplay.textContent = frame.stack.length > 0 ? `[${frame.stack.join(', ')}]` : '[]';
    currentAreaDisplay.textContent = frame.highlightRect ? String(frame.highlightRect.area) : '-';
    maxAreaDisplay.textContent = String(frame.maxArea);

    previous.disabled = position === 0;
    next.disabled = position === timeline.frames.length - 1;
    status.textContent = frame.message;
  }

  function restart() {
    const scenario = scenarios[select.value] || scenarios.classic;
    timeline = buildTimeline(scenario.heights);
    position = 0;
    render();
  }

  select.addEventListener('change', restart);
  previous.addEventListener('click', () => { if (position > 0) { position--; render(); } });
  next.addEventListener('click', () => { if (position < timeline.frames.length - 1) { position++; render(); } });
  reset.addEventListener('click', restart);
  restart();
  doc.querySelector('#histogram-controls').hidden = false;
}

if (typeof document !== 'undefined') initDemo(document);
