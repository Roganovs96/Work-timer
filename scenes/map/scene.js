// Карта России: поезд едет по Транссибу от Москвы до Владивостока.
// Панель показывает ближайшие станции и время прибытия по часам пользователя.
const mapCvs = makeCanvas();
css(`
  .map-info { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); width: min(460px, calc(100% - 16px));
    background: rgba(15, 17, 21, 0.85); border: 1px solid #2a2f3a; border-radius: 12px; padding: 8px 12px; pointer-events: none; }
  .map-info.side { left: 8px; transform: none; width: 280px; }
  .mi-top { font-size: 16px; font-weight: 700; }
  .mi-sub { color: #8a90a0; font-size: 12px; margin: 2px 0 6px; }
  .mi-row { display: grid; grid-template-columns: 1fr auto 52px; gap: 10px; font-size: 13px; padding: 2px 0; border-top: 1px solid #2a2f3a; }
  .mi-row span:nth-child(2) { color: #8a90a0; font-variant-numeric: tabular-nums; }
  .mi-row b { text-align: right; font-variant-numeric: tabular-nums; }
`);
html(`<div class="map-info" id="mapInfo">
  <div class="mi-top" id="mapTop">&nbsp;</div><div class="mi-sub" id="mapSub">&nbsp;</div><div class="mi-list" id="mapList"></div>
</div>`);

// Маршрут и станции (те же, что в сцене «Поезд»; каждая сцена самодостаточна)
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
const nextStation = km => STATIONS.find(s => s[1] > km + 0.5) || STATIONS[STATIONS.length - 1];
const tzAt = km => STATIONS.filter(s => s[1] <= km).pop()[2];
const kmFmt = km => Math.round(km).toLocaleString('ru-RU');

// Упрощённые контуры, [долгота, широта]
const RU_LAND = [
  [37.5, 44.7], [40.0, 43.4], [42.0, 43.2], [44.5, 42.7], [46.5, 41.9], [47.5, 42.9], [47.3, 44.4], [47.5, 45.6], [48.6, 46.3],
  [47.0, 48.6], [47.3, 50.0], [48.7, 50.6], [51.0, 51.4], [53.0, 51.5], [55.0, 50.7], [57.0, 51.0], [59.5, 50.6], [61.0, 52.3],
  [61.0, 54.0], [65.0, 54.6], [68.0, 55.2], [70.0, 55.2], [73.5, 54.0], [76.5, 54.1], [78.0, 52.8], [80.0, 50.8], [83.5, 51.0],
  [87.0, 49.2], [90.0, 50.4], [92.0, 50.7], [95.0, 49.9], [98.0, 50.4], [98.3, 52.0], [102.0, 51.7], [106.0, 50.3], [108.0, 49.5],
  [111.0, 49.4], [114.0, 50.2], [116.5, 49.9], [119.8, 52.6], [121.0, 53.3], [124.0, 53.4], [127.5, 50.3], [130.0, 48.9],
  [132.5, 47.7], [134.7, 48.3], [134.0, 47.0], [133.0, 45.0], [131.2, 44.5], [131.0, 42.6], [131.9, 43.1], [133.0, 42.8],
  [135.5, 43.9], [138.0, 46.5], [140.4, 48.5], [140.5, 51.5], [141.4, 53.0], [139.0, 54.2], [137.5, 54.0], [135.2, 54.8],
  [137.5, 56.5], [140.5, 58.2], [143.0, 59.3], [148.0, 59.4], [151.0, 59.5], [154.5, 59.3], [155.5, 60.7], [157.0, 61.6],
  [160.0, 61.9], [158.0, 58.0], [156.6, 57.0], [155.8, 54.5], [156.7, 51.0], [158.6, 52.9], [160.0, 54.5], [162.0, 56.2],
  [163.3, 58.0], [165.0, 60.0], [170.0, 60.0], [173.0, 61.6], [177.0, 62.5], [179.5, 62.4], [182.0, 64.5], [186.0, 64.4],
  [190.3, 66.0], [186.0, 67.1], [180.0, 68.9], [175.0, 69.9], [170.0, 70.1], [161.0, 69.6], [155.0, 71.0], [150.0, 71.5],
  [140.0, 72.5], [130.0, 71.0], [127.0, 73.5], [120.0, 73.0], [113.0, 73.7], [110.0, 74.0], [104.3, 77.7], [100.0, 76.0],
  [95.0, 76.0], [88.0, 75.0], [87.0, 74.0], [80.5, 72.6], [78.0, 72.3], [75.0, 72.8], [73.5, 71.0], [72.5, 68.0], [70.5, 66.6],
  [69.0, 69.0], [68.0, 71.0], [70.0, 73.4], [67.5, 71.5], [66.0, 69.0], [60.0, 69.8], [58.0, 68.6], [53.0, 68.5], [44.0, 68.5],
  [43.5, 66.2], [40.0, 64.6], [37.0, 63.9], [34.8, 64.5], [34.5, 66.5], [37.5, 66.2], [41.0, 66.6], [40.0, 67.8], [36.0, 69.1],
  [33.0, 69.4], [30.8, 69.8], [30.0, 67.5], [29.5, 66.0], [30.0, 64.0], [31.5, 62.9], [29.5, 61.2], [28.5, 60.6], [30.2, 59.95],
  [28.0, 59.5], [27.7, 57.8], [28.0, 56.2], [31.0, 55.6], [32.0, 53.5], [31.5, 52.1], [34.0, 52.3], [35.5, 50.5], [38.0, 50.0],
  [40.0, 49.5], [40.0, 48.0], [39.7, 47.2], [38.2, 47.1], [38.5, 46.0],
];
const RU_ISLANDS = [
  [[142.0, 46.0], [143.5, 46.8], [143.2, 49.0], [144.3, 49.0], [143.0, 51.5], [143.2, 53.0], [142.7, 54.4], [142.2, 54.3], [142.2, 51.0], [141.8, 48.5], [141.9, 46.6]],
  [[52.0, 71.0], [55.0, 70.6], [57.5, 70.7], [57.0, 72.5], [62.0, 74.5], [68.5, 76.8], [66.0, 77.0], [60.0, 76.0], [56.0, 74.5], [54.0, 73.0], [52.0, 72.0]],
];
const BAIKAL_SHAPE = [[103.7, 51.6], [104.8, 51.5], [106.0, 52.3], [107.3, 53.0], [108.5, 54.0], [109.6, 55.6], [109.3, 55.9], [108.2, 55.0], [106.6, 53.5], [105.0, 52.4]];
const MAP_RIVERS = [
  [[32.5, 57.3], [35.9, 56.9], [39.9, 57.6], [44.0, 56.3], [49.1, 55.8], [50.1, 53.2], [44.5, 48.7], [48.0, 46.3]],
  [[85.0, 52.5], [83.8, 53.4], [82.9, 55.0], [84.0, 57.5], [76.5, 60.9], [69.0, 61.0], [66.5, 65.0], [66.6, 66.5], [72.0, 68.5]],
  [[73.4, 55.0], [68.3, 58.2], [69.0, 61.0]],
  [[93.5, 51.7], [91.4, 53.7], [92.9, 56.0], [92.1, 58.5], [89.9, 61.6], [88.0, 64.0], [86.6, 67.5], [86.2, 69.4], [82.0, 71.5]],
  [[108.0, 53.8], [105.7, 56.8], [108.1, 57.8], [114.9, 60.7], [129.7, 62.0], [127.0, 66.0], [126.5, 72.5]],
  [[121.0, 53.3], [124.0, 53.6], [127.5, 50.3], [130.5, 48.0], [135.1, 48.5], [137.0, 50.6], [140.7, 53.1]],
];
// для ориентира: города не на маршруте
const MAP_CITIES = [['Санкт-Петербург', 30.3, 59.9], ['Мурманск', 33.1, 68.97], ['Казань', 49.1, 55.8], ['Норильск', 88.2, 69.35],
                    ['Якутск', 129.7, 62.0], ['Магадан', 150.8, 59.56], ['Петропавловск-Камчатский', 158.65, 53.02]];
// координаты станций маршрута в том же порядке, что STATIONS
const STATION_LL = [
  [37.62, 55.76], [39.87, 57.63], [40.17, 58.19], [41.53, 58.48], [45.51, 58.37], [48.35, 58.31], [49.66, 58.6], [52.66, 58.14],
  [53.01, 57.98], [56.25, 58.01], [56.94, 57.43], [60.61, 56.84], [65.53, 57.15], [69.48, 56.11], [73.37, 54.99], [78.35, 55.35],
  [82.92, 55.03], [85.62, 56.06], [87.75, 56.21], [90.5, 56.27], [92.85, 56.01], [95.7, 56.2], [98.0, 55.94], [99.03, 54.9],
  [102.05, 53.92], [104.28, 52.29], [103.7, 51.66], [107.58, 51.83], [108.84, 51.28], [110.46, 51.36], [113.5, 52.03], [114.35, 51.62],
  [117.01, 52.52], [119.77, 53.74], [121.95, 53.96], [123.94, 53.99], [128.47, 50.92], [131.05, 49.0], [132.92, 48.79], [135.08, 48.48],
  [134.75, 47.54], [134.25, 46.82], [131.95, 43.8], [131.89, 43.12],
];
const mapS = { geo: null, shown: '' };
// синусоидальная проекция с центром на 100° в.д. — Россия выгибается, как на привычных картах
const proj = (lon, lat) => [(lon - 100) * Math.cos(lat * Math.PI / 180), -lat];

function mapGeometry() {
  const W = area.clientWidth, H = area.clientHeight;
  if (!W || !H) return null;
  // узкий экран — панель под картой, широкий — слева от неё
  const tall = H > W * 0.6 || W < 700;
  $('mapInfo').classList.toggle('side', !tall);
  const ph = tall ? $('mapInfo').offsetHeight + 14 : 0, pw = tall ? 0 : $('mapInfo').offsetWidth + 16, pad = 12;
  const pts = RU_LAND.map(p => proj(...p));
  const minx = Math.min(...pts.map(p => p[0])), maxx = Math.max(...pts.map(p => p[0]));
  const miny = Math.min(...pts.map(p => p[1])), maxy = Math.max(...pts.map(p => p[1]));
  const aw = W - pw - pad * 2, ah = H - ph - pad * 2, s = Math.min(aw / (maxx - minx), ah / (maxy - miny));
  const ox = pw + pad + (aw - (maxx - minx) * s) / 2 - minx * s, oy = pad + (ah - (maxy - miny) * s) / 2 - miny * s;
  const P = ([lon, lat]) => { const [x, y] = proj(lon, lat); return [ox + x * s, oy + y * s]; };
  return { W, H, s, P, tall, land: RU_LAND.map(P), islands: RU_ISLANDS.map(i => i.map(P)), baikal: BAIKAL_SHAPE.map(P),
           rivers: MAP_RIVERS.map(r => r.map(P)), st: STATION_LL.map(P), cities: MAP_CITIES.map(c => [c[0], ...P([c[1], c[2]])]) };
}
function mapSet(k, force) {
  if (force || !mapS.geo) { mapS.geo = mapGeometry(); if (mapS.geo) fitCanvas(mapCvs); }
}
// где поезд на карте: между двумя станциями пропорционально км
function trainOnMap(g, km) {
  let i = STATIONS.findIndex(s => s[1] > km); if (i < 0) i = STATIONS.length - 1; if (i === 0) i = 1;
  const a = STATIONS[i - 1][1], b = STATIONS[i][1], q = Math.max(0, Math.min(1, (km - a) / (b - a || 1)));
  const A = g.st[i - 1], B = g.st[i];
  return { i, x: lerp(A[0], B[0], q), y: lerp(A[1], B[1], q), ang: Math.atan2(B[1] - A[1], B[0] - A[0]) };
}

function updateMapInfo() {
  const km = curPct / 100 * TOTAL_KM, nx = nextStation(km), at = STATIONS.find(s => Math.abs(s[1] - km) < 4);
  const top = km >= TOTAL_KM - 0.5 ? 'Владивосток! Приехали 🎉' : at ? 'Станция ' + at[0] : '→ ' + nx[0] + ' · ' + kmFmt(nx[1] - km) + ' км';
  const tz = tzAt(km), d = new Date(Date.now() + tz * 3600000), hm = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const sub = 'Пройдено ' + kmFmt(km) + ' из ' + kmFmt(TOTAL_KM) + ' км · ' + biomeAt(km)[1] + ' · местное ' + hm(d) + ' (МСК' + (tz ? '+' + tz : '') + ')';
  const left = leftMs(), rows = STATIONS.filter(s => s[1] > km + 0.5).slice(0, mapS.geo && !mapS.geo.tall ? 3 : 4).map(s => {
    const t = new Date(Date.now() + (s[1] - km) / TOTAL_KM * dayLenMs());
    return `<div class="mi-row"><span>${s[0]}</span><span>${kmFmt(s[1] - km)} км</span><b>${hm(t)}</b></div>`;
  }).join('') || '<div class="mi-row"><span>Конечная</span></div>';
  const key = top + sub + rows; if (key === mapS.shown) return; mapS.shown = key;
  $('mapTop').textContent = top; $('mapSub').textContent = sub; $('mapList').innerHTML = rows;
}

function mapFrame(now) {
  const g = mapS.geo; if (!g) return;
  beginFrame(mapCvs, g);
  const km = livePct() / 100 * TOTAL_KM, poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); if (close) ctx.closePath(); };

  // суша
  ctx.fillStyle = '#18261f'; ctx.strokeStyle = '#33503f'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
  for (const sh of [g.land, ...g.islands]) { poly(sh, true); ctx.fill(); ctx.stroke(); }
  // сетка меридианов и параллелей внутри суши
  ctx.save(); poly(g.land, true); ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; ctx.lineWidth = 1;
  for (let lon = 30; lon <= 190; lon += 20) { const pts = []; for (let lat = 40; lat <= 80; lat += 2) pts.push(g.P([lon, lat])); poly(pts); ctx.stroke(); }
  for (let lat = 45; lat <= 75; lat += 10) { const pts = []; for (let lon = 25; lon <= 192; lon += 3) pts.push(g.P([lon, lat])); poly(pts); ctx.stroke(); }
  ctx.restore();
  // реки и Байкал
  ctx.strokeStyle = '#2a5a80'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  for (const r of g.rivers) { poly(r); ctx.stroke(); }
  ctx.fillStyle = '#2a5a80'; poly(g.baikal, true); ctx.fill();

  const small = g.W < 600, fs = small ? 9 : 11;
  ctx.textBaseline = 'middle';
  // города для ориентира
  ctx.font = `${fs}px -apple-system, sans-serif`;
  for (const [name, x, y] of g.cities) {
    if (small && name.length > 9) continue;
    ctx.fillStyle = '#5a6070'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill();
    const right = x + 4 + ctx.measureText(name).width > g.W - 4;   // у правого края — подпись слева от точки
    ctx.fillStyle = '#6b7280'; ctx.textAlign = right ? 'right' : 'left'; ctx.fillText(name, right ? x - 4 : x + 4, y);
  }

  // Транссиб: вся дорога, затем пройденная часть
  const T = trainOnMap(g, km), done = [...g.st.slice(0, T.i), [T.x, T.y]];
  ctx.lineWidth = small ? 3 : 4; ctx.strokeStyle = '#3a3f4a'; poly(g.st); ctx.stroke();
  ctx.lineWidth = small ? 1 : 1.5; ctx.strokeStyle = '#8a90a0'; ctx.setLineDash([4, 4]); poly(g.st); ctx.stroke(); ctx.setLineDash([]);
  ctx.lineWidth = small ? 3 : 4; ctx.strokeStyle = '#4f9cff'; poly(done); ctx.stroke();

  // станции
  STATIONS.forEach((s, i) => {
    const [x, y] = g.st[i], passed = s[1] <= km;
    ctx.fillStyle = passed ? '#4f9cff' : '#e8eaf0';
    ctx.beginPath(); ctx.arc(x, y, s[3] === 2 ? 3.5 : s[3] === 1 ? 2.5 : 1.6, 0, 7); ctx.fill();
  });
  // подписи крупных станций: по очереди сверху и снизу от дороги
  ctx.font = `600 ${fs}px -apple-system, sans-serif`; ctx.textAlign = 'center';
  let flip = false;
  STATIONS.forEach((s, i) => {
    if (s[3] < (small ? 2 : 1) || s[0] === 'Уссурийск') return;
    const [x, y] = g.st[i]; flip = !flip;
    ctx.fillStyle = s[1] <= km ? '#8fc0ff' : '#c9ced8';
    if (i === STATIONS.length - 1) { ctx.textAlign = 'right'; ctx.fillText(s[0], x - 7, y + 2); ctx.textAlign = 'center'; return; }
    if (s[0] === 'Хабаровск') { ctx.textAlign = 'left'; ctx.fillText(s[0], x + 7, y); ctx.textAlign = 'center'; return; }
    ctx.fillText(s[0], Math.max(30, Math.min(g.W - 30, x)), y + (flip ? -1 : 1) * (fs + 3));
  });

  // поезд: пульсирующее свечение и вагончик по направлению пути
  const pulse = 0.5 + 0.5 * Math.sin(now / 400);
  ctx.fillStyle = `rgba(200, 53, 46, ${0.15 + 0.2 * pulse})`; ctx.beginPath(); ctx.arc(T.x, T.y, (small ? 9 : 12) + pulse * 4, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(T.x, T.y); ctx.rotate(T.ang);
  const tl = small ? 14 : 20, tw = small ? 6 : 8;
  ctx.fillStyle = '#c8352e'; ctx.beginPath(); ctx.roundRect(-tl / 2, -tw / 2, tl, tw, [2, tw / 2, tw / 2, 2]); ctx.fill();
  ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(tl / 2 - 1.5, 0, 1.5, 0, 7); ctx.fill();
  ctx.restore();
  // ближайшая станция подсвечена
  const nx = STATIONS.findIndex(s => s[1] > km + 0.5);
  if (nx >= 0) {
    const [x, y] = g.st[nx];
    ctx.strokeStyle = `rgba(255, 211, 107, ${0.5 + 0.5 * pulse})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.stroke();
  }
}

// Подпись в шапке: «Омск через 12:34»
function trainSub() {
  const km = curPct / 100 * TOTAL_KM, nx = nextStation(km);
  if (km >= TOTAL_KM - 0.5) return [{ t: 'Приехали во Владивосток!' }];
  return [{ t: nx[0] + ' через ' }, { ms: (nx[1] - km) / TOTAL_KM * dayLenMs(), b: true }];
}

registerScene({
  name: 'Карта', author: 'Roganovs96',
  set: mapSet, frame: mapFrame, tick: updateMapInfo, sub: trainSub,
});
