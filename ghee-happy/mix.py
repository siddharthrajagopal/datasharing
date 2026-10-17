# Foley + ambience + narration + score → out/mix.wav
import os, sys, json, numpy as np, soundfile as sf, soxr
from scipy.ndimage import uniform_filter1d
LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, os.path.join(LIB, 'core/audio'))
from sfx import *
HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, 'events.json'))); DUR = E['dur']; EV = E['ev']; N = int(DUR * SR)
tt = np.arange(N) / SR; rng = np.random.default_rng(21)
def nz(d): return rng.standard_normal(int(round(d * SR)))
def T(d): return np.arange(int(round(d * SR))) / SR
def fade(x, a=.01, b=.03):
    x = x.copy(); n = len(x); ia, ib = min(n, int(a * SR)), min(n, int(b * SR))
    if ia: x[:ia] *= np.linspace(0, 1, ia)
    if ib: x[-ib:] *= np.linspace(1, 0, ib)
    return x
def envelope(d, pts): k = np.array(pts, float); return np.interp(T(d), k[:, 0] * d, k[:, 1])
# crayon on toothy paper: stick-slip band-passed noise, grain follows speed
def crayon(d, speed=1.0, v=1.0):
    n = nz(d); rate = int(SR / (70 + 90 * speed))
    grain = uniform_filter1d((rng.random(len(n) // rate + 2) ** 3).repeat(rate)[:len(n)], rate // 3 + 1)
    x = bp(n, 1400 + 600 * speed, 6500, 2) * (0.35 + grain * 1.6) + bp(n, 300, 900, 1) * 0.15
    return fade(x * envelope(d, [(0, 0), (.08, 1), (.85, .9), (1, 0)]) * v * 0.22, .01, .04)
def scribble(d, rate=6.5, v=1.0):
    out = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.08:
        Ln = 1 / rate * (0.8 + 0.4 * rng.random()); s = crayon(min(Ln, d - t), 1.3, v * (0.7 + 0.3 * rng.random()))
        i = int(t * SR); out[i:i + len(s)] += s[:len(out) - i]; t += Ln
    return out
def write(d, v=1.0):
    out = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.1:
        Ln = 0.07 + 0.1 * rng.random(); s = crayon(Ln, 0.8, v); i = int(t * SR); out[i:i + len(s)] += s[:len(out) - i]; t += Ln + 0.03 * rng.random()
    return out
def rustle(d=0.6, v=1.0):
    n = nz(d); cr = (rng.random(len(n)) < 0.004) * rng.standard_normal(len(n)) * 3
    return fade((hp(n, 900) * 0.25 + bp(cr, 1500, 8000)) * envelope(d, [(0, 0), (.2, 1), (1, 0)]) * v * 0.25)
def tap(v=1.0, f=900):
    t = T(0.08); return fade((bp(nz(0.08), f, f * 3) * np.exp(-t / 0.012) + np.sin(2 * np.pi * f * 0.35 * t) * np.exp(-t / 0.02) * 0.4) * 0.35 * v, .001, .02)
def clink(v=1.0):   # glass jar set on wood
    t = T(0.5); x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for a, f, tau in [(1, 2350, .09), (.6, 3720, .06), (.4, 5100, .04)])
    return fade((x * 0.3 + bp(nz(0.5), 800, 3000) * np.exp(-t / .01) * .3) * v)
def twist(v=1.0):   # a lid unscrewed: squeaky stick-slip, then a soft pop
    d = 0.5; t = T(d); f = 1200 + 500 * t / d + 120 * np.sin(2 * np.pi * 38 * t)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.1 * envelope(d, [(0, 0), (.1, 1), (.9, .6), (1, 0)]) * (0.5 + 0.5 * (np.sin(2 * np.pi * 22 * t) > 0))
    p = np.zeros(int(0.2 * SR)); tp = T(0.2); p = (np.sin(2 * np.pi * 220 * tp * (1 - tp)) * np.exp(-tp / .03) * .5 + lp(nz(.2), 900) * np.exp(-tp / .02) * .4)
    return np.concatenate([fade(x), fade(p)]) * v
def dipsound(v=1.0):   # spoon into ghee
    t = T(0.3); return fade((lp(nz(.3), 700) * np.exp(-t / .08) * .5 + np.sin(2 * np.pi * np.cumsum(260 - 120 * t / .3) / SR) * np.exp(-t / .1) * .25) * v)
def pour(d, v=1.0):   # thick golden trickle: low glugs
    out = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.1:
        Ln = 0.1 + 0.08 * rng.random(); tp = T(Ln); f = 240 + 160 * rng.random()
        s = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.8 * tp / Ln)) / SR) * np.exp(-tp / (Ln * .5)) * .25 + lp(nz(Ln), 900) * .12
        i = int(t * SR); out[i:i + len(s)] += s[:len(out) - i] * (1 - 0.5 * t / d); t += Ln * (0.7 + 0.5 * rng.random())
    return fade(out * v * 0.8, .05, .3)
def sparkle_s(v=1.0):
    t = T(0.6); f = 3000 + 1500 * rng.random(); return fade(np.sin(2 * np.pi * f * t) * np.exp(-t / .12) * .12 * v + np.sin(2 * np.pi * f * 1.5 * t) * np.exp(-t / .07) * .05 * v)
def brushsnd(d, v=1.0):
    n = nz(d); wet = lp(n, 1800) * 0.5 + bp(n, 1800, 5000) * 0.18
    grain = uniform_filter1d(np.abs(rng.standard_normal(len(n))), 400) * 0.6 + 0.7
    return fade(wet * grain * envelope(d, [(0, 0), (.06, .9), (.3, 1), (.8, .85), (1, 0)]) * 0.22 * v, .03, .1)
def plip(v=1.0):
    t = T(0.25); return fade((np.sin(2 * np.pi * np.cumsum(900 + 1400 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.05)) * 0.25 * v + bp(nz(0.25), 2000, 7000) * np.exp(-t / 0.02) * 0.08 * v)
def swish(d=0.4, v=1.0):
    n = nz(d); e = np.sin(np.linspace(0, np.pi, len(n))) ** 2; return lp(bp(n, 250, 2500), 2200) * e * 0.35 * v
def creak_s(v=1.0):
    d = 0.4; t = T(d); f = 180 + 60 * np.sin(2 * np.pi * 3 * t); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.1 * (0.5 + 0.5 * np.sin(2 * np.pi * 40 * t))
    return fade(x * envelope(d, [(0, 0), (.3, 1), (1, 0)]) * v)
def pat(v=1.0):
    t = T(0.12); return fade(lp(nz(0.12), 500) * np.exp(-t / 0.025) * 0.5 * v + np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.03) * 0.2 * v)
def tick(v=1.0, hi=True):
    t = T(0.04); return fade(bp(nz(0.04), 2500 if hi else 1800, 7000) * np.exp(-t / 0.006) * 0.12 * v, .0005, .01)
def page_turn(d=0.7, v=1.0):
    out = np.zeros(int((d + 0.4) * SR))
    lift = hp(nz(0.3), 700) * envelope(0.3, [(0, 0), (.5, .6), (1, .2)]) * 0.18
    wh = bp(nz(0.5), 300, 4000) * np.sin(np.linspace(0, np.pi, int(0.5 * SR))) ** 1.5 * 0.3
    for x, at in [(lift, 0.0), (wh, 0.2)]:
        i = int(at * SR); out[i:i + len(x)] += x[:len(out) - i]
    return out * v
def chirp(v=1.0):
    d = 0.18; t = T(d); f = 3200 + 900 * np.sin(2 * np.pi * 14 * t) + 700 * t / d; return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * envelope(d, [(0, 0), (.2, 1), (1, 0)]) * 0.06 * v)
def cheer_s(v=1.0):   # a little shaker flourish
    out = np.zeros(int(0.8 * SR))
    for k in range(7):
        s = hp(nz(0.09), 5000) * np.exp(-T(0.09) / .02) * .1; i = int(k * 0.09 * SR); out[i:i + len(s)] += s
    return out * v

buf = np.zeros((N, 2)); amb = np.zeros((N, 2))
def put(x, at, g=1.0, pan=0.0, b=None):
    if at < 0: return
    add(buf if b is None else b, x.astype(np.float64), at, g, pan)

for e in EV:
    t, ty, pan = e['t'], e['type'], e.get('pan', 0.0)
    if ty == 'scratch': put(crayon(e['dur'], 1.1), t, 1.0, pan)
    elif ty == 'write': put(write(e['dur']), t, 0.85, pan)
    elif ty in ('scribble', 'blush', 'colour'): put(scribble(e['dur']), t, 0.7, pan)
    elif ty == 'paper': put(rustle(0.8), t, 0.8)
    elif ty == 'poke': put(tap(0.6, 1400), t, 0.6, pan)
    elif ty == 'chair': put(creak_s(0.8), t, 0.7, 0.2)
    elif ty == 'step': put(tap(0.8, 600), t, 0.8, pan)
    elif ty == 'jar': put(clink(), t, 0.9, pan)
    elif ty == 'lid': put(twist(), t, 0.8, pan)
    elif ty == 'dip': put(dipsound(), t, 0.8, pan)
    elif ty == 'land': put(tap(0.7, 500), t, 0.6, pan)
    elif ty == 'pour': put(pour(e['dur']), t, 0.9, pan)
    elif ty == 'sparkle': put(sparkle_s(), t, 0.7, pan)
    elif ty == 'brush':
        d = e['dur'] + 0.25; x = brushsnd(d); p0, p1 = (-0.85, 0.85) if e['dir'] > 0 else (0.85, -0.85)
        Ln = len(x); s = int(max(0, t) * SR); pn = np.linspace(p0, p1, Ln)
        l, r = np.cos((pn + 1) * np.pi / 4) * 1.414, np.sin((pn + 1) * np.pi / 4) * 1.414
        e2 = min(N, s + Ln); buf[s:e2, 0] += (x * l)[:e2 - s]; buf[s:e2, 1] += (x * r)[:e2 - s]
    elif ty == 'dipbrush': put(plip(), t, 0.8, -0.3)
    elif ty == 'cheer': put(cheer_s(), t, 0.8, 0.0)
    elif ty == 'clap': put(pat(0.9), t, 0.9, ((t * 7) % 1.0) - 0.5)
    elif ty == 'page': put(page_turn(e['dur']), t, 0.5, -0.1)
    elif ty == 'final': put(sparkle_s(), t, 0.6, 0.2)

# ambience: room tone + a distant clock (quiet dinner → it is all we hear in the silence), birds once the page is gold
room = lp(brown(DUR), 450) * 0.02 * np.interp(tt, [0, 2, 52, 54, 60], [0, 1, 1, 0.8, 0.8])
amb[:, 0] += room; amb[:, 1] += np.roll(room, 1500)
k = 0; tc = 4.2
while tc < 50.0:
    g = 1.0 if 14.5 < tc < 18.0 else 0.5
    if 25 < tc < 50: g *= 0.4
    add(amb, tick(0.8 * g, k % 2 == 0), tc, 1.0, -0.4); tc += 1.0; k += 1
nb = np.zeros(N)
for t0 in np.arange(26.0, 56.0, 1.3):
    x = chirp(0.8); i = int(t0 * SR) + int(rng.integers(0, 24000)); nb[i:i + len(x)] += x[:N - i] if i < N else 0
amb[:, 0] += nb * 0.7; amb[:, 1] += np.roll(nb, 900) * 0.7
air = hp(nz(DUR), 3000) * 0.0025; amb[:, 0] += air; amb[:, 1] += np.roll(air, 2000)
# fridge hum for the last ten seconds
d = DUR - 50.0; hum = (np.sin(2 * np.pi * 60 * T(d)) + 0.4 * np.sin(2 * np.pi * 120 * T(d))) * 0.003 * envelope(d, [(0, 0), (.2, 1), (1, 1)])
add(amb, hum, 50.0, 1.0, 0.0)

# narration: Kokoro → highpass, compress, warm EQ, small room
vo = np.zeros((N, 2)); VO = []
for e in EV:
    if e['type'] != 'voice': continue
    w, sr = sf.read(os.path.join(HERE, 'voices', e['id'] + '.wav'))
    if w.ndim > 1: w = w.mean(1)
    w = soxr.resample(w, sr, SR); w = hp(w, 90, 2); w = compress(w, thr=.12, ratio=3.0, att=.01, rel=.16)
    w = w + 0.35 * lp(w, 260, 1) - 0.2 * hp(w, 7000, 1)
    ir = nz(0.5) * np.exp(-T(0.5) / 0.12); ir[0] = 0; ir *= 1 / max(1e-9, np.abs(ir).max()) * 0.0
    wet = np.convolve(w, nz(0.35) * np.exp(-T(0.35) / 0.09) * 0.004)[:len(w)]
    w = w * 1.0 + wet * 0.5
    add(vo, w.astype(np.float64), e['t'], 1.0, 0.0); VO.append((e['t'], e['t'] + len(w) / SR))
# duck music under voice
duck = np.ones(N)
for a, b in VO:
    i0, i1 = int((a - 0.2) * SR), int((b + 0.4) * SR); duck[i0:i1] = 0.58
duck = uniform_filter1d(duck, int(0.15 * SR))
sc, _ = sf.read(os.path.join(HERE, 'out', 'score.wav')); sc = sc[:N] if len(sc) >= N else np.pad(sc, ((0, N - len(sc)), (0, 0)))
vo *= 1.5
mix = vo + sc * duck[:, None] * 0.82 + buf * 0.9 + amb
# the silences are real: ease everything but room tone and the clock out of 15–17.5
mix = np.stack([limit(compress(mix[:, c], thr=.5, ratio=2.0), ceil=0.9) for c in range(2)], 1)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix, SR)
print('mix ok', mix.shape, 'peak', np.abs(mix).max())
