// Проверка сцен в настоящем браузере: каждая сцена на телефоне и компьютере,
// в разных точках дня и в режиме «уйти пораньше». Скриншоты — в tests/output/.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { start } = require('./server');
const { root, sceneList, sceneFolders } = require('./common');

const OUT = path.join(root, 'tests/output');
const VIEWPORTS = { телефон: { width: 390, height: 780 }, компьютер: { width: 1280, height: 720 } };
const POINTS = [0, 0.4, 37.3, 81.6, 99.9, 100];
const MAX_FRAME_MS = 12;          // средняя стоимость кадра
const summary = [];
let server, base, browser;

test.before(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  server = await start(); base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch();
});
test.after(async () => {
  await browser.close(); server.close();
  fs.writeFileSync(path.join(OUT, 'summary.md'), '| Сцена | Экран | Кадр, мс | Итог |\n|---|---|---|---|\n' + summary.join('\n') + '\n');
});

// Рабочий день вокруг текущего времени, чтобы таймер шёл в любое время суток
async function workday(page) {
  await page.addInitScript(() => {
    const now = new Date(), m = now.getHours() * 60 + now.getMinutes(), hm = x => String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0');
    localStorage.setItem('workTimer', JSON.stringify({ start: hm(Math.max(0, m - 60)), end: hm(Math.min(1439, m + 60)) }));
  });
}

// Открыть сайт и перейти к сцене (сцены не из списка — например, шаблон — подключаем на место первой)
async function open(folder, viewport) {
  const page = await browser.newPage({ viewport });
  await workday(page);
  const outside = [];
  page.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) outside.push(r.url()); });
  const list = sceneList();
  if (!list.includes(folder)) await page.addInitScript(f => { Object.defineProperty(window, 'SCENE_LIST', { set() {}, get: () => [f] }); }, folder);
  await page.goto(base + '?test=1');
  const idx = Math.max(0, list.indexOf(folder));
  await page.waitForFunction(i => window.__wt && __wt.scenes[i] && (__wt.scenes[i].meta || __wt.scenes[i].errors.length), idx, { timeout: 8000 })
    .catch(() => {});
  await page.evaluate(i => __wt.goTo(i), idx);
  return { page, idx, outside };
}
const sceneState = (page, idx) => page.evaluate(i => ({ meta: __wt.scenes[i].meta, errors: __wt.scenes[i].errors }), idx);
const probe = (page, idx) => page.evaluate(i => __wt.scenes[i].probe(), idx);

const folders = [...sceneList(), ...sceneFolders().filter(f => f.startsWith('_'))];
for (const folder of folders) {
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    test(`сцена ${folder} · ${vpName}`, async () => {
      const { page, idx, outside } = await open(folder, viewport);
      let frame = '—';
      try {
        const st = await sceneState(page, idx);
        assert.deepStrictEqual(st.errors, [], 'ошибки при загрузке');
        assert.ok(st.meta, 'сцена не вызвала registerScene за 8 секунд');

        for (const pct of POINTS) {
          await page.evaluate(p => __wt.setPct(p), pct);
          await page.waitForTimeout(350);
          const p = await probe(page, idx);
          assert.ok(p, `${pct}%: сцена не отвечает`);
          assert.ok(p.painted >= 10 || p.text > 0, `${pct}%: сцена ничего не нарисовала`);
          if (pct === 37.3) await page.screenshot({ path: path.join(OUT, `${folder}-${vpName}.png`) });
        }
        // плавная работа во времени
        await page.evaluate(() => __wt.setPct(null));
        await page.waitForTimeout(1500);
        const p = await probe(page, idx); frame = p.frameCost;
        assert.ok(p.frameCost <= MAX_FRAME_MS, `кадр рисуется ${p.frameCost} мс, можно не больше ${MAX_FRAME_MS}`);
        // «уйти пораньше» и обратно
        await page.click('#leave'); await page.waitForTimeout(2000);
        await page.click('#leave'); await page.waitForTimeout(600);

        const end = await sceneState(page, idx);
        assert.deepStrictEqual(end.errors, [], 'ошибки во время работы');
        assert.deepStrictEqual(outside, [], 'сцена ходила в интернет');
        // шапка и футер на месте и работают
        const core = await page.evaluate(() => ({
          cards: document.querySelectorAll('.cards .card').length, timer: document.getElementById('timer').textContent,
          percent: document.getElementById('percent').textContent, panel: !!document.querySelector('.panel #start + * , .panel #end') &&
            !!document.getElementById('leave'), sandbox: [...document.querySelectorAll('.scene iframe')].every(f => f.getAttribute('sandbox') === 'allow-scripts'),
        }));
        assert.strictEqual(core.cards, 2, 'шапка сломана'); assert.match(core.timer, /^\d\d:\d\d:\d\d$/, 'таймер сломан');
        assert.match(core.percent, /^\d+\.\d\d%$/, 'проценты сломаны'); assert.ok(core.panel, 'футер сломан'); assert.ok(core.sandbox, 'сцена не в песочнице');
        summary.push(`| ${folder} | ${vpName} | ${frame} | ✅ |`);
      } catch (e) {
        summary.push(`| ${folder} | ${vpName} | ${frame} | ❌ ${String(e.message).split('\n')[0]} |`);
        await page.screenshot({ path: path.join(OUT, `${folder}-${vpName}-ошибка.png`) }).catch(() => {});
        throw e;
      } finally { await page.close(); }
    });
  }
}

// Песочница действительно не выпускает сцену наружу
test('песочница: нет доступа к сайту и сети', async () => {
  const { page, idx } = await open(sceneList()[0], VIEWPORTS.компьютер);
  try {
    const frame = page.frames().find(f => f.url().includes('core/frame.html'));
    assert.ok(frame, 'нет iframe сцены');
    const res = await frame.evaluate(async () => {
      const r = {};
      try { r.parent = !!window.parent.document.body; } catch { r.parent = 'blocked'; }
      try { localStorage.setItem('x', 1); r.storage = 'open'; } catch { r.storage = 'blocked'; }
      try { await fetch('https://example.com/'); r.fetch = 'open'; } catch { r.fetch = 'blocked'; }
      return r;
    });
    assert.deepStrictEqual(res, { parent: 'blocked', storage: 'blocked', fetch: 'blocked' });
  } finally { await page.close(); }
});

// Сломанная сцена не ломает сайт
test('ядро: битая сцена показывает ошибку, сайт работает', async () => {
  const page = await browser.newPage({ viewport: VIEWPORTS.телефон });
  await workday(page);
  try {
    await page.addInitScript(() => { Object.defineProperty(window, 'SCENE_LIST', { set() {}, get: () => ['no-such-scene', 'shooter'] }); });
    await page.goto(base + '?test=1');
    await page.waitForSelector('.scene-error', { timeout: 5000 });
    const t1 = await page.textContent('#timer'); await page.waitForTimeout(1200);
    assert.notStrictEqual(await page.textContent('#timer'), t1, 'таймер остановился');
    await page.click('#next'); await page.waitForTimeout(800);
    assert.strictEqual(await page.evaluate(() => __wt.active), 1, 'лента не листается');
  } finally { await page.close(); }
});
