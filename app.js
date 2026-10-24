import { sha256, base64Encode, base64Decode, urlEncode, urlDecode, utf8ByteLength, jsonFormat, jsonMinify, timestampToDate, dateToTimestamp } from './toolkit.mjs';

const $ = (id) => document.getElementById(id);
const input = $('tool-input');
const output = $('tool-output');
const runButton = $('run-tool');
const copyButton = $('copy-output');
const swapButton = $('swap-text');
const status = $('tool-status');
const tabs = [...document.querySelectorAll('[data-tool]')];
const modes = [...document.querySelectorAll('[data-mode]')];
const tools = {
  sha256: {
    title: '计算 SHA-256', format: '64 位十六进制',
    hint: '给一段文本生成 SHA-256 摘要，用来比较内容是否相同。它不是加密，也不能解密回原文。',
    sample: '你好，世界！', execute: sha256,
  },
  base64: {
    title: 'Base64', format: 'UTF-8 文本', sample: '保持好奇，继续动手。👋',
    hint: '标准 Base64 与 UTF-8 文本互转。解码会严格检查格式、填充与 UTF-8；请勿混入空白或使用 Base64URL 格式。',
  },
  url: {
    title: 'URL', format: 'URI 参数值', sample: '你好，世界！ + hello/world?x=1&y=2',
    hint: '编码或还原单独的 URL 参数值，使用 encodeURIComponent / decodeURIComponent。解码时 + 保留为加号，不作为空格。',
  },
  json: {
    title: 'JSON 格式化', format: 'JSON 文本',
    sample: '{"name":"Jueansuy","skills":["C","Python","Web"],"site":"www.jueansuy.cn","local":true}',
    hint: '纯浏览器本地格式化与压缩 JSON。严格校验语法并提示错误位置，不上传任何数据。',
  },
  timestamp: {
    title: '时间戳转换', format: '时间信息',
    sample: '1792873887',
    hint: 'Unix 时间戳与北京时间（UTC+8）互相转换。支持 10 位秒级与 13 位毫秒级时间戳，纯本地计算。',
  },
};
let selected = 'sha256';
let mode = 'encode';
let requestSerial = 0;
let hasResult = false;

function setStatus(message, state = 'neutral') {
  status.textContent = message;
  status.dataset.state = state;
}

function inputCount() {
  let bytes;
  try { bytes = utf8ByteLength(input.value).toLocaleString('zh-CN'); }
  catch { bytes = '无法计算'; }
  $('tool-input-count').textContent = `${Array.from(input.value).length.toLocaleString('zh-CN')} 字符 · ${bytes} 字节`;
}

function setBusy(busy) {
  runButton.disabled = busy;
  runButton.setAttribute('aria-busy', String(busy));
  const label = selected === 'sha256' ? tools.sha256.title
    : selected === 'json' ? `${mode === 'encode' ? '格式化' : '压缩'} JSON`
    : selected === 'timestamp' ? `${mode === 'encode' ? '转北京时间' : '转时间戳'}`
    : `${mode === 'encode' ? '编码' : '解码'}文本`;
  runButton.replaceChildren(document.createTextNode(busy ? '处理中…' : label));
  if (!busy) {
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    runButton.append(arrow);
  }
}

function invalidate(message = '输入已更新，点击运行或按 Ctrl / ⌘ + Enter。') {
  requestSerial += 1;
  hasResult = false;
  output.value = '';
  output.placeholder = '计算结果会出现在这里';
  copyButton.disabled = true;
  swapButton.disabled = true;
  $('tool-output-count').textContent = '等待运行';
  setBusy(false);
  setStatus(message);
}

function configure() {
  const isHash = selected === 'sha256';
  tabs.forEach((tab) => {
    const active = tab.dataset.tool === selected;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  $('tool-panel').setAttribute('aria-labelledby', `tab-${selected}`);
  $('mode-controls').hidden = isHash;
  swapButton.hidden = isHash;
  modes.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    if (button.dataset.mode === 'encode') button.textContent = selected === 'json' ? '格式化' : selected === 'timestamp' ? '转为日期' : '编码';
    if (button.dataset.mode === 'decode') button.textContent = selected === 'json' ? '压缩' : selected === 'timestamp' ? '转时间戳' : '解码';
  });
  $('tool-hint').textContent = tools[selected].hint;
  $('output-format').textContent = isHash ? tools[selected].format
    : selected === 'json' ? (mode === 'encode' ? '格式化 JSON' : '紧凑 JSON')
    : selected === 'timestamp' ? (mode === 'encode' ? '北京时间 / ISO' : 'Unix 时间戳')
    : selected === 'base64' && mode === 'encode' ? '标准 Base64'
    : selected === 'url' && mode === 'encode' ? 'URI 参数值'
    : 'UTF-8 文本';
  invalidate('准备就绪，输入文本或试一个例子。');
}

async function run() {
  const serial = ++requestSerial;
  const text = input.value;
  hasResult = false;
  copyButton.disabled = true;
  swapButton.disabled = true;
  output.value = '';
  $('tool-output-count').textContent = '处理中…';
  setBusy(true);
  setStatus('正在本页处理…');
  try {
    if (text.length > 100000) throw new Error('文本过长，请把输入缩短到 100,000 个字元以内。');
    const fn = selected === 'sha256' ? sha256
      : selected === 'base64' ? (mode === 'encode' ? base64Encode : base64Decode)
      : selected === 'url' ? (mode === 'encode' ? urlEncode : urlDecode)
      : selected === 'json' ? (mode === 'encode' ? jsonFormat : jsonMinify)
      : (mode === 'encode' ? timestampToDate : dateToTimestamp);
    const result = await fn(text);
    if (serial !== requestSerial) return;
    output.value = result;
    output.placeholder = result === '' ? '结果为空字符串' : '';
    hasResult = true;
    copyButton.disabled = false;
    swapButton.disabled = false;
    $('tool-output-count').textContent = `${Array.from(result).length.toLocaleString('zh-CN')} 字符 · ${utf8ByteLength(result).toLocaleString('zh-CN')} 字节`;
    const verb = selected === 'sha256' ? '摘要已生成'
      : selected === 'json' ? (mode === 'encode' ? '格式化完成' : '压缩完成')
      : selected === 'timestamp' ? '转换完成'
      : mode === 'encode' ? '编码完成' : '解码完成';
    setStatus(`${verb} · ${result === '' ? '输出为空字符串' : '输入内容未上传'}`, 'success');
  } catch (error) {
    if (serial !== requestSerial) return;
    $('tool-output-count').textContent = '未生成结果';
    output.placeholder = '请根据提示调整输入后重试';
    setStatus(error instanceof Error ? error.message : '处理失败，请检查输入后重试。', 'error');
  } finally {
    if (serial === requestSerial) setBusy(false);
  }
}

function selectTool(tool) {
  selected = tool;
  mode = 'encode';
  configure();
}

function loadExample() {
  const sample = tools[selected].sample;
  input.value = selected === 'json'
    ? (mode === 'decode' ? jsonFormat(sample) : jsonMinify(sample))
    : selected === 'timestamp'
    ? (mode === 'encode' ? '1792873887' : '2026-10-25 03:28:00')
    : mode === 'decode'
    ? (selected === 'base64' ? base64Encode(sample) : urlEncode(sample))
    : sample;
  inputCount();
  run();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTool(tab.dataset.tool));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[next].focus();
    selectTool(tabs[next].dataset.tool);
  });
});
modes.forEach((button) => button.addEventListener('click', () => {
  if (mode === button.dataset.mode) return;
  mode = button.dataset.mode;
  configure();
}));
input.addEventListener('input', () => { inputCount(); invalidate(); });
input.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    run();
  }
});
runButton.addEventListener('click', run);
$('load-example').addEventListener('click', loadExample);
$('clear-input').addEventListener('click', () => {
  input.value = '';
  inputCount();
  invalidate('已清空。空文本也可以运行。');
  input.focus();
});
swapButton.addEventListener('click', () => {
  if (!hasResult || selected === 'sha256') return;
  if (output.value.length > 100000) {
    setStatus('结果超过输入上限，无法整体换入。请复制后分段处理。', 'error');
    return;
  }
  input.value = output.value;
  mode = mode === 'encode' ? 'decode' : 'encode';
  inputCount();
  configure();
  input.focus();
  setStatus('结果已填入输入，并切换处理方向。点击运行即可。');
});
copyButton.addEventListener('click', async () => {
  if (!hasResult) return;
  const serial = requestSerial;
  const value = output.value;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard_unavailable');
    await navigator.clipboard.writeText(value);
    if (serial === requestSerial) setStatus('已复制到剪贴板。', 'success');
  } catch {
    if (serial !== requestSerial) return;
    output.focus();
    output.select();
    setStatus('浏览器未允许自动复制，结果已选中，请按 Ctrl / ⌘ + C。');
  }
});
document.querySelectorAll('.note-example').forEach((button) => button.addEventListener('click', () => {
  selectTool(button.dataset.exampleTool);
  loadExample();
  $('tools').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  tabs.find((tab) => tab.dataset.tool === selected)?.focus({ preventScroll: true });
}));

configure();
inputCount();
run();
