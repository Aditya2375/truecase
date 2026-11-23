// Feeds real keystrokes through the shipped engine and records every
// document state, so the demo GIF shows exactly what the extension does.
'use strict';
const fs = require('fs');
const { fixForDelimiter, isWordChar } = require('../out/core/engine');

const code =
  'public static void main(string[] args) {\n' +
  '    scanner sc = new scanner(system.in);\n' +
  '    string name = sc.nextline();\n' +
  '    system.out.println("hello " + name);\n' +
  '}';

let text = '';
const frames = [{ text, cursor: 0, fix: null }];
for (let k = 0; k < code.length; k++) {
  const ch = code[k];
  const at = text.length;
  text += ch;
  let fix = null;
  if (!isWordChar('java', ch)) {
    const c = fixForDelimiter(text, at, 'java');
    if (c) {
      text = text.slice(0, c.start) + c.canonical + text.slice(c.end);
      fix = { start: c.start, end: c.start + c.canonical.length };
    }
  }
  frames.push({ text, cursor: at + 1, fix });
}
fs.writeFileSync('/tmp/truecase-frames.json', JSON.stringify(frames));
console.log('frames:', frames.length, 'fixes:', frames.filter(f => f.fix).length);
