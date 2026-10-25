// 最长公共子序列（LCS）二维动态规划与网格回溯演示；纯函数，不修改传入参数。

export function buildTimeline(text1, text2) {
  if (typeof text1 !== 'string' || typeof text2 !== 'string') {
    throw new TypeError('text1 和 text2 必须为字符串。');
  }
  if (text1.length === 0 || text2.length === 0) {
    throw new TypeError('字符串长度须大于 0。');
  }
  if (text1.length > 10 || text2.length > 10) {
    throw new TypeError('演示模式单字符串长度建议在 10 字符以内。');
  }

  const m = text1.length;
  const n = text2.length;

  // 初始化 (m + 1) x (n + 1) 的二维 DP 数组
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  const frames = [];
  const snapshot = (info) => {
    frames.push({
      step: frames.length,
      text1,
      text2,
      m,
      n,
      dp: dp.map((row) => [...row]),
      ...info,
    });
  };

  // 初始帧
  snapshot({
    action: 'init',
    currentI: null,
    currentJ: null,
    sourceI: null,
    sourceJ: null,
    char1: null,
    char2: null,
    matched: false,
    message: `初始化二维网格：dp 尺寸为 (${m + 1}) × (${n + 1})。第 0 行与第 0 列代表空前缀，全部初始化为 0。`,
  });

  for (let i = 1; i <= m; i++) {
    const c1 = text1[i - 1];
    for (let j = 1; j <= n; j++) {
      const c2 = text2[j - 1];
      const matched = c1 === c2;

      if (matched) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        snapshot({
          action: 'match',
          currentI: i,
          currentJ: j,
          sourceI: i - 1,
          sourceJ: j - 1,
          char1: c1,
          char2: c2,
          matched: true,
          message: `对比 text1[${i - 1}]='${c1}' 与 text2[${j - 1}]='${c2}'：字符相同！从左上角 dp[${i - 1}][${j - 1}]=${dp[i - 1][j - 1]} 对角线转移 + 1，得 dp[${i}][${j}] = ${dp[i][j]}。`,
        });
      } else {
        const fromTop = dp[i - 1][j];
        const fromLeft = dp[i][j - 1];
        dp[i][j] = Math.max(fromTop, fromLeft);
        const fromTopBigger = fromTop >= fromLeft;
        snapshot({
          action: 'diff',
          currentI: i,
          currentJ: j,
          sourceI: fromTopBigger ? i - 1 : i,
          sourceJ: fromTopBigger ? j : j - 1,
          char1: c1,
          char2: c2,
          matched: false,
          message: `对比 text1[${i - 1}]='${c1}' 与 text2[${j - 1}]='${c2}'：字符不同。取上方 dp[${i - 1}][${j}]=${fromTop} 与左方 dp[${i}][${j - 1}]=${fromLeft} 的较大值，得 dp[${i}][${j}] = ${dp[i][j]}。`,
        });
      }
    }
  }

  // 回溯重构最长公共子序列路径
  const path = [];
  const chars = [];
  let curI = m;
  let curJ = n;
  while (curI > 0 && curJ > 0) {
    path.push([curI, curJ]);
    if (text1[curI - 1] === text2[curJ - 1]) {
      chars.unshift(text1[curI - 1]);
      curI--;
      curJ--;
    } else if (dp[curI - 1][curJ] >= dp[curI][curJ - 1]) {
      curI--;
    } else {
      curJ--;
    }
  }
  path.push([curI, curJ]);

  const lcsStr = chars.join('');
  const ans = dp[m][n];

  snapshot({
    action: 'done',
    currentI: m,
    currentJ: n,
    sourceI: null,
    sourceJ: null,
    char1: null,
    char2: null,
    matched: false,
    path,
    lcsStr,
    ans,
    message: `填表完成！最终最长公共子序列长度为 dp[${m}][${n}] = ${ans}。${ans > 0 ? `回溯得出的一条最长公共子序列为 "${lcsStr}"。` : '两字符串无任何公共子序列。'}`,
  });

  return { frames, ans, lcsStr, path };
}

export const scenarios = {
  standard: {
    text1: 'abcde',
    text2: 'ace',
    desc: '经典样例 "abcde" 与 "ace" · LCS 长度为 3 ("ace")',
  },
  interleaved: {
    text1: 'AGGTAB',
    text2: 'GXTXAYB',
    desc: '交错序列 "AGGTAB" 与 "GXTXAYB" · LCS 长度为 4 ("GTAB")',
  },
  no_common: {
    text1: 'abc',
    text2: 'def',
    desc: '完全无交集 "abc" 与 "def" · LCS 长度为 0',
  },
  repeated: {
    text1: 'bsbininm',
    text2: 'jmjkbkjkv',
    desc: '重复字符干扰 "bsbininm" 与 "jmjkbkjkv" · LCS 长度为 1 ("m")',
  },
  identical: {
    text1: 'algs',
    text2: 'algs',
    desc: '完全相同 "algs" 与 "algs" · LCS 长度为 4 ("algs")',
  },
};

function initDemo(doc) {
  const select = doc.querySelector('#lcs-scenario');
  if (!select) return;
  const tableContainer = doc.querySelector('#lcs-table-container');
  const previous = doc.querySelector('#lcs-prev');
  const next = doc.querySelector('#lcs-next');
  const reset = doc.querySelector('#lcs-reset');
  const status = doc.querySelector('#lcs-status');
  const currentCharsDisplay = doc.querySelector('#lcs-chars');
  const lcsLenDisplay = doc.querySelector('#lcs-len');
  const stepDisplay = doc.querySelector('#lcs-step');

  let timeline;
  let position = 0;

  function render() {
    const frame = timeline.frames[position];
    const isDone = frame.action === 'done';
    const pathSet = new Set((frame.path || []).map(([r, c]) => `${r},${c}`));

    const table = doc.createElement('table');
    table.className = 'lcs-table';

    // 表头
    const thead = doc.createElement('thead');
    const headerRow = doc.createElement('tr');

    const emptyCorner = doc.createElement('th');
    emptyCorner.textContent = 'i \\ j';
    emptyCorner.className = 'lcs-th lcs-corner';
    headerRow.appendChild(emptyCorner);

    const emptyPrefix = doc.createElement('th');
    emptyPrefix.textContent = '""(0)';
    emptyPrefix.className = 'lcs-th';
    headerRow.appendChild(emptyPrefix);

    for (let j = 1; j <= frame.n; j++) {
      const th = doc.createElement('th');
      th.className = 'lcs-th';
      th.textContent = `${frame.text2[j - 1]}(${j})`;
      if (frame.currentJ === j) th.dataset.highlight = 'true';
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 表体
    const tbody = doc.createElement('tbody');
    for (let i = 0; i <= frame.m; i++) {
      const tr = doc.createElement('tr');

      const rowHeader = doc.createElement('th');
      rowHeader.className = 'lcs-th lcs-row-th';
      rowHeader.textContent = i === 0 ? '""(0)' : `${frame.text1[i - 1]}(${i})`;
      if (frame.currentI === i) rowHeader.dataset.highlight = 'true';
      tr.appendChild(rowHeader);

      for (let j = 0; j <= frame.n; j++) {
        const td = doc.createElement('td');
        td.className = 'lcs-td';
        const val = frame.dp[i][j];
        td.textContent = String(val);

        const isCurrent = frame.currentI === i && frame.currentJ === j;
        const isSource = frame.sourceI === i && frame.sourceJ === j;
        const isInPath = isDone && pathSet.has(`${i},${j}`);

        if (isCurrent) td.dataset.active = 'true';
        if (isSource) td.dataset.source = 'true';
        if (isInPath) td.dataset.path = 'true';

        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    tableContainer.replaceChildren(table);

    currentCharsDisplay.textContent = frame.char1 && frame.char2
      ? `'${frame.char1}' vs '${frame.char2}'`
      : '—';
    lcsLenDisplay.textContent = String(frame.dp[frame.currentI || frame.m][frame.currentJ || frame.n]);
    stepDisplay.textContent = `${position + 1} / ${timeline.frames.length}`;
    status.textContent = frame.message;

    previous.disabled = position === 0;
    next.disabled = position === timeline.frames.length - 1;
  }

  function restart() {
    const scenario = scenarios[select.value] || scenarios.standard;
    timeline = buildTimeline(scenario.text1, scenario.text2);
    position = 0;
    render();
  }

  select.addEventListener('change', restart);
  previous.addEventListener('click', () => { if (position > 0) { position--; render(); } });
  next.addEventListener('click', () => { if (position < timeline.frames.length - 1) { position++; render(); } });
  reset.addEventListener('click', restart);
  restart();
  doc.querySelector('#lcs-controls').hidden = false;
}

if (typeof document !== 'undefined') initDemo(document);
