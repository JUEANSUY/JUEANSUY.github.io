// 用逐层 BFS 生成演示快照；不修改传入的网格。
export function buildTimeline(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 10 ||
      !Array.isArray(input[0]) || input[0].length < 1 || input[0].length > 10) {
    throw new TypeError('网格的行数与列数须在 1 到 10 之间。');
  }
  const rows = input.length;
  const cols = input[0].length;
  if (!input.every((row) => Array.isArray(row) && row.length === cols &&
      row.every((value) => [0, 1, 2].includes(value)))) {
    throw new TypeError('网格须为矩形，格子只能是 0、1 或 2。');
  }
  const grid = input.map((row) => [...row]);
  const queue = [];
  let fresh = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1) fresh++;
      if (grid[r][c] === 2) queue.push([r, c]);
    }
  }
  const frames = [];
  const snapshot = (minute, newlyRotten) => {
    frames.push({ minute, fresh, newlyRotten, grid: grid.map((row) => [...row]) });
  };
  snapshot(0, []);
  let head = 0;
  while (head < queue.length && fresh > 0) {
    // 先固定这一层的边界，新入队的格子留到下一分钟。
    const end = queue.length;
    const newlyRotten = [];
    while (head < end) {
      const [r, c] = queue[head++];
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] !== 1) continue;
        // 入队时就标记，避免同一颗橘子被多个起点重复加入。
        grid[nr][nc] = 2;
        fresh--;
        queue.push([nr, nc]);
        newlyRotten.push([nr, nc]);
      }
    }
    if (newlyRotten.length === 0) break;
    snapshot(frames.at(-1).minute + 1, newlyRotten);
  }
  return { frames, answer: fresh === 0 ? frames.at(-1).minute : -1 };
}

export const scenarios = {
  classic: { grid: [[2, 1, 1], [1, 1, 0], [0, 1, 1]] },
  multiple: { grid: [[2, 1, 1, 1, 2]] },
  blocked: { grid: [[2, 1, 1], [0, 1, 1], [1, 0, 1]] },
  ready: { grid: [[0, 2]] },
};

function initDemo(doc) {
  const select = doc.querySelector('#orange-scenario');
  if (!select) return;
  const gridElement = doc.querySelector('#orange-grid');
  const previous = doc.querySelector('#orange-prev');
  const next = doc.querySelector('#orange-next');
  const reset = doc.querySelector('#orange-reset');
  const status = doc.querySelector('#orange-status');
  let timeline;
  let position = 0;

  function render() {
    const frame = timeline.frames[position];
    const changed = new Set(frame.newlyRotten.map(([r, c]) => r + ',' + c));
    const names = ['空格', '新鲜橘子', '腐烂橘子'];
    const fragment = doc.createDocumentFragment();
    gridElement.style.setProperty('--orange-cols', frame.grid[0].length);
    gridElement.setAttribute('role', 'group');
    gridElement.setAttribute('aria-label', '第 ' + frame.minute + ' 分钟的网格');
    frame.grid.forEach((row, r) => row.forEach((value, c) => {
      const cell = doc.createElement('div');
      cell.className = 'orange-cell';
      cell.dataset.value = String(value);
      if (changed.has(r + ',' + c)) cell.dataset.new = 'true';
      cell.textContent = String(value);
      cell.setAttribute('role', 'img');
      cell.setAttribute('aria-label', `第 ${r + 1} 行第 ${c + 1} 列：${names[value]}`);
      fragment.append(cell);
    }));
    gridElement.replaceChildren(fragment);
    doc.querySelector('#orange-minute').textContent = String(frame.minute);
    doc.querySelector('#orange-fresh').textContent = String(frame.fresh);
    previous.disabled = position === 0;
    next.disabled = position === timeline.frames.length - 1;
    if (frame.fresh === 0) {
      status.textContent = frame.minute === 0 ? '开始时就没有新鲜橘子，答案为 0 分钟。' :
        `全部橘子已腐烂，答案为 ${frame.minute} 分钟。`;
    } else if (next.disabled) {
      status.textContent = `扩散已停止，仍有 ${frame.fresh} 颗新鲜橘子无法到达，答案为 -1。`;
    } else if (position === 0) {
      status.textContent = '所有初始腐烂橘子同时出发。点击“下一分钟”，观察一层的扩散。';
    } else {
      status.textContent = `本分钟新增 ${frame.newlyRotten.length} 颗腐烂橘子；它们会在下一分钟继续扩散。`;
    }
  }

  function restart() {
    const scenario = scenarios[select.value] || scenarios.classic;
    timeline = buildTimeline(scenario.grid);
    position = 0;
    render();
  }
  select.addEventListener('change', restart);
  previous.addEventListener('click', () => { if (position > 0) { position--; render(); } });
  next.addEventListener('click', () => { if (position < timeline.frames.length - 1) { position++; render(); } });
  reset.addEventListener('click', restart);
  restart();
  doc.querySelector('#orange-controls').hidden = false;
}

if (typeof document !== 'undefined') initDemo(document);
