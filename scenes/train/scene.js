// Поезд Москва — Владивосток, вид сверху: день = 9 289 км Транссиба, 44 станции.
// Под поездом едет пейзаж по регионам, реки на мостах, встречные товарняки. Кнопка 🔍 меняет масштаб.
const trainCvs = makeCanvas();
css(`
  .train-info { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); width: max-content; max-width: calc(100% - 24px);
    text-align: center; pointer-events: none; background: rgba(15, 17, 21, 0.82); border-radius: 12px; padding: 6px 14px; }
  .train-info .top { font-size: 18px; font-weight: 700; }
  .train-info .sub { color: #8a90a0; font-size: 13px; margin-top: 4px; line-height: 1.35; }
  .train-info.pop { animation: pop .5s ease-out; }
  @keyframes pop { from { opacity: 0; translate: 0 6px; } to { opacity: 1; translate: 0 0; } }
  .zoom-btn { position: absolute; right: 10px; bottom: 54px; background: rgba(15, 17, 21, 0.85); color: #e8eaf0;
    border: 1px solid #2a2f3a; border-radius: 10px; padding: 7px 12px; font-size: 13px; cursor: pointer; font-family: inherit; }
`);
html(`<button class="zoom-btn" id="trainZoom"></button>
  <div class="train-info" id="trainInfo"><div class="top" id="trainTop"></div><div class="sub" id="trainSub"></div></div>`);
const TOTAL_KM = 9289;
// [станция, км от Москвы (примерно), часовой пояс МСК+, размер города 0..2]
const STATIONS = [
  ['Москва', 0, 0, 2], ['Ярославль', 282, 0, 1], ['Данилов', 357, 0, 0], ['Буй', 450, 0, 0], ['Шарья', 698, 0, 0],
  ['Котельнич', 870, 0, 0], ['Киров', 957, 0, 1], ['Глазов', 1150, 1, 0], ['Балезино', 1194, 1, 0], ['Пермь', 1434, 2, 2],
  ['Кунгур', 1535, 2, 0], ['Екатеринбург', 1816, 2, 2], ['Тюмень', 2144, 2, 1], ['Ишим', 2433, 2, 0], ['Омск', 2712, 3, 2],
  ['Барабинск', 3040, 4, 0], ['Новосибирск', 3335, 4, 2], ['Тайга', 3565, 4, 0], ['Мариинск', 3713, 4, 0], ['Ачинск', 3999, 4, 0],
  ['Красноярск', 4098, 4, 2], ['Канск', 4344, 4, 0], ['Тайшет', 4516, 5, 0], ['Нижнеудинск', 4680, 5, 0], ['Зима', 4940, 5, 0],
  ['Иркутск', 5185, 5, 2], ['Слюдянка', 5312, 5, 0], ['Улан-Удэ', 5642, 5, 1], ['Петровский Завод', 5784, 6, 0], ['Хилок', 5932, 6, 0],
  ['Чита', 6199, 6, 1], ['Карымская', 6295, 6, 0], ['Чернышевск', 6660, 6, 0], ['Могоча', 6906, 6, 0], ['Ерофей Павлович', 7119, 6, 0],
  ['Сковородино', 7306, 6, 0], ['Белогорск', 7873, 6, 0], ['Облучье', 8198, 7, 0], ['Биробиджан', 8351, 7, 0], ['Хабаровск', 8521, 7, 2],
  ['Вяземская', 8640, 7, 0], ['Бикин', 8756, 7, 0], ['Уссурийск', 9177, 7, 1], ['Владивосток', 9289, 7, 2],
];
const RIVERS = [['Волга', 280, 110], ['Кама', 1425, 90], ['Иртыш', 2705, 80], ['Обь', 3330, 110], ['Енисей', 4090, 120], ['Селенга', 5630, 60], ['Амур', 8510, 150]];
const BIOMES = [[0, 'Центральная Россия', '#1d3324'], [1450, 'Урал', '#262d27'], [1900, 'Западная Сибирь', '#21372a'],
                [3600, 'тайга', '#16291d'], [5250, 'Байкал', '#1b2e26'], [5600, 'Забайкалье', '#2c3222'], [7400, 'Дальний Восток', '#1c3326']];
const biomeAt = km => BIOMES.filter(b => km >= b[0]).pop();
const BAIKAL = [5255, 5560], SEA = 9240;
const train = { geo: null, shown: '' };
// масштаб: насколько отдалена камера
const TRAIN_ZOOMS = [[1, 'близко'], [0.5, 'дальше'], [0.22, 'далеко']];
let trainZoom = Math.min(TRAIN_ZOOMS.length - 1, Math.max(0, sceneStore.get('zoom', 0) | 0));
function setTrainZoom(i) {
  trainZoom = i; sceneStore.set('zoom', i);
  $('trainZoom').textContent = '🔍 ' + TRAIN_ZOOMS[i][1];
}
$('trainZoom').onclick = () => setTrainZoom((trainZoom + 1) % TRAIN_ZOOMS.length);
$('trainZoom').textContent = '🔍 ' + TRAIN_ZOOMS[trainZoom][1];

function trainGeometry() {
  const W = area.clientWidth, H = area.clientHeight;
  if (!W || !H) return null;
  const port = H > W * 1.05;
  return { W, H, port, VL: port ? H : W, VW: port ? W : H };
}
function trainSet(k, force) {
  if (force || !train.geo) { train.geo = trainGeometry(); if (train.geo) fitCanvas(trainCvs); }
}
const nextStation = km => STATIONS.find(s => s[1] > km + 0.5) || STATIONS[STATIONS.length - 1];
const tzAt = km => STATIONS.filter(s => s[1] <= km).pop()[2];
const kmFmt = km => Math.round(km).toLocaleString('ru-RU');

function updateTrain() {
  const km = curPct / 100 * TOTAL_KM, nx = nextStation(km), at = STATIONS.find(s => Math.abs(s[1] - km) < 4);
  let top;
  if (km >= TOTAL_KM - 0.5) top = 'Владивосток! Приехали 🎉';
  else if (at) top = 'Станция ' + at[0];
  else top = '→ ' + nx[0] + ' · ' + kmFmt(nx[1] - km) + ' км';
  const tz = tzAt(km), d = new Date(Date.now() + tz * 3600000);
  const sub = 'Пройдено ' + kmFmt(km) + ' из ' + kmFmt(TOTAL_KM) + ' км · ' + biomeAt(km)[1] +
    '<br>Местное время ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' (МСК' + (tz ? '+' + tz : '') + ')';
  if (top + sub === train.shown) return;
  if (top !== train.shown.split('|')[0]) { const el = $('trainInfo'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  train.shown = top + '|' + sub;
  $('trainTop').textContent = top; $('trainSub').innerHTML = sub;
}

function trainFrame(now) {
  const g = train.geo; if (!g) return;
  beginFrame(trainCvs, g);
  const { W, H, port } = g, z = TRAIN_ZOOMS[trainZoom][0];
  const VL = g.VL / z, VW = g.VW / z;                               // видимая область в мировых пикселях
  const km = livePct() / 100 * TOTAL_KM;
  const ppk = Math.max(3, 25 * dayLenMs() / 1000 / TOTAL_KM);      // пикселей на км: ~25 px/с при обычной скорости
  const gap = Math.max(10, g.VW * 0.032), c = VW * 0.5, tA = c - gap, tB = c + gap;   // наш путь A, встречный B
  const strip = 44, headU = (strip + (g.VL - strip) * 0.58) / z, off = km * ppk - headU;
  const U = kmv => kmv * ppk - off;                                 // км → координата вдоль пути на экране
  const toScreen = (u, v) => port ? [v * z, H - u * z] : [u * z, v * z];

  ctx.save();
  if (port) { ctx.translate(0, H); ctx.rotate(-Math.PI / 2); }
  ctx.scale(z, z);

  // земля по биомам
  const TS = 48, t0 = Math.floor(off / TS), t1 = Math.ceil((off + VL) / TS);
  for (let t = t0; t <= t1; t++) { ctx.fillStyle = biomeAt(Math.max(0, t * TS / ppk))[2]; ctx.fillRect(t * TS - off - 1, 0, TS + 2, VW); }

  // Байкал и море — вода с одной стороны
  const water = (k0, k1) => {
    const u0 = Math.max(-10, U(k0)), u1 = Math.min(VL + 10, U(k1)); if (u1 <= u0) return;
    ctx.fillStyle = '#17405e'; ctx.beginPath(); ctx.moveTo(u0, 0);
    for (let u = u0; u <= u1; u += 8) ctx.lineTo(u, tA - gap * 2.2 - 6 * Math.sin((u + off) / 37) - Math.min(1, (u - U(k0)) / 80, (U(k1) - u) / 80) * 0);
    ctx.lineTo(u1, 0); ctx.fill();
  };
  water(BAIKAL[0], BAIKAL[1]); water(SEA, TOTAL_KM + 500);
  const inWater = (kmv, v) => v < tA - gap * 1.6 && ((kmv > BAIKAL[0] && kmv < BAIKAL[1]) || kmv > SEA);

  // реки поперёк пути
  for (const [, rk, rw] of RIVERS) {
    const u = U(rk); if (u < -rw || u > VL + rw) continue;
    ctx.fillStyle = '#1d4a6b'; ctx.beginPath(); ctx.moveTo(u - rw / 2, 0);
    for (let v = 0; v <= VW; v += 10) ctx.lineTo(u - rw / 2 + Math.sin(v / 40 + rk) * 12, v);
    for (let v = VW; v >= 0; v -= 10) ctx.lineTo(u + rw / 2 + Math.sin(v / 40 + rk) * 12, v);
    ctx.fill();
  }

  // где не ставить деревья: города и реки
  const busy = (kmv, u) => STATIONS.some(s => Math.abs(U(s[1]) - u) < 90 + s[3] * 170) || RIVERS.some(r => Math.abs(U(r[1]) - u) < r[2] / 2 + 16);

  // деревья, поля, домики, камни
  for (let t = t0; t <= t1; t++) {
    const kmT = t * TS / ppk; if (kmT < -2) continue;
    const r = rng(t * 7919 + 13), b = biomeAt(Math.max(0, kmT))[1];
    const n = Math.round((b === 'тайга' ? 9 : b === 'Забайкалье' ? 3 : 6) / z);
    for (let i = 0; i < n; i++) {
      const u = t * TS + r() * TS - off, v = r() * VW, kind = r(), sz = 0.6 + r() * 0.6;
      if (Math.abs(v - c) < gap * 2.3 || busy(kmT, u) || inWater(kmT, v)) continue;
      if (b === 'Урал' && kind < 0.35 || b === 'Байкал' && kind < 0.2) {
        ctx.fillStyle = '#5b5f66'; ctx.beginPath(); ctx.ellipse(u, v, 9 * sz, 6 * sz, kind * 7, 0, 7); ctx.fill();
      } else if ((b === 'Центральная Россия' || b === 'Западная Сибирь') && kind < 0.18) {
        ctx.fillStyle = kind < 0.09 ? '#4a5a2a' : '#3c4f2a'; ctx.fillRect(u - 22, v - 14, 44 * sz, 28 * sz);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let s = 4; s < 28 * sz; s += 5) { ctx.moveTo(u - 22, v - 14 + s); ctx.lineTo(u - 22 + 44 * sz, v - 14 + s); } ctx.stroke();
      } else if (b === 'Центральная Россия' && kind < 0.26) {
        ctx.fillStyle = '#8a3b2e'; ctx.fillRect(u - 6, v - 5, 12, 10); ctx.strokeStyle = '#5e2a20'; ctx.beginPath(); ctx.moveTo(u - 6, v); ctx.lineTo(u + 6, v); ctx.stroke();
      } else if (b === 'Забайкалье') {
        ctx.fillStyle = kind < 0.5 ? '#3a4a2a' : '#4a4630'; ctx.beginPath(); ctx.arc(u, v, 5 * sz, 0, 7); ctx.fill();
      } else {
        const conifer = b === 'тайга' || b === 'Урал' || b === 'Байкал' || kind < 0.4, birch = b === 'Западная Сибирь' && kind > 0.6;
        ctx.fillStyle = conifer ? '#0f3d24' : birch ? '#6fa060' : '#2f6b3a';
        ctx.beginPath(); ctx.arc(u, v, (conifer ? 6 : 8) * sz, 0, 7); ctx.fill();
        ctx.fillStyle = conifer ? '#1d5a35' : birch ? '#9cc88a' : '#3f8a4a';
        ctx.beginPath(); ctx.arc(u - 1.5, v - 1.5, (conifer ? 3 : 4.5) * sz, 0, 7); ctx.fill();
      }
    }
  }

  // станции и города
  const labels = [];
  STATIONS.forEach((s, si) => {
    const u = U(s[1]), spread = 90 + s[3] * 170; if (u < -spread - 60 || u > VL + spread + 60) return;
    const r = rng(si * 31 + 5);
    if (s[3] > 0) {   // кварталы
      for (let i = 0; i < 14 * s[3] * s[3]; i++) {
        const bu = u + (r() - 0.5) * spread * 1.8, side = r() < 0.5 ? -1 : 1, bv = c + side * (gap * 3 + 14 + r() * (g.VW / 2 - gap * 3 - 20));
        if (inWater(s[1], bv)) continue;
        const bw = 14 + r() * 26, bh = 10 + r() * 20;
        ctx.fillStyle = ['#5d6470', '#6f7682', '#7a5a4a', '#4f5865'][i % 4]; ctx.fillRect(bu - bw / 2, bv - bh / 2, bw, bh);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(bu - bw / 2, bv - bh / 2, bw, 3);
      }
    }
    const P = 60 + s[3] * 35;
    ctx.fillStyle = '#4a4f59';   // платформы
    ctx.fillRect(u - P, tA - gap - 9, P * 2, 7); ctx.fillRect(u - P, tB + gap + 2, P * 2, 7);
    const bw = 34 + s[3] * 26, bh = 16 + s[3] * 6, bv = tA - gap - 14 - bh;   // вокзал
    ctx.fillStyle = s[3] === 2 ? '#d9c9a3' : '#b9a27a'; ctx.fillRect(u - bw / 2, bv, bw, bh);
    ctx.strokeStyle = '#8a7350'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(u - bw / 2, bv + bh / 2); ctx.lineTo(u + bw / 2, bv + bh / 2); ctx.stroke();
    labels.push([u, bv - 6, s[0], s[3]]);
  });

  // два пути: щебень, шпалы, рельсы
  for (const tv of [tA, tB]) {
    ctx.fillStyle = '#34363b'; ctx.fillRect(0, tv - gap * 0.75, VL, gap * 1.5);
    ctx.fillStyle = '#5a4632';
    for (let u = Math.ceil(off / 9) * 9 - off; u < VL; u += 9) ctx.fillRect(u, tv - gap * 0.55, 3, gap * 1.1);
    ctx.fillStyle = '#9aa1ad'; ctx.fillRect(0, tv - gap * 0.35 - 1, VL, 2); ctx.fillRect(0, tv + gap * 0.35 - 1, VL, 2);
  }
  // мосты через реки
  for (const [, rk, rw] of RIVERS) {
    const u = U(rk); if (u < -rw || u > VL + rw) continue;
    ctx.strokeStyle = '#8a929e'; ctx.lineWidth = 2;
    ctx.strokeRect(u - rw / 2 - 14, tA - gap * 0.95, rw + 28, tB - tA + gap * 1.9);
    ctx.beginPath(); for (let x = u - rw / 2 - 14; x < u + rw / 2 + 14; x += 14) { ctx.moveTo(x, tA - gap * 0.95); ctx.lineTo(x + 14, tB + gap * 0.95); } ctx.stroke();
  }
  RIVERS.forEach(([name, rk, rw]) => { const u = U(rk); if (u > -rw && u < VL + rw) labels.push([u, VW * 0.12, name, -1]); });
  if (U(BAIKAL[0]) < VL && U(BAIKAL[1]) > 0) labels.push([Math.max(40, Math.min(VL - 40, (Math.max(0, U(BAIKAL[0])) + Math.min(VL, U(BAIKAL[1]))) / 2)), VW * 0.15, 'озеро Байкал', -1]);
  if (U(SEA) < VL) labels.push([Math.min(VL - 40, U(SEA) + 120), VW * 0.15, 'Японское море', -1]);

  // вагон сверху: (u — перед вагона), len, цвет
  const cw = gap * 1.35, carL = Math.min(cw * 5.2, g.VL * 0.13);
  const car = (u, tv, len, body, roof, front) => {
    ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(u - len, tv - cw / 2, len, cw, front ? [cw * 0.6, 3, 3, cw * 0.6].reverse() : 3); ctx.fill();
    ctx.fillStyle = roof; ctx.fillRect(u - len + 4, tv - cw * 0.22, len - 8 - (front ? cw * 0.3 : 0), cw * 0.44);
  };
  // встречный товарный по пути B
  const fp = (now / 1000) % 47, fT = 9, fN = 14;
  if (fp < fT) {
    const fl = carL * 0.85, head = VL + 30 - fp / fT * (VL + fN * (fl + 3) + 80);
    ctx.save(); ctx.translate(2 * head, 0); ctx.scale(-1, 1);   // смотрит в обратную сторону
    car(head, tB, fl * 0.9, '#3f6e8c', '#2c4f66', true);
    for (let i = 1; i <= fN; i++) {
      const u = head - fl * 0.9 - 3 - (i - 1) * (fl + 3);
      car(u, tB, fl, ['#3b3b3b', '#7a4a2e', '#4a6a8a', '#8a6a2e'][i % 4], ['#555', '#5e3820', '#35506a', '#6e5422'][i % 4]);
    }
    ctx.restore();
  }
  // наш поезд «Россия»: красный локомотив и серо-красные вагоны
  car(headU, tA, carL * 0.85, '#c8352e', '#8e2620', true);
  ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(headU - 2, tA - cw * 0.28, 1.6, 0, 7); ctx.arc(headU - 2, tA + cw * 0.28, 1.6, 0, 7); ctx.fill();
  for (let i = 0, u = headU - carL * 0.85 - 3; i < 16 && u > -carL; i++, u -= carL + 3) {
    car(u, tA, carL, '#8d96a6', '#6d7686');
    ctx.fillStyle = '#c8352e'; ctx.fillRect(u - carL, tA - cw / 2, carL, 2); ctx.fillRect(u - carL, tA + cw / 2 - 2, carL, 2);
    ctx.fillStyle = '#5a616e'; for (let j = 1; j < 4; j++) ctx.fillRect(u - carL + carL * j / 4 - 2, tA - 2, 4, 4);   // вентиляция
  }
  ctx.restore();

  // подписи (без поворота, чтобы читались)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [u, v, text, size] of labels) {
    if (u < 10 || u > VL - 10) continue;
    const [x, y] = toScreen(u, v);
    if (y > H - strip - 8) continue;
    ctx.font = size < 0 ? 'italic 11px -apple-system, sans-serif' : `600 ${size === 2 ? 13 : 11}px -apple-system, sans-serif`;
    const w = ctx.measureText(text).width + 10;
    const lx = Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, x)), ly = Math.max(10, Math.min(H - strip - 10, y));
    ctx.fillStyle = size < 0 ? 'rgba(15, 30, 45, 0.75)' : 'rgba(15, 17, 21, 0.8)'; ctx.beginPath(); ctx.roundRect(lx - w / 2, ly - 9, w, 18, 5); ctx.fill();
    ctx.fillStyle = size < 0 ? '#8fc0ff' : '#e8eaf0'; ctx.fillText(text, lx, ly);
  }

  // маршрут целиком внизу
  ctx.fillStyle = 'rgba(15, 17, 21, 0.88)'; ctx.fillRect(0, H - strip, W, strip);
  const x0 = 16, x1 = W - 16, ly = H - 26, X = k => lerp(x0, x1, k / TOTAL_KM);
  ctx.lineCap = 'round'; ctx.lineWidth = 3;
  ctx.strokeStyle = '#262a34'; ctx.beginPath(); ctx.moveTo(x0, ly); ctx.lineTo(x1, ly); ctx.stroke();
  ctx.strokeStyle = '#4f9cff'; ctx.beginPath(); ctx.moveTo(x0, ly); ctx.lineTo(X(km), ly); ctx.stroke();
  ctx.font = '10px -apple-system, sans-serif'; ctx.textBaseline = 'alphabetic';
  let lastLabel = -1e9;
  STATIONS.forEach((s, i) => {
    const x = X(s[1]), passed = s[1] <= km;
    ctx.fillStyle = passed ? '#4f9cff' : '#5a6070'; ctx.beginPath(); ctx.arc(x, ly, s[3] === 2 ? 3 : 1.6, 0, 7); ctx.fill();
    const big = s[3] === 2 && (W >= 600 || i === 0 || i === STATIONS.length - 1);
    if (big && x - lastLabel > 70) {
      ctx.fillStyle = '#8a90a0'; ctx.textAlign = i === 0 ? 'left' : i === STATIONS.length - 1 ? 'right' : 'center';
      ctx.fillText(s[0], i === 0 ? x0 - 4 : i === STATIONS.length - 1 ? x1 + 4 : x, ly + 15); lastLabel = x;
    }
  });
  ctx.fillStyle = '#c8352e'; ctx.beginPath(); ctx.roundRect(X(km) - 6, ly - 4, 12, 8, 3); ctx.fill();
}
// Подпись в шапке: «Омск через 12:34»
function trainSub() {
  const km = curPct / 100 * TOTAL_KM, nx = nextStation(km);
  if (km >= TOTAL_KM - 0.5) return [{ t: 'Приехали во Владивосток!' }];
  return [{ t: nx[0] + ' через ' }, { ms: (nx[1] - km) / TOTAL_KM * dayLenMs(), b: true }];
}

registerScene({
  name: 'Поезд', author: 'Roganovs96',
  set: trainSet, frame: trainFrame, tick: updateTrain, sub: trainSub,
});
