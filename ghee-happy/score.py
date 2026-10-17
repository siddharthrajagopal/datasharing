# Original score for "A Spoonful of Gold": ukulele, music box, glockenspiel, recorder, clarinet, toy piano, woodblock, shaker.
# 96 bpm, C major. Cue points come from events.json (same timeline as the picture).
import os, sys, json, numpy as np, soundfile as sf
LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, os.path.join(LIB, 'core/audio'))
from sfx import SR, bp, lp, hp
HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, 'events.json'))); DUR = E['dur']; EV = E['ev']
N = int(DUR * SR); BEAT = 60 / 96; rng = np.random.default_rng(5)
L = np.zeros(N); R = np.zeros(N)
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def T(d): return np.arange(int(d * SR)) / SR
def put(x, at, g=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N or i < 0: return
    x = x[:N - i]; l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(x)] += x * g * l * 1.414; R[i:i + len(x)] += x * g * r * 1.414
def fade(x, a=.004, b=.02):
    ia, ib = int(a * SR), int(b * SR); x = x.copy()
    if ia and len(x) > ia: x[:ia] *= np.linspace(0, 1, ia)
    if ib and len(x) > ib: x[-ib:] *= np.linspace(1, 0, ib)
    return x
# ——— instruments ———
def ukulele(m, d=1.6, v=1.0):
    t = T(d); f = hz(m); x = np.zeros_like(t)
    for k, (a, tau) in enumerate([(1, .55), (.55, .32), (.3, .2), (.18, .12), (.1, .08)], 1):
        x += a * np.sin(2 * np.pi * f * k * t + 0.2 * k) * np.exp(-t / tau)
    click = bp(rng.standard_normal(len(t)), 1500, 5000) * np.exp(-t / 0.006) * 0.25
    return fade(lp(x * 0.5 + click, 4200) * v * 0.55)
def strum(ms, at, g=1.0, pan=0.0, down=True, gap=0.018):
    ms = ms if down else ms[::-1]
    for i, m in enumerate(ms): put(ukulele(m), at + i * gap, g, pan)
def musicbox(m, d=1.4, v=1.0):
    t = T(d); f = hz(m); x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / tau) for a, r, tau in [(1, 1, .5), (.5, 2.01, .3), (.25, 4.1, .15), (.12, 6.3, .08)])
    return fade(x * v * 0.34, .002, .05)
def glock(m, d=1.8, v=1.0):
    t = T(d); f = hz(m); x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / tau) for a, r, tau in [(1, 1, .9), (.45, 2.76, .4), (.2, 5.4, .18), (.1, 8.9, .08)])
    return fade(x * v * 0.3, .001, .08)
def recorder(m, d, v=1.0):
    t = T(d); f = hz(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / 0.4))
    ph = 2 * np.pi * np.cumsum(f) / SR; x = np.sin(ph) + 0.12 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    br = bp(rng.standard_normal(len(t)), 2500, 6000) * 0.05
    env = np.minimum(1, t / 0.07) * np.minimum(1, (d - t) / 0.14)
    return fade((x + br) * env * v * 0.3, .01, .05)
def clarinet(m, d, v=1.0):
    t = T(d); f = hz(m); ph = 2 * np.pi * f * t
    x = sum(a * np.sin(k * ph) for k, a in [(1, 1), (3, .45), (5, .28), (7, .12), (9, .06)])
    env = np.minimum(1, t / 0.12) * np.minimum(1, (d - t) / 0.2)
    return fade(lp(x, 2600) * env * v * 0.3, .01, .06)
def toypiano(m, v=1.0):
    t = T(0.5); f = hz(m); x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / tau) for a, r, tau in [(1, 1, .16), (.6, 2.52, .08), (.3, 4.3, .05)])
    return fade((x + bp(rng.standard_normal(len(t)), 3000, 8000) * np.exp(-t / .004) * .15) * v * 0.35)
def wood(v=1.0, f=820):
    t = T(0.12); return fade((np.sin(2 * np.pi * f * t) * np.exp(-t / .02) + bp(rng.standard_normal(len(t)), 900, 3200) * np.exp(-t / .008) * .6) * v * .4)
def shaker(v=1.0):
    t = T(0.09); return fade(hp(rng.standard_normal(len(t)), 5500) * np.exp(-t / .02) * np.minimum(1, t / .008) * v * .09)
# ——— the tune ———
C, D, E_, F, G, A, B = 0, 2, 4, 5, 7, 9, 11
n = lambda name, o=5: 12 * (o + 1) + {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[name]
THEME = [  # (beat in 16-beat theme, note, beats)
    (0, 'E5', 1), (1, 'G5', .5), (1.5, 'A5', .5), (2, 'G5', 1), (3, 'E5', 1),
    (4, 'D5', 1), (5, 'E5', .5), (5.5, 'G5', .5), (6, 'E5', 2),
    (8, 'A5', 1), (9, 'G5', .5), (9.5, 'E5', .5), (10, 'G5', 1), (11, 'A5', 1),
    (12, 'C6', 2), (14, 'G5', 2)]
CHORDS = [[48, 55, 64, 67], [43, 55, 62, 67], [45, 57, 64, 69], [41, 57, 60, 65]]   # C | G | Am | F (bass, 3 ukulele notes)
CH_END = [48, 55, 64, 67]
def nm(s): return 12 * (int(s[-1]) + 1) + {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[s[0]]
def theme(t0, instr, g=1.0, pan=0.0, octave=0, accomp=True, sh=True, bass=True, last_c=False, maxbeat=16):
    for b, name, d in THEME:
        if b >= maxbeat: continue
        at = t0 + b * BEAT; m = nm(name) + 12 * octave
        if instr == 'recorder': put(recorder(m, d * BEAT * 0.92), at, g, pan)
        elif instr == 'box': put(musicbox(m), at, g, pan)
        elif instr == 'glock': put(glock(m), at, g, pan)
    if accomp:
        for bar in range(maxbeat // 4):
            ch = CHORDS[bar] if not (last_c and bar == 3) else CH_END
            a = t0 + bar * 4 * BEAT
            for k in range(8):   # lilting 8ths: down, -, up, ...
                if k in (0, 3, 6): strum(ch[1:], a + k * BEAT / 2, 0.85 if k == 0 else 0.55, -0.35, down=(k != 3))
            if bass: put(clarinet(ch[0], BEAT * 1.6, 0.8), a, 0.55, 0.0); put(clarinet(ch[0] + (7 if bar % 2 == 0 else 0), BEAT * 1.2, 0.8), a + 2 * BEAT, 0.45, 0.0)
            if sh:
                for k in range(8): put(shaker(1.0 if k % 2 == 0 else 0.55), a + k * BEAT / 2, 0.8, 0.5)

def picks(t0, bars, g=1.0, pan=-0.3, prog=(0, 2, 3, 0), lead=None):
    base = [[48, 55, 64], [45, 57, 64], [41, 57, 60], [48, 55, 64]]
    for i in range(bars):
        ch = base[prog[i % len(prog)]]; a = t0 + i * 4 * BEAT
        for k, idx in enumerate([0, 1, 2, 1, 2, 1, 0, 1]):
            if k % 2 == 0 or k == 5: put(ukulele(ch[idx]), a + k * BEAT / 2, g * (0.9 if k == 0 else 0.6), pan)
# ——— the score by section ———
BAR = 4 * BEAT
# A (0–5): bare. a single music-box note as the plate finishes
put(musicbox(nm('E5')), 2.2, 0.5, 0.2)
put(ukulele(48), 3.75, 0.5, -0.3); put(ukulele(55), 3.75 + .02, 0.4, -0.3); put(ukulele(64), 3.75 + .04, 0.4, -0.3)
# B (5–15): sparse and quiet
picks(5.0, 4, 0.55)
for e in EV:
    if e['type'] == 'poke': put(toypiano(nm('G4')), e['t'] + 0.15, 0.7, 0.2)
put(clarinet(nm('G3'), 2.6, 1.0), 12.4, 0.55, 0.0)
# silence 15–17.5 (nothing)
# D (17.5–25): first glock note after the silence = the spoon touches the rice
put(glock(nm('G6'), 2.6), 17.5, 1.0, -0.1); put(glock(nm('E6'), 2.2), 17.5 + .02, 0.5, -0.1)
picks(17.5, 3, 0.6, prog=(0, 1, 2)); 
for i, nme in enumerate(['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'E5', 'G5']): put(musicbox(nm(nme)), 18.3 + i * BEAT * 1.5, 0.45, 0.2)
put(clarinet(nm('C3'), 3.0, 1.0), 23.0, 0.5)
# E (25–40): full theme, twice; recorder sings; glock gets a note per secret uncovered
theme(25.0, 'recorder', 0.9, 0.05, octave=0)
theme(35.0, 'recorder', 0.9, 0.05, octave=0, maxbeat=8)
gl = [nm(x) for x in ['C6', 'E6', 'G6', 'A6', 'D6', 'G6', 'E6', 'A6']]
k = 0
for e in EV:
    if e['type'] == 'glint': put(glock(gl[k % len(gl)], 1.4), e['t'], 0.55, e.get('pan', 0)); k += 1
# F (40–50): theme again, brighter, music box doubles, woodblock claps from the family
theme(40.0, 'recorder', 0.85, 0.05)
theme(40.0, 'box', 0.7, 0.2, octave=1, accomp=False)
for e in EV:
    if e['type'] == 'clap': put(wood(1.0, 780 + 60 * (int(e['t']) % 3)), e['t'], 0.8, ((e['t'] * 7) % 1.0) - 0.5)
# G (50–53.8): thin: ukulele + music box over the pull-out
picks(50.0, 1, 0.7, prog=(0,)); picks(52.5, 1, 0.55, prog=(2,))
for i, nme in enumerate(['E5', 'G5', 'A5', 'G5']): put(musicbox(nm(nme)), 50.0 + i * BEAT, 0.5, 0.2)
# silence 53.8–54.2: cut everything in this window
w0, w1 = int(53.8 * SR), int(54.2 * SR)
ramp = np.ones(N); ramp[w0 - 2400:w0] = np.linspace(1, 0, 2400); ramp[w0:w1] = 0; ramp[w1:w1 + 2400] = np.linspace(0, 1, 2400)
# H (54.5–60): the page slides to the jar: ukulele arpeggio and the last chord
picks(54.5, 2, 0.65, prog=(0, 2))
for i, nme in enumerate(['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'E5']): put(musicbox(nm(nme)), 54.6 + i * BEAT * 0.9, 0.45, 0.3)
strum([48, 55, 64, 67, 72], 58.75, 1.0, -0.1); put(glock(nm('C6'), 3.0), 58.75, 0.8, 0.1); put(glock(nm('G6'), 3.0), 58.8, 0.5, 0.1); put(clarinet(nm('C3'), 1.2, 1.0), 58.75, 0.5)
L *= ramp; R *= ramp
out = np.stack([L, R], 1); out /= max(1e-9, np.abs(out).max()) / 0.8
sf.write(os.path.join(HERE, 'out', 'score.wav'), out, SR)
print('score', DUR, 's')
