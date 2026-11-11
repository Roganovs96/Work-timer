// Шаблон сцены: свеча, которая сгорает за рабочий день.
// Скопируйте папку в scenes/<имя-латиницей>/ и рисуйте своё. Подробности — в CONTRIBUTING.md.
//
// Что доступно (из core/sdk.js):
//   makeCanvas(), fitCanvas(c), beginFrame(c, g) — холст на всю сцену; ctx — его контекст
//   area.clientWidth / area.clientHeight — размер сцены
//   curPct (0…100), curK (0…N), N = 300 — сколько прошло; leftMs(), livePct() — плавно, для анимации
//   dayLenMs(), fast — длина дня и режим «уйти пораньше» ({ per } или null)
//   isFat(r) — на части r заканчивается час; isHat(r) — каждая 10-я часть
//   rng(seed), lerp, smooth, pickGrid, walker(...) — помощники; html(), css() — свой HTML поверх холста
//   sceneStore.get/set — сохранить маленькую настройку сцены

const cv = makeCanvas();
let g = null;

// Вызывается 10 раз в секунду с номером текущей части; force — изменился размер сцены
function set(k, force) {
  if (force || !g) {
    const W = area.clientWidth, H = area.clientHeight;
    if (!W || !H) return;
    g = { W, H };
    fitCanvas(cv);
  }
}

// Вызывается каждый кадр, пока сцену видно
function frame(now) {
  if (!g) return;
  beginFrame(cv, g);
  const { W, H } = g, left = 1 - livePct() / 100;           // доля дня, которая осталась
  const cw = Math.min(W * 0.18, 70), full = H * 0.7, h = Math.max(4, full * left), x = W / 2, base = H - 20;

  // подсвечник
  ctx.fillStyle = '#6b7280'; ctx.fillRect(x - cw, base, cw * 2, 8);
  // свеча: её высота — сколько осталось
  ctx.fillStyle = '#efe6d2'; ctx.fillRect(x - cw / 2, base - h, cw, h);
  // пламя, пока день не кончился
  if (left > 0) {
    const f = 1 + 0.08 * Math.sin(now / 90) + (fast ? 0.5 : 0);
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.ellipse(x, base - h - 18 * f, 8 * f, 18 * f, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.ellipse(x, base - h - 14 * f, 4 * f, 9 * f, 0, 0, 7); ctx.fill();
  }
  // отметки часов на подсвечнике
  ctx.fillStyle = '#8a90a0'; ctx.font = '12px -apple-system, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(Math.round(left * 100) + '% свечи', x, base - full - 40);
}

registerScene({
  name: 'Свеча',                        // название в ленте, до 24 символов
  author: 'ваш-ник-на-github',
  // подпись в шапке: «<0> <1> 5:24» и «<2> через 1:10»; steps — на сколько частей делится день
  words: ['процент свечи', 'каждые', 'следующий процент', 'следующий'], steps: 100,
  set, frame,
});
