// 实践笔记归档页：分类筛选、即时搜索与 URL 深度链接；纯前端无依赖，优雅降级。

export function filterCards(cards, { category = 'all', keyword = '' } = {}) {
  const normKeyword = keyword.trim().toLowerCase();
  let matchCount = 0;

  for (const card of cards) {
    const cardCat = card.dataset.category || '';
    const catMatch = category === 'all' || cardCat === category;

    const text = card.textContent.toLowerCase();
    const keywordMatch = !normKeyword || text.includes(normKeyword);

    const isVisible = catMatch && keywordMatch;
    card.hidden = !isVisible;
    if (isVisible) matchCount++;
  }

  return matchCount;
}

export function initArchive(doc = document, win = typeof window !== 'undefined' ? window : null) {
  const filterBtns = Array.from(doc.querySelectorAll('.archive-filter-btn'));
  const searchInput = doc.querySelector('#archive-search-input');
  const cards = Array.from(doc.querySelectorAll('.archive-card'));
  const emptyState = doc.querySelector('#archive-empty');

  if (cards.length === 0) return;

  let currentCategory = 'all';
  let currentKeyword = '';

  // 检查 URL 中的初始分类参数，例如 #category=dp 或 ?category=dp
  if (win?.location) {
    const rawSearch = win.location.search || (win.location.hash ? win.location.hash.replace(/^#/, '?') : '');
    const params = new URLSearchParams(rawSearch);
    const catFromUrl = params.get('category');
    if (catFromUrl && filterBtns.some((b) => b.dataset.category === catFromUrl)) {
      currentCategory = catFromUrl;
      for (const b of filterBtns) {
        const isMatch = b.dataset.category === currentCategory;
        b.dataset.active = isMatch ? 'true' : 'false';
        b.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
      }
    }
  }

  function update() {
    const count = filterCards(cards, {
      category: currentCategory,
      keyword: currentKeyword,
    });
    if (emptyState) {
      emptyState.hidden = count > 0;
    }
  }

  for (const btn of filterBtns) {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.category || 'all';
      for (const b of filterBtns) {
        b.dataset.active = b === btn ? 'true' : 'false';
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      }
      if (win?.history?.replaceState) {
        const hash = currentCategory === 'all' ? '' : `#category=${currentCategory}`;
        win.history.replaceState(null, '', win.location.pathname + hash);
      }
      update();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentKeyword = e.target.value;
      update();
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        currentKeyword = '';
        update();
        searchInput.blur();
      }
    });

    doc.addEventListener('keydown', (e) => {
      if (e.key === '/' && doc.activeElement !== searchInput && !['INPUT', 'TEXTAREA'].includes(doc.activeElement?.tagName)) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });
  }

  update();
}

if (typeof document !== 'undefined') {
  initArchive(document, window);
}
