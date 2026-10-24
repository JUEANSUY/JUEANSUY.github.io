// 实践笔记通用交互增强：代码一键复制与阅读体验

export function initNoteCommon(doc = document) {
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

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initNoteCommon(document));
  } else {
    initNoteCommon(document);
  }
}
