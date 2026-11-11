// Статические проверки сцен: структура папки, размер, запрещённые конструкции.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const { root, sceneList, sceneFolders } = require('./common');

const MAX_BYTES = 150 * 1024;
const ALLOWED = ['.js', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.json', '.md'];
// Сцене это не нужно: сеть, выход из песочницы, хранилища браузера, выполнение строк как кода
const FORBIDDEN = [
  [/\beval\s*\(/, 'eval()'], [/\bnew\s+Function\b/, 'new Function'], [/\bFunction\s*\(/, 'Function()'],
  [/\b(window\s*\.\s*)?(parent|top|opener|frameElement)\s*\./, 'обращение к parent/top/opener'],
  [/\bfetch\s*\(/, 'fetch()'], [/XMLHttpRequest|WebSocket|EventSource|RTCPeerConnection|navigator\s*\.\s*sendBeacon/, 'сетевые запросы'],
  [/\bimport\s*\(|importScripts|<script/i, 'загрузка чужих скриптов'], [/document\s*\.\s*(cookie|write|domain)/, 'document.cookie/write/domain'],
  [/localStorage|sessionStorage|indexedDB|caches\s*\./, 'хранилища браузера (используйте sceneStore)'],
  [/postMessage/, 'postMessage (используйте registerScene)'], [/setTimeout\s*\(\s*['"`]|setInterval\s*\(\s*['"`]/, 'setTimeout/setInterval со строкой'],
];

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? files(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

test('список сцен совпадает с папками', () => {
  const list = sceneList(), folders = sceneFolders().filter(f => !f.startsWith('_'));
  assert.ok(list.length > 0, 'scenes/list.js пуст');
  assert.deepStrictEqual([...new Set(list)].length, list.length, 'в scenes/list.js есть повторы');
  for (const f of list) assert.ok(folders.includes(f), `сцена «${f}» есть в списке, но нет папки scenes/${f}/`);
  for (const f of folders) assert.ok(list.includes(f), `папка scenes/${f}/ не добавлена в scenes/list.js`);
});

for (const folder of sceneFolders()) {
  test(`сцена ${folder}: структура и код`, () => {
    const dir = path.join(root, 'scenes', folder);
    assert.match(folder, /^_?[a-z0-9][a-z0-9-]{0,29}$/, 'имя папки: латиница в нижнем регистре, цифры и дефис');
    assert.ok(fs.existsSync(path.join(dir, 'scene.js')), 'нет файла scene.js');
    const all = files(dir);
    const size = all.reduce((s, f) => s + fs.statSync(f).size, 0);
    assert.ok(size <= MAX_BYTES, `папка весит ${Math.round(size / 1024)} КБ, можно не больше ${MAX_BYTES / 1024} КБ`);
    for (const f of all) assert.ok(ALLOWED.includes(path.extname(f).toLowerCase()), `недопустимый файл ${path.relative(root, f)}`);
    for (const f of all.filter(f => f.endsWith('.js'))) {
      const code = stripComments(fs.readFileSync(f, 'utf8'));
      for (const [re, what] of FORBIDDEN) {
        const m = code.match(re);
        assert.ok(!m, `${path.relative(root, f)}: нельзя использовать ${what} (найдено «${m && m[0]}»)`);
      }
      assert.doesNotThrow(() => new Function(code), `${path.relative(root, f)}: синтаксическая ошибка`);
    }
    const main = fs.readFileSync(path.join(dir, 'scene.js'), 'utf8');
    assert.strictEqual((main.match(/registerScene\s*\(/g) || []).length, 1, 'scene.js должен один раз вызвать registerScene({...})');
  });
}
