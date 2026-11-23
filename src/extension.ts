import * as vscode from 'vscode';
import { fixForDelimiter, findAllCorrections, isWordChar, EngineOptions } from './core/engine';
import { LangKey } from './core/keywords';

const LANGUAGE_MAP: Record<string, LangKey> = {
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  javascript: 'javascript',
  typescript: 'typescript',
  javascriptreact: 'javascript',
  typescriptreact: 'typescript',
  python: 'python',
  csharp: 'csharp',
  go: 'go',
  rust: 'rust',
  kotlin: 'kotlin',
  swift: 'swift',
  php: 'php',
  ruby: 'ruby',
  sql: 'sql',
  lua: 'lua',
  r: 'r',
  shellscript: 'shellscript',
};

interface TrackedFix {
  start: number;
  end: number;
  typed: string;
  canonical: string;
  version: number;
}

interface DocState {
  fixes: TrackedFix[];
  /** Exact typed forms the user reverted; never auto-fix these again in this document. */
  suppressed: Set<string>;
}

const docStates = new Map<string, DocState>();
let applyingEdit = false;
let statusBar: vscode.StatusBarItem;
let output: vscode.OutputChannel;

function stateFor(uri: string): DocState {
  let st = docStates.get(uri);
  if (!st) { st = { fixes: [], suppressed: new Set() }; docStates.set(uri, st); }
  return st;
}

function config() {
  return vscode.workspace.getConfiguration('truecase');
}

function isEnabled(): boolean {
  return config().get<boolean>('enabled', true);
}

function langFor(doc: vscode.TextDocument): LangKey | null {
  const mapped = LANGUAGE_MAP[doc.languageId];
  if (!mapped) return null;
  const langs = config().get<string[]>('languages', Object.keys(LANGUAGE_MAP));
  if (!langs.includes(doc.languageId)) return null;
  return mapped;
}

function engineOptions(lang: LangKey): EngineOptions {
  const cfg = config();
  const extra = cfg.get<Record<string, string[]>>('extraSymbols', {});
  return {
    fixKeywords: cfg.get<boolean>('fixKeywords', true),
    fixLibrary: cfg.get<boolean>('fixLibrary', true),
    fixDocument: cfg.get<boolean>('fixDocumentIdentifiers', true),
    extraSymbols: extra[lang] ?? [],
  };
}

function updateStatusBar() {
  if (!statusBar) return;
  const on = isEnabled();
  statusBar.text = on ? '$(case-sensitive) TrueCase' : '$(case-sensitive) TrueCase: off';
  statusBar.tooltip = on
    ? 'TrueCase is correcting casing as you type. Click to turn off.'
    : 'TrueCase is off. Click to turn on.';
  statusBar.backgroundColor = undefined;
  statusBar.show();
}

async function toggle(): Promise<void> {
  const next = !isEnabled();
  await config().update('enabled', next, vscode.ConfigurationTarget.Global);
  updateStatusBar();
}

function onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent): void {
  if (applyingEdit) return;
  const doc = event.document;
  if (doc.uri.scheme !== 'file' && doc.uri.scheme !== 'untitled') return;
  if (!isEnabled()) return;
  const lang = langFor(doc);
  if (!lang) return;

  const maxKB = config().get<number>('maxFileSizeKB', 512);
  if (doc.getText().length > maxKB * 1024) return;

  const st = stateFor(doc.uri.toString());

  // Suppression: a change that exactly reverts one of our fixes means the
  // user wants that casing. Respect it for the rest of the session.
  for (const change of event.contentChanges) {
    for (let i = st.fixes.length - 1; i >= 0; i--) {
      const f = st.fixes[i];
      if (
        change.rangeOffset === f.start &&
        change.rangeLength === f.end - f.start &&
        change.text === f.typed
      ) {
        st.suppressed.add(f.typed);
        st.fixes.splice(i, 1);
      }
    }
  }
  // Expire old tracking entries.
  const cutoff = doc.version - 40;
  st.fixes = st.fixes.filter((f) => f.version >= cutoff);

  // Only react to a single, small, pure insertion ending a word.
  if (event.contentChanges.length !== 1) return;
  const change = event.contentChanges[0];
  if (change.rangeLength !== 0) return;
  const inserted = change.text;
  const isDelimiter =
    inserted === '\n' || inserted === '\r\n' ||
    (inserted.length === 1 && !isWordChar(lang, inserted));
  if (!isDelimiter) return;

  const editor = vscode.window.visibleTextEditors.find((e) => e.document === doc);
  if (!editor) return;

  const text = doc.getText();
  const correction = fixForDelimiter(text, change.rangeOffset, lang, engineOptions(lang));
  if (!correction) return;
  if (st.suppressed.has(correction.typed)) return;

  const versionAtEvent = doc.version;
  const range = new vscode.Range(doc.positionAt(correction.start), doc.positionAt(correction.end));

  // The edit applies asynchronously. If the user has typed more since this
  // event, the stored range may no longer hold the word we checked; skip
  // rather than touch the wrong text.
  if (doc.version !== versionAtEvent || doc.getText(range) !== correction.typed) return;

  applyingEdit = true;
  editor
    .edit(
      (builder) => builder.replace(range, correction.canonical),
      // Isolated undo unit: one Ctrl+Z undoes exactly this fix, nothing else.
      { undoStopBefore: true, undoStopAfter: true },
    )
    .then(
      (applied) => {
        applyingEdit = false;
        if (applied) {
          st.fixes.push({
            start: correction.start,
            end: correction.end,
            typed: correction.typed,
            canonical: correction.canonical,
            version: doc.version,
          });
        }
      },
      () => { applyingEdit = false; },
    );
}

async function fixDocument(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const doc = editor.document;
  const lang = langFor(doc);
  if (!lang) {
    vscode.window.showInformationMessage(`TrueCase does not support "${doc.languageId}" files.`);
    return;
  }
  const text = doc.getText();
  const corrections = findAllCorrections(text, lang, engineOptions(lang));
  if (corrections.length === 0) {
    vscode.window.showInformationMessage('TrueCase: nothing to fix in this file.');
    return;
  }
  applyingEdit = true;
  try {
    await editor.edit(
      (builder) => {
        for (const c of corrections) {
          builder.replace(
            new vscode.Range(doc.positionAt(c.start), doc.positionAt(c.end)),
            c.canonical,
          );
        }
      },
      { undoStopBefore: true, undoStopAfter: true },
    );
    vscode.window.showInformationMessage(`TrueCase: fixed ${corrections.length} word${corrections.length === 1 ? '' : 's'}.`);
  } finally {
    applyingEdit = false;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  output = vscode.window.createOutputChannel('TrueCase');
  context.subscriptions.push(output);

  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'truecase.toggle';
  context.subscriptions.push(statusBar);
  updateStatusBar();

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument),
    vscode.commands.registerCommand('truecase.toggle', toggle),
    vscode.commands.registerCommand('truecase.fixDocument', fixDocument),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('truecase')) updateStatusBar();
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      docStates.delete(doc.uri.toString());
    }),
  );
}

export function deactivate(): void {
  docStates.clear();
}
