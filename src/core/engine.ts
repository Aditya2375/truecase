/**
 * The correction engine.
 *
 * Design rule: when unsure, don't change anything. A correction only
 * happens when there is exactly one plausible canonical casing:
 *
 *  1. The word, typed exactly, is already a keyword -> never touched.
 *  2. The word matches identifiers used elsewhere in the same document
 *     (case-insensitively) with exactly one distinct casing -> that casing.
 *  3. The word matches a language keyword with wrong case -> keyword casing.
 *  4. The word matches one standard-library symbol -> library casing.
 *
 * Anything ambiguous (two casings in play, no evidence) is left alone.
 * The engine never invents casing from a convention or a guess.
 */

import { nonCodeSpans, isNonCode, Span } from './lexer';
import { LangKey, keywordCanonical, libraryCanonical, isKeywordExact, LIBRARY } from './keywords';

export type CorrectionSource = 'document' | 'keyword' | 'library';

export interface Correction {
  start: number;
  end: number;
  typed: string;
  canonical: string;
  source: CorrectionSource;
}

export interface EngineOptions {
  fixKeywords?: boolean;   // default true
  fixLibrary?: boolean;    // default true
  fixDocument?: boolean;   // default true
  extraSymbols?: string[]; // user-supplied canonical names for this language
}

const MIN_WORD_LENGTH = 2;

function wordCharRegex(lang: LangKey): RegExp {
  // $ is an identifier char in Java and JS/TS (jQuery, JS internals).
  return lang === 'java' || lang === 'javascript' || lang === 'typescript'
    ? /[A-Za-z0-9_$]/
    : /[A-Za-z0-9_]/;
}

export function isWordChar(lang: LangKey, ch: string): boolean {
  return wordCharRegex(lang).test(ch);
}

/**
 * The word that ends just before `offset` (where a delimiter was typed).
 * Returns null when there is no word, the word is too short, or it starts
 * with a digit (a numeric literal like 0xff or 1e5 is not an identifier).
 */
export function wordBefore(
  text: string,
  offset: number,
  lang: LangKey,
): { start: number; word: string } | null {
  if (offset <= 0) return null;
  const re = wordCharRegex(lang);
  let j = offset;
  while (j > 0 && re.test(text[j - 1])) j--;
  if (j === offset) return null;
  const word = text.slice(j, offset);
  if (word.length < MIN_WORD_LENGTH) return null;
  const first = word[0];
  if (first >= '0' && first <= '9') return null;
  return { start: j, word };
}

export type IdentifierIndex = Map<string, Map<string, number>>;

/**
 * lowercased identifier -> (exact casing -> occurrence count) over code
 * regions only. Built fresh from the current text whenever the engine
 * needs it; documents are small enough that a regex pass is cheap.
 */
export function buildIdentifierIndex(text: string, spans: Span[], lang: LangKey): IdentifierIndex {
  const index: IdentifierIndex = new Map();
  const re = lang === 'java' || lang === 'javascript' || lang === 'typescript'
    ? /[A-Za-z_$][A-Za-z0-9_$]*/g
    : /[A-Za-z_][A-Za-z0-9_]*/g;

  let cursor = 0;
  const regions: Array<[number, number]> = [];
  for (const sp of spans) {
    if (sp.start > cursor) regions.push([cursor, sp.start]);
    cursor = Math.max(cursor, sp.end);
  }
  if (cursor < text.length) regions.push([cursor, text.length]);

  for (const [a, b] of regions) {
    re.lastIndex = 0;
    const chunk = text.slice(a, b);
    let m: RegExpExecArray | null;
    while ((m = re.exec(chunk)) !== null) {
      const word = m[0];
      const lower = word.toLowerCase();
      let casings = index.get(lower);
      if (!casings) { casings = new Map(); index.set(lower, casings); }
      casings.set(word, (casings.get(word) ?? 0) + 1);
    }
  }
  return index;
}

export function findCorrection(
  text: string,
  start: number,
  end: number,
  lang: LangKey,
  spans: Span[],
  index: IdentifierIndex,
  opts: EngineOptions = {},
): Correction | null {
  const fixKeywords = opts.fixKeywords !== false;
  const fixLibrary = opts.fixLibrary !== false;
  const fixDocument = opts.fixDocument !== false;

  const typed = text.slice(start, end);
  if (typed.length < MIN_WORD_LENGTH) return null;
  if (typed[0] >= '0' && typed[0] <= '9') return null;

  // Never touch anything inside a string or comment.
  if (isNonCode(spans, start)) return null;

  const lower = typed.toLowerCase();

  // Rule 1: already a correctly-cased keyword.
  if (isKeywordExact(lang, typed)) return null;

  // Rule 2: document identifiers, excluding this occurrence.
  if (fixDocument) {
    const casings = index.get(lower);
    if (casings) {
      const counts = new Map(casings);
      const own = counts.get(typed);
      if (own !== undefined) {
        if (own <= 1) counts.delete(typed); else counts.set(typed, own - 1);
      }
      if (counts.size === 1) {
        const canonical = counts.keys().next().value as string;
        if (canonical !== typed) return { start, end, typed, canonical, source: 'document' };
        return null;
      }
      if (counts.size > 1) {
        // Both casings already exist in this file: genuinely ambiguous.
        return null;
      }
      // No other occurrence: fall through to keyword/library rules.
    }
  }

  // Rule 2.5: typed exactly matches a library canonical -> already correct.
  if (fixLibrary && libraryCanonical(lang, lower) === typed) return null;

  // Rule 3: keyword with wrong case (PUBLIC -> public, True -> TRUE).
  if (fixKeywords) {
    const kw = keywordCanonical(lang, lower);
    if (kw !== undefined && kw !== typed) {
      return { start, end, typed, canonical: kw, source: 'keyword' };
    }
  }

  // Rule 4: standard library symbol.
  if (fixLibrary) {
    const lib = libraryCanonical(lang, lower);
    if (lib !== undefined && lib !== typed) {
      return { start, end, typed, canonical: lib, source: 'library' };
    }
    if (opts.extraSymbols) {
      for (const sym of opts.extraSymbols) {
        if (sym.toLowerCase() === lower && sym !== typed) {
          return { start, end, typed, canonical: sym, source: 'library' };
        }
      }
    }
  }

  return null;
}

/**
 * The hot path: a single delimiter character was just inserted at
 * `delimiterOffset` in `docText` (already updated). Decide whether the
 * word that the delimiter just finished should be corrected.
 */
export function fixForDelimiter(
  docText: string,
  delimiterOffset: number,
  lang: LangKey,
  opts: EngineOptions = {},
): Correction | null {
  const found = wordBefore(docText, delimiterOffset, lang);
  if (!found) return null;
  const spans = nonCodeSpans(docText, lang);
  if (isNonCode(spans, found.start)) return null;
  const index = buildIdentifierIndex(docText, spans, lang);
  return findCorrection(docText, found.start, delimiterOffset, lang, spans, index, opts);
}

/**
 * Every correctable word in the document (used by the explicit
 * "fix whole file" command and by tests).
 */
export function findAllCorrections(
  docText: string,
  lang: LangKey,
  opts: EngineOptions = {},
): Correction[] {
  const spans = nonCodeSpans(docText, lang);
  const index = buildIdentifierIndex(docText, spans, lang);
  const out: Correction[] = [];
  const re = lang === 'java' || lang === 'javascript' || lang === 'typescript'
    ? /[A-Za-z_$][A-Za-z0-9_$]*/g
    : /[A-Za-z_][A-Za-z0-9_]*/g;
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(docText)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (isNonCode(spans, start)) continue;
    const c = findCorrection(docText, start, end, lang, spans, index, opts);
    if (c) out.push(c);
  }
  return out;
}

/**
 * Simulate a user typing `keystrokes` into a document, applying the same
 * delimiter-triggered correction the extension applies. Powers the test
 * suite and the demo GIF, so what you see is exactly what ships.
 */
export function simulateTyping(
  initial: string,
  keystrokes: string,
  lang: LangKey,
  opts: EngineOptions = {},
): { text: string; corrections: Array<Correction & { atKeystroke: number }> } {
  let text = initial;
  const corrections: Array<Correction & { atKeystroke: number }> = [];
  for (let k = 0; k < keystrokes.length; k++) {
    const ch = keystrokes[k];
    const insertAt = text.length; // typing always appends
    text = text.slice(0, insertAt) + ch + text.slice(insertAt);
    if (!isWordChar(lang, ch)) {
      const c = fixForDelimiter(text, insertAt, lang, opts);
      if (c) {
        text = text.slice(0, c.start) + c.canonical + text.slice(c.end);
        corrections.push({ ...c, atKeystroke: k });
      }
    }
  }
  return { text, corrections };
}

/** True when `lang` has curated keyword tables (all supported languages do). */
export function hasLibrarySymbols(lang: LangKey): boolean {
  return (LIBRARY[lang] ?? []).length > 0;
}
