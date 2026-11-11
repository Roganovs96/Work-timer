// Жизнь Батрака: день = 100 лет, каждый процент — год со своей подписью.
// После 95 — могила, по кругу сменяются времена года.
const lifeCvs = makeCanvas();
css(`
  .bio { position: absolute; top: 10px; left: 12px; right: 12px; text-align: center; pointer-events: none; }
  .bio-age { font-size: 24px; font-weight: 700; }
  .bio-text { color: #8a90a0; font-size: 16px; margin-top: 4px; line-height: 1.35; }
  .bio.pop { animation: pop .5s ease-out; }
  @keyframes pop { from { opacity: 0; translate: 0 6px; } to { opacity: 1; translate: 0 0; } }
  @media (max-width: 700px) { .bio-age { font-size: 20px; } .bio-text { font-size: 14px; } }
`);
html('<div class="bio" id="bio"><div class="bio-age" id="bioAge"></div><div class="bio-text" id="bioText"></div></div>');
const life = { geo: null, shown: '' };
const BIO = [
  'Батрак родился. 3,5 кг, орёт', 'Батрак научился ходить', 'Батрак сказал первое слово: «дай»', 'Батрак пошёл в детский сад',
  'Батрак съел кашу без уговоров. Один раз', 'Батрак научился кататься на велосипеде', 'Батрак потерял первый молочный зуб',
  'Батрак пошёл в первый класс', 'Батрак получил первую двойку', 'Батрак разбил соседское окно мячом', 'Батрак пошёл в 5 класс',
  'Батрак впервые подоил корову', 'Батрак выучил таблицу умножения на 7', 'Батрак влюбился в соседку по парте', 'Батрак получил паспорт',
  'У Батрака пробились первые усы', 'Батрак летом подрабатывает на ферме', 'Батрак окончил школу', 'Батрака забрали в армию',
  'Батрак чистит картошку в армии', 'Батрак вернулся из армии героем', 'Батрак устроился батраком на ферму',
  'Батрак получил первую зарплату — мешок картошки', 'Батрак купил мопед', 'Батрак встретил её на сельской дискотеке',
  'Батрак женился', 'Батрак построил дом', 'У Батрака родился сын', 'Батрак не спит по ночам', 'У Батрака родилась дочь',
  'Батраку 30. Кризис среднего возраста пришёл пораньше', 'Батрака повысили до старшего батрака', 'Батрак построил баню',
  'Батрак посадил дерево', 'Сын Батрака пошёл в первый класс', 'Батрак завёл корову Зорьку', 'Батрак выиграл конкурс по колке дров',
  'Батрак купил подержанные «Жигули»', 'Батрак впервые съездил на море', 'Батрак отрастил пузо', 'Батраку 40. Не отмечает — плохая примета',
  'Батрак опять чинит «Жигули»', 'Батрак научился пользоваться смартфоном', 'Батрак поругался с соседом из-за забора',
  'Батрак помирился с соседом', 'Батрак — ягодка опять', 'Сын Батрака окончил школу', 'Сын Батрака уехал в город',
  'Дочь Батрака вышла замуж', 'Батрак купил трактор (в кредит)', 'Батраку 50. Юбилей на всю деревню', 'У Батрака родился внук',
  'Батрак нашёл первую седину', 'Батрак купил очки для чтения', 'Батрак стал бригадиром батраков', 'Батрак вырастил рекордную тыкву',
  'Батрак начал смотреть новости', 'Батрак ругает молодёжь', 'Батрак выплатил кредит за трактор', 'У Батрака заболела спина',
  'Батраку 60. На пенсию рано, сказали', 'Батрак всё ещё батрачит', 'Батрак научил внука рыбачить', 'Батрак завёл пчёл',
  'Батрак лечит спину мазью', 'Батрак вышел на пенсию', 'Батрак сидит на лавочке', 'Батрак разгадывает кроссворды',
  'Батрак выращивает помидоры', 'Батрак съездил в санаторий', 'Батраку 70. Вся семья в сборе', 'Батрак ходит в поликлинику как на работу',
  'Батрак рассказывает, как было раньше', 'У Батрака родился правнук', 'Батрак помнит всё, кроме того, куда положил очки',
  'Батрак купил трость', 'Батрак кормит голубей', 'Батрак смотрит сериалы', 'Батрак переслушал все песни молодости',
  'Батрак пережил соседа', 'Батраку 80. Свечки на торте задул с третьего раза', 'Батрак гуляет до магазина и обратно',
  'Батрак путает имена внуков', 'Батрак диктует мемуары', 'Батрак всё ещё колет дрова — одно полено в день', 'Батрак спит после обеда',
  'Батрак ворчит на погоду', 'Батрак рассказывает анекдоты из 70-х', 'Батрак отдал трактор внуку', 'Батрак сидит у окна',
  'Батраку 90! Поздравление от главы района', 'Батрак ходит медленно, но с достоинством', 'Батрак всех простил',
  'Батрак смотрит на закат', 'Батрак говорит: «Хорошо пожил»', 'Батрак умер. Покойся с миром',
];
const SEASONS = ['Осень. На могилу Батрака падают листья', 'Зима. Могилу Батрака замело снегом',
                 'Весна. На могиле Батрака проросли цветы', 'Лето. Над могилой Батрака идёт тёплый дождь'];
const yearsWord = n => n % 10 === 1 && n % 100 !== 11 ? 'год' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'года' : 'лет';

function updateBio() {
  const a = Math.max(0, Math.min(100, curPct)), y = Math.floor(a);
  let age, text;
  if (a >= 100) { age = 'Конец'; text = 'Рабочий день окончен. Батрак отмучился'; }
  else if (y >= 96) { age = 'Покойся с миром'; text = SEASONS[Math.floor((a - 95) * 4) % 4]; }
  else { age = y === 0 ? 'Новорождённый' : y === 95 ? '95 лет' : 'Батраку ' + y + ' ' + yearsWord(y); text = BIO[y]; }
  if (age + text === life.shown) return;
  life.shown = age + text;
  $('bioAge').textContent = age; $('bioText').textContent = text;
  const el = $('bio'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

function lifeGeometry() {
  const W = area.clientWidth, H = area.clientHeight;
  if (!W || !H) return null;
  const S = Math.min(H * 0.3, W * 0.26), gy = H - 42;
  const hw = Math.min(S * 1.1, W * 0.24), hx = Math.max(10, W * 0.06);
  return { W, H, S, gy, hw, hx, tx: hx + hw + S * 0.45, cx: W * 0.6, hay: W - Math.max(S * 0.55, W * 0.08) };
}
function lifeSet(k, force) {
  if (force || !life.geo) { life.geo = lifeGeometry(); if (life.geo) fitCanvas(lifeCvs); }
}

function drawHouse(g) {
  const { hx, hw, gy } = g, hh = hw * 0.7;
  ctx.fillStyle = '#5a3a22'; ctx.fillRect(hx, gy - hh, hw, hh);
  ctx.fillStyle = '#8a3b2e'; ctx.beginPath(); ctx.moveTo(hx - hw * 0.1, gy - hh); ctx.lineTo(hx + hw / 2, gy - hh - hw * 0.45); ctx.lineTo(hx + hw * 1.1, gy - hh); ctx.fill();
  ctx.fillStyle = '#ffd36b'; ctx.fillRect(hx + hw * 0.58, gy - hh * 0.75, hw * 0.25, hw * 0.22);
  ctx.fillStyle = '#3a2516'; ctx.fillRect(hx + hw * 0.15, gy - hh * 0.62, hw * 0.24, hh * 0.62);
}

// season: -1 обычное лето при жизни, 0 осень, 1 зима, 2 весна, 3 лето; sp — доля сезона
function drawTree(g, a, season, sp, now) {
  const { tx, gy, S } = g, h = S * (0.35 + 1.25 * Math.min(1, (a - 33) / 30));
  ctx.strokeStyle = '#6e4526'; ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, h * 0.07); ctx.beginPath(); ctx.moveTo(tx, gy); ctx.lineTo(tx, gy - h * 0.55); ctx.stroke();
  ctx.lineWidth = Math.max(1.5, h * 0.03); ctx.beginPath();
  for (const [dx, dy] of [[-0.25, -0.85], [0.22, -0.8], [0, -0.95], [-0.15, -0.65], [0.18, -0.62]]) { ctx.moveTo(tx, gy - h * 0.5); ctx.lineTo(tx + dx * h, gy + dy * h); }
  ctx.stroke();
  const crown = (col, alpha) => {
    ctx.globalAlpha = alpha; ctx.fillStyle = col;
    for (const [dx, dy, r] of [[0, -0.75, 0.3], [-0.2, -0.65, 0.22], [0.2, -0.66, 0.22], [0, -0.92, 0.2]]) { ctx.beginPath(); ctx.arc(tx + dx * h, gy + dy * h, r * h, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  };
  if (season === 0) crown('#d9822b', 1 - sp * 0.85);
  else if (season === 1) { ctx.fillStyle = '#e8eaf0'; for (const dx of [-0.2, 0, 0.18]) ctx.fillRect(tx + dx * h - h * 0.06, gy - h * 0.82 - (dx ? 0 : h * 0.1), h * 0.12, Math.max(2, h * 0.025)); }
  else if (season === 2) { crown('#7fcf6a', Math.min(1, sp * 1.5)); ctx.fillStyle = '#ffb3c7'; const r = rng(5); for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(tx + (r() - 0.5) * h * 0.6, gy - h * (0.55 + r() * 0.45), Math.max(1.5, h * 0.03), 0, 7); ctx.fill(); } }
  else crown('#3f8f4a', 1);
}

function lifeFrame(now) {
  const g = life.geo; if (!g) return;
  beginFrame(lifeCvs, g);
  const a = Math.max(0, Math.min(100, curPct)), y = Math.floor(a), dead = a >= 95;
  const { W, H, S, gy, cx } = g;
  const season = dead ? Math.floor((a - 95) * 4) % 4 : -1, sp = dead ? ((a - 95) * 4) % 1 : 0;

  // земля (зимой белеет)
  ctx.fillStyle = season === 1 ? `rgba(232, 234, 240, ${0.3 + sp * 0.5})` : '#24402a';
  ctx.fillRect(0, gy, W, 5);

  if (y >= 26) drawHouse(g);
  if (y >= 33) drawTree(g, a, season, sp, now);
  if (!dead && y >= 16 && y < 65) {   // стог сена
    ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.ellipse(g.hay, gy, S * 0.45, S * 0.42, 0, Math.PI, 0); ctx.fill();
  }

  if (!dead) {
    // семья у дома
    const fam = (age, col, x) => { const s = S * (0.3 + 0.62 * Math.min(1, age / 18)); walker(x, gy, s, { dir: 1, color: col, head: age > 65 ? '#d8dbe2' : col, bend: age > 70 ? 0.15 : 0 }); };
    if (y >= 25) fam(y - 2, '#ff8fb1', g.hx + g.hw * 0.75);
    if (y >= 27 && y < 47) fam(y - 27, '#7fd1a0', g.hx + g.hw * 0.75 + S * 0.32);
    if (y >= 29 && y < 48) fam(y - 29, '#c9a2ff', g.hx + g.hw * 0.75 + S * 0.55);
    drawBatrak(g, a, y, now);
  } else drawGrave(g, season, sp, now);

  // осадки после смерти
  if (dead && a < 100) {
    const r = rng(season + 20), n = season === 3 ? 60 : 40;
    for (let i = 0; i < n; i++) {
      const x0 = r() * W, v = 0.4 + r() * 0.6, off = r() * gy;
      const yy = (now / 1000 * v * (season === 3 ? 260 : season === 1 ? 45 : 60) + off) % gy;
      const x = x0 + Math.sin(now / 900 + i) * (season === 0 ? 18 : season === 1 ? 8 : 0);
      if (season === 0) { ctx.save(); ctx.translate(x, yy); ctx.rotate(now / 500 + i); ctx.fillStyle = ['#d9822b', '#e0b13c', '#b5532e'][i % 3]; ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.5, 0, 0, 7); ctx.fill(); ctx.restore(); }
      else if (season === 1) { ctx.fillStyle = '#e8eaf0'; ctx.beginPath(); ctx.arc(x, yy, 1.5 + (i % 3) * 0.6, 0, 7); ctx.fill(); }
      else if (season === 3) { ctx.strokeStyle = 'rgba(143, 192, 255, 0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x - 2, yy + 9); ctx.stroke(); }
      else if (i < 12) { ctx.fillStyle = '#ffb3c7'; ctx.beginPath(); ctx.arc(x + Math.sin(now / 400 + i) * 20, yy, 2, 0, 7); ctx.fill(); }
    }
  }

  // шкала жизни 0–100
  const x0 = 16, x1 = W - 16, ly = H - 20, X = v => lerp(x0, x1, v / 100);
  ctx.lineCap = 'round'; ctx.lineWidth = 4;
  ctx.strokeStyle = '#262a34'; ctx.beginPath(); ctx.moveTo(x0, ly); ctx.lineTo(x1, ly); ctx.stroke();
  ctx.strokeStyle = '#4f9cff'; ctx.beginPath(); ctx.moveTo(x0, ly); ctx.lineTo(X(Math.min(a, 95)), ly); ctx.stroke();
  if (a > 95) { ctx.strokeStyle = '#6b6f7a'; ctx.beginPath(); ctx.moveTo(X(95), ly); ctx.lineTo(X(a), ly); ctx.stroke(); }
  ctx.fillStyle = '#8a90a0'; ctx.font = '10px -apple-system, sans-serif'; ctx.textAlign = 'center';
  for (let v = 0; v <= 100; v += W < 500 ? 20 : 10) ctx.fillText(v, X(v), ly + 14);
  ctx.fillText('†', X(95), ly - 7);
  ctx.fillStyle = dead ? '#8a90a0' : '#e8eaf0'; ctx.beginPath(); ctx.arc(X(a), ly, 5, 0, 7); ctx.fill();
}

function drawBatrak(g, a, y, now) {
  const { S, gy, cx } = g, s = S * (0.3 + 0.7 * Math.min(1, a / 18)), t = now / 1000;
  if (y < 1) {   // младенец в люльке
    const rock = Math.sin(t * 2) * 0.12;
    ctx.save(); ctx.translate(cx, gy - S * 0.12); ctx.rotate(rock);
    ctx.strokeStyle = '#9a6a42'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -S * 0.05, S * 0.3, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.fillStyle = '#e8eaf0'; ctx.beginPath(); ctx.ellipse(0, S * 0.08, S * 0.2, S * 0.08, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4f9cff'; ctx.beginPath(); ctx.arc(S * 0.2, S * 0.04, S * 0.07, 0, 7); ctx.fill();
    ctx.restore(); return;
  }
  const col = y >= 18 && y <= 20 ? '#6f9a5a' : '#4f9cff', head = y >= 52 ? (y >= 65 ? '#e8eaf0' : '#a9b6cc') : col;
  const bend = y >= 65 ? 0.1 + Math.min(1, (y - 65) / 30) * 0.3 : 0;
  if (y >= 21 && y < 65) {   // батрачит: вилами кидает сено
    const p = (t / 2.2) % 1, th = 0.5 - 1.7 * (0.5 - 0.5 * Math.cos(2 * Math.PI * p)), x = g.hay - S * 0.95;
    let F = null;
    const hd = walker(x, gy, s, { dir: 1, color: col, head, bend: 0.1 + 0.15 * Math.max(0, Math.cos(2 * Math.PI * p)),
      hands: sh => { F = sh; return [[sh[0] + Math.cos(th) * s * 0.26, sh[1] + Math.sin(th) * s * 0.26], [sh[0] + Math.cos(th) * s * 0.06, sh[1] + Math.sin(th) * s * 0.06 + s * 0.1]]; } });
    const b = hd[1], c = Math.cos(th), si = Math.sin(th), tip = [b[0] + c * s * 0.85, b[1] + si * s * 0.85];
    ctx.strokeStyle = '#9a6a42'; ctx.lineWidth = Math.max(2, s * 0.03); ctx.beginPath(); ctx.moveTo(b[0] - c * s * 0.2, b[1] - si * s * 0.2); ctx.lineTo(...tip); ctx.stroke();
    ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = Math.max(1.2, s * 0.018); ctx.beginPath();
    for (const o of [-1, 0, 1]) { const px = tip[0] - si * o * s * 0.05, py = tip[1] + c * o * s * 0.05; ctx.moveTo(px, py); ctx.lineTo(px + c * s * 0.12, py + si * s * 0.12); }
    ctx.stroke();
    if (th < 0.1) { ctx.fillStyle = '#e0c060'; ctx.beginPath(); ctx.ellipse(tip[0] + c * s * 0.06, tip[1] + si * s * 0.06 - s * 0.04, s * 0.12, s * 0.06, th, 0, 7); ctx.fill(); }
    if (y >= 39 && y < 65) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x + s * 0.06, gy - s * 0.55, s * 0.08, s * 0.1, 0, 0, 7); ctx.fill(); }
    return;
  }
  // гуляет туда-обратно: малыш и старик медленно
  const v = S * (y < 3 ? 0.25 : y < 65 ? 0.7 : y < 85 ? 0.3 : 0.18), span = S * 1.6, xa = cx - span / 2;
  const d = (t * v) % (2 * span), fwd = d < span, x = fwd ? xa + d : xa + 2 * span - d, dir = fwd ? 1 : -1;
  const cane = y >= 75;
  if (y >= 7 && y <= 17) { ctx.fillStyle = '#e05252'; ctx.beginPath(); ctx.roundRect(x - dir * s * 0.17, gy - s * 0.7, s * 0.12 * dir, s * 0.2, 2); ctx.fill(); }
  const hd = walker(x, gy, s, { dir, color: col, head, bend, walk: t * v / (s * 0.18),
    hands: cane ? sh => [[sh[0] + s * 0.22, sh[1] + s * 0.24], [sh[0] + s * 0.02, sh[1] + s * 0.28]] : undefined });
  if (cane) { ctx.strokeStyle = '#9a6a42'; ctx.lineWidth = Math.max(2, s * 0.03); ctx.beginPath(); ctx.moveTo(...hd[0]); ctx.lineTo(hd[0][0] + dir * s * 0.03, gy); ctx.stroke(); }
  if (y >= 18 && y <= 20) { ctx.fillStyle = '#4d6b3f'; ctx.beginPath(); ctx.arc(hd.head[0], hd.head[1] - s * 0.02, s * 0.13, Math.PI, 0); ctx.fill(); }
}

function drawGrave(g, season, sp, now) {
  const { S, gy, cx } = g, w = S * 0.5, h = S * 0.62;
  ctx.fillStyle = '#4a3a2c'; ctx.beginPath(); ctx.ellipse(cx + S * 0.35, gy, S * 0.45, S * 0.12, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#6b7280'; ctx.beginPath(); ctx.roundRect(cx - w / 2, gy - h, w, h, [w / 2, w / 2, 2, 2]); ctx.fill();
  ctx.fillStyle = '#e8eaf0'; ctx.textAlign = 'center';
  ctx.font = `600 ${Math.max(9, S * 0.085)}px -apple-system, sans-serif`; ctx.fillText('БАТРАК', cx, gy - h * 0.55);
  ctx.font = `${Math.max(8, S * 0.075)}px -apple-system, sans-serif`; ctx.fillText('0 – 95', cx, gy - h * 0.32);
  if (season === 0) {   // листья копятся на холмике
    const r = rng(9); for (let i = 0; i < 4 + sp * 18; i++) { ctx.fillStyle = ['#d9822b', '#e0b13c', '#b5532e'][i % 3]; ctx.beginPath(); ctx.ellipse(cx + S * 0.35 + (r() - 0.5) * S * 0.8, gy - r() * S * 0.08, 4, 2, r() * 3, 0, 7); ctx.fill(); }
  }
  if (season === 1) {   // сугроб растёт
    ctx.fillStyle = '#e8eaf0';
    ctx.beginPath(); ctx.ellipse(cx + S * 0.35, gy, S * 0.5, S * (0.04 + sp * 0.12), 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, gy - h, w * 0.45, S * (0.02 + sp * 0.05), 0, Math.PI, 0); ctx.fill();
  }
  if (season === 2) {   // цветы прорастают
    const r = rng(4);
    for (let i = 0; i < 7; i++) {
      const fx = cx + S * 0.35 + (r() - 0.5) * S * 0.75, fh = S * 0.18 * Math.min(1, sp * 2 - i * 0.12); if (fh <= 0) continue;
      ctx.strokeStyle = '#4f9a4a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(fx, gy - S * 0.05); ctx.lineTo(fx, gy - S * 0.05 - fh); ctx.stroke();
      ctx.fillStyle = ['#ff8fb1', '#ffd36b', '#c9a2ff'][i % 3]; ctx.beginPath(); ctx.arc(fx, gy - S * 0.05 - fh, Math.max(2, S * 0.035), 0, 7); ctx.fill();
    }
  }
  if (season === 3) {   // лужица
    ctx.fillStyle = 'rgba(143, 192, 255, 0.35)'; ctx.beginPath(); ctx.ellipse(cx - S * 0.5, gy + 1, S * 0.25 * (0.4 + sp), 3, 0, 0, 7); ctx.fill();
  }
}

registerScene({
  name: 'Батрак', author: 'Roganovs96',
  words: ['год', 'каждые', 'следующий год', 'следующий'], steps: 100,
  set: lifeSet, frame: lifeFrame, tick: updateBio,
});
