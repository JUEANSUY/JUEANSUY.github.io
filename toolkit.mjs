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

/**
 * 将文本按 UTF-8 编码为小写十六进制字符串（默认以空格分隔每个字节）。
 * 空输入返回空字符串。
 */
export function textToHex(text, separator = " ") {
  requireUnicodeText(text);
  if (text === "") return "";
  const bytes = utf8Bytes(text);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(separator);
}

/**
 * 将十六进制字符串解码为 UTF-8 文本。
 * 允许包含空格、换行或冒号分隔符，也支持连续十六进制；
 * 校验字符合法性与偶数长度，且必须解码为合法的 UTF-8 序列。
 */
export function hexToText(text) {
  requireString(text);
  const cleaned = text.trim().replace(/[\s:-]/g, "");
  if (cleaned === "") return "";
  if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
    throw new TypeError("十六进制字符无效，仅支持 0-9、a-f、A-F 及空格/冒号分隔符。");
  }
  if (cleaned.length % 2 !== 0) {
    throw new TypeError("十六进制字符数量必须为偶数（每个字节占 2 个十六进制字符）。");
  }
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch (error) {
    throw new TypeError("十六进制解码后的内容不是合法的 UTF-8 文本。", { cause: error });
  }
}

function decodeBase64Url(segment) {
  let b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  return base64Decode(b64);
}

/**
 * 纯本地解析 JWT（JSON Web Token）头部与载荷。
 * 格式化输出 Header 与 Payload，分析 exp/nbf/iat 等时间戳，并进行安全提示。
 * 本函数不发送网络请求，不验证加密签名真伪。
 */
export function jwtDecode(token) {
  requireString(token);
  const trimmed = token.trim();
  if (trimmed === "") return "";

  const parts = trimmed.split(".");
  if (parts.length !== 3) {
    throw new TypeError("JWT 格式无效：标准的 JWT 必须由两个点号分隔为 Header、Payload、Signature 三段。");
  }

  let header;
  let payload;
  try {
    header = JSON.parse(decodeBase64Url(parts[0]));
  } catch (err) {
    throw new TypeError("JWT 头部（Header）不是合法的 Base64URL 编码 JSON 对象。", { cause: err });
  }
  try {
    payload = JSON.parse(decodeBase64Url(parts[1]));
  } catch (err) {
    throw new TypeError("JWT 载荷（Payload）不是合法的 Base64URL 编码 JSON 对象。", { cause: err });
  }

  const sections = [];
  sections.push("[JWT Header 头部]");
  sections.push(JSON.stringify(header, null, 2));

  sections.push("\n[JWT Payload 载荷]");
  sections.push(JSON.stringify(payload, null, 2));

  sections.push("\n[时间与有效性分析]");
  const now = Math.floor(Date.now() / 1000);

  if (typeof payload.exp === "number") {
    const expDate = new Date(payload.exp * 1000).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
    const diff = payload.exp - now;
    if (diff < 0) {
      const pastHours = Math.abs(Math.round(diff / 3600));
      sections.push(`• 过期时间 (exp): ${expDate} (UTC+8) -> [已过期约 ${pastHours} 小时]`);
    } else {
      const leftHours = Math.round(diff / 3600);
      sections.push(`• 过期时间 (exp): ${expDate} (UTC+8) -> [尚在有效期内，剩余约 ${leftHours} 小时]`);
    }
  } else {
    sections.push("• 过期时间 (exp): 未声明");
  }

  if (typeof payload.iat === "number") {
    const iatDate = new Date(payload.iat * 1000).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
    sections.push(`• 签发时间 (iat): ${iatDate} (UTC+8)`);
  }

  if (typeof payload.nbf === "number") {
    const nbfDate = new Date(payload.nbf * 1000).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
    sections.push(`• 生效时间 (nbf): ${nbfDate} (UTC+8)`);
  }

  sections.push("\n[安全提示]");
  if (header.alg === "none") {
    sections.push("⚠️ 警告：Header 算法标注为 'none'，可能存在允许未签名伪造的安全隐患！");
  } else {
    sections.push(`• 签名算法: ${header.alg || "未知"}`);
  }
  sections.push("• 签名段: " + (parts[2] ? `${parts[2].slice(0, 16)}...` : "(空)"));
  sections.push("• 说明：本工具仅在浏览器本地解码明文信息，不校验数字签名真伪，亦不上传任何凭据。");

  return sections.join("\n");
}

/**
 * 生成符合 RFC 4122 标准的 UUID v4 随机字符串。
 */
export function generateUuid() {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // 降级回退基于 getRandomValues
  const rnd = new Uint8Array(16);
  crypto.getRandomValues(rnd);
  rnd[6] = (rnd[6] & 0x0f) | 0x40; // version 4
  rnd[8] = (rnd[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(rnd, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * 生成加密安全的随机密钥字符串（支持 hex 16进制、alphanumeric 字母数字、base64url）。
 */
export function generateRandomToken(length = 32, type = "hex") {
  const len = Math.max(4, Math.min(256, Number(length) || 32));
  if (type === "hex") {
    const bytes = new Uint8Array(Math.ceil(len / 2));
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
  }
  if (type === "alphanumeric") {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    let str = "";
    for (let i = 0; i < len; i++) {
      str += chars[bytes[i] % chars.length];
    }
    return str;
  }
  // base64url
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "").slice(0, len);
}




