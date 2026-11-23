/**
 * TrueCase test suite. Runs in plain node against the compiled core in out/.
 * No VS Code needed: the engine and lexer are pure functions, and the
 * extension wrapper is a thin adapter over them.
 */
'use strict';
const assert = require('assert');
const { nonCodeSpans, isNonCode } = require('../out/core/lexer');
const {
  wordBefore,
  buildIdentifierIndex,
  findCorrection,
  fixForDelimiter,
  findAllCorrections,
  simulateTyping,
} = require('../out/core/engine');
const { KEYWORDS, LIBRARY } = require('../out/core/keywords');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failed++;
    failures.push(`${name}: ${err.message}`);
  }
}

function inSpan(text, lang, needle) {
  const spans = nonCodeSpans(text, lang);
  const idx = text.indexOf(needle);
  assert.notStrictEqual(idx, -1, `needle ${needle} must exist in text`);
  return isNonCode(spans, idx);
}

/* ------------------------------ lexer ------------------------------ */

test('lexer: line comment is non-code', () => {
  const t = 'int x; // system.out here\nint y;';
  assert.ok(inSpan(t, 'java', 'system.out'));
  assert.ok(!isNonCode(nonCodeSpans(t, 'java'), t.indexOf('int x')));
});

test('lexer: block comment spanning lines', () => {
  const t = 'a /* start\nmiddle\nend */ b';
  assert.ok(inSpan(t, 'java', 'middle'));
  assert.ok(!isNonCode(nonCodeSpans(t, 'java'), t.lastIndexOf('b')));
});

test('lexer: string with escaped quote', () => {
  const t = 'String s = "she said \\"hi\\" and http://x"; int z;';
  assert.ok(inSpan(t, 'java', 'http://x'));
  assert.ok(!isNonCode(nonCodeSpans(t, 'java'), t.lastIndexOf('int z')));
});

test('lexer: unterminated string stops at newline', () => {
  const t = 'String s = "oops\nsystem x;';
  assert.ok(!isNonCode(nonCodeSpans(t, 'java'), t.indexOf('system')));
});

test('lexer: java text block', () => {
  const t = 'String html = """\n<html> system </html>\n"""; int q;';
  assert.ok(inSpan(t, 'java', 'system'));
  assert.ok(!isNonCode(nonCodeSpans(t, 'java'), t.lastIndexOf('int q')));
});

test('lexer: cpp raw string', () => {
  const t = 'auto s = R"(system "quoted" )"; int w;';
  assert.ok(inSpan(t, 'cpp', 'system'));
  assert.ok(!isNonCode(nonCodeSpans(t, 'cpp'), t.lastIndexOf('int w')));
});

test('lexer: rust raw string with hashes', () => {
  const t = 'let s = r#"a "b" system"#; let w = 1;';
  assert.ok(inSpan(t, 'rust', 'system'));
  assert.ok(!isNonCode(nonCodeSpans(t, 'rust'), t.lastIndexOf('let w')));
});

test('lexer: rust lifetime is code, char literal is not', () => {
  const t = "fn f<'a>(x: &'a str) { let c = 'z'; }";
  assert.ok(!isNonCode(nonCodeSpans(t, 'rust'), t.indexOf("'a")));
  assert.ok(inSpan(t, 'rust', 'z'));
});

test('lexer: js template literal whole-span incl interpolation', () => {
  const t = 'const s = `hello ${name} system`; const q = 1;';
  assert.ok(inSpan(t, 'javascript', 'system'));
  assert.ok(inSpan(t, 'javascript', 'name'));
  assert.ok(!isNonCode(nonCodeSpans(t, 'javascript'), t.lastIndexOf('const q')));
});

test('lexer: nested template literal', () => {
  const t = 'const s = `a ${`b ${x} c`} d`; const q = 2;';
  assert.ok(!isNonCode(nonCodeSpans(t, 'javascript'), t.lastIndexOf('const q')));
});

test('lexer: python triple quotes and hash comments', () => {
  const t = 's = """\nmulti system\n"""\n# comment valueerror\nx = 1';
  assert.ok(inSpan(t, 'python', 'system'));
  assert.ok(inSpan(t, 'python', 'valueerror'));
  assert.ok(!isNonCode(nonCodeSpans(t, 'python'), t.lastIndexOf('x = 1')));
});

test('lexer: python raw prefix string', () => {
  const t = 'path = r"C:\\new\\folder" + "\\\\"\nx = 2';
  assert.ok(!isNonCode(nonCodeSpans(t, 'python'), t.lastIndexOf('x = 2')));
});

test('lexer: csharp verbatim string', () => {
  const t = 'var s = @"C:\\system\\path"; var q = 1;';
  assert.ok(inSpan(t, 'csharp', 'system'));
  assert.ok(!isNonCode(nonCodeSpans(t, 'csharp'), t.lastIndexOf('var q')));
});

test('lexer: go backtick raw string', () => {
  const t = 's := `raw \\n system`\nx := 1';
  assert.ok(inSpan(t, 'go', 'system'));
  assert.ok(!isNonCode(nonCodeSpans(t, 'go'), t.lastIndexOf('x := 1')));
});

test('lexer: sql dash comment and doubled quote', () => {
  const t = "select 'it''s system' from t -- where x\n";
  assert.ok(inSpan(t, 'sql', 'system'));
  assert.ok(!isNonCode(nonCodeSpans(t, 'sql'), t.indexOf('select')));
  assert.ok(inSpan(t, 'sql', 'where x'));
});

test('lexer: lua long string and long comment', () => {
  const t = 'x = [[ system ]]\n--[[ comment y ]]\nz = 1';
  assert.ok(inSpan(t, 'lua', 'system'));
  assert.ok(inSpan(t, 'lua', 'comment y'));
  assert.ok(!isNonCode(nonCodeSpans(t, 'lua'), t.lastIndexOf('z = 1')));
});

test('lexer: ruby block comment', () => {
  const t = "a = 1\n=begin\nsystem here\n=end\nb = 2";
  assert.ok(inSpan(t, 'ruby', 'system here'));
  assert.ok(!isNonCode(nonCodeSpans(t, 'ruby'), t.lastIndexOf('b = 2')));
});

/* --------------------------- wordBefore ---------------------------- */

test('wordBefore: basic word', () => {
  const r = wordBefore('foo bar(', 7, 'java');
  assert.deepStrictEqual(r, { start: 4, word: 'bar' });
});

test('wordBefore: too short', () => {
  assert.strictEqual(wordBefore('a b(', 3, 'java'), null);
});

test('wordBefore: numeric literal rejected', () => {
  assert.strictEqual(wordBefore('x = 0xff;', 8, 'c'), null);
  assert.strictEqual(wordBefore('x = 1e5;', 7, 'c'), null);
});

/* ------------------------------ engine ----------------------------- */

test('engine: java library class', () => {
  const c = fixForDelimiter('system.', 6, 'java');
  assert.ok(c);
  assert.strictEqual(c.canonical, 'System');
  assert.strictEqual(c.source, 'library');
});

test('engine: java keyword wrong case', () => {
  const c = fixForDelimiter('PUBLIC ', 6, 'java');
  assert.ok(c);
  assert.strictEqual(c.canonical, 'public');
  assert.strictEqual(c.source, 'keyword');
});

test('engine: exact keyword never touched', () => {
  assert.strictEqual(fixForDelimiter('public ', 6, 'java'), null);
});

test('engine: document identifier wins', () => {
  const doc = 'class MyClass {}\nMyClass a = new MyClass();\nmyclass.';
  const c = fixForDelimiter(doc, doc.length - 1, 'java');
  assert.ok(c);
  assert.strictEqual(c.canonical, 'MyClass');
  assert.strictEqual(c.source, 'document');
});

test('engine: ambiguous document casings left alone', () => {
  const doc = 'int Value; int VALUE; value.';
  const c = fixForDelimiter(doc, doc.length - 1, 'java');
  assert.strictEqual(c, null);
});

test('engine: single occurrence alone gives no evidence', () => {
  const doc = 'myvar.';
  assert.strictEqual(fixForDelimiter(doc, doc.length - 1, 'java'), null);
});

test('engine: words in strings untouched', () => {
  const doc = 'String s = "a system b"; system.';
  const spans = nonCodeSpans(doc, 'java');
  const index = buildIdentifierIndex(doc, spans, 'java');
  const start = doc.indexOf('system');
  const c = findCorrection(doc, start, start + 6, 'java', spans, index, {});
  assert.strictEqual(c, null);
  // ...while the real one outside the string is fixed
  const c2 = findCorrection(doc, doc.length - 7, doc.length - 1, 'java', spans, index, {});
  assert.ok(c2);
  assert.strictEqual(c2.canonical, 'System');
});

test('engine: words in comments untouched', () => {
  const doc = '// system should stay\nint x;';
  const c = findAllCorrections(doc, 'java');
  assert.strictEqual(c.length, 0);
});

test('engine: python True keyword', () => {
  const c = fixForDelimiter('flag = true\n', 11, 'python');
  assert.ok(c);
  assert.strictEqual(c.canonical, 'True');
});

test('engine: python lowercase keyword untouched', () => {
  assert.strictEqual(fixForDelimiter('import ', 6, 'python'), null);
});

test('engine: sql uppercase canonical', () => {
  const c = fixForDelimiter('select ', 6, 'sql');
  assert.ok(c);
  assert.strictEqual(c.canonical, 'SELECT');
});

test('engine: typescript string type protected', () => {
  assert.strictEqual(fixForDelimiter('let s: string = ', 15, 'typescript'), null);
});

test('engine: cpp std string untouched', () => {
  assert.strictEqual(fixForDelimiter('std::string s;', 11, 'cpp'), null);
});

test('engine: rust Self vs self', () => {
  const c = fixForDelimiter('impl Foo { fn f(self', 19, 'rust');
  assert.strictEqual(c, null); // 'self' is already correct
  // 'self' and 'Self' are both Rust keywords: SELF is genuinely ambiguous
  // and the zero-wrong-corrections bar means leaving it alone.
  assert.strictEqual(fixForDelimiter('SELF.', 4, 'rust'), null);
});

test('engine: rust library type', () => {
  const c = fixForDelimiter('let v: vec<i32> = ', 10, 'rust');
  assert.ok(c);
  assert.strictEqual(c.canonical, 'Vec');
});

test('engine: json -> JSON in js', () => {
  const c = fixForDelimiter('json.', 4, 'javascript');
  assert.ok(c);
  assert.strictEqual(c.canonical, 'JSON');
});

test('engine: extraSymbols respected', () => {
  const c = fixForDelimiter('myapiclient.', 11, 'java', { extraSymbols: ['MyApiClient'] });
  assert.ok(c);
  assert.strictEqual(c.canonical, 'MyApiClient');
});

test('engine: unknown word untouched', () => {
  assert.strictEqual(fixForDelimiter('qwxyzt.', 6, 'java'), null);
});

test('engine: word starting with digit untouched', () => {
  assert.strictEqual(fixForDelimiter('0xff.', 4, 'c'), null);
});

test('engine: keyword fix can be disabled', () => {
  assert.strictEqual(fixForDelimiter('PUBLIC ', 6, 'java', { fixKeywords: false }), null);
});

test('engine: library fix can be disabled', () => {
  assert.strictEqual(fixForDelimiter('system.', 6, 'java', { fixLibrary: false }), null);
});

test('engine: document fix can be disabled', () => {
  const doc = 'MyClass a; myclass.';
  const c = fixForDelimiter(doc, doc.length - 1, 'java', { fixDocument: false });
  assert.strictEqual(c, null);
});

/* ------------------------- simulateTyping -------------------------- */

test('simulate: full java line', () => {
  const { text } = simulateTyping('', 'public static void main(string[] args) { system.out.println("hi"); }', 'java');
  assert.strictEqual(text, 'public static void main(String[] args) { System.out.println("hi"); }');
});

test('simulate: nothing inside the string changes', () => {
  const { text } = simulateTyping('', 'string s = "system and public";', 'java');
  assert.strictEqual(text, 'String s = "system and public";');
});

test('simulate: python def line', () => {
  const { text } = simulateTyping('', 'def f():\n    return true\n', 'python');
  assert.strictEqual(text, 'def f():\n    return True\n');
});

test('simulate: sql query', () => {
  const { text } = simulateTyping('', 'select name, age from users where age > 18;', 'sql');
  assert.strictEqual(text, 'SELECT name, age FROM users WHERE age > 18;');
});

test('simulate: document identifier learned mid-typing', () => {
  const { text } = simulateTyping('', 'int MyValue = 1;\nint b = myvalue + 1;', 'java');
  assert.strictEqual(text, 'int MyValue = 1;\nint b = MyValue + 1;');
});

/* --------------------------- consistency --------------------------- */

for (const [lang, list] of Object.entries(KEYWORDS)) {
  test(`keywords: ${lang} canonical forms are self-consistent`, () => {
    for (const kw of list) {
      // A correctly typed keyword must never be "corrected" into something else.
      const c = fixForDelimiter(kw + ' ', kw.length, lang);
      assert.strictEqual(c, null, `keyword ${kw} in ${lang} was corrected`);
    }
  });
}

for (const [lang, list] of Object.entries(LIBRARY)) {
  test(`library: ${lang} canonical forms are self-consistent`, () => {
    for (const sym of list) {
      const c = fixForDelimiter(sym + ' ', sym.length, lang);
      assert.strictEqual(c, null, `symbol ${sym} in ${lang} was corrected`);
    }
  });
}

/* ------------------------------ report ----------------------------- */

console.log(`\n${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
