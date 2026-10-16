/* StudyHub figures: redrawn from the lecture slides (see AUDIT.md for corrections applied). */
const T = (x, y, s, c = '') => { const ls = s.split('|'), y0 = y - (ls.length - 1) * 7; return `<text x="${x}" y="${y0}" class="${c}">${ls.map((l, i) => `<tspan x="${x}" dy="${i ? 14 : 0}">${l}</tspan>`).join('')}</text>`; };
const N = (x, y, w, h, s, d = 0, o = {}) => `<g class="node pop-in${o.acc ? ' acc' : ''}" style="--d:${d}ms"${o.k ? ` data-k="${o.k}" tabindex="0" role="button" aria-label="${s.replace(/\|/g, ' ')}"` : ''}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>${T(x + w / 2, y + h / 2 + 4, s, o.sm ? 'sm' : '')}</g>`;
const A = (d, delay = 0, o = {}) => `<path class="arr ${o.dash ? 'dashed pop-in' : 'draw'}" ${o.dash ? '' : 'pathLength="1"'} style="--d:${delay}ms" d="${d}" ${o.both ? 'marker-start="url(#ah)" ' : ''}${o.noend ? '' : 'marker-end="url(#ah)"'}/>`;
const SVG = (w, h, body, label) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}"><defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs>${body}</svg>`;
const wire = (root, INFO) => {
  const box = root.querySelector('.figinfo'), set = k => { root.querySelectorAll('[data-k]').forEach(n => n.classList.toggle('sel', n.dataset.k === k)); box.innerHTML = INFO[k]; };
  root.querySelectorAll('[data-k]').forEach(n => { n.onclick = () => set(n.dataset.k); n.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(n.dataset.k); } }; });
};
const make = f => ({ ...f, html() { return `<p class="label">Diagram</p><figure class="fig">${f.svg()}${f.info ? '<div class="figinfo" aria-live="polite">' + f.hint + '</div>' : ''}<figcaption>${f.caption} <span>Source: ${f.source}</span></figcaption></figure>`; }, init(r) { if (f.info) wire(r, f.info); if (f.after) f.after(r); } });
const tap = 'Tap a block to see what it does.';

/* ---- GET 301 figures: plot helpers (drawn in code, themed by CSS variables) ---- */
const PI = Math.PI;
const GP = (w, h, x0, x1, y0, y1, m = { l: 34, r: 14, t: 14, b: 28 }) => ({ w, h, x0, x1, y0, y1, m,
  sx: x => m.l + (x - x0) / (x1 - x0) * (w - m.l - m.r), sy: y => h - m.b - (y - y0) / (y1 - y0) * (h - m.t - m.b) });
const f1 = n => Math.round(n * 10) / 10;
const gline = (P, xa, ya, xb, yb, cls = 'guide') => `<path class="${cls}" d="M${f1(P.sx(xa))} ${f1(P.sy(ya))}L${f1(P.sx(xb))} ${f1(P.sy(yb))}"/>`;
const gaxes = (P, o = {}) => {
  const { sx, sy, x0, x1, y0, y1 } = P, ax = Math.min(Math.max(0, y0), y1), ay = Math.min(Math.max(0, x0), x1);
  let s = `<path class="ax" d="M${f1(sx(x0))} ${f1(sy(ax))}H${f1(sx(x1))}M${f1(sx(ay))} ${f1(sy(y0))}V${f1(sy(y1))}"/>`;
  (o.xt || []).forEach(([v, l]) => { s += `<path class="tk" d="M${f1(sx(v))} ${f1(sy(ax) - 3)}v6"/>` + (l ? T(f1(sx(v)), f1(sy(y0)) + 16, l, 'sm mu') : ''); });
  (o.yt || []).forEach(([v, l]) => { s += `<path class="tk" d="M${f1(sx(ay) - 3)} ${f1(sy(v))}h6"/>` + (l ? T(f1(sx(x0)) - 6, f1(sy(v)) + 4, l, 'sm mu e') : ''); });
  return s;
};
const gcurve = (P, f, a, b, o = {}) => {
  const n = o.n || 180; let s = '';
  for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; let y = f(x); if (o.clip) y = Math.max(o.clip[0], Math.min(o.clip[1], y)); s += (i ? 'L' : 'M') + f1(P.sx(x)) + ' ' + f1(P.sy(y)); }
  return `<path class="curve${o.c ? ' ' + o.c : ''} draw" pathLength="1" style="--d:${o.d || 0}ms" d="${s}"/>`;
};
const gpoly = (P, pts, o = {}) => `<path class="curve${o.c ? ' ' + o.c : ''} draw" pathLength="1" style="--d:${o.d || 0}ms" d="${pts.map(([x, y], i) => (i ? 'L' : 'M') + f1(P.sx(x)) + ' ' + f1(P.sy(y))).join('')}"/>`;
const garea = (P, f, a, b, o = {}) => {
  const n = o.n || 120, base = o.base === undefined ? 0 : o.base; let s = `M${f1(P.sx(a))} ${f1(P.sy(base))}`;
  for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; s += `L${f1(P.sx(x))} ${f1(P.sy(f(x)))}`; }
  return `<path class="area pop-in" fill-opacity="${o.op === undefined ? .3 : o.op}" style="--d:${o.d || 0}ms" d="${s}L${f1(P.sx(b))} ${f1(P.sy(base))}Z"/>`;
};
const gdot = (P, x, y, d = 0, k = '') => `<circle class="dot${k ? ' ' + k : ''} pop-in" style="--d:${d}ms" cx="${f1(P.sx(x))}" cy="${f1(P.sy(y))}" r="3.6"/>`;
const grp = (dx, dy, body) => `<g transform="translate(${dx},${dy})">${body}</g>`;
const legend = (x, y, kind, text) => ((kind === 'dot' || kind === 'dotk') ? `<circle class="dot${kind === 'dotk' ? ' k' : ''}" cx="${x + 10}" cy="${y - 4}" r="3.6"/>` : `<path class="curve ${kind} thin" d="M${x} ${y - 4}h20"/>`) + T(x + 26, y, text, 'sm l');
/* special functions, accurate to well under a pixel */
const gam = x => { if (x < .5) return PI / (Math.sin(PI * x) * gam(1 - x)); x -= 1; const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; let a = c[0]; const t = x + 7.5; for (let i = 1; i < 9; i++) a += c[i] / (x + i); return Math.sqrt(2 * PI) * Math.pow(t, x + .5) * Math.exp(-t) * a; };
const bj = (n, x) => { const N = 200, h = PI / N; let s = 0; for (let i = 0; i <= N; i++) { const t = i * h, w = i === 0 || i === N ? 1 : i % 2 ? 4 : 2; s += w * Math.cos(n * t - x * Math.sin(t)); } return s * h / 3 / PI; };
const erf = x => { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + .3275911 * x); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x)); };
const npdf = x => Math.exp(-x * x / 2) / Math.sqrt(2 * PI), ncdf = x => .5 * (1 + erf(x / Math.SQRT2));

const G301 = {
  /* ===== GET 301, batch 1: curves and plots ===== */
  g301_fourier: make({
    source: 'Not in your notes; drawn from the square wave of lesson 2.1', caption: 'Adding more sine terms makes the sum hug the square wave. Near each jump the sum overshoots by about 9% of the jump, however many terms are used.',
    svg: () => {
      const P = GP(400, 240, -PI, PI, -1.7, 1.7, { l: 30, r: 12, t: 12, b: 50 }), S = n => x => { let s = 0; for (let k = 1; k <= n; k += 2) s += Math.sin(k * x) / k; return 4 / PI * s; };
      const sq = `M${f1(P.sx(-PI))} ${f1(P.sy(-1))}H${f1(P.sx(0))}V${f1(P.sy(1))}H${f1(P.sx(PI))}`;
      return SVG(400, 240, gaxes(P, { xt: [[-PI, '-π'], [0, '0'], [PI, 'π']], yt: [[-1, '-1'], [1, '1']] }) + `<path class="arr dashed pop-in" style="--d:0ms;stroke:var(--ink)" d="${sq}"/>` +
        gcurve(P, S(1), -PI, PI, { c: 'c3 thin', d: 200 }) + gcurve(P, S(3), -PI, PI, { c: 'c2 thin', d: 500 }) + gcurve(P, S(15), -PI, PI, { d: 800, n: 420 }) +
        `<path class="arr dashed" style="stroke:var(--ink)" d="M10 222h20"/>${T(36, 226, 'square wave', 'sm l')}` + legend(120, 226, 'c3', '1 term') + legend(196, 226, 'c2', '3 terms') + legend(280, 226, '', '15 terms'),
        'Partial sums of the Fourier series of a square wave with 1, 3 and 15 terms');
    }
  }),
  g301_evenodd: make({
    source: 'Not in your notes; definitions from lesson 2.2', caption: 'An even function is a mirror image about the vertical axis. An odd function turns upside down as well: its two sides are opposite.',
    svg: () => {
      const L = GP(192, 170, -1.6, 1.6, -.4, 2.9, { l: 20, r: 8, t: 30, b: 20 }), R = GP(192, 170, -1.6, 1.6, -4.4, 4.4, { l: 20, r: 8, t: 30, b: 20 });
      const left = `<text x="96" y="14" class="b">Even: f(-x) = f(x)</text>` + gaxes(L, { xt: [[-1, '-1'], [1, '1']] }) + gcurve(L, x => x * x, -1.6, 1.6, { d: 100 }) + gline(L, -1, 1, 1, 1) + gdot(L, -1, 1, 600) + gdot(L, 1, 1, 650) +
        T(L.sx(0), L.sy(1) - 8, 'same height', 'sm mu') + T(L.sx(1) + 8, L.sy(1) + 15, '(1, 1)', 'sm l') + T(L.sx(-1) - 8, L.sy(1) + 15, '(-1, 1)', 'sm e');
      const right = `<text x="96" y="14" class="b">Odd: f(-x) = -f(x)</text>` + gaxes(R, { xt: [[-1, '-1'], [1, '1']] }) + gcurve(R, x => x * x * x, -1.6, 1.6, { d: 100 }) + gline(R, -1, -1, 1, 1) + gdot(R, -1, -1, 600) + gdot(R, 1, 1, 650) +
        T(R.sx(1) + 8, R.sy(1) + 15, '(1, 1)', 'sm l') + T(R.sx(-1) - 8, R.sy(-1) - 8, '(-1, -1)', 'sm e');
      return SVG(400, 232, grp(0, 0, left) + grp(208, 0, right) + T(96, 206, 'x squared: cosines only', 'sm mu') + T(304, 206, 'x cubed: sines only', 'sm mu'), 'An even function and an odd function with a pair of mirror points marked');
    }
  }),
  g301_gamma: make({
    source: 'Not in your notes; values from lesson 2.3', caption: 'The gamma function passes through the factorials: Γ(n + 1) = n!. Between the whole numbers it fills in the gaps, and Γ(1/2) = √π.',
    svg: () => {
      const P = GP(400, 260, 0, 4.6, 0, 8, { l: 34, r: 14, t: 14, b: 28 });
      const lab = [[1, '0! = 1'], [2, '1! = 1'], [3, '2! = 2'], [4, '3! = 6']];
      return SVG(400, 260, gaxes(P, { xt: [[1, '1'], [2, '2'], [3, '3'], [4, '4']], yt: [[2, '2'], [4, '4'], [6, '6'], [8, '8']] }) + T(P.sx(0) + 6, 18, 'Γ(x)', 'sm mu l') + T(P.sx(4.6) + 4, P.sy(0) + 4, 'x', 'sm mu l') +
        gcurve(P, gam, .26, 4.2, { d: 100, n: 260 }) + lab.map(([x, s], k) => gdot(P, x, gam(x), 600 + k * 80) + T(P.sx(x) + 6, P.sy(gam(x)) + 17, s, 'sm l')).join('') +
        gdot(P, .5, gam(.5), 1000, 'k') + gline(P, .5, gam(.5), .72, 3.1) + T(P.sx(.72), P.sy(3.1) - 4, 'Γ(1/2) = √π ≈ 1.77', 'sm l'), 'The gamma function curve with the factorial points marked');
    }
  }),
  g301_bessel: make({
    source: 'Not in your notes; J0 and J1 of lesson 2.5', caption: 'Bessel functions look like waves that die away and never repeat exactly. J0 starts at 1 and J1 starts at 0.',
    svg: () => {
      const P = GP(400, 240, 0, 14, -.6, 1.1, { l: 34, r: 12, t: 12, b: 50 }), z0 = [2.4048, 5.5201, 8.6537, 11.7915];
      return SVG(400, 240, gaxes(P, { xt: [0, 2, 4, 6, 8, 10, 12, 14].map(v => [v, '' + v]), yt: [[-.5, '-0.5'], [0, '0'], [.5, '0.5'], [1, '1']] }) + gcurve(P, x => bj(0, x), 0, 14, { d: 100, n: 240 }) + gcurve(P, x => bj(1, x), 0, 14, { c: 'c2', d: 500, n: 240 }) +
        z0.map((x, k) => gdot(P, x, 0, 900 + k * 80, 'k')).join('') + legend(40, 226, '', 'J0') + legend(110, 226, 'c2', 'J1') + legend(180, 226, 'dotk', 'the first four zeros of J0'), 'The Bessel functions J0 and J1 plotted from 0 to 14');
    }
  }),
  g301_pulse: make({
    source: 'Not in your notes; the pulse of lesson 3.1', caption: 'A single pulse (above) is built from a continuous spread of frequencies (below). The spectrum A(ω) = 2 sin ω / ω has its tallest value, 2, at ω = 0 and crosses zero at ω = ±π, ±2π, and so on.',
    svg: () => {
      const T1 = GP(400, 130, -3, 3, -.3, 1.4, { l: 34, r: 14, t: 22, b: 24 }), T2 = GP(400, 150, -14, 14, -.9, 2.4, { l: 34, r: 14, t: 22, b: 26 });
      const top = T(8, 14, 'The pulse', 'sm mu l') + T(392, 14, 'f(x) = 1 between -1 and 1', 'sm mu e') + gaxes(T1, { xt: [[-1, '-1'], [1, '1']], yt: [[1, '1']] }) + gpoly(T1, [[-3, 0], [-1, 0], [-1, 1], [1, 1], [1, 0], [3, 0]], { d: 100 });
      const bot = T(8, 14, 'Its spectrum', 'sm mu l') + T(392, 14, 'A(ω) = 2 sin ω / ω', 'sm mu e') + gaxes(T2, { xt: [-4, -3, -2, -1, 0, 1, 2, 3, 4].map(k => [k * PI, k ? (Math.abs(k) === 1 ? (k < 0 ? '-' : '') : k) + 'π' : '0']), yt: [[2, '2'], [1, '1']] }) +
        gcurve(T2, w => Math.abs(w) < 1e-9 ? 2 : 2 * Math.sin(w) / w, -14, 14, { d: 400, n: 400 }) + [-3, -2, -1, 1, 2, 3].map(k => gdot(T2, k * PI, 0, 900, 'k')).join('') + T(T2.sx(0) + 12, T2.sy(2) + 4, 'A(0) = 2: the area under f', 'sm l');
      return SVG(400, 300, top + grp(0, 150, bot), 'A rectangular pulse and its spectrum 2 sin ω over ω');
    }
  }),
  g301_ftpair: make({
    source: 'Not in your notes; the transform pair of lesson 3.2', caption: 'A narrow pulse has a low, wide spectrum. A wide pulse has a tall, narrow spectrum. In both, F(0) = 2a is the area of the pulse.',
    svg: () => {
      const cols = [[.5, 'Narrow pulse, a = 0.5'], [2, 'Wide pulse, a = 2']];
      const col = ([a, title]) => { const P1 = GP(192, 110, -3, 3, -.3, 1.5, { l: 22, r: 8, t: 22, b: 22 }), P2 = GP(192, 160, -12, 12, -1.3, 5.3, { l: 22, r: 8, t: 22, b: 26 });
        return `<text x="2" y="14" class="b l">${title}</text>` + gaxes(P1, { xt: [[-a, '-' + a], [a, '' + a]], yt: [[1, '1']] }) + gpoly(P1, [[-3, 0], [-a, 0], [-a, 1], [a, 1], [a, 0], [3, 0]], { d: 100 }) +
          grp(0, 118, T(2, 14, 'Its transform F(ω)', 'sm mu l') + gaxes(P2, { xt: [[-8, '-8'], [0, '0'], [8, '8']], yt: [[2, '2'], [4, '4']] }) + gcurve(P2, w => Math.abs(w) < 1e-9 ? 2 * a : 2 * Math.sin(a * w) / w, -12, 12, { d: 400, n: 320 }) + T(P2.sx(a < 1 ? 3 : 2.2), P2.sy(a < 1 ? 2.2 : 4) + 4, 'F(0) = ' + (2 * a), 'sm l')); };
      return SVG(400, 296, grp(0, 0, col(cols[0])) + grp(208, 0, col(cols[1])), 'Two rectangular pulses of different widths and their transforms');
    }
  }),
  g301_damping: make({
    source: 'Not in your notes; the three root cases of lesson 4.1', caption: 'The same start (y = 1, y′ = 0) with three kinds of roots. Distinct real roots decay slowly, a repeated root decays fastest without swinging, and complex roots swing while they decay.',
    svg: () => {
      const P = GP(400, 276, 0, 8, -.45, 1.1, { l: 34, r: 14, t: 24, b: 84 }), r1 = -3 + Math.sqrt(5), r2 = -3 - Math.sqrt(5), wd = Math.sqrt(3.75);
      const over = t => (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1), crit = t => (1 + 2 * t) * Math.exp(-2 * t), under = t => Math.exp(-.5 * t) * (Math.cos(wd * t) + .5 / wd * Math.sin(wd * t));
      return SVG(400, 276, T(8, 14, 'y″ + 2c y′ + 4y = 0, with y(0) = 1 and y′(0) = 0', 'sm mu l') + gaxes(P, { xt: [[2, '2'], [4, '4'], [6, '6'], [8, '8']], yt: [[0, '0'], [1, '1']] }) + T(P.sx(8) + 4, P.sy(0) + 4, 't', 'sm mu l') +
        gcurve(P, over, 0, 8, { c: 'c3', d: 100 }) + gcurve(P, crit, 0, 8, { c: 'c2', d: 400 }) + gcurve(P, under, 0, 8, { d: 700, n: 300 }) +
        legend(8, 226, 'c3', 'Overdamped, c = 3: distinct real roots') + legend(8, 244, 'c2', 'Critical, c = 2: a repeated root') + legend(8, 262, '', 'Underdamped, c = ½: complex roots'),
        'Three solutions of a second order equation: overdamped, critically damped and underdamped');
    }
  }),
  g301_density: make({
    source: 'Not in your notes; density and distribution functions of lesson 5.2', caption: 'Probability is area under the density. The distribution function F(x) records the running total, so P(a < X < b) = F(b) - F(a).',
    svg: () => {
      const a = -.5, b = 1.5, Fa = ncdf(a), Fb = ncdf(b), D = GP(400, 150, -3.5, 3.5, -.05, .45, { l: 34, r: 14, t: 22, b: 26 }), Fp = GP(400, 160, -3.5, 3.5, -.1, 1.1, { l: 34, r: 14, t: 22, b: 26 });
      const top = T(8, 14, 'Density f(x)', 'sm mu l') + gaxes(D, { xt: [[a, 'a'], [b, 'b']] }) + garea(D, npdf, a, b, { d: 500 }) + gcurve(D, npdf, -3.5, 3.5, { d: 100 }) + gline(D, a, 0, a, npdf(a)) + gline(D, b, 0, b, npdf(b)) +
        T(D.sx(1.75), D.sy(.31), 'shaded area|= P(a &lt; X &lt; b)|= ' + (Fb - Fa).toFixed(2), 'sm l');
      const bot = T(8, 14, 'Distribution function F(x)', 'sm mu l') + gaxes(Fp, { xt: [[a, 'a'], [b, 'b']], yt: [[0, '0'], [.5, '0.5'], [1, '1']] }) + gcurve(Fp, ncdf, -3.5, 3.5, { d: 700 }) +
        gline(Fp, -3.5, Fa, a, Fa) + gline(Fp, a, 0, a, Fa) + gline(Fp, -3.5, Fb, b, Fb) + gline(Fp, b, 0, b, Fb) + gdot(Fp, a, Fa, 1200) + gdot(Fp, b, Fb, 1250) +
        T(Fp.sx(-3.4), Fp.sy(Fa) - 6, 'F(a) = ' + Fa.toFixed(2), 'sm l') + T(Fp.sx(-3.4), Fp.sy(Fb) - 6, 'F(b) = ' + Fb.toFixed(2), 'sm l') + T(Fp.sx(2.4), Fp.sy(.5), 'F(b) - F(a)|= ' + (Fb - Fa).toFixed(2), 'sm');
      return SVG(400, 330, top + grp(0, 160, bot), 'A density curve with a shaded area and the matching distribution function');
    }
  }),
  g301_normal: make({
    source: 'Dr Jack\'s deck, slides 36 to 59, redrawn; the exact percentages and the two table pictures are added', caption: 'About 68%, 95% and 99.7% of a normal distribution lies within 1, 2 and 3 standard deviations. The two kinds of table report different areas for the same z.',
    svg: () => {
      const M = GP(400, 190, -3.6, 3.6, -.03, .45, { l: 12, r: 12, t: 14, b: 32 }), z = .47, H = () => GP(192, 130, -3, 3, -.04, .45, { l: 8, r: 8, t: 22, b: 28 });
      const top = garea(M, npdf, -3, 3, { op: .18, d: 100 }) + garea(M, npdf, -2, 2, { op: .3, d: 300 }) + garea(M, npdf, -1, 1, { op: .5, d: 500 }) + gcurve(M, npdf, -3.6, 3.6, { d: 100 }) +
        gaxes(M, { xt: [-3, -2, -1, 0, 1, 2, 3].map(k => [k, k ? 'μ' + (k > 0 ? '+' : '-') + (Math.abs(k) > 1 ? Math.abs(k) : '') + 'σ' : 'μ']) }) +
        T(M.sx(0), M.sy(.17), '68.27%|within 1σ', 'sm') + T(M.sx(1.5), M.sy(.045), '95.45%', 'sm') + T(M.sx(-1.5), M.sy(.045), '95.45%', 'sm') + gline(M, 2.6, .075, 2.55, .018) + T(M.sx(2.6), M.sy(.1), '99.73%|within 3σ', 'sm');
      const L = H(), Rr = H();
      const left = `<text x="2" y="14" class="cap">Left-area table</text>` + garea(L, npdf, -3, z, { op: .4, d: 700 }) + gcurve(L, npdf, -3, 3, { d: 600 }) + gaxes(L, { xt: [[z, '0.47']] });
      const right = `<text x="2" y="14" class="cap">Upper-tail table</text>` + garea(Rr, npdf, z, 3, { op: .4, d: 700 }) + gcurve(Rr, npdf, -3, 3, { d: 600 }) + gaxes(Rr, { xt: [[z, '0.47']] });
      return SVG(400, 366, top + grp(0, 200, left) + grp(208, 200, right) + T(96, 338, 'P(Z &lt; 0.47) = 0.6808', 'sm') + T(304, 338, 'P(Z &gt; 0.47) = 0.3192', 'sm') + T(200, 358, 'The same z = 0.47 in each table: 0.6808 + 0.3192 = 1', 'sm mu'), 'The normal curve with the 68, 95 and 99.7 percent bands and the two kinds of normal table');
    }
  })
};

export const FIG = {
  parallel: make({
    source: 'concept from Lecture 1, slide 26, redrawn', caption: 'Sequential design hands work over a wall. Concurrent design shares one model from day one.',
    svg: () => SVG(400, 330, `<text x="8" y="20" class="cap">Sequential</text>
      ${['Mechanical', 'Electrical', 'Software', 'Testing'].map((t, k) => N(8 + k * 100, 32, 84, 40, t, k * 90)).join('')}
      ${[0, 1, 2].map(k => A(`M${92 + k * 100} 52H${108 + k * 100}`, 300 + k * 90)).join('')}
      ${T(200, 98, 'Each team hands over to the next. Clashes appear late.', 'sm mu')}
      <path d="M8 120H392" class="arr" style="opacity:.5"/>
      <text x="8" y="146" class="cap">Concurrent</text>
      ${N(8, 190, 84, 44, 'Shared|specification', 500)}
      ${['Mechanical', 'Electrical', 'Software'].map((t, k) => N(150, 160 + k * 48, 100, 34, t, 600 + k * 90, { acc: 1 })).join('')}
      ${N(308, 190, 84, 44, 'Integrated|product', 900)}
      ${[177, 225, 273].map((y, k) => A(`M92 212L150 ${y}`, 700 + k * 80)).join('')}
      ${[177, 225, 273].map((y, k) => A(`M250 ${y}L308 ${200 + k * 12}`, 950 + k * 80)).join('')}
      ${A('M200 194V208', 1100, { dash: 1, noend: 1 })}${A('M200 242V256', 1100, { dash: 1, noend: 1 })}
      ${T(200, 312, 'Teams share one model and talk throughout. Clashes appear early.', 'sm mu')}`, 'Sequential versus concurrent design')
  }),
  process: make({
    source: 'Lecture 1, slides 5 to 7, redrawn', caption: 'The mechatronic design process runs in three phases, with information fed back for future models.',
    svg: () => {
      const cols = [[8, '1 Modelling|and simulation', ['Recognise|the need', 'Conceptual design|and specification', 'Modular|mathematical model', 'Sensor and|actuator selection', 'Detailed|modelling', 'Control|system design', 'Design|optimisation']],
        [142, '2 Prototyping', ['Software-in-the-|loop simulation', 'Hardware-in-the-|loop simulation', 'Design|optimisation']], [276, '3 Deployment|and life cycle', ['Deployment of|embedded software', 'Life-cycle|optimisation']]];
      return SVG(400, 400, cols.map(([x, h, ch], c) => N(x, 8, 116, 44, h, c * 200, { acc: 1 }) + ch.map((t, k) => N(x, 64 + k * 44, 116, 36, t, c * 200 + 150 + k * 70, { sm: 1 })).join('')).join('') +
        A('M124 30H142', 250) + A('M258 30H276', 450) + T(200, 386, 'Information for future models and upgrades feeds back into modelling.', 'sm mu'), 'Mechatronic design process in three phases');
    }
  }),
  stages: make({
    source: 'Lecture 1, slides 13 to 20 (new diagram)', caption: 'The seven stages of design. Analysis is the critical stage.',
    svg: () => { const R = [['The need', 'Customer need from market research'], ['Analysis of the problem', 'Find the true nature of the problem'], ['Specification', 'Mass, size, accuracy, I/O, power, life'], ['Conceptualisation', 'At least six ideas per function'], ['Optimisation', 'Pick the best solution'], ['Detail design', 'Prototype, layout, accessibility'], ['Working drawings', 'Drawings, circuits, tolerances']];
      return SVG(400, 372, R.map(([t, n], k) => { const cy = 28 + k * 52; return (k ? A(`M26 ${cy - 37}V${cy - 15}`, k * 120, { noend: 1 }) : '') +
        `<g class="node pop-in${k === 1 ? ' acc' : ''}" style="--d:${k * 120}ms"><circle cx="26" cy="${cy}" r="15"/><text x="26" y="${cy + 4}">${k + 1}</text></g>
         <g class="pop-in" style="--d:${k * 120 + 60}ms"><text x="54" y="${cy - 2}" class="l b">${t}</text><text x="54" y="${cy + 15}" class="l sm mu">${n}</text></g>`; }).join('') +
        `<text x="392" y="${28 + 52 - 2}" class="e sm ac">critical stage</text>`, 'The seven stages of design');
    }
  }),
  ems: make({
    source: 'Lecture 1, slide 46, redrawn', caption: 'Engine management: sensors feed the controller, which drives the actuators.', hint: tap,
    info: {
      power: '<b>Power and protection</b>A voltage regulator supplies the controller. A transient protection circuit guards against supply surges.',
      speed: '<b>Engine speed sensor</b>A coil reads a toothed timing wheel. The pulses show crankshaft position, which the controller uses to time the spark.',
      temp: '<b>Temperature sensor</b>A thermistor changes resistance with temperature, so the controller can adjust fuelling for a cold or hot engine.',
      air: '<b>Air flow sensor</b>A heated wire cools as air passes. The cooling depends on the mass flow of air, which sets how much fuel to inject.',
      o2: '<b>Oxygen sensor</b>A zirconia tube with platinum electrodes. Above about 300 degrees C it produces a voltage that depends on the oxygen left in the exhaust.',
      thr: '<b>Throttle position sensor</b>Tells the controller how far the driver has opened the throttle.',
      cond: '<b>Signal conditioning</b>Cleans, filters and scales raw sensor signals so the controller can use them.',
      adc: '<b>ADC</b>Analogue-to-digital converter. Turns sensor voltages into numbers.',
      mcu: '<b>Microcontroller (ECU)</b>Compares the readings with stored set points and decides fuel amount and ignition timing.',
      drv: '<b>Drivers</b>Power stages that turn the controller\'s small outputs into the currents the actuators need.',
      inj: '<b>Fuel injectors</b>Valves whose open time sets the amount of fuel.', ign: '<b>Ignition coil</b>Produces the high-voltage pulse at the moment chosen by the controller.', idle: '<b>Idle speed actuator</b>Holds the engine speed steady when the driver is not pressing the pedal.'
    },
    svg() {
      const S = [['speed', 'Engine speed'], ['temp', 'Temperature'], ['air', 'Air flow|(hot wire)'], ['o2', 'Oxygen|sensor'], ['thr', 'Throttle|position']];
      return SVG(400, 392, N(136, 8, 130, 40, 'Voltage regulator|+ surge protection', 0, { k: 'power', sm: 1 }) +
        S.map(([k, t], i) => N(8, 70 + i * 48, 104, 40, t, 100 + i * 80, { k, sm: 1 }) + A(`M112 ${90 + i * 48}L146 ${78 + i * 7}`, 500 + i * 60)).join('') +
        N(146, 70, 108, 44, 'Signal|conditioning', 700, { k: 'cond' }) + N(146, 140, 108, 44, 'ADC', 800, { k: 'adc' }) + N(146, 210, 108, 44, 'Microcontroller|(ECU)', 900, { k: 'mcu', acc: 1 }) + N(146, 280, 108, 44, 'Drivers', 1000, { k: 'drv' }) +
        A('M200 114V140', 800) + A('M200 184V210', 900) + A('M200 254V280', 1000) + A('M266 28H276V232H254', 1100, { dash: 1 }) +
        [['inj', 'Fuel|injectors'], ['ign', 'Ignition|coil'], ['idle', 'Idle speed|actuator']].map(([k, t], i) => N(288, 240 + i * 48, 104, 40, t, 1100 + i * 80, { k, sm: 1 }) + A(`M254 302L288 ${260 + i * 48}`, 1100 + i * 80)).join(''), 'Engine management system block diagram');
    }
  }),
  pick: make({
    source: 'Lecture 1, slides 30 to 36 (simplified)', caption: 'The control chain of the pick-and-place robot, simplified from the circuit on slide 30.', hint: tap,
    info: {
      mcu: '<b>Microcontroller</b>Runs the program. Port C (PC0 to PC7) reads eight limit switches, Port B (PB0 to PB7) drives the eight movements, and a line on Port D starts and stops the robot.',
      ss: '<b>Start / stop switch</b>One switch position gives +5 V (logic high) and the other 0 V (logic low) to a Port D line.',
      opto: '<b>TRIAC opto-isolators</b>An LED lights a TRIAC, so the controller can switch the solenoid supply without any electrical connection to it.',
      valve: '<b>Solenoid valves</b>Electrically operated valves that send air to one side of a cylinder or the other.',
      cyl: '<b>Pneumatic cylinders</b>Pistons that extend and retract to turn the base, move the arm in and out and up and down, and open the gripper.',
      move: '<b>Robot movement</b>Base clockwise and anticlockwise, arm extend and retract, arm up and down, gripper open and close.',
      lim: '<b>Limit switches</b>Close when a motion reaches its end. They tell the controller the motion is complete, so it can start the next one.'
    },
    svg() {
      return SVG(400, 390, N(130, 8, 140, 46, 'Microcontroller|ports B, C, D', 0, { k: 'mcu', acc: 1 }) + N(8, 8, 100, 46, 'Start / stop|switch (Port D)', 100, { k: 'ss', sm: 1 }) + A('M108 31H130', 200) +
        N(130, 84, 140, 46, 'TRIAC|opto-isolators', 300, { k: 'opto' }) + N(130, 160, 140, 46, 'Solenoid|valves', 420, { k: 'valve' }) + N(130, 236, 140, 46, 'Pneumatic|cylinders', 540, { k: 'cyl' }) + N(130, 312, 140, 52, 'Robot movement|rotate, reach, lift, grip', 660, { k: 'move', sm: 1 }) +
        [[54, 84], [130, 160], [206, 236], [282, 312]].map(([a, b], i) => A(`M200 ${a}V${b}`, 300 + i * 120)).join('') + `<text x="208" y="73" class="l sm mu">Port B</text>` +
        N(296, 312, 96, 52, 'Limit|switches', 780, { k: 'lim' }) + A('M270 338H296', 800) + A('M344 312V31H270', 900, { dash: 1 }) + T(372, 170, 'Port C|PC0-PC7', 'sm mu'), 'Pick and place robot control chain');
    }
  }),
  autotypes: make({
    source: 'Lecture 2, slides 4 to 8 (new chart)', caption: 'More variety usually means lower volume and higher cost per item.',
    svg: () => SVG(400, 330, `${A('M50 280V28', 0)}${A('M50 280H384', 200)}<text transform="translate(16 160) rotate(-90)" class="sm mu">Production volume</text><text x="217" y="312" class="sm mu">Product variety</text><text x="58" y="34" class="l sm mu">high</text><text x="378" y="298" class="e sm mu">high</text>
      ${N(84, 40, 140, 72, 'Fixed|high volume|one product', 400, { acc: 1 })}${N(134, 122, 140, 72, 'Programmable|batches|reprogram between', 600)}${N(236, 204, 140, 72, 'Flexible|low volume|many products', 800)}`, 'Fixed, programmable and flexible automation by volume and variety')
  }),
  joints: make({
    source: 'Lecture 2, joint types; definitions from standard robotics texts', caption: 'The five robot joint types. L and O slide; R, T and V rotate.', hint: 'Tap a joint to see how it moves.',
    info: {
      L: '<b>L, linear</b>The link slides in and out along its own axis. Translational motion.',
      O: '<b>O, orthogonal</b>Sliding at right angles to the previous link. Translational motion.',
      R: '<b>R, rotational</b>Rotation about an axis perpendicular to the two connected links, like an elbow.',
      T: '<b>T, twisting</b>Rotation about an axis parallel to the two connected links, like turning a screwdriver.',
      V: '<b>V, revolving</b>Rotation about an axis parallel to the input link, with the output link perpendicular to that axis, like a turntable.'
    },
    svg() {
      const cell = (k, x, y, t, icon, d) => `<g class="node pop-in" style="--d:${d}ms" data-k="${k}" tabindex="0" role="button" aria-label="${t}"><rect x="${x}" y="${y}" width="120" height="110" rx="10"/><g transform="translate(${x + 60} ${y + 46})">${icon}</g><text x="${x + 60}" y="${y + 100}" class="b">${t}</text></g>`;
      const bar = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" class="solid" style="stroke:none"/>`;
      const ic = {
        L: bar(-30, -7, 60, 14) + A('M-34 22H34', 0, { both: 1 }),
        O: bar(-34, 8, 52, 12) + bar(8, -26, 12, 36) + A('M34 -26V8', 0, { both: 1 }),
        R: `<circle cx="-20" cy="16" r="5" class="accf"/><rect x="-20" y="10" width="56" height="12" rx="3" transform="rotate(-35 -20 16)" class="solid" style="stroke:none"/>` + A('M34 22A52 52 0 0 0 26 -22', 0),
        T: bar(-34, -12, 60, 24) + A('M32 -24A9 24 0 1 1 32 24', 0),
        V: bar(-26, 24, 52, 10) + bar(-5, -18, 10, 44) + A('M-32 -22A32 11 0 0 1 32 -22', 0)
      };
      return SVG(400, 250, cell('L', 10, 8, 'L  Linear', ic.L, 0) + cell('O', 140, 8, 'O  Orthogonal', ic.O, 100) + cell('R', 270, 8, 'R  Rotational', ic.R, 200) + cell('T', 10, 128, 'T  Twisting', ic.T, 300) + cell('V', 140, 128, 'V  Revolving', ic.V, 400) +
        T(330, 178, 'L, O: sliding|R, T, V: rotating', 'sm mu'), 'Five robot joint types');
    }
  }),
  configs: (() => {
    const base = '<rect x="150" y="205" width="100" height="16" rx="3" class="solid"/>', limb = (a, b) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="limb"/>`, jt = (x, y) => `<circle cx="${x}" cy="${y}" r="7" class="accf"/>`, lab = (x, y, s) => `<text x="${x}" y="${y}" class="b ac">${s}</text>`;
    const D = {
      cart: { n: 'Cartesian', a: 'PPP', b: 'LOO', m: 'x, y, z', ws: 'rectangular box', t: 'Three sliding joints, two of them orthogonal. Also called rectilinear or x-y-z robot.',
        g: '<path class="ws" d="M90 100H240V200H90ZM140 60H290V160H140ZM90 100L140 60M240 100L290 60M240 200L290 160M90 200L140 160"/>' + A('M90 200H270', 0) + A('M90 200V70', 80) + A('M90 200L150 160', 160) + lab(276, 204, 'x') + lab(84, 62, 'z') + lab(156, 158, 'y') + '<circle cx="190" cy="140" r="8" class="accf"/>' },
      cyl: { n: 'Cylindrical', a: 'RPP', b: 'TLO', m: 'angle, radius, height', ws: 'a cylindrical shell', t: 'A vertical column with an arm that moves up and down and in and out. The whole assembly rotates on the base.',
        g: '<path class="ws" d="M70 205A130 22 0 0 0 330 205M70 205A130 22 0 0 1 330 205M70 70A130 22 0 0 0 330 70M70 70A130 22 0 0 1 330 70M70 70V205M330 70V205"/>' + base + '<rect x="192" y="70" width="16" height="140" class="solid"/><rect x="208" y="100" width="112" height="12" class="solid"/><rect x="320" y="94" width="10" height="24" class="accf"/>' + A('M170 190V84', 0, { both: 1 }) + A('M215 90H322', 80, { both: 1 }) + lab(158, 142, 'L') + lab(264, 82, 'O') + lab(262, 222, 'T') },
      sph: { n: 'Spherical', a: 'RRP', b: 'TRL', m: 'angle, angle, extension', ws: 'part of a sphere', t: 'A sliding arm that rotates about a vertical axis and a horizontal axis.',
        g: '<path class="ws" d="M70 170A130 130 0 0 1 330 170"/>' + base + '<rect x="192" y="170" width="16" height="40" class="solid"/>' + limb([200, 170], [290, 100]) + '<line x1="290" y1="100" x2="322" y2="76" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"/>' + jt(200, 170) + lab(262, 222, 'T') + lab(176, 160, 'R') + lab(312, 108, 'L') },
      art: { n: 'Articulated', a: 'RRR', b: 'TRR', m: 'three angles', ws: 'a large sphere-like volume', t: 'Jointed like a human arm, with rotary joints at the shoulder, elbow and wrist.',
        g: '<path class="ws" d="M40 190A165 165 0 0 1 360 190"/>' + base + '<rect x="192" y="170" width="16" height="40" class="solid"/>' + limb([200, 175], [250, 100]) + limb([250, 100], [335, 128]) + jt(200, 175) + jt(250, 100) + lab(262, 222, 'T') + lab(172, 170, 'R') + lab(236, 90, 'R') },
      scara: { n: 'SCARA', a: 'RRP', b: 'VRO', m: 'angle, angle, height', ws: 'a flat disc', t: 'Selective Compliance Assembly Robot Arm. Two vertical rotary axes, compliant horizontally and rigid vertically, ideal for vertical insertion.',
        g: '<ellipse class="ws" cx="260" cy="190" rx="120" ry="26"/>' + base + '<rect x="190" y="110" width="20" height="100" class="solid"/>' + limb([200, 118], [268, 118]) + limb([268, 118], [335, 118]) + jt(200, 118) + jt(268, 118) + '<line x1="335" y1="118" x2="335" y2="180" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"/>' + lab(160, 110, 'V') + lab(262, 100, 'R') + lab(348, 156, 'O') }
    };
    const show = (r, k) => { const d = D[k]; r.querySelector('#cfg').innerHTML = d.g; r.querySelectorAll('.tab').forEach(b => { const on = b.dataset.t === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      r.querySelector('.figinfo').innerHTML = `<b>${d.n}</b>${d.t}<span class="kv">Notation: ${d.a} (P and R) or ${d.b} (joint letters)</span><span class="kv">Movement: ${d.m}</span><span class="kv">Workspace: ${d.ws}</span>`; };
    return make({
      source: 'Lecture 2, slides 27 to 33, redrawn; both notations from the slides', caption: 'The mix of joints decides the shape of the workspace. The slides use two notations, P and R, and the joint letters.', hint: '',
      info: {}, svg: () => `<div class="tabs" role="tablist">${Object.entries(D).map(([k, d]) => `<button class="chip tab" role="tab" data-t="${k}">${d.n}</button>`).join('')}</div>` + SVG(400, 250, '<g id="cfg"></g>', 'Robot configuration drawing'),
      after: r => { r.querySelectorAll('.tab').forEach(b => b.onclick = () => show(r, b.dataset.t)); show(r, 'cart'); }
    });
  })(),
  ladder: make({
    source: 'Lecture 2, slides 38 to 40, redrawn', caption: 'JIRA has six classes. RIA counts only classes 3 to 6 as robots.',
    svg: () => { const R = ['Manual handling device', 'Fixed sequence robot', 'Variable sequence robot', 'Playback robot', 'Numerical control robot', 'Intelligent robot'];
      return SVG(400, 450, `<text x="8" y="20" class="cap">JIRA (Japan): 6 classes</text>` + R.map((t, k) => N(8, 34 + k * 52, 250, 44, `${k + 1}   ${t}`, k * 90, { acc: k > 1 })).join('') +
        A('M264 138H276V338H264', 600, { noend: 1 }) + T(338, 238, 'RIA counts|only classes|3 to 6|as robots', 'ac') + `<text x="8" y="378" class="cap">AFR (France): 4 types, A to D</text>` +
        [['A', 'Manual to|telerobot'], ['B', 'Automatic|handling'], ['C', 'Programmable|servo'], ['D', 'C plus|sensing']].map(([l, t], k) => N(8 + k * 98, 390, 88, 50, `${l}|${t}`, 700 + k * 90, { sm: 1 })).join(''), 'JIRA classes, RIA range and AFR types');
    }
  }),
  ...G301
};
