// CSP 202509A 蒙特卡洛估计圆周率 交互演练器
// 纯 ESM 模块，零依赖，支持 Node.js 单元测试与浏览器 Canvas/DOM 交互

/**
 * 严格判断点 (x, y) 是否落在第一象限四分之一圆内（含边界）
 * 核心考点：直接比较平方规避 sqrt 精度与开销，且必须使用 <= 包含边界
 */
export function isPointInQuarterCircle(x, y, radius) {
  if (typeof x !== 'number' || typeof y !== 'number' || typeof radius !== 'number') {
    return false;
  }
  if (x < 0 || y < 0 || radius <= 0) {
    return false;
  }
  // 平方比较，带极微小浮点容差 1e-12
  return x * x + y * y <= radius * radius + 1e-12;
}

/**
 * 计算给定采样点集的圆周率估计值及误差
 */
export function estimatePi(points, radius) {
  if (!Array.isArray(points) || radius <= 0) {
    return {
      totalCount: 0,
      insideCount: 0,
      outsideCount: 0,
      estimatedPi: 0,
      error: Math.PI,
      relativeError: 1,
    };
  }

  let insideCount = 0;
  for (const pt of points) {
    if (isPointInQuarterCircle(pt.x, pt.y, radius)) {
      insideCount++;
    }
  }

  const totalCount = points.length;
  const outsideCount = totalCount - insideCount;
  const estimatedPi = totalCount === 0 ? 0 : (4 * insideCount) / totalCount;
  const error = Math.abs(estimatedPi - Math.PI);
  const relativeError = Math.PI === 0 ? 0 : error / Math.PI;

  return {
    totalCount,
    insideCount,
    outsideCount,
    estimatedPi,
    error,
    relativeError,
  };
}

/**
 * 生成均匀分布在 [0, radius] x [0, radius] 正方形内的随机点
 * 支持可选 seed（线性同余发生器 LCG），保证测试可复现
 */
export function generateRandomPoints(count, radius, seed = null) {
  if (count <= 0 || radius <= 0) return [];
  const points = [];
  let s = typeof seed === 'number' ? (seed >>> 0) : null;

  function nextFloat() {
    if (s !== null) {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 4294967296;
    }
    return Math.random();
  }

  for (let i = 0; i < count; i++) {
    points.push({
      x: nextFloat() * radius,
      y: nextFloat() * radius,
    });
  }

  return points;
}

// 预设演练场景
export const presetScenarios = {
  'small-sample': {
    title: '小样本采样 (50 点)：直观方差与随机波动',
    description: '样本量极小时，偶然落在圆内外的点数占比波动显著，体现大数定律之前的方差现象。',
    radius: 10,
    points: generateRandomPoints(50, 10, 101),
  },
  'boundary-critical': {
    title: '边界等于陷阱 (经典勾股 3-4-5 点)',
    description: '特设多组落在正圆弧边界上的点（如 3,4 与 0,5）。若代码错写为严格小于 <，这些点会被误判淘汰。',
    radius: 5,
    points: [
      { x: 0, y: 0 },
      { x: 3, y: 4 }, // 3^2 + 4^2 = 25 = 5^2 (边界圆弧上)
      { x: 4, y: 3 }, // 边界圆弧上
      { x: 0, y: 5 }, // 边界圆弧上
      { x: 5, y: 0 }, // 边界圆弧上
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3.5, y: 3.5 }, // 外点
      { x: 4.8, y: 4.8 }, // 远外角点
      { x: 1.5, y: 4.2 },
    ],
  },
  'medium-sample': {
    title: '中样本采样 (400 点)：估计值平稳收敛',
    description: '400 次均匀撒点后，圆内点比例开始稳定逼近 π/4 ≈ 0.7854，相对误差降至 3% 左右。',
    radius: 10,
    points: generateRandomPoints(400, 10, 202),
  },
  'dense-sample': {
    title: '大样本密集采样 (2000 点)：高精度逼近 3.14',
    description: '两千点密集覆盖第一象限正方形，清晰勾勒出四分之一圆边界弧线，估计值高精度逼近 3.14。',
    radius: 10,
    points: generateRandomPoints(2000, 10, 303),
  },
};

/**
 * 浏览器端 DOM 挂载与 Canvas 渲染器
 */
export function initMonteCarloSimulator(container = document.querySelector('#monte-carlo-simulator')) {
  if (!container) return;

  let currentRadius = 10;
  let currentPoints = [...presetScenarios['small-sample'].points];

  container.innerHTML = `
    <div class="mc-toolbar">
      <div class="mc-scenario-group">
        <label for="mc-scenario-select">预设场景：</label>
        <select id="mc-scenario-select" class="mc-select">
          <option value="small-sample">小样本 (50 点) - 方差演示</option>
          <option value="boundary-critical">边界陷阱 (勾股 3-4-5 点)</option>
          <option value="medium-sample">中样本 (400 点) - 渐进收敛</option>
          <option value="dense-sample">大样本 (2000 点) - 高精逼近</option>
        </select>
      </div>
      <div class="mc-btn-group">
        <button type="button" id="mc-add-20" class="mc-btn">+20 点</button>
        <button type="button" id="mc-add-200" class="mc-btn">+200 点</button>
        <button type="button" id="mc-clear" class="mc-btn mc-btn-secondary">清空重置</button>
      </div>
    </div>

    <div class="mc-display-layout">
      <div class="mc-canvas-wrapper">
        <canvas id="mc-canvas" width="360" height="360" aria-label="蒙特卡洛四分之一圆撒点画布"></canvas>
        <div class="mc-canvas-labels">
          <span class="mc-axis-y">Y (a)</span>
          <span class="mc-axis-origin">(0,0)</span>
          <span class="mc-axis-x">X (a)</span>
          <span class="mc-arc-tag">x² + y² ≤ a²</span>
        </div>
      </div>

      <div class="mc-stats-card">
        <div class="mc-stat-item">
          <span class="mc-stat-label">总采样点数 (N)</span>
          <strong id="mc-stat-total" class="mc-stat-val">0</strong>
        </div>
        <div class="mc-stat-item">
          <span class="mc-stat-label">圆内点数 (cnt, 绿色)</span>
          <strong id="mc-stat-inside" class="mc-stat-val mc-val-inside">0</strong>
        </div>
        <div class="mc-stat-item">
          <span class="mc-stat-label">圆外点数 (红色)</span>
          <strong id="mc-stat-outside" class="mc-stat-val mc-val-outside">0</strong>
        </div>
        <div class="mc-stat-highlight">
          <span class="mc-stat-label">估算 π = 4 × (cnt / N)</span>
          <strong id="mc-stat-pi" class="mc-stat-val mc-val-pi">0.0000</strong>
          <span id="mc-stat-diff" class="mc-stat-diff">误差: 0.0000 (0.0%)</span>
        </div>
        <div class="mc-legend">
          <span><span class="mc-dot mc-dot-in"></span> 圆内命中 (x² + y² ≤ a²)</span>
          <span><span class="mc-dot mc-dot-out"></span> 圆外落点 (x² + y² > a²)</span>
        </div>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#mc-canvas');
  const ctx = canvas?.getContext('2d');
  const select = container.querySelector('#mc-scenario-select');
  const add20Btn = container.querySelector('#mc-add-20');
  const add200Btn = container.querySelector('#mc-add-200');
  const clearBtn = container.querySelector('#mc-clear');

  const totalEl = container.querySelector('#mc-stat-total');
  const insideEl = container.querySelector('#mc-stat-inside');
  const outsideEl = container.querySelector('#mc-stat-outside');
  const piEl = container.querySelector('#mc-stat-pi');
  const diffEl = container.querySelector('#mc-stat-diff');

  function render() {
    if (!canvas || !ctx) return;
    const stats = estimatePi(currentPoints, currentRadius);

    if (totalEl) totalEl.textContent = stats.totalCount.toLocaleString();
    if (insideEl) insideEl.textContent = stats.insideCount.toLocaleString();
    if (outsideEl) outsideEl.textContent = stats.outsideCount.toLocaleString();
    if (piEl) piEl.textContent = stats.estimatedPi.toFixed(4);
    if (diffEl) {
      const pct = (stats.relativeError * 100).toFixed(2);
      diffEl.textContent = `真实 π ≈ 3.1416 | 绝对误差: ${stats.error.toFixed(4)} (${pct}%)`;
    }

    const w = canvas.width;
    const h = canvas.height;
    const pad = 24;
    const size = w - pad * 2;

    // 清屏与深色背景
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#101615';
    ctx.fillRect(0, 0, w, h);

    // 正方形外框 [0, a] x [0, a]
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pad, pad, size, size);

    // 四分之一圆填充微弱薄光
    ctx.beginPath();
    ctx.moveTo(pad, pad + size);
    ctx.arc(pad, pad + size, size, -Math.PI / 2, 0, false);
    ctx.closePath();
    ctx.fillStyle = 'rgba(52, 211, 153, 0.08)';
    ctx.fill();

    // 边界圆弧：高亮淡青色
    ctx.beginPath();
    ctx.arc(pad, pad + size, size, -Math.PI / 2, 0, false);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制采样点
    const scale = size / currentRadius;
    const dotRadius = currentPoints.length > 500 ? 2 : 3.5;

    for (const pt of currentPoints) {
      const isInside = isPointInQuarterCircle(pt.x, pt.y, currentRadius);
      const cx = pad + pt.x * scale;
      const cy = pad + size - pt.y * scale;

      ctx.beginPath();
      ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
      if (isInside) {
        ctx.fillStyle = '#34d399';
      } else {
        ctx.fillStyle = '#f87171';
      }
      ctx.fill();
    }
  }

  select?.addEventListener('change', (e) => {
    const sc = presetScenarios[e.target.value];
    if (sc) {
      currentRadius = sc.radius;
      currentPoints = [...sc.points];
      render();
    }
  });

  add20Btn?.addEventListener('click', () => {
    const newPts = generateRandomPoints(20, currentRadius);
    currentPoints.push(...newPts);
    render();
  });

  add200Btn?.addEventListener('click', () => {
    const newPts = generateRandomPoints(200, currentRadius);
    currentPoints.push(...newPts);
    render();
  });

  clearBtn?.addEventListener('click', () => {
    currentPoints = [];
    render();
  });

  render();
}

if (typeof document !== 'undefined') {
  const container = document.querySelector('#monte-carlo-simulator');
  if (container) {
    initMonteCarloSimulator(container);
  }
}
