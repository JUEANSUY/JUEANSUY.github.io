// 实践笔记通用交互增强：代码一键复制、阅读进度、字数与时长预估、返回顶部与目录高亮

export function computeReadingMetrics(text) {
  if (typeof text !== 'string') return { chars: 0, minutes: 1 };
  // 统计字符数（过滤过多连续空格和换行）
  const clean = text.replace(/\s+/g, ' ').trim();
  const chars = Array.from(clean).length;
  // 中文技术阅读速度按 350~450 字/分钟估算
  const minutes = Math.max(1, Math.ceil(chars / 400));
  return { chars, minutes };
}

export function computeScrollProgress(scrollTop, scrollHeight, clientHeight) {
  const maxScroll = scrollHeight - clientHeight;
  if (maxScroll <= 0) return 100;
  const ratio = Math.min(1, Math.max(0, scrollTop / maxScroll));
  return Math.round(ratio * 100);
}

export function initCodeCopy(doc) {
  const codePanels = doc.querySelectorAll('.article-code-panel');
  codePanels.forEach((panel) => {
    const caption = panel.querySelector('.article-code-caption');
    const pre = panel.querySelector('pre');
    if (!caption || !pre) return;

    let copyBtn = caption.querySelector('.code-copy-btn');
    if (!copyBtn) {
      copyBtn = doc.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'code-copy-btn';
      copyBtn.textContent = '复制代码';
      copyBtn.setAttribute('aria-label', '复制代码到剪贴板');
      caption.appendChild(copyBtn);
    }

    copyBtn.addEventListener('click', async () => {
      try {
        const text = pre.innerText;
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = '已复制 ✓';
        copyBtn.dataset.copied = 'true';
        setTimeout(() => {
          copyBtn.textContent = '复制代码';
          delete copyBtn.dataset.copied;
        }, 1800);
      } catch {
        copyBtn.textContent = '复制失败';
        setTimeout(() => { copyBtn.textContent = '复制代码'; }, 1800);
      }
    });
  });
}

export function initReadingProgressBar(doc, win = window) {
  let bar = doc.querySelector('.reading-progress-bar');
  if (!bar) {
    bar = doc.createElement('div');
    bar.className = 'reading-progress-bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', '0');
    bar.setAttribute('aria-label', '笔记阅读进度');
    doc.body.appendChild(bar);
  }

  function update() {
    const docEl = doc.documentElement;
    const progress = computeScrollProgress(
      win.scrollY || docEl.scrollTop,
      docEl.scrollHeight,
      win.innerHeight || docEl.clientHeight
    );
    bar.style.width = `${progress}%`;
    bar.setAttribute('aria-valuenow', String(progress));
  }

  win.addEventListener('scroll', update, { passive: true });
  update();
}

export function initReadingMetrics(doc) {
  const article = doc.querySelector('.article-content');
  const meta = doc.querySelector('.article-meta');
  if (!article || !meta) return;

  if (meta.querySelector('.reading-metric-badge')) return;

  const { chars, minutes } = computeReadingMetrics(article.textContent || '');
  const badge = doc.createElement('span');
  badge.className = 'reading-metric-badge';
  badge.textContent = `约 ${minutes} 分钟阅读 · ${chars.toLocaleString('zh-CN')} 字`;
  meta.appendChild(badge);
}

export function initBackToTop(doc, win = window) {
  let btn = doc.querySelector('.floating-back-to-top');
  if (!btn) {
    btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'floating-back-to-top';
    btn.setAttribute('aria-label', '平滑返回顶部');
    btn.innerHTML = '<span aria-hidden="true">↑</span>';
    btn.hidden = true;
    doc.body.appendChild(btn);
  }

  btn.addEventListener('click', () => {
    win.scrollTo({ top: 0, behavior: 'smooth' });
  });

  win.addEventListener('scroll', () => {
    btn.hidden = (win.scrollY || doc.documentElement.scrollTop) < 320;
  }, { passive: true });
}

export function initScrollSpy(doc, win = window) {
  const tocLinks = Array.from(doc.querySelectorAll('.article-toc nav a[href^="#"]'));
  if (tocLinks.length === 0) return;

  const sections = tocLinks
    .map((link) => {
      const id = link.getAttribute('href').slice(1);
      const el = doc.getElementById(id);
      return el ? { id, el, link } : null;
    })
    .filter(Boolean);

  if (sections.length === 0) return;

  function updateSpy() {
    const scrollPos = (win.scrollY || doc.documentElement.scrollTop) + 120;
    let currentId = null;

    for (const section of sections) {
      if (section.el.offsetTop <= scrollPos) {
        currentId = section.id;
      }
    }

    for (const section of sections) {
      const isActive = section.id === currentId;
      section.link.dataset.active = isActive ? 'true' : 'false';
    }
  }

  win.addEventListener('scroll', updateSpy, { passive: true });
  updateSpy();
}

export function initNoteCommon(doc = document) {
  initCodeCopy(doc);
  initReadingProgressBar(doc);
  initReadingMetrics(doc);
  initBackToTop(doc);
  initScrollSpy(doc);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initNoteCommon(document));
  } else {
    initNoteCommon(document);
  }
}
