// Проверяет, что PR меняет только одну сцену: папку scenes/<имя>/ и (для новой сцены) одну строку в scenes/list.js.
// Запуск: node tests/check-pr.js origin/main
const { execSync } = require('child_process');
const fs = require('fs');
const base = process.argv[2] || 'origin/main';
const git = cmd => execSync('git ' + cmd, { encoding: 'utf8' }).trim();

const changes = git(`diff --name-status ${base}...HEAD`).split('\n').filter(Boolean).map(l => l.split('\t'));
const problems = [], folders = new Set();
let listChanged = false;

for (const [status, ...paths] of changes) {
  for (const file of paths) {
    if (file === 'scenes/list.js') { listChanged = true; continue; }
    const m = file.match(/^scenes\/([^/]+)\/.+/);
    if (!m) { problems.push(`Нельзя менять ${file}: в PR можно трогать только свою папку scenes/<имя>/`); continue; }
    if (m[1].startsWith('_')) problems.push(`Нельзя менять ${file}: папки с «_» служебные`);
    else if (status.startsWith('D') && !fs.existsSync(`scenes/${m[1]}`)) problems.push(`Нельзя удалять сцену ${m[1]}`);
    else folders.add(m[1]);
  }
}
if (folders.size > 1) problems.push(`PR меняет несколько сцен (${[...folders].join(', ')}): одна сцена — один PR`);

const [folder] = folders;
const isNew = folder && !git(`ls-tree -d ${base} scenes/${folder}`);
if (listChanged) {
  const lines = git(`diff -U0 ${base}...HEAD -- scenes/list.js`).split('\n').filter(l => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
  const removed = lines.filter(l => l.startsWith('-')), added = lines.filter(l => l.startsWith('+'));
  if (removed.length) problems.push('В scenes/list.js можно только добавить строку, удалять и менять нельзя');
  if (added.length !== 1 || !folder || added[0] !== `+  '${folder}',`) problems.push(`В scenes/list.js нужно добавить ровно одну строку:   '${folder || '<имя>'}',`);
} else if (isNew) problems.push(`Новая сцена: допишите '${folder}', в конец scenes/list.js`);

const report = problems.length
  ? '### ❌ PR меняет лишнее\n\n' + problems.map(p => '- ' + p).join('\n') + '\n\nПравила — в CONTRIBUTING.md.\n'
  : `### ✅ PR меняет только сцену «${folder || '—'}»\n`;
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
process.exit(problems.length ? 1 : 0);
