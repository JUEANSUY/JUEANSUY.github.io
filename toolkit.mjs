/**
 * 仅在调用者所在的浏览器中处理文本；本模块不访问网络或保存输入。
 * Base64 采用带标准填充的 RFC 4648 格式，URL 编码采用 URI 组件规则。
 */

function requireString(value) {
  if (typeof value !== "string") {
    throw new TypeError("请输入文本字符串。");
  }
  return value;
}

function requireUnicodeText(value) {
  const text = requireString(value);
  // TextEncoder 会把孤立的 UTF-16 代理项替换为 U+FFFD；明确拒绝以免改变输入。
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new TypeError("文本含有不完整的 Unicode 字符，请检查后重试。");
      }
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new TypeError("文本含有不完整的 Unicode 字符，请检查后重试。");
    }
  }
  return text;
}

function utf8Bytes(text) {
  return new TextEncoder().encode(requireUnicodeText(text));
}

/** 返回文本原始 UTF-8 字节的 SHA-256，小写十六进制；不会移除空白或换行。 */
export async function sha256(text) {
  const bytes = utf8Bytes(text);
  const subtle = globalThis.crypto?.subtle;
  if (typeof subtle?.digest !== "function") {
    throw new Error("当前环境无法使用 SHA-256，请通过 HTTPS 或 localhost 打开本页，并使用支持 Web Crypto 的浏览器。");
  }
  const digest = await subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** 将文本按 UTF-8 编码后转换为标准 Base64。 */
export function base64Encode(text) {
  const bytes = utf8Bytes(text);
  const chunks = [];
  // 分块，避免较长输入在展开函数参数时超过 JavaScript 调用栈上限。
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)));
  }
  return btoa(chunks.join(""));
}

/**
 * 解码标准 Base64 中的 UTF-8 文本。
 * 拒绝空白、缺失/多余填充、URL-safe 字母及非零填充位；不会自动修复输入。
 */
export function base64Decode(text) {
  requireString(text);
  const standardBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!standardBase64.test(text)) {
    throw new TypeError("请输入合法的标准 Base64；请检查字符、空白和末尾的 = 填充。");
  }
  const binary = atob(text);
  if (btoa(binary) !== text) {
    throw new TypeError("Base64 的填充位无效，请检查输入。");
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  try {
    // ignoreBOM: true 保留原始文本中的 U+FEFF，确保编码和解码往返不丢字符。
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch (error) {
    throw new TypeError("Base64 解码后的内容不是合法的 UTF-8 文本。", { cause: error });
  }
}

/** 对 URI 的一个组件编码，不用于一次性编码整条网址。 */
export function urlEncode(text) {
  return encodeURIComponent(requireUnicodeText(text));
}

/** 解码 URI 组件；+ 保持为 +，不按表单规则转换为空格。 */
export function urlDecode(text) {
  requireUnicodeText(text);
  try {
    return decodeURIComponent(text);
  } catch (error) {
    throw new URIError("URL 组件编码无效，请检查 % 后是否为两个十六进制字符，以及内容是否为合法 UTF-8。", { cause: error });
  }
}

/** 按 UTF-8 计算字节数，保留原始输入中的空白和换行。 */
export function utf8ByteLength(text) {
  return utf8Bytes(text).byteLength;
}

/** 格式化 JSON 文本，带 2 个空格缩进；空输入返回空字符串。 */
export function jsonFormat(text) {
  requireUnicodeText(text);
  if (text.trim() === "") return "";
  try {
    const value = JSON.parse(text);
    return JSON.stringify(value, null, 2);
  } catch (error) {
    throw new SyntaxError(`JSON 格式无效：${error.message}`, { cause: error });
  }
}

/** 压缩 JSON 文本，去除冗余空白；空输入返回空字符串。 */
export function jsonMinify(text) {
  requireUnicodeText(text);
  if (text.trim() === "") return "";
  try {
    const value = JSON.parse(text);
    return JSON.stringify(value);
  } catch (error) {
    throw new SyntaxError(`JSON 格式无效：${error.message}`, { cause: error });
  }
}

/** 将 Unix 时间戳（秒或毫秒）转换为格式化的北京时间与 ISO 时间字符串。 */
export function timestampToDate(text) {
  requireUnicodeText(text);
  const trimmed = text.trim();
  if (trimmed === "") return "";
  let num = Number(trimmed);
  if (!Number.isFinite(num)) {
    throw new TypeError("请输入合法的数字时间戳（秒或毫秒）。");
  }
  // 10 位左右（秒级时间戳，小于 1e11）自动换算为毫秒
  if (Math.abs(num) < 1e11) {
    num = Math.round(num * 1000);
  } else {
    num = Math.round(num);
  }
  const date = new Date(num);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("时间戳超出有效日期范围。");
  }
  const beijingStr = date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
  const isoStr = date.toISOString();
  const seconds = Math.floor(date.getTime() / 1000);
  const millis = date.getTime();
  return `北京时间 (UTC+8): ${beijingStr}\nISO 8601 (UTC): ${isoStr}\n秒级时间戳: ${seconds}\n毫秒时间戳: ${millis}`;
}

/** 将日期时间字符串解析并输出对应的 Unix 秒级与毫秒级时间戳。 */
export function dateToTimestamp(text) {
  requireUnicodeText(text);
  const trimmed = text.trim();
  if (trimmed === "") return "";
  let parseInput = trimmed;
  // 针对形如 2026-10-25 03:28:00 没有时区标记的常见输入，按北京时间 (+08:00) 缺省解析
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{1,2}(?::\d{1,2}(?:\.\d+)?)?)?$/.test(trimmed)) {
    parseInput = trimmed.replace(/\//g, "-").replace(/\s+/, "T");
    if (!parseInput.includes("T")) parseInput += "T00:00:00";
    else if (parseInput.split("T")[1].split(":").length === 2) parseInput += ":00";
    parseInput += "+08:00";
  }
  const date = new Date(parseInput);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("无法解析输入的日期时间格式，请参考格式：YYYY-MM-DD HH:mm:ss 或 ISO 8601。");
  }
  const seconds = Math.floor(date.getTime() / 1000);
  const millis = date.getTime();
  const beijingStr = date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
  const isoStr = date.toISOString();
  return `毫秒时间戳: ${millis}\n秒级时间戳: ${seconds}\n标准北京时间: ${beijingStr}\n标准 ISO 时间: ${isoStr}`;
}


