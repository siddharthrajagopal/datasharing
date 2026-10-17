// "A Spoonful of Gold": the timeline. One page, drawn live; at 50 s it is pulled out onto a fridge.
import { layer, clear, line, fill, dab, text, handCircle, ellipse, CAM, BOIL, W, H, sx, sy } from './crayon.js';
import { group, clearGroup } from './rig.js';
import * as S from './scene.js';
import { PAL } from './pal.js';
import { clamp, lerp, hash, track, ss, eio, eo, mulberry } from '/core/lib.js';
import { fridgeFrame } from './fridge.js';
const K = PAL.crayon, { pr, TB, RICE, PLATE, SEATS } = S;
export const DUR = 60;
export const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4;
const PAGE_END = 50;

// —— narration (t = voice start; durations measured from the Kokoro files) ——
export const LINES = [
  { id: 'n1', t: 2.3, d: 1.383, text: 'This is a plate.' },
  { id: 'n2', t: 6.6, d: 1.926, text: 'It was a very quiet dinner.' },
  { id: 'n3', t: 18.0, d: 2.323, text: 'Then, one spoonful of gold.' },
  { id: 'n4', t: 28.0, d: 3.165, text: 'And everything remembered how to smile.' },
  { id: 'n5', t: 43.0, d: 1.796, text: 'Warm. Golden. Home.' },
];
export const SUBS = LINES.map((L, i) => { const t0 = L.t - 0.1; let t1 = Math.max(t0 + 1.8, L.t + L.d + 0.7); const nx = LINES[i + 1]; if (nx) t1 = Math.min(t1, nx.t - 0.25); return { t0, t1, text: L.text }; });

// —— camera: world centre + zoom ——
const camT = track([
  [0, [1900, 1050, 3.2]], [2.3, [1900, 1050, 3.2]], [4.8, [1600, 900, 0.6]], [12.0, [1600, 900, 0.6]],
  [15.0, [1930, 770, 1.3]], [17.3, [2150, 800, 1.25]], [18.0, [2030, 790, 1.5]], [24.0, [2000, 790, 1.5]],
  [25.4, [1600, 900, 0.6]], [35.0, [1600, 900, 0.6]], [37.0, [1920, 700, 1.6]], [39.0, [1920, 700, 1.6]],
  [40.4, [780, 720, 1.1]], [42.8, [1290, 720, 1.1]], [45.0, [1900, 720, 1.1]], [47.3, [2450, 720, 1.1]], [50.0, [1600, 900, 0.6]],
]);

// —— the golden wash: four overlapping bands, alternating direction ——
export const BANDS = [
  { y0: -160, y1: 560, t0: 25.4, t1: 27.4, dir: 1, seed: 1 },
  { y0: 440, y1: 1040, t0: 27.1, t1: 29.2, dir: -1, seed: 2 },
  { y0: 920, y1: 1500, t0: 28.9, t1: 31.0, dir: 1, seed: 3 },
  { y0: 1380, y1: 1960, t0: 30.7, t1: 32.8, dir: -1, seed: 4 },
];
const X0 = -260, X1 = 3460;
export function bandFront(b, t) { const u = clamp((t - b.t0) / (b.t1 - b.t0)); const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; const v = 0.15 * u + 0.85 * e; return b.dir > 0 ? lerp(X0, X1, v) : lerp(X1, X0, v); }
function drawWash(LW, t) {
  const g = LW.g; g.save();
  g.setTransform(CAM.s, 0, 0, CAM.s, W / 2 - CAM.x * CAM.s, H / 2 - CAM.y * CAM.s);
  for (const b of BANDS) {
    if (t < b.t0) continue;
    const f = bandFront(b, t), moving = t < b.t1;
    const top = [], bot = [];
    for (let x = X0; x <= X1; x += 40) {
      top.push([x, b.y0 + 12 * (Math.sin(x * 0.006 + b.seed) + 0.6 * Math.sin(x * 0.017 + b.seed * 3)) + 12 * hash(x * 0.37 + b.seed)]);
      bot.push([x, b.y1 + 14 * (Math.sin(x * 0.005 + b.seed * 2) + 0.5 * Math.sin(x * 0.019 + b.seed)) + 14 * hash(x * 0.71 + b.seed)]);
    }
    const frontX = y => f + b.dir * 70 * Math.sin(clamp((y - b.y0) / (b.y1 - b.y0)) * Math.PI) + 12 * Math.sin(y * 0.05);
    g.save(); g.beginPath();
    if (b.dir > 0) { g.moveTo(X0 - 50, b.y0 - 200); for (let y = b.y0 - 200; y <= b.y1 + 200; y += 20) g.lineTo(frontX(y), y); g.lineTo(X0 - 50, b.y1 + 200); }
    else { g.moveTo(X1 + 50, b.y0 - 200); for (let y = b.y0 - 200; y <= b.y1 + 200; y += 20) g.lineTo(frontX(y), y); g.lineTo(X1 + 50, b.y1 + 200); }
    g.closePath(); g.clip();
    const shape = new Path2D(); top.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); for (let i = bot.length - 1; i >= 0; i--) shape.lineTo(bot[i][0], bot[i][1]); shape.closePath();
    g.fillStyle = '#000'; g.globalAlpha = 0.8; g.fill(shape);
    g.save(); g.clip(shape);
    const R = mulberry(b.seed * 97);
    for (let i = 0; i < 26; i++) {
      const yy = lerp(b.y0, b.y1, R()), wdt = 6 + R() * 30, dark = R() < 0.55;
      g.beginPath(); for (let x = X0; x <= X1; x += 60) { const y = yy + 14 * Math.sin(x * 0.002 + i) + 6 * Math.sin(x * 0.01 + i * 2); x === X0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.lineWidth = dark ? wdt : wdt * 0.5; g.globalCompositeOperation = dark ? 'source-over' : 'destination-out'; g.globalAlpha = dark ? 0.14 + R() * 0.12 : 0.05 + R() * 0.07; g.strokeStyle = '#000'; g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    g.beginPath(); for (let y = b.y0 - 80; y <= b.y1 + 80; y += 16) { const x = frontX(y) - b.dir * 14; y === b.y0 - 80 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.lineWidth = moving ? 34 : 22; g.globalAlpha = moving ? 0.3 : 0.14; g.stroke();
    g.restore(); g.restore();
  }
  g.restore();
}

// —— cue events for the mixer ——
export const EV = [];
const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
LINES.forEach(L => ev(L.t, 'voice', { id: L.id }));
ev(0, 'paper'); ev(0.3, 'scratch', { dur: 1.9, pan: 0.2 });
ev(2.3, 'scratch', { dur: 0.9, pan: -0.2 }); ev(3.2, 'write', { dur: 1.4, pan: 0 });
[[3.3, 1.2, -0.6], [3.6, 1.0, -0.2], [3.8, 1.0, 0.2], [4.0, 0.9, 0.6]].forEach(([t, d, pan]) => ev(t, 'scribble', { dur: d, pan }));
[8.2, 10.2].forEach(t => ev(t, 'poke', { pan: 0.1 }));
ev(11.8, 'chair');
ev(12.6, 'step', { pan: 0.8 }); ev(13.1, 'step', { pan: 0.7 }); ev(13.6, 'step', { pan: 0.5 }); ev(14.1, 'step', { pan: 0.4 }); ev(14.6, 'step', { pan: 0.4 });
ev(15.0, 'silence', { dur: 2.5 });
ev(15.75, 'jar', { pan: 0.4 }); ev(16.35, 'lid', { pan: 0.4 }); ev(17.0, 'dip', { pan: 0.4 });
ev(17.5, 'land', { pan: -0.1 }); ev(17.9, 'pour', { dur: 2.6, pan: -0.1 });
for (let i = 0; i < 6; i++) ev(21 + i * 0.55, 'sparkle', { i, pan: -0.5 + i * 0.2 });
BANDS.forEach(b => ev(b.t0 - 0.4, 'brush', { dur: b.t1 - b.t0 + 0.4, dir: b.dir }));
ev(25.0, 'dipbrush');
// white-wax reveals: a glock note as the wet front passes each secret
const REVEALS = [[1900, 250], [470, 880], [980, 800], [1560, 850], [2260, 790], [2680, 860], [3060, 760], [330, 320], [590, 410], [1130, 560], [2700, 540], [900, 1290], [1800, 1290], [2500, 1390], [1500, 1290], [2900, 1290]];
export const REVEAL_T = REVEALS.map(([x, y]) => { const b = BANDS.find(b => y >= b.y0 + 60 && y <= b.y1 - 60) || BANDS[0]; const u = b.dir > 0 ? (x - X0) / (X1 - X0) : (X1 - x) / (X1 - X0); const v = clamp(u); return b.t0 + (b.t1 - b.t0) * (v < 0.15 ? v / 0.15 * 0.0 : Math.pow(Math.max(0, (v - 0.15) / 0.85), 0.5) * 0.9 + 0.1); });
REVEAL_T.forEach((t, i) => ev(t, 'glint', { i, pan: (REVEALS[i][0] - 1600) / 1600 }));
ev(35.0, 'blush', { dur: 1.4 }); ev(37.4, 'cheer');
[40.8, 43.2, 47.3].forEach(t => ev(t, 'colour', { dur: 1.7 }));
[41.6, 42.1, 44.6, 45.0, 45.4, 46.0].forEach(t => ev(t, 'clap'));
ev(50.0, 'room'); ev(53.9, 'page', { dur: 0.7 });
ev(56.1, 'write', { dur: 2.2, pan: 0 }); ev(58.75, 'final');
[['A', 0], ['B', 5.0], ['C', 15], ['D', 17.5], ['E', 25], ['F', 40], ['G', 50], ['H', 54.5]].forEach(([id, t]) => ev(t, 'cue', { id }));

// —— layers ——
const BG = { f: layer(), l: layer() }, HID = layer(), WASH = layer(), PPL = group(), IT = group(), FX = layer(), SUBK = layer(), SUBT = layer();
const GIRL = { x: SEATS.girl, y: TB.back - 6, kind: 'girl', seed: 3000, s: 1.0 };

const stepT = t => Math.floor(t * 12 + 1e-6) / 12;
const isOn = (t, a, b) => t >= a && t < b;
const toLocal = (o, wx, wy) => [(wx - o.x) / (o.s ?? 1), (wy - (o.y - (o.lift ?? 0))) / (o.s ?? 1)];

// —— the girl ——
function girlState(t, ts) {
  const o = { ...GIRL, pl: pr(t, 3.3, 4.4), pf: pr(t, 4.2, 5.2) };
  o.look = [-0.25, 0.8];
  o.expr = 'flat';
  if (t >= 12 && t < 15) { o.expr = 'sad'; o.look = [-0.1, 0.9]; }
  if (t >= 13.4 && t < 15) o.look = [0.9, -0.1];
  if (t >= 15 && t < 17.5) { o.expr = 'flat'; o.look = [1, -0.3]; }
  if (t >= 17.5 && t < 21.5) { o.expr = 'wow'; o.look = [0.3, 0.6]; }
  if (t >= 21.5) { o.expr = 'smile'; o.look = [0, 0.3]; }
  if (t >= 35) { o.expr = 'grin'; o.look = [0, 0]; }
  if (t >= 37.4) o.expr = 'joy';
  o.cheek = pr(t, 35, 36.4);
  o.vivid = pr(t, 36.2, 38.3);
  // right hand: pokes the rice with a little spoon
  let dip = 0;
  [[8.0, 8.6], [10.0, 10.6]].forEach(([a, b]) => { if (ts >= a && ts < b) dip = Math.sin(pr(ts, a, b) * Math.PI); });
  const hand = [172 - 24 * dip, 62 - 34 * dip];
  o.arms = { L: [[-140, -215], [-215, -100], [-172, 62]], R: [[140, -215], [215, -100], hand] };
  if (t >= 37.4) { const ph = Math.floor(t * 4) % 2; o.arms = S.ARMS.up(ph); }
  o.poke = t < 15 ? hand : null;
  return o;
}
const GRANDMA = { x: SEATS.grandma, y: TB.back - 6, kind: 'grandma', seed: 4000, s: 1.1, lift: 70 };
// spoon bowl position along the pour sequence
function spoonState(t) {
  const jarTop = [2430, 940], rice = [1935, 898];
  if (t < 16.5) return null;
  const hl = 300;
  if (t < 17.0) { const u = ss(pr(t, 16.5, 17.0)); return { bx: lerp(2300, jarTop[0], u), by: lerp(780, jarTop[1] + 18 * u, u), a: -0.5, load: 0 }; }
  if (t < 17.5) { const u = eo(pr(t, 17.0, 17.5)); const arc = Math.sin(u * Math.PI) * 90; return { bx: lerp(jarTop[0], rice[0], u), by: lerp(jarTop[1] + 18, rice[1], u) - arc, a: lerp(-0.5, -0.5, u), load: 1 }; }
  if (t < 20.6) { const u = ss(pr(t, 17.7, 19.4)); return { bx: rice[0] + 0, by: rice[1] - 18 * Math.sin(u * 3.14), a: lerp(-0.5, 0.15, u), load: 1 - 0.95 * pr(t, 18.0, 19.8) }; }
  if (t < 22.2) { const u = ss(pr(t, 20.6, 22.2)); return { bx: lerp(rice[0], 2330, u), by: lerp(rice[1], 780, u), a: lerp(0.15, -0.5, u), load: 0 }; }
  return null;
}
function grandmaState(t, ts) {
  const o = { ...GRANDMA, pl: pr(t, 3.5, 4.5), pf: pr(t, 4.2, 5.2) };
  const enter = ss(pr(t, 12.4, 15.0));
  o.x = lerp(3560, SEATS.grandma, enter);
  const lean = ss(pr(t, 16.6, 17.4)) * (1 - ss(pr(t, 21.5, 22.6)));
  o.x -= 150 * lean;
  o.y -= (t > 12.4 && t < 15 ? 6 * Math.abs(Math.sin(t * 6.3)) : 0);
  o.expr = t < 36 ? 'smile' : 'grin';
  o.look = t < 17.5 ? [-0.9, 0.3] : [-0.9, 0.5];
  o.vivid = pr(t, 47.3, 48.8);
  // arms: R carries the jar (then rests on the table); L works the spoon
  const jarHeld = t < 15.8;
  const jarPos = jarHeld ? [o.x + 130, o.y - 70 + 0] : null;
  const Rh = jarHeld ? toLocal(o, o.x + 128, 800) : toLocal(o, 2430, 1005);
  const Rel = [Rh[0] * 0.5 + 170, (-215 + Rh[1]) / 2 + 40];
  const sp = spoonState(t);
  let Lh, Lel;
  if (sp) {
    const dx = Math.cos(sp.a), dy = Math.sin(sp.a);   // handle points from the bowl toward the hand: (+x, -y)
    const hxw = sp.bx + 300 * Math.abs(dx), hyw = sp.by - 300 * Math.abs(dy);
    Lh = toLocal(o, hxw, hyw); o.spoonHand = [hxw, hyw];
    Lel = [(-140 + Lh[0]) / 2 - 30, (-215 + Lh[1]) / 2 + 70];
  } else { Lh = [-125, -50]; Lel = [-185, -110]; }
  o.arms = { L: [[-140, -215], Lel, Lh], R: [[140, -215], Rel, Rh] };
  if (t >= 36 && t < 47.5) { o.arms = { L: S.ARMS.clap(Math.floor(t * 4) % 2).L, R: S.ARMS.clap(Math.floor(t * 4) % 2).R }; if (t < 40) o.arms = { L: [[-140, -215], [-190, -110], [-125, 40]], R: [[140, -215], [190, -110], [125, 40]] }; }
  o.jarHeld = jarHeld; o.jarPos = jarPos; o.sp = sp;
  return o;
}
function boyState(t) {
  const o = { x: SEATS.boy, y: TB.back - 6, kind: 'boy', seed: 5000, s: 0.86, pl: pr(t, 3.7, 4.6), pf: pr(t, 4.2, 5.2), expr: 'flat', look: [0, 0.7] };
  if (t >= 14.3) o.look = [0.6, -0.1];
  if (t >= 26) { o.expr = 'wow'; o.look = [0, -0.2]; }
  if (t >= 29) o.expr = 'smile';
  if (t >= 38) o.expr = 'grin';
  if (t >= 43.2) o.expr = 'joy';
  o.vivid = pr(t, 43.2, 45.0);
  o.arms = S.ARMS.rest;
  if (t >= 43.4) { const ph = Math.floor(t * 4 + 1) % 2; o.arms = S.ARMS.up(ph); }
  return o;
}
function grandpaState(t) {
  const o = { x: SEATS.grandpa, y: TB.back - 6, kind: 'grandpa', seed: 6000, s: 1.0, pl: pr(t, 3.5, 4.5), pf: pr(t, 4.2, 5.2), expr: 'flat', look: [0.3, 0.6] };
  if (t >= 14.3) o.look = [0.9, 0];
  if (t >= 26) o.expr = 'wow';
  if (t >= 30) o.expr = 'smile';
  if (t >= 38) o.expr = 'grin';
  if (t >= 41) o.expr = 'joy';
  o.vivid = pr(t, 40.8, 42.6);
  o.arms = S.ARMS.rest;
  if (t >= 41.4) o.arms = S.ARMS.clap(Math.floor(t * 4) % 2);
  return o;
}

// —— things in the hands and on the table ——
function drawJar(L, F, x, y, lidOff, open) {
  const w = 170, h = 230, top = y - h, r = 26;
  const body = [[x - w / 2, top + 10], [x + w / 2, top + 10], [x + w / 2 + 8, y - r], [x + w / 2 - 6, y], [x - w / 2 + 6, y], [x - w / 2 - 8, y - r]];
  fill(F, body, { col: K.gold, p: 0.88, gap: 8, w: 11, ang: 0.9, seed: 700, boil: 0.5, over: 3 });
  fill(F, [[x - w / 2 + 14, top + 40], [x - w / 2 + 34, top + 40], [x - w / 2 + 34, y - 30], [x - w / 2 + 14, y - 30]], { col: K.butter, p: 0.7, gap: 6, w: 8, ang: 1.5, seed: 701, boil: 0.4 });
  line(L, [...body, body[0]], { w: 7, seed: 702, boil: 0.8, taper: 0 });
  // label
  const lab = ellipse(x, y - 108, 62, 52, 20);
  fill(F, lab, { col: K.cream, p: 0.95, gap: 6, w: 9, seed: 703, boil: 0.3, over: 0 });
  line(L, lab, { w: 4.5, seed: 704, boil: 0.5, closed: true });
  text(L, 'GHEE', sx(x), sy(y - 96), { size: 42 * CAM.s, font: 'Gaegu', weight: 700, col: K.ink, seed: 705, p: 0.95, stroke: 1 });
  // lid
  const lid = [[x - w / 2 + 4, top + 10], [x + w / 2 - 4, top + 10], [x + w / 2 - 10, top - 34], [x - w / 2 + 10, top - 34]];
  const lx = lidOff ? lidOff[0] : 0, ly = lidOff ? lidOff[1] : 0, rot = lidOff ? lidOff[2] : 0;
  if (open) {
    const mouth = ellipse(x, top + 10, w / 2 - 4, 16, 20);
    fill(F, mouth, { col: K.gold, p: 0.95, gap: 5, w: 8, seed: 706, boil: 0.3, over: 0 }); line(L, mouth, { w: 5, seed: 707, boil: 0.5, closed: true });
  }
  const lp = lid.map(([a, b]) => { const c = Math.cos(rot), s = Math.sin(rot); const dx = a - x, dy = b - (top - 10); return [x + dx * c - dy * s + lx, top - 10 + dx * s + dy * c + ly]; });
  fill(F, lp, { col: K.tomato, p: 0.88, gap: 7, w: 10, ang: 0.4, seed: 708, boil: 0.5, over: 2 });
  line(L, [...lp, lp[0]], { w: 6.5, seed: 709, boil: 0.8, taper: 0 });
}
function drawSpoon(L, F, sp, o = {}) {
  const dx = Math.cos(sp.a), dy = Math.sin(sp.a);
  const hx = sp.bx + 300 * Math.abs(dx), hy = sp.by - 300 * Math.abs(dy);
  line(L, [[sp.bx + Math.abs(dx) * 40, sp.by - Math.abs(dy) * 40], [hx, hy]], { w: 10, col: K.ink, seed: 720, boil: 0.5, taper: 0.1, p: 0.9 });
  line(L, [[sp.bx + Math.abs(dx) * 40 + 3, sp.by - Math.abs(dy) * 40 - 3], [hx + 3, hy - 3]], { w: 4, col: K.white, seed: 721, boil: 0.4, taper: 0.1, p: 0.8 });
  // bowl tilted by a (positive = pouring to the left)
  const bowl = ellipse(sp.bx, sp.by, 56, 32, 24, 0, 6.283, -sp.a * 0.9);
  fill(F, bowl, { col: K.cream, p: 0.85, gap: 6, w: 9, seed: 722, boil: 0.3, over: 1 });
  fill(F, bowl, { col: K.teal, p: 0.25, gap: 9, w: 9, seed: 723, boil: 0.3 });
  if (sp.load > 0.02) fill(F, ellipse(sp.bx, sp.by - 2, 46 * Math.sqrt(sp.load), 24 * Math.sqrt(sp.load), 18, 0, 6.283, -sp.a * 0.9), { col: K.gold, p: 0.95, gap: 4.5, w: 7, seed: 724, boil: 0.3, over: 0 });
  line(L, bowl, { w: 7, seed: 725, boil: 0.7, closed: true, taper: 0 });
}

// —— one frame of the room ——
function drawPage(comp, t, cam, { subs = true, vig = 0.3 } = {}) {
  [CAM.x, CAM.y, CAM.s] = cam;
  const ts = stepT(t);
  BOIL.amp = t < 5 ? 1 : t < 15 ? 0.5 : t < 17.5 ? 0.35 : 1;
  [BG.f, BG.l, HID, WASH, FX, SUBK, SUBT].forEach(clear); clearGroup(PPL); clearGroup(IT);
  const g = { floor: pr(t, 3.5, 4.6), wall: pr(t, 3.9, 4.8), win: pr(t, 4.0, 4.9), clock: pr(t, 4.3, 4.9), table: pr(t, 2.5, 3.5), cloth: pr(t, 3.0, 4.0), plates: pr(t, 0.3, 2.3), plin: pr(t, 1.9, 2.9), food: pr(t, 1.9, 2.9) };
  const col = { cloth: pr(t, 40.0, 41.6), win: pr(t, 44.4, 46.0), floor: pr(t, 48.0, 49.4) };
  S.drawRoom(BG.f, BG.l, g, col, t);
  if (t > 0.3) S.drawHidden(HID, pr(t, 2.8, 4.6));

  // the opening: a crayon tip draws the plate rim
  if (t < 4.8) crayonPen(t);

  // people (composited after the wash)
  const gm = grandmaState(t, ts), gs = girlState(t, ts), bs = boyState(t), ps = grandpaState(t);
  const bob = (t < 5 ? 0 : 2.5 * Math.sin(t * 1.9));
  const withBob = (o, k) => ({ ...o, y: o.y + bob * k });
  if (t > 3.3) S.person(PPL, withBob(ps, 0.8)); if (t > 3.5) S.person(PPL, withBob(bs, 1)); if (t > 3.3) S.person(PPL, withBob(gs, 0.9));
  if (t > 3.5 && gm.x < 3300) S.person(PPL, { ...gm, y: gm.y });
  S.drawRice(IT, pr(t, 1.9, 2.9));
  // girl's little spoon
  if (gs.poke && t > 4.6) { const hw = [gs.x + gs.poke[0] * gs.s, gs.y + gs.poke[1] * gs.s]; line(IT.l, [[hw[0] + 6, hw[1] - 2], [hw[0] - 108, hw[1] - 34]], { w: 8, col: K.ink, seed: 740, boil: 0.5, taper: 0.1 }); const b = ellipse(hw[0] - 120, hw[1] - 38, 20, 12, 14); fill(IT.f, b, { col: K.cream, p: 0.9, gap: 5, w: 7, seed: 741, boil: 0.3 }); line(IT.l, b, { w: 5, seed: 742, closed: true, boil: 0.5 }); }

  // jar and spoon (after the people so the hands hold them)
  if (t > 12.4) {
    if (gm.jarHeld) drawJar(IT.l, IT.f, gm.x + 130, 905, null, false);
    else { const u1 = ss(pr(t, 16.35, 16.8)), u2 = ss(pr(t, 16.8, 17.3)); drawJar(IT.l, IT.f, 2430, 1100, u1 > 0 ? [210 * u1, lerp(-130 * u1, 205, u2), 0.5 * (1 - u2) * u1 + 0.08 * u2] : null, u1 > 0.5); }
  }
  if (gm.sp) drawSpoon(IT.l, IT.f, gm.sp);
  drawGhee(t);
  drawFX(t, ts);

  if (t > BANDS[0].t0 - 0.5) drawWash(WASH, t);
  if (subs) subTo(SUBK, SUBT, t);

  comp.paperCam(CAM.x * 0.6, CAM.y * 0.6, CAM.s / 0.6);
  comp.begin();
  comp.crayon(HID.c); comp.crayon(BG.f.c); comp.crayon(BG.l.c);
  if (t > BANDS[0].t0) comp.wash(WASH.c, { color: PAL.wash, resist: 0.94, edge: 1.4, gran: 0.5 });
  const go = [hash(BOIL.step) * 300, hash(BOIL.step + 7) * 300];
  comp.group(PPL, { goff: go });
  comp.group(IT, { goff: go });
  comp.crayon(FX.c, { goff: go });
  comp.knock(SUBK.c); comp.crayon(SUBT.c);
  comp.finish({ vig });
}

function crayonPen(t) {
  // the crayon tip rides along the plate rim: ellipse rx 215 ry 56 around the girl's plate
  const [cx, cy] = PLATE.girl, rx = 215, ry = 56;
  const u = pr(t, 0.3, 2.3);
  const a = u * Math.PI * 2;
  const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
  const alpha = 1 - pr(t, 2.3, 2.7);
  if (alpha <= 0) return;
  const ang = -0.95, len = 230, r = 26;
  const T = pts => xf2(pts, px, py, ang);
  const body = T([[0, 0], [len * 0.18, -r * 0.55], [len, -r], [len, r], [len * 0.18, r * 0.55]]);
  fill(FX, body, { col: K.tomato, p: 0.95 * alpha, gap: 6, w: 9, seed: 760, boil: 0.2, over: 0 });
  line(FX, [...body, body[0]], { w: 6, seed: 761, boil: 0.6, p: alpha });
  const wr = T([[len * 0.34, -r - 2], [len, -r - 2], [len, r + 2], [len * 0.34, r + 2]]);
  fill(FX, wr, { col: K.cream, p: 0.9 * alpha, gap: 6, w: 9, seed: 762, boil: 0.2, over: 0 });
  line(FX, [...wr, wr[0]], { w: 5, seed: 763, boil: 0.5, p: alpha });
  line(FX, T([[len * 0.5, -r + 6], [len * 0.5, r - 6]]), { w: 5, seed: 764, boil: 0.4, p: alpha, taper: 0 });
  line(FX, T([[len * 0.74, -r + 6], [len * 0.74, r - 6]]), { w: 5, seed: 765, boil: 0.4, p: alpha, taper: 0 });
}
function xf2(pts, x, y, r) { const c = Math.cos(r), s = Math.sin(r); return pts.map(([a, b]) => [x + a * c - b * s, y + a * s + b * c]); }

function drawGhee(t) {
  const R = RICE;
  if (t < 17.8) return;
  const topY = R.y - R.h, cx = 1930, cy = 944;
  const dome = [...ellipse(R.x, R.y, R.rx, R.h, 30, Math.PI, Math.PI * 2), [R.x - R.rx, R.y]];
  // ribbon from the bowl lip to the rice
  const rib = pr(t, 17.9, 18.8);
  if (rib > 0 && t < 21.0) {
    const fade = 1 - pr(t, 20.0, 20.8);
    line(IT.l, [[1925, 912], [1920, 942], [1922, 972]], { w: 30 * (0.7 + 0.3 * Math.sin(t * 9)), col: K.gold, p: 0.95 * fade, draw: rib, seed: 780, boil: 0.5, taper: 0.1, streak: 1 });
    line(IT.l, [[1923, 914], [1918, 942], [1920, 968]], { w: 10, col: K.butter, p: 0.9 * fade, draw: rib, seed: 781, boil: 0.5, taper: 0.1 });
  }
  // golden pool that keeps growing
  const pg = ss(pr(t, 18.4, 25.0)), pw = lerp(14, 100, pg), ph = lerp(6, 36, Math.pow(pg, 0.9));
  const pool = ellipse(R.x + 14, topY + 34 + 28 * pg, pw, ph, 28);
  fill(IT.f, pool, { col: K.gold, p: 0.92, gap: 5.5, w: 8, ang: 0.5, seed: 790, boil: 0.35, over: 2, cross: pg > 0.4 });
  fill(IT.f, ellipse(R.x + 14 - pw * 0.25, topY + 28 + 20 * pg, pw * 0.5, ph * 0.38, 18), { col: K.butter, p: 0.8, gap: 5, w: 7, seed: 791, boil: 0.3, over: 0 });
  line(IT.l, pool, { w: 5.5, col: K.brown, seed: 792, boil: 0.6, closed: true, p: 0.85, taper: 0 });
  // golden rice, and slow drips down the mound
  const rg = ss(pr(t, 20.5, 25.0));
  if (rg > 0) fill(IT.f, dome, { col: K.butter, p: 0.5, gap: 8, w: 10, ang: 0.7, seed: 793, draw: rg, boil: 0.3, over: 0, cross: false });
  [[-70, 0.0], [34, 0.5], [92, 1.1]].forEach(([dx, dt], i) => {
    const dr = ss(pr(t, 20.6 + dt, 23.4 + dt)); if (dr <= 0) return;
    const x = R.x + dx * 0.75, y0 = topY + 58 + Math.abs(dx) * 0.25, y1 = R.y + 12;
    line(IT.l, [[x, y0], [x + 3, (y0 + y1) / 2], [x + (i - 1) * 4, y1 + 6]], { w: 16, col: K.gold, p: 0.95, draw: dr, seed: 795 + i, boil: 0.4, taper: 0.1 });
    if (dr > 0.95) dab(IT.f, x + (i - 1) * 4, y1 + 8, 13, { col: K.gold, p: 0.95, seed: 799 + i, boil: 0.3 });
  });
}

function drawFX(t, ts) {
  // gold twinkles around the plate while the ghee melts, white ones once the page is golden
  const R = RICE;
  if (t > 21 && t < 25.8) for (let k = 0; k < 6; k++) {
    const t0 = 21 + k * 0.55, u = (t - t0) / 1.0; if (u < 0 || u > 1) continue;
    const a = Math.sin(u * Math.PI);
    const pts = [[R.x - 190, 900], [R.x + 200, 880], [R.x - 130, 820], [R.x + 120, 800], [R.x - 40, 770], [R.x + 230, 960]][k];
    S.sparkle(FX, pts[0], pts[1], 14 + 22 * a, { col: K.gold, p: 0.4 + 0.6 * a, seed: 800 + k * 4, w: 7 });
  }
  // steam hearts rise from the golden rice and drift off to the right
  if (t > 26) for (let j = 0; j < 8; j++) {
    const t0 = 26.6 + 0.9 * j, u = (t - t0) / 3.2; if (u < 0 || u > 1) continue;
    const hx = 1960 + 230 * u + 24 * Math.sin(u * 7 + j), hy = 900 - 300 * u;
    const r = 16 + 16 * Math.sin(u * 3.14);
    const c = j % 2 ? K.white : K.pink;
    S.heart && line(FX, S.heart(hx, hy, r), { w: 8, col: c, p: 1 - pr(u, 0.6, 1), seed: 830 + j, draw: pr(u, 0, 0.15), boil: 0.6 });
  }
  // sparkles that twinkle on and off across the golden page
  if (t > 33) for (let k = 0; k < 12; k++) {
    const xy = [[1500, 440], [2300, 560], [800, 560], [2760, 700], [1300, 300], [2100, 330], [600, 940], [3000, 980], [1700, 1260], [2400, 1240], [1000, 1250], [400, 700]][k];
    const ph = (t * 0.8 + hash(k + 20) * 3) % 3; if (ph > 0.6) continue;
    const a = Math.sin(ph / 0.6 * Math.PI);
    S.sparkle(FX, xy[0], xy[1], 12 + 24 * a, { col: k % 2 ? K.white : K.butter, p: a, seed: 850 + k * 4, w: 7 });
  }
  // little hearts pop up as the family colours in
  if (t > 38 && t < 50) for (let j = 0; j < 14; j++) {
    const base = [SEATS.grandpa, SEATS.boy, SEATS.girl, SEATS.grandma][j % 4];
    const t0 = 38.2 + 0.8 * j, u = (t - t0) / 2.6; if (u < 0 || u > 1) continue;
    const hx = base + 150 * Math.sin(j * 1.7) + 30 * Math.sin(u * 6 + j), hy = 640 - 260 * u - (j % 4 === 3 ? 160 : 0);
    line(FX, S.heart(hx, hy, 15 + 8 * hash(j)), { w: 8, col: j % 3 === 0 ? K.pink : j % 3 === 1 ? K.tomato : K.gold, p: 1 - pr(u, 0.55, 1), seed: 880 + j, draw: pr(u, 0, 0.15), boil: 0.6 });
  }
}

export function subTo(SUBK, SUBT, t) {
  const Sx = SUBS.find(s => t >= s.t0 && t < s.t1); if (!Sx) return;
  const rv = pr(t, Sx.t0, Sx.t0 + 0.35);
  const g = SUBK.g; g.save(); g.font = '400 54px "Patrick Hand"'; const tw = g.measureText(Sx.text).width; g.restore();
  const cx = 960, cy = 1002, hw = tw / 2 + 46, hh = 44;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.beginPath();
  for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; const px = Math.cos(a), py = Math.sin(a); const sq = Math.pow(Math.abs(px), 0.3) * Math.sign(px); const n = 1 + 0.06 * Math.sin(a * 7 + 1.3) + 0.03 * Math.sin(a * 17); const X = cx + sq * hw * n, Y = cy + py * hh * n; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }
  g.closePath(); g.fill(); g.restore();
  text(SUBT, Sx.text, cx, cy + 18, { size: 54, col: K.ink, reveal: rv, seed: 11 + Sx.t0 * 3, p: 1, stroke: 1.2 });
}

export function frame(comp, t) {
  if (t >= PAGE_END) return fridgeFrame(comp, t, { drawPage, subTo });
  drawPage(comp, t, camT(t), { vig: 0.3 });
}
