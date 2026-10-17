// The dining room, the family, the plate: all drawn with the crayon engine.
// World = one 3200×1800 page (full page = camera s 0.6).
import { line, fill, dab, ellipse, handCircle, text, xf } from './crayon.js';
import { part, tube, curve } from './rig.js';
import { PAL } from './pal.js';
import { clamp, lerp, hash } from '/core/lib.js';
export const K = PAL.crayon;
export const pr = (t, a, b) => clamp((t - a) / (b - a));

export const TB = { back: 956, front: 1130, bx0: 520, bx1: 2880, fx0: 380, fx1: 3020, hem: 1480 };
export const FLOOR_Y = 1330;
export const PLATE = { girl: [1900, 1050], grandpa: [760, 1050], boy: [1290, 1050] };
export const RICE = { x: 1900, y: 1040, rx: 108, h: 112 };   // girl's rice mound
export const SUN = [1900, 250, 110];
export const WIN = { x0: 250, y0: 230, x1: 690, y1: 720 };
export const SEATS = { grandpa: 760, boy: 1290, girl: 1900, grandma: 2450 };

// ——— small drawing helpers (world coordinates) ———
export function heart(cx, cy, r, n = 30) {
  const o = [];
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; o.push([cx + r * Math.pow(Math.sin(a), 3), cy - r * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16]); }
  return o;
}
export function sparkle(L, x, y, r, o = {}) {
  const c = o.col || K.white, w = o.w ?? 6, p = o.p ?? 1, sd = o.seed ?? 1, d = o.draw ?? 1;
  line(L, [[x - r, y], [x + r, y]], { w, col: c, p, seed: sd, wob: 0.3, draw: d, boil: 0.5 });
  line(L, [[x, y - r * 1.15], [x, y + r * 1.15]], { w, col: c, p, seed: sd + 1, wob: 0.3, draw: d, boil: 0.5 });
  line(L, [[x - r * 0.45, y - r * 0.45], [x + r * 0.45, y + r * 0.45]], { w: w * 0.7, col: c, p, seed: sd + 2, wob: 0.3, draw: d, boil: 0.5 });
}
export function smiley(L, x, y, r, o = {}) {
  const c = o.col || K.white, w = o.w ?? 8, sd = o.seed ?? 1, d = o.draw ?? 1, p = o.p ?? 1;
  line(L, handCircle(x, y, r, sd, 0.08, 36), { w, col: c, p, seed: sd, draw: d, boil: 0.6 });
  dab(L, x - r * 0.34, y - r * 0.2, r * 0.1, { col: c, p, seed: sd + 3, boil: 0.5 });
  dab(L, x + r * 0.34, y - r * 0.2, r * 0.1, { col: c, p, seed: sd + 4, boil: 0.5 });
  line(L, ellipse(x, y + r * 0.05, r * 0.5, r * 0.42, 14, 0.25, Math.PI - 0.25), { w: w * 0.85, col: c, p, seed: sd + 5, draw: d, boil: 0.6 });
}
export function daisy(L, x, y, r, o = {}) {
  const c = o.col || K.white, sd = o.seed ?? 1, d = o.draw ?? 1;
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; line(L, ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.42, r * 0.28, 12, 0, 6.3, a), { w: o.w ?? 7, col: c, seed: sd + k, draw: d, boil: 0.5 }); }
  line(L, handCircle(x, y, r * 0.26, sd + 9, 0, 14), { w: o.w ?? 7, col: c, seed: sd + 10, draw: d, boil: 0.5 });
}

const tablePoly = [[TB.bx0, TB.back], [TB.bx1, TB.back], [TB.fx1, TB.front], [TB.fx0, TB.front]];
function clothPoly() {
  const x0 = TB.fx0 + 30, x1 = TB.fx1 - 30, top = TB.front, hem = TB.hem - 45, n = 17, w = (x1 - x0) / n;
  const pts = [[x0, top], [x1, top], [x1, hem]];
  for (let i = 0; i < n; i++) { const xa = x1 - i * w; for (let k = 1; k <= 8; k++) pts.push([xa - w * k / 8, hem + Math.sin(k / 8 * Math.PI) * 48]); }
  pts.push([x0, hem]);
  return pts;
}
export const CLOTH = clothPoly();

// ——— the room (pre-wash layers F = fills, L = lines) ———
// g: draw progress {wall, win, clock, table, cloth, plates, floor}   col: colour-in progress {cloth, win, floor}
export function drawRoom(F, L, g, col, t) {
  const bo = 0.6;
  // floor
  const floor = [[-60, FLOOR_Y], [3260, FLOOR_Y], [3260, 1860], [-60, 1860]];
  fill(F, floor, { col: K.grey, p: 0.24, gap: 16, w: 16, ang: 0.12, seed: 11, draw: g.floor, boil: 0, over: 8 });
  if (col.floor > 0) fill(F, floor, { col: K.butter, p: 0.55, gap: 14, w: 15, ang: 0.1, seed: 12, draw: col.floor, boil: 0, over: 8 });
  line(L, [[-60, FLOOR_Y], [3260, FLOOR_Y + 6]], { w: 7, seed: 13, draw: g.floor, boil: bo });
  // wall: a faint grey day
  fill(F, [[-60, -60], [3260, -60], [3260, FLOOR_Y], [-60, FLOOR_Y]], { col: K.grey, p: 0.1, gap: 22, w: 18, ang: 1.45, seed: 14, draw: g.wall, boil: 0, over: 6 });
  // window
  const w = WIN;
  const wp = [[w.x0, w.y0], [w.x1, w.y0], [w.x1, w.y1], [w.x0, w.y1]];
  fill(F, wp, { col: K.grey, p: 0.14, gap: 14, w: 14, ang: 0.8, seed: 15, draw: g.win, boil: 0, over: 3 });
  if (col.win > 0) { fill(F, wp, { col: K.teal, p: 0.5, gap: 12, w: 13, ang: 0.7, seed: 16, draw: col.win, boil: 0, over: 3 }); fill(F, [[w.x0 + 40, w.y0 + 40], [w.x0 + 200, w.y0 + 40], [w.x0 + 120, w.y1 - 40]], { col: K.butter, p: 0.55, gap: 10, w: 12, ang: 0.3, seed: 17, draw: col.win, boil: 0 }); }
  line(L, [...wp, wp[0]], { w: 8, seed: 18, draw: g.win, boil: bo });
  line(L, [[(w.x0 + w.x1) / 2, w.y0], [(w.x0 + w.x1) / 2, w.y1]], { w: 7, seed: 19, draw: g.win, boil: bo });
  line(L, [[w.x0, (w.y0 + w.y1) / 2], [w.x1, (w.y0 + w.y1) / 2]], { w: 7, seed: 20, draw: g.win, boil: bo });
  line(L, [[w.x0 - 40, w.y1 + 18], [w.x1 + 40, w.y1 + 18], [w.x1 + 40, w.y1 + 50], [w.x0 - 40, w.y1 + 50], [w.x0 - 40, w.y1 + 18]], { w: 7, seed: 21, draw: g.win, boil: bo });
  // clock (the tick of a quiet dinner)
  const cx = 1180, cy = 250, cr = 84;
  line(L, handCircle(cx, cy, cr, 31, 0.06, 40), { w: 8, seed: 30, draw: g.clock, boil: bo });
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; const r0 = i % 3 ? cr - 18 : cr - 26; line(L, [[cx + Math.sin(a) * r0, cy - Math.cos(a) * r0], [cx + Math.sin(a) * (cr - 8), cy - Math.cos(a) * (cr - 8)]], { w: 5, seed: 32 + i, draw: g.clock, boil: 0.3, taper: 0 }); }
  if (g.clock > 0.99) {
    const sec = Math.floor(t) % 60; const a = sec / 60 * 6.283, ah = 0.9 + t * 0.0003;
    line(L, [[cx, cy], [cx + Math.sin(ah) * 40, cy - Math.cos(ah) * 40]], { w: 7, seed: 50, boil: 0.3, taper: 0 });
    line(L, [[cx, cy], [cx + Math.sin(a) * 60, cy - Math.cos(a) * 60]], { w: 4, seed: 51, boil: 0.2, col: K.tomato, taper: 0 });
  }
  // table top
  fill(F, tablePoly, { col: K.grey, p: 0.3, gap: 13, w: 15, ang: 0.05, seed: 40, draw: g.table, boil: 0, over: 5 });
  fill(F, tablePoly, { col: K.brown, p: 0.12, gap: 20, w: 15, ang: -0.04, seed: 41, draw: g.table, boil: 0, over: 5 });
  line(L, [...tablePoly, tablePoly[0]], { w: 8, seed: 42, draw: g.table, boil: bo, taper: 0 });
  // cloth
  fill(F, CLOTH, { col: K.grey, p: 0.26, gap: 14, w: 16, ang: 1.45, seed: 43, draw: g.cloth, boil: 0, over: 6 });
  if (col.cloth > 0) { fill(F, CLOTH, { col: K.tomato, p: 0.62, gap: 12, w: 14, ang: 1.4, seed: 44, draw: col.cloth, boil: 0, over: 6, cross: true, crossP: 0.5 }); }
  line(L, [...CLOTH.slice(0, 3)], { w: 7, seed: 45, draw: g.cloth, boil: bo });
  line(L, CLOTH.slice(2), { w: 7, seed: 46, draw: g.cloth, boil: bo });
  line(L, [CLOTH[CLOTH.length - 1], CLOTH[0]], { w: 7, seed: 47, draw: g.cloth, boil: bo });
  // plates and their sad suppers
  const pl = (x, y, rx, ry, sd) => {
    const el = ellipse(x, y, rx, ry, 40);
    fill(F, el, { col: K.cream, p: 0.6, gap: 8, w: 11, ang: 0.2, seed: sd, draw: g.plin, boil: 0, over: 2 });
    line(L, el, { w: 7, seed: sd + 1, draw: g.plates, boil: bo, closed: true, taper: 0 });
    line(L, ellipse(x, y, rx * 0.72, ry * 0.68, 32), { w: 5, seed: sd + 2, draw: g.plin, boil: bo, p: 0.6, closed: true, taper: 0 });
  };
  [[PLATE.grandpa, 160, 41, 60], [PLATE.boy, 140, 36, 70]].forEach(([pc, rx, ry, sd]) => {
    pl(pc[0], pc[1], rx, ry, sd);
    const m = [...ellipse(pc[0] - 10, pc[1] + 4, rx * 0.4, 44, 20, Math.PI, Math.PI * 2), [pc[0] + rx * 0.4 - 10, pc[1] + 4]];
    fill(F, m, { col: K.grey, p: 0.4, gap: 8, w: 10, ang: 0.6, seed: sd + 4, draw: g.food, boil: 0 });
    line(L, m, { w: 5.5, seed: sd + 5, draw: g.food, boil: bo });
  });
  const [gx, gy] = PLATE.girl;
  pl(gx, gy, 215, 56, 80);
  // roti and a little bowl of dal (grey today)
  const roti = ellipse(gx - 120, gy + 8, 90, 26, 24);
  fill(F, roti, { col: K.grey, p: 0.38, gap: 7, w: 9, ang: 0.1, seed: 84, draw: g.food, boil: 0 });
  line(L, roti, { w: 5.5, seed: 85, draw: g.food, boil: bo, closed: true, taper: 0 });
  const dal = [...ellipse(gx + 140, gy - 4, 52, 36, 20, Math.PI, Math.PI * 2)];
  fill(F, dal, { col: K.grey, p: 0.4, gap: 7, w: 9, ang: 0.4, seed: 86, draw: g.food, boil: 0 });
  line(L, [...dal, dal[0]], { w: 5.5, seed: 87, draw: g.food, boil: bo });
}


// the girl's rice, drawn in front of her (after the people) so the mound hides her hands' edge and the plate rim
export function drawRice(G, prog) {
  const R = RICE, bo = 0.6;
  const dome = [...ellipse(R.x, R.y, R.rx, R.h, 30, Math.PI, Math.PI * 2), [R.x - R.rx, R.y]];
  part(G, dome, { col: K.cream, p: 0.8, gap: 8, w: 10, ang: 0.7, seed: 90, draw: prog, boil: 0 }, null);
  fill(G.f, dome, { col: K.grey, p: 0.2, gap: 11, w: 10, ang: -0.5, seed: 91, draw: prog, boil: 0 });
  line(G.l, [...dome, [R.x - R.rx, R.y]], { w: 6, seed: 92, draw: prog, boil: bo });
  for (let i = 0; i < 14; i++) { const a = Math.PI + 0.35 + hash(i + 3) * (Math.PI - 0.7), rr = 0.25 + hash(i * 1.7) * 0.6; const px = R.x + Math.cos(a) * R.rx * rr, py = R.y + Math.sin(a) * R.h * rr; line(G.l, [[px - 8, py + 3], [px + 8, py - 3]], { w: 4, seed: 100 + i, p: 0.45, draw: prog, boil: 0.3, taper: 0.4 }); }
}

// white-wax secrets, hidden from the very first frame (revealed by the amber wash)
export function drawHidden(L, g) {
  const d = g, W = K.white;
  // sun on the wall
  const [sx_, sy_, sr] = SUN;
  smiley(L, sx_, sy_, sr, { col: W, w: 11, seed: 200, draw: d });
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; line(L, [[sx_ + Math.cos(a) * (sr + 28), sy_ + Math.sin(a) * (sr + 28)], [sx_ + Math.cos(a) * (sr + 78 + (i % 2) * 22), sy_ + Math.sin(a) * (sr + 78 + (i % 2) * 22)]], { w: 10, col: W, seed: 220 + i, draw: d, boil: 0.4 }); }
  // daisies on the wall
  [[470, 880], [980, 800], [1560, 850], [2260, 790], [2680, 860], [3060, 760], [1130, 560], [2700, 540]].forEach(([x, y, ], i) => daisy(L, x, y, 44, { col: W, seed: 300 + i * 12, draw: d, w: 8 }));
  // hearts along the tablecloth
  for (let i = 0; i < 11; i++) heartLine(L, 530 + i * 238, 1290, 40, 400 + i, d);
  for (let i = 0; i < 10; i++) heartLine(L, 650 + i * 238, 1390, 30, 440 + i, d);
  // each plate is secretly smiling
  [[PLATE.grandpa, 100], [PLATE.boy, 90]].forEach(([pc, r], i) => line(L, ellipse(pc[0], pc[1] + 3, r * 0.5, 14, 12, 0.3, Math.PI - 0.3), { w: 7, col: W, seed: 500 + i, draw: d, boil: 0.4 }));
  // sparkles by the window
  [[330, 320], [590, 410], [470, 600]].forEach(([x, y], i) => sparkle(L, x, y, 26, { col: W, seed: 520 + i * 4, w: 8, draw: d }));
  // little hearts above the boy
  heartLine(L, 1215, 700, 26, 560, d); heartLine(L, 1420, 640, 20, 561, d);
}
function heartLine(L, x, y, r, sd, d) { line(L, heart(x, y, r), { w: 8, col: K.white, seed: sd, draw: d, boil: 0.5 }); }

// ——— people ———
const ARM = {
  rest: { L: [[-140, -215], [-200, -90], [-125, 62]], R: [[140, -215], [200, -90], [125, 62]] },
  up: ph => ({ L: [[-140, -215], [-235, -320], [-250 + ph * 14, -470 - ph * 22]], R: [[140, -215], [235, -320], [250 - ph * 14, -470 - ph * 22]] }),
  clap: ph => ({ L: [[-140, -215], [-175, -120], [-34 - ph * 18, -168]], R: [[140, -215], [175, -120], [34 + ph * 18, -168]] }),
};
export const ARMS = ARM;

const CLO = { girl: K.teal, boy: K.leaf, grandpa: K.tomato, grandma: K.butter };
// o: x,y(base on table back edge), s, kind, expr, cheek, vivid, pl, pf, seed, lift, look, arms{L,R}, held(handle R hand extra), tilt
export function person(C, o) {
  const { x, y, kind } = o, s = o.s ?? 1, lift = o.lift ?? 0, sd = o.seed ?? 1;
  const X = u => x + u * s, Y = v => y - lift + v * s;
  const P = pts => pts.map(([u, v]) => [X(u), Y(v)]);
  const pl = o.pl ?? 1, pf = o.pf ?? 1, vv = o.vivid ?? 0, bo = o.boil ?? 0.8, ws = s * 0.92 + 0.08;
  const skin = { col: K.peach, p: 0.28 + 0.5 * vv, gap: 8, w: 10, ang: 0.7, seed: sd + 1, draw: pf, boil: 0.5 };
  const oln = (w, sd2) => ({ w: w * ws, seed: sd + sd2, draw: pl, boil: bo });
  const cloth = CLO[kind];
  const hairCol = kind === 'grandma' || kind === 'grandpa' ? K.grey : K.brown;
  const hairP = kind === 'grandma' || kind === 'grandpa' ? 0.55 : 0.82;
  const hf = { col: hairCol, p: hairP, gap: 7, w: 10, ang: 1.1, seed: sd + 3, draw: pf, boil: 0.4 };
  const bottom = lift / s;
  const arms = o.arms || ARM.rest;
  // back hair
  if (kind === 'girl') {
    [-1, 1].forEach((sgn, i) => { const pig = [[100 * sgn, -420], [165 * sgn, -410], [205 * sgn, -345], [196 * sgn, -255], [150 * sgn, -212], [124 * sgn, -262], [115 * sgn, -345]]; part(C, P(curve(pig, 4)), hf, oln(7, 10 + i)); });
  }
  if (kind === 'grandma') part(C, P(handCircle(0, -512, 54, sd + 7, 0, 24)), hf, oln(7, 12));
  if (kind === 'grandpa') [-1, 1].forEach((sg, i) => part(C, P(ellipse(112 * sg, -372, 34, 46, 16)), { ...hf, p: 0.5 }, oln(6, 14 + i)));
  // torso (open at the bottom: it disappears behind the table)
  const T = [[-150, bottom], [-168, -140], [-140, -228], [-70, -262], [70, -262], [140, -228], [168, -140], [150, bottom]];
  part(C, P(T), { col: K.grey, p: 0.34, gap: 9, w: 12, ang: 1.3, seed: sd + 20, draw: pf, boil: 0.4 }, null);
  if (vv > 0) { fill(C.f, P(T), { col: cloth, p: 0.82, gap: 9, w: 12, ang: 1.25, seed: sd + 21, draw: vv, boil: 0.4, over: 4, cross: true, crossP: 0.55 }); }
  line(C.l, P([[-150, bottom], [-168, -140], [-140, -228], [-70, -262], [70, -262], [140, -228], [168, -140], [150, bottom]]), oln(7, 22));
  line(C.l, P([[-42, -262], [0, -214], [42, -262]]), oln(5.5, 23));
  if (kind === 'grandma' && vv > 0) {   // saree drape across the chest
    const dr = [[-168, -140], [-140, -228], [-70, -262], [30, -262], [150, -80], [150, bottom], [60, bottom], [-168, -20]];
    fill(C.f, P(dr), { col: K.tomato, p: 0.78, gap: 9, w: 12, ang: 0.8, seed: sd + 24, draw: vv, boil: 0.4, over: 3 });
    line(C.l, P([[30, -262], [150, -80]]), oln(6, 25));
  }
  // neck, ears, head
  part(C, P([[-30, -255], [30, -255], [30, -305], [-30, -305]]), skin, oln(5.5, 26));
  [-1, 1].forEach((sg, i) => part(C, P(handCircle(112 * sg, -372, 22, sd + 28 + i, 0, 14)), skin, oln(5.5, 30 + i)));
  const headC = ellipse(0, -378, 112, 104, 40);
  part(C, P(headC), skin, oln(8, 32));
  // arms (drawn over torso, under nothing else)
  for (const side of ['L', 'R']) {
    const a = arms[side]; const w0 = 58 * s, w1 = 48 * s;
    const tp = tube(curve(P(a), 6), w0, w1);
    part(C, tp, { col: K.grey, p: 0.34, gap: 9, w: 11, ang: 1.0, seed: sd + 40, draw: pf, boil: 0.4 }, oln(6.5, side === 'L' ? 41 : 42));
    if (vv > 0) fill(C.f, tp, { col: cloth, p: 0.82, gap: 9, w: 11, ang: 0.95, seed: sd + 43, draw: vv, boil: 0.4, over: 3 });
    const hd = P([a[2]])[0];
    part(C, handCircle(hd[0], hd[1], 30 * s, sd + 44, 0, 16), skin, oln(6, side === 'L' ? 45 : 46));
  }
  // hair front
  const arc = (r0, r1, a0, a1, n = 24) => ellipse(0, -378, r0, r1, n, a0, a1);
  if (kind === 'girl') {
    const cap = [...arc(120, 112, Math.PI + 0.12, Math.PI * 2 - 0.12), [100, -428], [58, -412], [14, -436], [-30, -414], [-72, -434], [-100, -426]];
    part(C, P(cap), hf, null, { kn: false }); line(C.l, P(arc(120, 112, Math.PI + 0.12, Math.PI * 2 - 0.12)), oln(7, 50));
    line(C.l, P([[100, -428], [58, -412], [14, -436], [-30, -414], [-72, -434], [-100, -426]]), oln(5, 51));
    if (vv > 0.3) [-1, 1].forEach((sg, i) => { fill(C.f, P([[132 * sg, -252], [194 * sg, -290], [198 * sg, -214]]), { col: K.tomato, p: 0.9, gap: 6, w: 8, seed: sd + 52 + i, draw: clamp((vv - 0.3) / 0.7), boil: 0.3 }); line(C.l, P([[132 * sg, -252], [194 * sg, -290], [198 * sg, -214], [132 * sg, -252]]), oln(4.5, 54 + i)); });
  } else if (kind === 'boy') {
    const spikes = [];
    for (let i = 0; i <= 8; i++) { const a = Math.PI + 0.1 + (Math.PI - 0.2) * i / 8; spikes.push([Math.cos(a) * 118, -380 + Math.sin(a) * 110]); if (i < 8) { const a2 = a + (Math.PI - 0.2) / 16; spikes.push([Math.cos(a2) * 150, -380 + Math.sin(a2) * 142]); } }
    part(C, P([...spikes, [96, -418], [50, -402], [-10, -420], [-60, -400], [-98, -414]]), hf, null, { kn: false });
    line(C.l, P(spikes), oln(6.5, 56));
    line(C.l, P([[96, -418], [50, -402], [-10, -420], [-60, -400], [-98, -414]]), oln(5, 57));
  } else if (kind === 'grandma') {
    const cap = [...arc(118, 108, Math.PI + 0.1, Math.PI * 2 - 0.1), [100, -400], [30, -440], [0, -452], [-30, -440], [-100, -400]];
    part(C, P(cap), hf, null, { kn: false });
    line(C.l, P(arc(118, 108, Math.PI + 0.1, Math.PI * 2 - 0.1)), oln(7, 58)); line(C.l, P([[100, -400], [30, -440], [0, -452], [-30, -440], [-100, -400]]), oln(5, 59));
    line(C.l, P([[0, -482], [0, -450]]), oln(4.5, 60));
    if (vv > 0.5) dab(C.f, X(0), Y(-432), 8 * s, { col: K.tomato, p: 0.95, seed: sd + 61, boil: 0.3 });
  } else if (kind === 'grandpa') {
    [-1, 1].forEach((sg, i) => { line(C.l, P([[70 * sg, -472], [98 * sg, -462], [118 * sg, -432]]), { ...oln(5, 62 + i), col: K.grey }); });
  }
  // face
  const ex = 40, ey = -385, lk = o.look || [0, 0];
  const expr = o.expr || 'flat';
  const glasses = kind === 'grandma' || kind === 'grandpa';
  const eyeR = (kind === 'boy' ? 10 : 9) * s;
  const eyeClosed = expr === 'joy';
  [-1, 1].forEach((sg, i) => {
    const cx = X(ex * sg), cy = Y(ey);
    if (eyeClosed) { line(C.l, P(ellipse(ex * sg, ey + 6, 18, 14, 10, Math.PI + 0.3, Math.PI * 2 - 0.3)), oln(6, 70 + i)); }
    else { dab(C.l, cx + lk[0] * 6, cy + lk[1] * 5, eyeR, { col: K.ink, p: 0.98, seed: sd + 72 + i, gap: 3.5, w: 5, over: 1, boil: 0.2 }); dab(C.l, cx + lk[0] * 6 + eyeR * 0.35, cy + lk[1] * 5 - eyeR * 0.35, eyeR * 0.3, { col: K.white, p: 1, seed: sd + 74 + i, gap: 3, w: 4, over: 0, boil: 0.1 }); }
    if (glasses) line(C.l, P(handCircle(ex * sg, ey, 36, sd + 76 + i, 0, 22).map(([a, b]) => [a, b])), { ...oln(4.5, 78 + i), p: 0.9 });
    const br = expr === 'sad' ? [[(ex + 16) * sg, ey - 40], [(ex - 18) * sg, ey - 30]] : expr === 'flat' ? null : [[(ex + 16) * sg, ey - 38], [(ex - 4) * sg, ey - 46], [(ex - 22) * sg, ey - 38]];
    if (br) line(C.l, P(br), { ...oln(5, 80 + i), p: 0.8 });
  });
  if (glasses) line(C.l, P([[-6, ey - 4], [6, ey - 4]]), oln(4, 82));
  if (kind === 'grandpa') {
    const mus = [[-62, -338], [-32, -354], [0, -344], [32, -354], [62, -338], [36, -320], [0, -332], [-36, -320]];
    fill(C.f, P(mus), { col: K.grey, p: 0.75, gap: 4.5, w: 6, seed: sd + 83, draw: pf, boil: 0.3, over: 1 }); line(C.l, P([...mus, mus[0]]), { ...oln(4.5, 84), col: K.grey, p: 0.9 });
  }
  const my = kind === 'grandpa' ? -304 : -325;
  if (expr === 'flat') line(C.l, P([[-20, my], [20, my + 1]]), oln(6, 90));
  else if (expr === 'sad') line(C.l, P(ellipse(0, my + 16, 26, 16, 12, Math.PI + 0.3, Math.PI * 2 - 0.3)), oln(6, 90));
  else if (expr === 'smile') line(C.l, P(ellipse(0, my - 12, 36, 24, 14, 0.25, Math.PI - 0.25)), oln(6.5, 90));
  else if (expr === 'wow') { part(C, P(ellipse(0, my + 4, 14, 18, 16)), { col: K.tomato, p: 0.8, gap: 4, w: 6, seed: sd + 91, draw: pf, boil: 0.3, over: 0 }, oln(5, 92)); }
  else {   // grin / joy: open mouth
    const wd = expr === 'joy' ? 50 : 42, dp = expr === 'joy' ? 44 : 32;
    const mp = ellipse(0, my - 14, wd, dp, 16, 0, Math.PI);
    part(C, P([...mp, mp[0]]), { col: K.tomato, p: 0.85, gap: 4.5, w: 6, seed: sd + 91, draw: pf, boil: 0.3, over: 0 }, oln(6, 92));
    fill(C.f, P(ellipse(0, my + dp * 0.55, wd * 0.5, dp * 0.35, 10, 0, Math.PI)), { col: K.pink, p: 0.8, gap: 3.5, w: 5, seed: sd + 93, draw: pf, boil: 0.2, over: 0 });
  }
  if (o.cheek > 0.02) [-1, 1].forEach((sg, i) => dab(C.f, X(76 * sg), Y(-338), (14 + 12 * o.cheek) * s, { col: K.pink, p: 0.3 + 0.62 * o.cheek, seed: sd + 94 + i, gap: 4.5, w: 6, over: 2, boil: 0.5 }));
}
