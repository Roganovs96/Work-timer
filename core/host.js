'use strict';
// Мост между ядром и сценой. Сцена живёт в iframe-песочнице (sandbox="allow-scripts", без доступа к сайту),
// всё общение — сообщениями. Всё, что приходит от сцены, проверяется: это чужой код.
class SceneFrame {
  constructor(folder, container, base = '') {
    this.folder = folder; this.meta = null; this.sub = null; this.errors = []; this.visible = false; this.probes = {};
    this.el = document.createElement('div'); this.el.className = 'scene';
    this.iframe = document.createElement('iframe');
    this.iframe.setAttribute('sandbox', 'allow-scripts');
    this.iframe.setAttribute('scrolling', 'no');
    this.iframe.tabIndex = -1; this.iframe.title = folder;
    this.iframe.src = base + 'core/frame.html?scene=' + encodeURIComponent(folder);
    // прозрачный слой поверх сцены: даёт листать ленту свайпом, а нажатия пересылает в сцену
    this.touch = document.createElement('div'); this.touch.className = 'touch';
    this.touch.addEventListener('click', e => {
      const r = this.iframe.getBoundingClientRect();
      this.post({ type: 'tap', x: e.clientX - r.left, y: e.clientY - r.top });
    });
    this.el.append(this.iframe, this.touch);
    container.appendChild(this.el);
    SceneFrame.all.push(this);
  }
  get name() { return this.meta ? this.meta.name : this.folder; }
  post(m) { if (this.iframe.contentWindow) this.iframe.contentWindow.postMessage(m, '*'); }
  tick(m) { this.lastTick = Object.assign({ type: 'tick' }, m); if (this.meta) this.post(this.lastTick); }
  setVisible(on) { if (on !== this.visible) { this.visible = on; this.post({ type: 'visible', on }); } }
  probe() {
    return new Promise(res => {
      const id = String(Math.random()); this.probes[id] = res; this.post({ type: 'probe', id });
      setTimeout(() => { if (this.probes[id]) { delete this.probes[id]; res(null); } }, 3000);
    });
  }
  error(msg) { this.errors.push(String(msg).slice(0, 300)); console.warn('[' + this.folder + ']', msg); SceneFrame.onError(this); }

  receive(m) {
    if (!m || typeof m !== 'object') return;
    const str = (v, max) => typeof v === 'string' && v.trim() && v.length <= max;
    switch (m.type) {
      case 'hello':
        this.post({ type: 'init', store: SceneFrame.loadStore(this.folder) });
        break;
      case 'ready': {
        if (!str(m.name, 24)) return this.error('name: нужна строка до 24 символов');
        const words = Array.isArray(m.words) && m.words.length === 4 && m.words.every(w => str(w, 30)) ? m.words : null;
        if (m.words && !words) this.error('words: нужен массив из 4 строк до 30 символов');
        const steps = Number.isInteger(m.steps) && m.steps >= 1 && m.steps <= 10000 ? m.steps : 300;
        this.meta = { name: m.name.trim(), author: str(m.author, 40) ? m.author : '', words, steps };
        this.post({ type: 'visible', on: this.visible });
        if (this.lastTick) this.post(this.lastTick);
        SceneFrame.onChange(this);
        break;
      }
      case 'sub': {
        const ok = Array.isArray(m.parts) && m.parts.length <= 6 && m.parts.every(p => p && (str(p.t, 60) || (Number.isFinite(p.ms) && p.ms >= 0)));
        if (!ok) return this.error('sub: нужен массив до 6 частей { t: строка } или { ms: число }');
        this.sub = m.parts.map(p => ({ t: typeof p.t === 'string' ? p.t : null, ms: Number.isFinite(p.ms) ? p.ms : null, b: !!p.b }));
        SceneFrame.onChange(this);
        break;
      }
      case 'store': {
        const json = JSON.stringify(m.data || {});
        if (json.length > 2000) return this.error('store: не больше 2000 символов');
        SceneFrame.saveStore(this.folder, JSON.parse(json));
        break;
      }
      case 'error': this.error(m.message); break;
      case 'probe': if (this.probes[m.id]) { this.probes[m.id](m); delete this.probes[m.id]; } break;
    }
  }
}
SceneFrame.all = [];
SceneFrame.onChange = () => {};
SceneFrame.onError = () => {};
SceneFrame.loadStore = () => ({});
SceneFrame.saveStore = () => {};
window.addEventListener('message', e => {
  const f = SceneFrame.all.find(f => f.iframe.contentWindow === e.source);
  if (f) f.receive(e.data);
});

// Текст под процентом в шапке: строим из узлов, а не из HTML, — слова присылает сцена
function buildSub(el, { onePct, short, scene, toNext, pct }) {
  const ms = t => { const x = Math.round(t / 1000); return Math.floor(x / 60) + ' мин ' + String(x % 60).padStart(2, '0') + ' сек'; };
  const mmss = t => { const x = Math.round(t / 1000); return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); };
  const hms = t => { const s = Math.max(0, Math.round(t / 1000)); return [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':'); };
  const f = t => t >= 3600000 ? hms(t) : short ? mmss(t) : ms(t);
  const out = [];
  const text = t => out.push(document.createTextNode(t));
  const bold = t => { const b = document.createElement('b'); b.textContent = t; out.push(b); };
  const br = () => out.push(document.createElement('br'));
  text('1% = '); bold(short ? mmss(onePct) : ms(onePct));
  if (scene && scene.sub) {
    br();
    for (const p of scene.sub) (p.b ? bold : text)(p.ms != null ? f(p.ms) : p.t);
  } else {
    const m = scene && scene.meta, w = (m && m.words) || ['часть', 'каждые', 'следующая часть', 'следующая'];
    const step = toNext.step;
    text(' · ' + w[0] + (short ? ' ' : ' ' + w[1] + ' ')); bold(short ? mmss(step) : ms(step));
    if (pct < 100) { br(); text((short ? w[3] : w[2]) + ' через '); bold(short ? mmss(toNext.left) : ms(toNext.left)); }
  }
  el.replaceChildren(...out);
}
