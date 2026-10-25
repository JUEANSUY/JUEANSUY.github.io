// 实践笔记归档页：分类筛选与即时搜索；纯前端无依赖，优雅降级。

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

export function initArchive(doc = document) {
  const filterBtns = Array.from(doc.querySelectorAll('.archive-filter-btn'));
  const searchInput = doc.querySelector('#archive-search-input');
  const cards = Array.from(doc.querySelectorAll('.archive-card'));
  const emptyState = doc.querySelector('#archive-empty');

  if (cards.length === 0) return;

  let currentCategory = 'all';
  let currentKeyword = '';

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
      update();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentKeyword = e.target.value;
      update();
    });
  }
}

if (typeof document !== 'undefined') {
  initArchive(document);
}
