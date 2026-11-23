/**
 * Lightweight lexical scanner.
 *
 * Produces the spans of a document that are NOT code: comments, strings,
 * char literals, template literals. The engine never touches words inside
 * these spans, which is what keeps auto-correction from rewriting prose,
 * URLs or string contents.
 *
 * This is a deliberately conservative scanner, not a full parser. Where a
 * construct is ambiguous (for example a Rust lifetime versus a char
 * literal) it falls back to treating the region as code, which only ever
 * means "no correction", never a wrong one.
 */

export interface Span {
  start: number;
  end: number; // exclusive
}

interface ScanState {
  text: string;
  n: number;
  spans: Span[];
}

function isWordCharAt(text: string, i: number): boolean {
  if (i < 0 || i >= text.length) return false;
  const c = text.charCodeAt(i);
  return (
    (c >= 48 && c <= 57) ||
    (c >= 65 && c <= 90) ||
    (c >= 97 && c <= 122) ||
    c === 95 || // _
    c === 36 // $
  );
}

/** Backslash-escaped string starting at i (text[i] is the quote). Returns end index (exclusive). */
function scanEscapedString(text: string, i: number, n: number, quote: string, multiline: boolean): number {
  let j = i + 1;
  while (j < n) {
    const c = text[j];
    if (c === '\\') { j += 2; continue; }
    if (c === quote) return j + 1;
    if ((c === '\n' || c === '\r') && !multiline) return j;
    j++;
  }
  return j;
}

/** Raw string without escapes (Python r"..."). Returns end index. */
function scanPlainString(text: string, i: number, n: number, quote: string): number {
  let j = i + 1;
  while (j < n) {
    if (text[j] === quote) return j + 1;
    if (text[j] === '\n' || text[j] === '\r') return j;
    j++;
  }
  return j;
}

/** Quote-doubling string (SQL 'it''s', C# @"..."). Returns end index. */
function scanDoublingString(text: string, i: number, n: number, quote: string): number {
  let j = i + 1;
  while (j < n) {
    if (text[j] === quote) {
      if (text[j + 1] === quote) { j += 2; continue; }
      return j + 1;
    }
    j++;
  }
  return j;
}

/**
 * Strict single-quote char literal: one char or one escape sequence
 * between quotes. Returns end index, or -1 when this is not a char
 * literal (for example a Rust lifetime like 'a).
 */
function scanCharLiteral(text: string, i: number, n: number): number {
  let j = i + 1;
  if (j >= n) return -1;
  const c = text[j];
  if (c === '\\') {
    j++;
    if (j >= n) return -1;
    const e = text[j];
    if (e === 'u') {
      // \uXXXX (Java/Kotlin/C#) - accept up to 4 hex digits
      let k = 0;
      while (k < 4 && /[0-9a-fA-F]/.test(text[j + 1 + k] || '')) k++;
      j += 1 + k;
    } else if (e === 'x') {
      let k = 0;
      while (k < 2 && /[0-9a-fA-F]/.test(text[j + 1 + k] || '')) k++;
      j += 1 + Math.max(k, 0);
    } else {
      j += 1;
    }
  } else if (c === '\n' || c === '\r' || c === "'") {
    return -1;
  } else {
    j += 1;
  }
  if (text[j] === "'") return j + 1;
  return -1;
}

/** C++ raw string R"delim( ... )delim". Returns end index, or -1. */
function scanCppRawString(text: string, i: number, n: number): number {
  if (isWordCharAt(text, i - 1)) return -1;
  const m = /^R"([A-Za-z0-9_]{0,16})\(/.exec(text.slice(i, Math.min(i + 22, n)));
  if (!m) return -1;
  const closer = ')' + m[1] + '"';
  const closeIdx = text.indexOf(closer, i + m[0].length);
  return closeIdx === -1 ? n : closeIdx + closer.length;
}

/** Rust raw string r"...", r#"..."#, br#"..."#. Returns end index, or -1. */
function scanRustRawString(text: string, i: number, n: number): number {
  if (isWordCharAt(text, i - 1)) return -1;
  const m = /^(?:b)?r(#*)"/.exec(text.slice(i, Math.min(i + 10, n)));
  if (!m) return -1;
  const closer = '"' + m[1];
  let j = i + m[0].length;
  while (j < n) {
    if (text[j] === '"' && text.startsWith(closer, j)) return j + closer.length;
    j++;
  }
  return n;
}

/**
 * JS/TS template literal. The whole template, including ${} expressions,
 * is treated as non-code (documented limitation: identifiers inside
 * interpolation are neither indexed nor corrected). Returns end index.
 */
function scanTemplateEnd(text: string, i: number, n: number): number {
  let j = i + 1;
  while (j < n) {
    const c = text[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '`') return j + 1;
    if (c === '$' && text[j + 1] === '{') {
      j += 2;
      let depth = 1;
      while (j < n && depth > 0) {
        const e = text[j];
        if (e === '{') { depth++; j++; }
        else if (e === '}') { depth--; j++; }
        else if (e === '"' || e === "'") { j = scanEscapedString(text, j, n, e, false); }
        else if (e === '`') { j = scanTemplateEnd(text, j, n); }
        else if (e === '/' && text[j + 1] === '/') { while (j < n && text[j] !== '\n') j++; }
        else if (e === '/' && text[j + 1] === '*') {
          const c2 = text.indexOf('*/', j + 2);
          j = c2 === -1 ? n : c2 + 2;
        } else { j++; }
      }
      continue;
    }
    j++;
  }
  return n;
}

export interface LexerOptions {
  slashComments?: boolean;   // // and /* */
  hashComments?: boolean;    // #
  dashComments?: boolean;    // -- (SQL, Lua)
  luaLong?: boolean;         // Lua --[[ ]] comments and [[ ]] strings
  rubyBlock?: boolean;       // =begin ... =end
  tripleDouble?: boolean;    // """ text blocks / multiline strings
  tripleSingle?: boolean;    // ''' (Python)
  pyPrefixes?: boolean;      // r/b/f/u string prefixes (Python)
  cppRaw?: boolean;          // R"(...)"
  rustRaw?: boolean;         // r#"..."#
  csVerbatim?: boolean;      // @"...", $"..."
  backtickRaw?: boolean;     // Go `...`
  templates?: boolean;       // JS/TS `...${}...`
  singleQuote: 'string' | 'char' | 'sql';
}

function optionsFor(lang: string): LexerOptions {
  switch (lang) {
    case 'java':
      return { singleQuote: 'char', slashComments: true, tripleDouble: true };
    case 'c':
      return { singleQuote: 'char', slashComments: true };
    case 'cpp':
      return { singleQuote: 'char', slashComments: true, cppRaw: true };
    case 'javascript':
    case 'typescript':
      return { singleQuote: 'string', slashComments: true, templates: true };
    case 'csharp':
      return { singleQuote: 'char', slashComments: true, csVerbatim: true, tripleDouble: true };
    case 'go':
      return { singleQuote: 'char', slashComments: true, backtickRaw: true };
    case 'rust':
      return { singleQuote: 'char', slashComments: true, rustRaw: true };
    case 'kotlin':
      return { singleQuote: 'char', slashComments: true, tripleDouble: true };
    case 'swift':
      return { singleQuote: 'char', slashComments: true, tripleDouble: true };
    case 'php':
      return { singleQuote: 'string', slashComments: true, hashComments: true };
    case 'python':
      return { singleQuote: 'string', hashComments: true, tripleDouble: true, tripleSingle: true, pyPrefixes: true };
    case 'ruby':
      return { singleQuote: 'string', hashComments: true, rubyBlock: true };
    case 'r':
    case 'shellscript':
      return { singleQuote: 'string', hashComments: true };
    case 'sql':
      return { singleQuote: 'sql', slashComments: true, dashComments: true };
    case 'lua':
      return { singleQuote: 'string', dashComments: true, luaLong: true };
    default:
      // Generic fallback: C-style comments + ordinary quoted strings.
      return { singleQuote: 'string', slashComments: true };
  }
}

const PY_PREFIX_CHAR = /[rRbBfFuU]/;

/** If a quote at i is preceded by Python prefix letters (r/b/f/u combos), return the prefix start; else i. */
function extendStartForPyPrefix(text: string, i: number): number {
  let p = i;
  while (p > 0 && PY_PREFIX_CHAR.test(text[p - 1])) p--;
  if (p < i && (p === 0 || !isWordCharAt(text, p - 1))) return p;
  return i;
}

function pyPrefixIsRaw(prefix: string): boolean {
  return /[rR]/.test(prefix);
}

export function nonCodeSpans(text: string, lang: string): Span[] {
  const o = optionsFor(lang);
  const s: ScanState = { text, n: text.length, spans: [] };
  const t = text;
  const to = text.length;
  let i = 0;

  while (i < to) {
    // Line comments
    if (o.slashComments && t[i] === '/' && t[i + 1] === '/') {
      let j = i + 2;
      while (j < to && t[j] !== '\n') j++;
      s.spans.push({ start: i, end: j });
      i = j; continue;
    }
    if (o.hashComments && t[i] === '#') {
      let j = i + 1;
      while (j < to && t[j] !== '\n') j++;
      s.spans.push({ start: i, end: j });
      i = j; continue;
    }
    if (o.dashComments && t[i] === '-' && t[i + 1] === '-') {
      if (o.luaLong && t[i + 2] === '[' && t[i + 3] === '[') {
        const close = t.indexOf(']]', i + 4);
        const end = close === -1 ? to : close + 2;
        s.spans.push({ start: i, end });
        i = end; continue;
      }
      let j = i + 2;
      while (j < to && t[j] !== '\n') j++;
      s.spans.push({ start: i, end: j });
      i = j; continue;
    }

    // Ruby block comments (=begin / =end must start a line)
    if (o.rubyBlock && t.startsWith('=begin', i) && (i === 0 || t[i - 1] === '\n')) {
      const m = /^=end[^\S\n]*$/m.exec(t.slice(i));
      const end = m ? i + m.index + 4 : to;
      s.spans.push({ start: i, end });
      i = end; continue;
    }

    // Block comments
    if (o.slashComments && t[i] === '/' && t[i + 1] === '*') {
      const close = t.indexOf('*/', i + 2);
      const end = close === -1 ? to : close + 2;
      s.spans.push({ start: i, end });
      i = end; continue;
    }

    // Lua long strings
    if (o.luaLong && t[i] === '[' && t[i + 1] === '[') {
      const close = t.indexOf(']]', i + 2);
      const end = close === -1 ? to : close + 2;
      s.spans.push({ start: i, end });
      i = end; continue;
    }

    // Triple-quote strings. Must run before the plain-quote branches.
    if (o.tripleDouble && t.startsWith('"""', i)) {
      const start = o.pyPrefixes ? extendStartForPyPrefix(t, i) : i;
      let j = i + 3;
      while (j < to) {
        if (t[j] === '\\') { j += 2; continue; }
        if (t.startsWith('"""', j)) { j += 3; break; }
        j++;
      }
      s.spans.push({ start, end: Math.min(j, to) });
      i = j; continue;
    }
    if (o.tripleSingle && t.startsWith("'''", i)) {
      const start = o.pyPrefixes ? extendStartForPyPrefix(t, i) : i;
      let j = i + 3;
      while (j < to) {
        if (t[j] === '\\') { j += 2; continue; }
        if (t.startsWith("'''", j)) { j += 3; break; }
        j++;
      }
      s.spans.push({ start, end: Math.min(j, to) });
      i = j; continue;
    }

    // C++ raw strings
    if (o.cppRaw && t[i] === 'R' && t[i + 1] === '"') {
      const end = scanCppRawString(t, i, to);
      if (end !== -1) { s.spans.push({ start: i, end }); i = end; continue; }
    }

    // Rust raw strings
    if (o.rustRaw && (t[i] === 'r' || (t[i] === 'b' && t[i + 1] === 'r'))) {
      const end = scanRustRawString(t, i, to);
      if (end !== -1) { s.spans.push({ start: i, end }); i = end; continue; }
    }

    // C# verbatim / interpolated strings
    if (o.csVerbatim && (t[i] === '@' || t[i] === '$') && !isWordCharAt(t, i - 1)) {
      let k = i;
      let verbatim = false;
      if (t[k] === '$') k++;
      if (t[k] === '@') { k++; verbatim = true; }
      if (k > i && t[k] === '"') {
        const end = verbatim
          ? scanDoublingString(t, k, to, '"')
          : scanEscapedString(t, k, to, '"', false);
        s.spans.push({ start: i, end });
        i = end; continue;
      }
    }

    // JS/TS template literals
    if (o.templates && t[i] === '`') {
      const end = scanTemplateEnd(t, i, to);
      s.spans.push({ start: i, end });
      i = end; continue;
    }

    // Go raw strings
    if (o.backtickRaw && t[i] === '`') {
      const close = t.indexOf('`', i + 1);
      const end = close === -1 ? to : close + 1;
      s.spans.push({ start: i, end });
      i = end; continue;
    }

    // Double-quoted strings
    if (t[i] === '"') {
      let start = i;
      let raw = false;
      if (o.pyPrefixes) {
        const p = extendStartForPyPrefix(t, i);
        if (p < i) { start = p; raw = pyPrefixIsRaw(t.slice(p, i)); }
      }
      const end = raw
        ? scanPlainString(t, i, to, '"')
        : scanEscapedString(t, i, to, '"', false);
      s.spans.push({ start, end });
      i = end; continue;
    }

    // Single quotes: full string, strict char literal, or SQL string
    if (t[i] === "'") {
      if (o.singleQuote === 'sql') {
        const end = scanDoublingString(t, i, to, "'");
        s.spans.push({ start: i, end });
        i = end; continue;
      }
      if (o.singleQuote === 'char') {
        const end = scanCharLiteral(t, i, to);
        if (end !== -1) { s.spans.push({ start: i, end }); i = end; continue; }
        i++; continue; // e.g. a Rust lifetime: treat as code
      }
      let start = i;
      let raw = false;
      if (o.pyPrefixes) {
        const p = extendStartForPyPrefix(t, i);
        if (p < i) { start = p; raw = pyPrefixIsRaw(t.slice(p, i)); }
      }
      const end = raw
        ? scanPlainString(t, i, to, "'")
        : scanEscapedString(t, i, to, "'", false);
      s.spans.push({ start, end });
      i = end; continue;
    }

    i++;
  }

  return s.spans;
}

/** Binary search: is `pos` inside any non-code span? Spans are produced in ascending order. */
export function isNonCode(spans: Span[], pos: number): boolean {
  let lo = 0, hi = spans.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const sp = spans[mid];
    if (pos < sp.start) hi = mid - 1;
    else if (pos >= sp.end) lo = mid + 1;
    else return true;
  }
  return false;
}

/** Exported for tests. */
export const _internals = { optionsFor };
