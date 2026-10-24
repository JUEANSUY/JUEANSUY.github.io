// 拓扑排序与课程表有向图环检测演示；不修改传入参数。

export function buildTimeline(numCourses, prerequisites) {
  if (!Number.isInteger(numCourses) || numCourses < 1 || numCourses > 8) {
    throw new TypeError('课程数量须在 1 到 8 之间。');
  }
  if (!Array.isArray(prerequisites)) {
    throw new TypeError('先修关系须为数组。');
  }
  for (const pair of prerequisites) {
    if (!Array.isArray(pair) || pair.length !== 2 ||
        !Number.isInteger(pair[0]) || !Number.isInteger(pair[1]) ||
        pair[0] < 0 || pair[0] >= numCourses || pair[1] < 0 || pair[1] >= numCourses) {
      throw new TypeError(`先修关系须为包含合法课程编号的数对 [a, b] (0 到 ${numCourses - 1})。`);
    }
  }

  const graph = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);

  // [a, b] 意为想学 a 须先学 b，即有向边 b -> a
  for (const [a, b] of prerequisites) {
    graph[b].push(a);
    indegree[a]++;
  }

  const frames = [];
  const initialIndegree = [...indegree];

  const snapshot = (action, info) => {
    frames.push({
      step: frames.length,
      action,
      numCourses,
      prerequisites: prerequisites.map((p) => [...p]),
      indegree: [...currentIndegree],
      learnedCount: learnedList.length,
      learnedList: [...learnedList],
      queue: [...queue.slice(head)],
      ...info,
    });
  };

  const currentIndegree = [...initialIndegree];
  const queue = [];
  let head = 0;
  const learnedList = [];

  // 初始帧
  snapshot('init', {
    currentCourse: null,
    unlockedList: [],
    message: `共有 ${numCourses} 门课程。已统计各节点初始入度。准备将所有初始入度为 0 的无先修要求课程放入队列。`,
  });

  // 找出初始入度为 0 的课程
  for (let i = 0; i < numCourses; i++) {
    if (currentIndegree[i] === 0) {
      queue.push(i);
    }
  }

  snapshot('initial_queue', {
    currentCourse: null,
    unlockedList: [...queue],
    message: queue.length > 0
      ? `初始入度为 0 的课程有 [${queue.join(', ')}]，它们没有先修课程，可作为第一批直接学习。`
      : '没有入度为 0 的课程！所有课程都存在未满足的前置依赖，有向图中存在环，无法开始学习。',
  });

  while (head < queue.length) {
    const course = queue[head++];
    learnedList.push(course);

    const unlockedThisStep = [];
    const affectedNeighbors = [];

    for (const next of graph[course]) {
      currentIndegree[next]--;
      affectedNeighbors.push(next);
      if (currentIndegree[next] === 0) {
        queue.push(next);
        unlockedThisStep.push(next);
      }
    }

    snapshot('learn_step', {
      currentCourse: course,
      affectedNeighbors,
      unlockedList: unlockedThisStep,
      message: `学完课程 ${course}。其后续依赖课程 [${affectedNeighbors.join(', ')}] 入度各减 1。` +
               (unlockedThisStep.length > 0
                 ? `课程 [${unlockedThisStep.join(', ')}] 入度降为 0，成功解锁并进入学习队列！`
                 : '本步未解锁新的入度为 0 课程。'),
    });
  }

  const canFinishAll = learnedList.length === numCourses;

  snapshot('done', {
    currentCourse: null,
    unlockedList: [],
    canFinishAll,
    message: canFinishAll
      ? `全部 ${numCourses} 门课程已按拓扑顺序 [${learnedList.join(' -> ')}] 顺利学完！不存在死锁环依赖，返回 true。`
      : `队列已空，仅学完 ${learnedList.length} 门课程，剩余 ${numCourses - learnedList.length} 门课程之间存在循环死锁，无法全部完成，返回 false。`,
  });

  return {
    frames,
    canFinish: canFinishAll,
    learnedList: [...learnedList],
  };
}

export const scenarios = {
  diamond: {
    numCourses: 4,
    prerequisites: [[1, 0], [2, 0], [3, 1], [3, 2]], // 0 -> 1,2 -> 3
  },
  cycle: {
    numCourses: 3,
    prerequisites: [[1, 0], [2, 1], [0, 2]], // 0 -> 1 -> 2 -> 0 死锁
  },
  partial_cycle: {
    numCourses: 4,
    prerequisites: [[1, 0], [2, 1], [1, 2], [3, 0]], // 0 解锁 3；1 与 2 互锁
  },
  linear: {
    numCourses: 3,
    prerequisites: [[1, 0], [2, 1]], // 0 -> 1 -> 2
  },
  independent: {
    numCourses: 3,
    prerequisites: [], // 互不依赖
  },
};

function initDemo(doc) {
  const select = doc.querySelector('#course-scenario');
  if (!select) return;
  const nodesContainer = doc.querySelector('#course-nodes');
  const edgesContainer = doc.querySelector('#course-edges');
  const previous = doc.querySelector('#course-prev');
  const next = doc.querySelector('#course-next');
  const reset = doc.querySelector('#course-reset');
  const status = doc.querySelector('#course-status');
  const queueDisplay = doc.querySelector('#course-queue');
  const learnedDisplay = doc.querySelector('#course-learned');
  const stepDisplay = doc.querySelector('#course-step');

  let timeline;
  let position = 0;

  function render() {
    const frame = timeline.frames[position];

    // 渲染课程节点
    const nodesFragment = doc.createDocumentFragment();
    for (let c = 0; c < frame.numCourses; c++) {
      const node = doc.createElement('div');
      node.className = 'course-node';
      const isLearned = frame.learnedList.includes(c);
      const isCurrent = frame.currentCourse === c;
      const inQueue = frame.queue.includes(c);

      if (isLearned) node.dataset.learned = 'true';
      if (isCurrent) node.dataset.current = 'true';
      if (inQueue) node.dataset.inQueue = 'true';

      const inDeg = frame.indegree[c];
      node.innerHTML = `
        <span class="course-node-id">课程 ${c}</span>
        <span class="course-node-indeg">入度: ${inDeg}</span>
      `;
      node.setAttribute('aria-label', `课程 ${c}，当前入度 ${inDeg}${isLearned ? '，已学完' : inQueue ? '，在队列中' : ''}`);
      nodesFragment.appendChild(node);
    }
    nodesContainer.replaceChildren(nodesFragment);

    // 渲染先修依赖列表
    const edgesFragment = doc.createDocumentFragment();
    frame.prerequisites.forEach(([a, b]) => {
      const tag = doc.createElement('span');
      tag.className = 'course-edge-tag';
      const bLearned = frame.learnedList.includes(b);
      if (bLearned) tag.dataset.satisfied = 'true';
      tag.textContent = `${b} → ${a}`;
      edgesFragment.appendChild(tag);
    });
    edgesContainer.replaceChildren(edgesFragment);

    queueDisplay.textContent = frame.queue.length > 0 ? `[${frame.queue.join(', ')}]` : '[]';
    learnedDisplay.textContent = `${frame.learnedCount} / ${frame.numCourses}`;
    stepDisplay.textContent = `${position + 1} / ${timeline.frames.length}`;
    status.textContent = frame.message;

    previous.disabled = position === 0;
    next.disabled = position === timeline.frames.length - 1;
  }

  function restart() {
    const scenario = scenarios[select.value] || scenarios.diamond;
    timeline = buildTimeline(scenario.numCourses, scenario.prerequisites);
    position = 0;
    render();
  }

  select.addEventListener('change', restart);
  previous.addEventListener('click', () => { if (position > 0) { position--; render(); } });
  next.addEventListener('click', () => { if (position < timeline.frames.length - 1) { position++; render(); } });
  reset.addEventListener('click', restart);
  restart();
  doc.querySelector('#course-controls').hidden = false;
}

if (typeof document !== 'undefined') initDemo(document);
