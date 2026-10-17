// The ending: the finished page is pulled out and turns out to be taped on a fridge among a child's other drawings;
// the camera slides to the newest one, a jar of ghee on a golden plate, and the girl's line is written under it.
import { layer, clear, line, fill, dab, text, handCircle, ellipse, CAM, BOIL, W, H, sx, sy } from './crayon.js';
import { PAL } from './pal.js';
import { sparkle, heart, smiley } from './scene.js';
import { clamp, lerp, hash, track, ss } from '/core/lib.js';
const K = PAL.crayon;
const pr = (t, a, b) => clamp((t - a) / (b - a));
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return { c, g: c.getContext('2d') }; };
const snap = mk(), book = mk();
const DOOR = { f: layer(), l: layer() }, PAP = layer(), ART = { f: layer(), l: layer() }, TAPE = { f: layer(), l: layer() };
const glc = () => document.getElementById('gl');
const DOORPAPER = [0.84, 0.89, 0.9];

const camT = track([[50.0, [960, 540, 1]], [53.0, [1400, 540, 0.5]], [54.5, [1400, 540, 0.5]], [57.2, [2800, 500, 1.03]], [60, [2800, 500, 1.03]]]);
const wx = (x, cam) => (x - cam[0]) * cam[2] + W / 2, wy = (y, cam) => (y - cam[1]) * cam[2] + H / 2;

const PAPERS = {
  A: [-1000, -300, -150, 420], B: [-1000, 560, -150, 1280], C: [250, 1220, 1050, 1900], D: [1150, 1260, 1950, 1950],
  J: [2300, -20, 3300, 1000],
};
const rect = ([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

export function fridgeFrame(comp, t, api) {
  const cam = camT(t);
  BOIL.amp = 1;
  // 1) snapshot of the page, exactly as it was
  api.drawPage(comp, t, [1600, 900, 0.6], { subs: false, vig: 0.3 * (1 - pr(t, 50, 51.2)) });
  snap.g.setTransform(1, 0, 0, 1, 0, 0); snap.g.clearRect(0, 0, W, H); snap.g.drawImage(glc(), 0, 0);

  [CAM.x, CAM.y, CAM.s] = cam;   // drawPage moved the camera: take it back
  [DOOR.f, DOOR.l, PAP, ART.f, ART.l, TAPE.f, TAPE.l].forEach(clear);
  drawDoor();
  // paper patches for the other drawings + the new one
  const g = PAP.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000';
  for (const k in PAPERS) { const [x0, y0, x1, y1] = PAPERS[k]; g.fillRect(wx(x0, cam), wy(y0, cam), (x1 - x0) * cam[2], (y1 - y0) * cam[2]); }
  g.restore();
  for (const k in PAPERS) line(ART.l, [...rect(PAPERS[k]), PAPERS[k] && rect(PAPERS[k])[0]], { w: 4, p: 0.5, seed: 900 + k.charCodeAt(0), boil: 0.2, taper: 0, col: K.grey });
  drawOldDrawings();
  drawJarPage(t);

  // the page itself (real paper, with a soft shadow), slightly crooked once it is on the fridge
  const bg = book.g; bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, W, H);
  const rot = -0.013 * ss(pr(t, 50.3, 52.3)), z = cam[2];
  bg.save(); bg.translate(wx(960, cam), wy(540, cam)); bg.rotate(rot);
  bg.shadowColor = 'rgba(40,40,50,0.35)'; bg.shadowBlur = 36 * z; bg.shadowOffsetX = 8 * z; bg.shadowOffsetY = 14 * z;
  bg.drawImage(snap.c, -960 * z, -540 * z, 1920 * z, 1080 * z);
  bg.restore();
  // tape on the page, tilted with it
  const tp = (x, y, r) => { const c = Math.cos(r + rot), s = Math.sin(r + rot); const px = x - 960, py = y - 540; return [960 + px * Math.cos(rot) - py * Math.sin(rot), 540 + px * Math.sin(rot) + py * Math.cos(rot)]; };
  const tapes = [[tp(60, 20)[0], tp(60, 20)[1], -0.7 + rot], [tp(1860, 20)[0], tp(1860, 20)[1], 0.7 + rot], [tp(60, 1060)[0], tp(60, 1060)[1], 0.7 + rot], [tp(1860, 1060)[0], tp(1860, 1060)[1], -0.7 + rot]];
  const tk = pr(t, 51.8, 52.6);
  tapes.forEach(([x, y, r], i) => tape(x, y, r, i, tk));
  PAPERS && Object.entries(PAPERS).forEach(([k, [x0, y0, x1, y1]]) => { tape(x0 + 40, y0 + 8, -0.7, 10 + k.charCodeAt(0), 1); tape(x1 - 40, y0 + 8, 0.7, 20 + k.charCodeAt(0), 1); });

  comp.paperCam(cam[0] * 0.6, cam[1] * 0.6, cam[2] / 0.6);
  comp.begin(DOORPAPER);
  comp.crayon(DOOR.f.c); comp.crayon(DOOR.l.c);
  comp.knock(PAP.c);
  comp.crayon(ART.f.c); comp.crayon(ART.l.c);
  comp.image(book.c);
  comp.crayon(TAPE.f.c); comp.crayon(TAPE.l.c);
  comp.finish({ vig: 0.3 * pr(t, 50.5, 52) });
}

function tape(x, y, r, i, k) {
  if (k <= 0) return;
  const c = Math.cos(r), s = Math.sin(r), hw = 70, hh = 22;
  const poly = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([a, b]) => [x + a * c - b * s, y + a * s + b * c]);
  fill(TAPE.f, poly, { col: K.butter, p: 0.5, gap: 8, w: 10, ang: r + 1.5, seed: 920 + i, boil: 0.2, draw: k, over: 2 });
  line(TAPE.l, [...poly, poly[0]], { w: 3.5, p: 0.6, seed: 940 + i, boil: 0.3, draw: k, taper: 0, col: K.brown });
}

function drawDoor() {
  const R = [[-2600, -1500], [4400, -1500], [4400, 3000], [-2600, 3000]];
  fill(DOOR.f, R, { col: K.teal, p: 0.16, gap: 18, w: 18, ang: 1.5, seed: 950, boil: 0, over: 0 });
  line(DOOR.l, [[-2600, -560], [4400, -556]], { w: 8, seed: 951, boil: 0.3, taper: 0, p: 0.6 });
  // handle
  const h = [[-1380, -300], [-1300, -300], [-1300, 780], [-1380, 780]];
  fill(DOOR.f, h, { col: K.grey, p: 0.55, gap: 8, w: 11, ang: 1.5, seed: 952, boil: 0, over: 3 });
  line(DOOR.l, [...h, h[0]], { w: 7, seed: 953, boil: 0.5, taper: 0 });
  // magnets
  [[-760, -360, K.tomato], [4000, -120, K.leaf], [3600, 1500, K.butter], [-1100, 1700, K.pink]].forEach(([x, y, c], i) => {
    const m = handCircle(x, y, 46, 960 + i, 0, 20); fill(DOOR.f, m, { col: c, p: 0.9, gap: 6, w: 9, seed: 960 + i, boil: 0, over: 2 }); line(DOOR.l, m, { w: 5, seed: 965 + i, boil: 0.5 });
  });
}

function drawOldDrawings() {
  const F = ART.f, L = ART.l;
  // A: a sun over a house
  const [ax0, ay0] = PAPERS.A; const ac = [ax0 + 425, ay0 + 360];
  fill(F, [[ac[0] - 190, ac[1] + 40], [ac[0] + 190, ac[1] + 40], [ac[0] + 190, ac[1] + 260], [ac[0] - 190, ac[1] + 260]], { col: K.tomato, p: 0.7, gap: 10, w: 12, seed: 970, boil: 0, over: 5 });
  line(L, [[ac[0] - 190, ac[1] + 260], [ac[0] - 190, ac[1] + 40], [ac[0], ac[1] - 120], [ac[0] + 190, ac[1] + 40], [ac[0] + 190, ac[1] + 260], [ac[0] - 190, ac[1] + 260]], { w: 7, seed: 971, boil: 0.5, taper: 0 });
  fill(F, handCircle(ac[0] + 230, ac[1] - 220, 58, 972, 0, 24), { col: K.butter, p: 0.9, gap: 7, w: 10, seed: 973, boil: 0, over: 2 });
  line(L, handCircle(ac[0] + 230, ac[1] - 220, 58, 974, 0.05, 24), { w: 6, seed: 975, boil: 0.5 });
  // B: a blue fish
  const [bx0, by0] = PAPERS.B; const bc = [bx0 + 440, by0 + 360];
  const fish = [...ellipse(bc[0], bc[1], 230, 130, 28), [bc[0] + 220, bc[1]], [bc[0] + 360, bc[1] - 120], [bc[0] + 330, bc[1]], [bc[0] + 360, bc[1] + 120], [bc[0] + 220, bc[1]]];
  fill(F, ellipse(bc[0], bc[1], 230, 130, 28), { col: K.teal, p: 0.75, gap: 9, w: 12, seed: 976, boil: 0, over: 5 });
  line(L, ellipse(bc[0], bc[1], 230, 130, 28), { w: 7, seed: 977, boil: 0.5 });
  line(L, [[bc[0] + 215, bc[1]], [bc[0] + 350, bc[1] - 115], [bc[0] + 320, bc[1]], [bc[0] + 350, bc[1] + 115], [bc[0] + 215, bc[1]]], { w: 7, seed: 978, boil: 0.5 });
  dab(L, bc[0] - 120, bc[1] - 30, 12, { col: K.ink, seed: 979 });
  // C: a rainbow
  const [cx0, cy0] = PAPERS.C; const cc = [cx0 + 400, cy0 + 520];
  [K.tomato, K.butter, K.leaf, K.teal].forEach((c, i) => line(L, ellipse(cc[0], cc[1], 300 - i * 52, 300 - i * 52, 24, Math.PI, Math.PI * 2), { w: 22, col: c, seed: 980 + i, boil: 0.5, p: 0.9 }));
  // D: a cat
  const [dx0, dy0] = PAPERS.D; const dc = [dx0 + 400, dy0 + 380];
  fill(F, ellipse(dc[0], dc[1], 150, 140, 24), { col: K.gold, p: 0.7, gap: 9, w: 12, seed: 990, boil: 0, over: 4 });
  line(L, [[dc[0] - 150, dc[1] - 40], [dc[0] - 130, dc[1] - 190], [dc[0] - 50, dc[1] - 120], [dc[0] + 50, dc[1] - 120], [dc[0] + 130, dc[1] - 190], [dc[0] + 150, dc[1] - 40]], { w: 7, seed: 991, boil: 0.5 });
  line(L, ellipse(dc[0], dc[1], 150, 140, 24), { w: 7, seed: 992, boil: 0.5 });
  dab(L, dc[0] - 50, dc[1] - 20, 11, { col: K.ink, seed: 993 }); dab(L, dc[0] + 50, dc[1] - 20, 11, { col: K.ink, seed: 994 });
  line(L, [[dc[0] - 150, dc[1] + 10], [dc[0] - 260, dc[1] - 10]], { w: 4, seed: 995, boil: 0.3 }); line(L, [[dc[0] + 150, dc[1] + 10], [dc[0] + 260, dc[1] - 10]], { w: 4, seed: 996, boil: 0.3 });
}

// J: the newest drawing: a smiling jar on a golden plate, and the line
function drawJarPage(t) {
  const F = ART.f, L = ART.l, a = 54.6;
  if (t < a) return;
  const cx = 2800, plateY = 800;
  const plate = ellipse(cx, plateY, 350, 86, 40), pa = pr(t, a, a + 1.2);
  fill(F, plate, { col: K.gold, p: 0.85, gap: 8, w: 12, ang: 0.15, seed: 1000, boil: 0.3, draw: pr(t, a + 0.8, a + 2.0), over: 4, cross: true, crossP: 0.5 });
  line(L, plate, { w: 8, seed: 1001, boil: 0.8, draw: pa, closed: true, taper: 0 });
  line(L, ellipse(cx, plateY, 250, 56, 32), { w: 5, seed: 1002, boil: 0.6, draw: pr(t, a + 0.6, a + 1.6), p: 0.6, taper: 0 });
  // jar
  const jt = a + 0.8, top = 360, bottom = 760, w = 330;
  const body = [[cx - w / 2, top], [cx + w / 2, top], [cx + w / 2 + 14, bottom - 50], [cx + w / 2 - 10, bottom], [cx - w / 2 + 10, bottom], [cx - w / 2 - 14, bottom - 50]];
  fill(F, body, { col: K.gold, p: 0.9, gap: 8, w: 12, ang: 0.9, seed: 1010, boil: 0.4, draw: pr(t, jt + 0.8, jt + 2.2), over: 3, cross: true, crossP: 0.5 });
  fill(F, [[cx - w / 2 + 24, top + 50], [cx - w / 2 + 56, top + 50], [cx - w / 2 + 56, bottom - 80], [cx - w / 2 + 24, bottom - 80]], { col: K.butter, p: 0.75, gap: 6, w: 8, ang: 1.5, seed: 1011, boil: 0.3, draw: pr(t, jt + 1.8, jt + 2.4) });
  line(L, [...body, body[0]], { w: 8, seed: 1012, boil: 0.8, draw: pr(t, jt, jt + 1.0), taper: 0 });
  const lid = [[cx - w / 2 + 6, top], [cx + w / 2 - 6, top], [cx + w / 2 - 18, top - 70], [cx - w / 2 + 18, top - 70]];
  fill(F, lid, { col: K.tomato, p: 0.9, gap: 7, w: 11, ang: 0.4, seed: 1013, boil: 0.4, draw: pr(t, jt + 1.0, jt + 1.8), over: 2 });
  line(L, [...lid, lid[0]], { w: 7, seed: 1014, boil: 0.8, draw: pr(t, jt + 0.6, jt + 1.4), taper: 0 });
  // the jar has a face (child logic)
  const fa = pr(t, jt + 2.2, jt + 2.9);
  dab(L, cx - 62, 470, 15, { col: K.ink, seed: 1020, p: fa }); dab(L, cx + 62, 470, 15, { col: K.ink, seed: 1021, p: fa });
  dab(L, cx - 62 + 5, 465, 5, { col: K.white, seed: 1022, p: fa, over: 0 }); dab(L, cx + 62 + 5, 465, 5, { col: K.white, seed: 1023, p: fa, over: 0 });
  line(L, ellipse(cx, 500, 52, 38, 14, 0.3, Math.PI - 0.3), { w: 7, seed: 1024, boil: 0.5, draw: fa });
  dab(F, cx - 110, 505, 22, { col: K.pink, p: 0.8 * fa, seed: 1025 }); dab(F, cx + 110, 505, 22, { col: K.pink, p: 0.8 * fa, seed: 1026 });
  // label
  const lab = ellipse(cx, 640, 112, 76, 24);
  fill(F, lab, { col: K.cream, p: 0.95, gap: 6, w: 9, seed: 1030, boil: 0.2, draw: pr(t, jt + 2.2, jt + 2.7), over: 0 });
  line(L, lab, { w: 5, seed: 1031, boil: 0.6, closed: true, draw: pr(t, jt + 2.2, jt + 2.7) });
  text(L, 'GHEE', sx(cx), sy(662), { size: 78 * CAM.s, font: 'Gaegu', weight: 700, col: K.ink, seed: 1032, p: 0.95, stroke: 1.5, reveal: pr(t, jt + 2.6, jt + 3.1) });
  // sparkles and a spoon
  [[cx - 300, 330, 1], [cx + 310, 400, 2], [cx - 280, 640, 3], [cx + 320, 640, 4], [cx, 245, 5]].forEach(([x, y, n]) => {
    const st = a + 2.8 + 0.2 * n, ph = pr(t, st, st + 0.5);
    if (ph > 0) sparkle(L, x, y, 30 + 8 * Math.sin(t * 5 + n), { col: n % 2 ? K.gold : K.pink, p: ph, seed: 1040 + n * 4, w: 8 });
  });
  // the line, written like a child would
  const tw = pr(t, 56.3, 58.5);
  if (tw > 0) text(L, 'A spoonful of happy.', sx(cx), sy(935), { size: 88 * CAM.s, font: 'Gaegu', weight: 700, col: K.ink, seed: 1060, p: 0.97, stroke: 2, reveal: tw });
  if (t > 58.4) line(L, [[cx - 400, 968], [cx - 200, 978], [cx, 966], [cx + 200, 978], [cx + 400, 966]], { w: 9, col: K.gold, seed: 1070, boil: 0.6, draw: pr(t, 58.4, 59.1), p: 0.95 });
}
