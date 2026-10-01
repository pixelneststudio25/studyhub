import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { FIG } from './figures.js';
let createClient = null;
try { ({ createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')); } catch { /* offline on first visit: app still works, sync is off */ }

const $ = s => document.querySelector(s), app = $('#app');
const ICON = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const day = (o = 0) => new Date(Date.now() + o * 864e5).toISOString().slice(0, 10);
let D, L = [], S, user = null, timer;
const sb = createClient && SUPABASE_URL.startsWith('http') ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const blank = () => ({ done: {}, quiz: {}, weak: {}, cards: {}, days: {}, t: 0 });
S = { ...blank(), ...JSON.parse(localStorage.getItem('sh') || '{}') };
function save() {
  S.t = Date.now(); S.days[day()] = 1;
  localStorage.setItem('sh', JSON.stringify(S));
  clearTimeout(timer); timer = setTimeout(push, 1200);
}
let syncT;
function setSync(st) {
  const el = $('#sync'); clearTimeout(syncT); el.className = 'sync ' + st;
  el.innerHTML = st === 'saving' ? '<i class="spin" aria-hidden="true"></i><span>Saving</span>' : st === 'saved' ? `${ICON('check')}<span>Saved</span>` : st === 'error' ? '<span>Not synced</span>' : st === 'offline' ? `${ICON('offline')}<span>Offline. Saved on this device</span>` : '';
  if (st === 'saved') syncT = setTimeout(() => setSync(''), 2200);
}
async function push() {
  if (!(sb && user)) return; if (!navigator.onLine) { setSync('offline'); return; } setSync('saving');
  const { error } = await sb.from('user_state').upsert({ user_id: user.id, data: S, updated_at: new Date().toISOString() });
  setSync(error ? 'error' : 'saved');
}
async function withLoad(btn, label, fn) {
  const h = btn.innerHTML; btn.disabled = true; btn.classList.add('loading'); btn.innerHTML = `<i class="spin" aria-hidden="true"></i><span>${label}</span>`;
  try { return await fn(); } finally { btn.disabled = false; btn.classList.remove('loading'); btn.innerHTML = h; }
}
const lb = $('#lbar'); let lbT;
function bar(on) {
  clearTimeout(lbT);
  if (on) { lb.style.transition = 'none'; lb.style.width = '0'; lb.style.opacity = '1'; requestAnimationFrame(() => requestAnimationFrame(() => { lb.style.transition = ''; lb.style.width = '72%'; })); }
  else { lb.style.width = '100%'; lbT = setTimeout(() => { lb.style.opacity = '0'; }, 240); }
}
async function pull() {
  const { data } = await sb.from('user_state').select('data').eq('user_id', user.id).maybeSingle();
  if (data && (data.data.t || 0) > (S.t || 0)) { S = { ...blank(), ...data.data }; localStorage.setItem('sh', JSON.stringify(S)); } else push();
  route();
}
const streak = () => { let n = 0, o = S.days[day()] ? 0 : -1; while (S.days[day(o)]) { n++; o--; } return n; };
const weekDays = () => [...Array(7)].filter((_, i) => S.days[day(-i)]).length;

// theme
const theme = localStorage.getItem('th');
if (theme) document.documentElement.dataset.theme = theme;
$('#theme').onclick = () => {
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme:dark)').matches);
  const n = dark ? 'light' : 'dark'; document.documentElement.dataset.theme = n; localStorage.setItem('th', n);
};
// nav
const NAV = [['#/', 'home', 'Home'], ['#/lessons', 'list', 'Lessons'], ['#/cards', 'layers', 'Cards'], ['#/glossary', 'book', 'Terms'], ['#/account', 'user', 'Account']];
const navHTML = h => NAV.map(([href, ic, t]) => `<a href="${href}" class="nl ${h === href ? 'on' : ''}" ${h === href ? 'aria-current="page"' : ''}>${ICON(ic)}<span>${t}</span></a>`).join('');
const setMenu = o => { document.body.classList.toggle('menu', o); $('#burger').setAttribute('aria-expanded', o); };
$('#burger').onclick = () => setMenu(!document.body.classList.contains('menu'));
$('#scrim').onclick = () => setMenu(false);

// search
const ov = $('#overlay'), qi = $('#q');
const openS = () => { ov.hidden = false; qi.value = ''; qi.focus(); find(); };
$('#srch').onclick = openS;
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openS(); } if (e.key === 'Escape') { ov.hidden = true; setMenu(false); } });
ov.onclick = e => { if (e.target === ov || e.target.closest('a')) ov.hidden = true; };
qi.oninput = find;
function find() {
  const q = qi.value.toLowerCase().trim();
  const ls = L.filter(l => !q || (l.id + l.title + l.one_line).toLowerCase().includes(q)).slice(0, 6).map(l => `<a href="#/lesson/${l.id}">${l.id} · ${esc(l.title)}</a>`);
  const ts = q ? Object.values(D.glossary).filter(g => (g.term + g.plain).toLowerCase().includes(q)).slice(0, 6).map(g => `<a href="#/glossary/${encodeURIComponent(g.term)}">Term: ${esc(g.term)}</a>`) : [];
  $('#res').innerHTML = ls.join('') + ts.join('') || '<p class="mut">No matches</p>';
}

// views
const ring = (p, n = 96) => { const c = 2 * Math.PI * 40; return `<svg class="ring" viewBox="0 0 100 100" width="${n}" height="${n}" role="img" aria-label="${Math.round(p * 100)} percent complete"><circle class="bg" cx="50" cy="50" r="40"/><circle class="fg" cx="50" cy="50" r="40" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-o="${c * (1 - p)}"/></svg>`; };
const fillRings = () => requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('.ring .fg').forEach(e => e.style.strokeDashoffset = e.dataset.o)));
const lesson = id => L.find(l => l.id === id);
const dueCards = scope => L.filter(l => !scope || l.id === scope).flatMap(l => l.flashcards.map((c, i) => ({ ...c, key: l.id + '#' + i, lid: l.id })))
  .filter(c => (S.cards[c.key]?.due || '') <= day());

const TARGET = 5;
let C = {};
const dow = () => (new Date().getDay() + 6) % 7 + 1;
const dnum = () => Math.floor(Date.now() / 864e5);
const gapDays = () => { if (S.days[day()]) return 0; for (let o = 1; o <= 90; o++) if (S.days[day(-o)]) return o; return -1; };
const fill = (t, d) => t.replace(/\{(\w+)\}/g, (_, k) => d[k] ?? '');
const weakest = () => Object.entries(S.weak).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0];
const dueNow = () => L.flatMap(l => l.flashcards.map((c, i) => ({ k: l.id + '#' + i, l }))).filter(c => (S.cards[c.k] || S.done[c.l.id]) && (S.cards[c.k]?.due || '') <= day()).length;

function coach() {
  const done = L.filter(l => S.done[l.id]).length, st = streak(), gap = gapDays(), wd = weekDays(), wk = weakest();
  const lq = Object.entries(S.quiz).sort((a, b) => b[1].ts - a[1].ts)[0];
  const need = TARGET - wd, daysLeft = 8 - dow();
  const fresh = lq && Date.now() - lq[1].ts < 36e5 * 36 && lq[1].score === lq[1].total;
  const data = { n: done, left: L.length - done, total: L.length, streak: st, days: wd, target: TARGET, remaining: Math.max(0, need), gap, topic: wk ? lesson(wk[0]).title : fresh ? lesson(lq[0]).title : '' };
  let key = 'progress', arr;
  if (gap < 0) key = 'start';
  else if (gap >= 3) key = 'return';
  else if (gap === 2) key = 'skipped';
  else if (S.days[day()] && C.streak?.[st]) { key = 'streak'; arr = C.streak[st]; }
  else if (need > 0 && need >= daysLeft && dow() >= 3) key = 'behind';
  else if (fresh) { key = 'perfect'; data.topic = lesson(lq[0]).title; }
  else if (wk) key = 'weak';
  else if (done === L.length) key = 'caughtup';
  arr = arr || C[key];
  return arr?.length ? fill(arr[(dnum() + key.length) % arr.length], data) : 'Open the assignment below and start.';
}
function assignment() {
  const due = dueNow(), wk = weakest(), next = L.find(l => !S.done[l.id]);
  if (due > 0) return { label: 'Flashcards due', title: `${due} card${due > 1 ? 's' : ''} to review`, text: `About ${Math.max(1, Math.round(due * 0.5))} minutes. Clear these before anything new.`, href: '#/cards', cta: 'Review cards' };
  if (wk) return { label: 'Weak topic', title: lesson(wk[0]).title, text: 'You missed questions here. Retake the quiz until it is clean.', href: `#/quiz/${wk[0]}`, cta: 'Retake quiz' };
  if (next) { const on = (S.pos?.[next.id] || 0) > 0; return { label: on ? 'Continue' : 'Next lesson', title: `${next.id} · ${next.title}`, text: next.one_line, href: `#/lesson/${next.id}`, cta: on ? 'Resume lesson' : 'Start lesson' }; }
  return { label: 'Course complete', title: 'Every lesson is done', text: 'Revisit your weakest topics and keep your cards clear.', href: '#/lessons', cta: 'Open lessons' };
}
function countUp() {
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  document.querySelectorAll('[data-n]').forEach(el => {
    const n = +el.dataset.n; if (reduce || !n) { el.textContent = n; return; }
    const t0 = performance.now();
    const f = t => { const p = Math.min(1, (t - t0) / 600); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
}
function home() {
  const done = L.filter(l => S.done[l.id]).length, a = assignment(), st = streak();
  app.innerHTML = `<section class="coach"><p class="label">Your coach</p><p class="coach-line">${esc(coach())}</p></section>
  <a class="assign" href="${a.href}"><span class="label">Today's assignment · ${esc(a.label)}</span><h2>${esc(a.title)}</h2><p>${esc(a.text)}</p><span class="btn pri">${esc(a.cta)}${ICON('arrow')}</span></a>
  <h2 class="sec-h">Progress</h2><p class="mut">${esc(D.course.code)} · ${esc(D.course.title)}</p>
  <div class="grid"><div class="card ringcard">${ring(done / L.length)}<div class="stat"><b data-n="${done}">0</b>of ${L.length} lessons</div></div>
  <div class="card stat"><span class="fl ${st ? 'on' : ''}">${ICON('flame')}</span><b data-n="${st}">0</b>day streak</div>
  <div class="card stat"><b data-n="${weekDays()}">0</b>of ${TARGET} study days this week</div>
  <a class="card stat" href="#/cards"><b data-n="${dueNow()}">0</b>cards due</a></div>`;
  fillRings(); countUp();
}
function lessons() {
  app.innerHTML = '<h1>Lessons</h1>' + D.modules.map(m => `<h2>${esc(m.title)}</h2>` + m.lessons.map(l =>
    `<a class="card" href="#/lesson/${l.id}">${S.done[l.id] ? ICON('check') + ' ' : ''}${l.id} · ${esc(l.title)}${S.quiz[l.id] ? `<br><span class="mut">Quiz: ${S.quiz[l.id].score}/${S.quiz[l.id].total}</span>` : ''}</a>`).join('')).join('');
}
let lc = null;
function lessonView(id, start) {
  const l = lesson(id); if (!l) return home();
  const v = l.videos[0], chunks = [];
  for (let k = 0; k < l.exam.length; k += 3) chunks.push(l.exam.slice(k, k + 3));
  const li = L.findIndex(x => x.id === id), next = L[li + 1];
  const words = (l.exam.join(' ') + l.analogy + l.one_line).split(/\s+/).length;
  const mins = Math.max(4, Math.round(words / 150 + l.quiz.length * 0.7 + (v.id ? 5 : 0)));
  const secs = [
    { t: 'Orient', h: () => `<p class="label">Lesson ${esc(l.id)} · Slides ${esc(l.slides)}</p><h1>${esc(l.title)}</h1><p class="tip">${esc(l.one_line)}</p><p class="mut">${secs.length} screens, about ${mins} minutes.</p>` },
    { t: 'Recall', h: () => `<p class="label">Before you read</p>${l.recall.map(r => `<p class="big">${esc(r)}</p>`).join('')}<p class="mut">Answer in your head first. Then continue.</p>` },
    { t: 'Picture it', h: () => `<p class="label">Picture it</p><p class="big">${esc(l.analogy)}</p>` },
    ...(l.figure && FIG[l.figure] ? [{ t: 'Diagram', h: () => FIG[l.figure].html(), after: r => FIG[l.figure].init(r) }] : []),
    ...chunks.map((c, k) => ({ t: chunks.length > 1 ? `The core, part ${k + 1}` : 'The core', h: () => `<p class="label">The core${chunks.length > 1 ? `, ${k + 1} of ${chunks.length}` : ''}</p><ul class="core">${c.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` })),
    { t: 'Terms', h: () => `<p class="label">Key terms</p><p class="mut">Tap a term.</p><div>${l.terms.map(t => `<button class="chip" data-t="${t}">${esc(D.glossary[t].term)}</button>`).join('')}</div><div id="def"></div>` },
    { t: 'Watch', h: () => `<p class="label">Watch</p>${!navigator.onLine ? '<div class="card">Videos need a connection. Reconnect to watch.</div>' : v.id ? `<div class="vwrap"><div class="sk"></div><iframe class="vid" onload="this.parentNode.classList.add('ready')" loading="lazy" allowfullscreen title="Lesson video" src="https://www.youtube-nocookie.com/embed/${v.id}?start=${v.start || 0}${v.end ? '&end=' + v.end : ''}"></iframe></div>` : `<div class="card">No approved video yet. <a target="_blank" rel="noopener" href="${v.search_fallback}">Search YouTube</a></div>`}` },
    { t: 'Check', h: () => `<p class="label">Check</p><h2 style="margin-top:0">Test yourself</h2><p>${l.quiz.length} questions. Rate your confidence before each answer.</p>${S.quiz[id] ? `<p class="mut">Last score: ${S.quiz[id].score} of ${S.quiz[id].total}</p>` : ''}<button class="btn pri" id="qs">${S.quiz[id] ? 'Retake quiz' : 'Start quiz'}</button>` },
    { t: 'Close', h: () => `<p class="label">Lesson ${esc(l.id)}</p><h2 style="margin-top:0">${esc(l.title)}</h2><p class="tip">${esc(l.one_line)}</p>${S.quiz[id] ? `<p class="mut">Quiz: ${S.quiz[id].score} of ${S.quiz[id].total}</p>` : '<p class="mut">You have not taken the quiz yet.</p>'}<button class="btn ${S.done[id] ? '' : 'pri'}" id="dn">${S.done[id] ? ICON('check') + 'Completed. Undo' : 'Mark complete'}</button><a class="btn" href="#/cards/${id}">Flashcards</a>${next ? `<a class="btn" href="#/lesson/${next.id}/0">Next: ${esc(next.title)}</a>` : ''}` }
  ];
  let i = Math.min(Math.max(start != null && start !== '' ? +start || 0 : S.pos?.[id] || 0, 0), secs.length - 1), busy = false, tx = 0, ty = 0;
  const rev = ICON('arrow').replace('class="ic"', 'class="ic rev"');
  app.innerHTML = `<div class="lv"><div class="bar" role="progressbar" aria-label="Lesson progress" aria-valuemin="1" aria-valuemax="${secs.length}"><i></i></div>
    <div class="stage" id="stg"></div>
    <div class="ctl"><button class="btn" id="bk">${rev}<span>Back</span></button><button class="btn sec" id="sl" aria-expanded="false">${ICON('list')}<span>Sections</span></button><button class="btn pri" id="nx"><span>Next</span>${ICON('arrow')}</button></div>
    <aside class="secs" id="sp" aria-label="Lesson sections"><p class="label">Sections</p>${secs.map((x, k) => `<button data-i="${k}"><b>${k + 1}</b>${esc(x.t)}</button>`).join('')}</aside></div>`;
  const stg = $('#stg'), sp = $('#sp');
  const upd = () => {
    app.querySelector('.bar i').style.width = ((i + 1) / secs.length * 100) + '%';
    app.querySelector('.bar').setAttribute('aria-valuenow', i + 1);
    $('#bk').disabled = i === 0; $('#nx').disabled = i === secs.length - 1;
    sp.querySelectorAll('button').forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('seen', k < i); });
    if ((S.pos ||= {})[id] !== i) { S.pos[id] = i; save(); }
    history.replaceState(null, '', `#/lesson/${id}/${i}`);
  };
  const show = cls => { qh = null; stg.innerHTML = `<section class="scr ${cls}">${secs[i].h()}</section>`; upd(); scrollTo(0, 0); secs[i].after?.(stg.firstElementChild); };
  const go = n => {
    if (busy || n < 0 || n >= secs.length || n === i) return;
    const d = n > i ? 1 : -1, old = stg.firstElementChild; i = n; busy = true;
    const swap = () => { show(d > 0 ? 'in-n' : 'in-p'); busy = false; };
    if (old && !matchMedia('(prefers-reduced-motion:reduce)').matches) { old.classList.add(d > 0 ? 'out-n' : 'out-p'); setTimeout(swap, 160); } else swap();
  };
  const closeS = () => { sp.classList.remove('open'); $('#sl').setAttribute('aria-expanded', 'false'); };
  $('#bk').onclick = () => go(i - 1); $('#nx').onclick = () => go(i + 1);
  $('#sl').onclick = () => { const o = sp.classList.toggle('open'); $('#sl').setAttribute('aria-expanded', o); };
  sp.onclick = e => { const b = e.target.closest('[data-i]'); if (b) { closeS(); go(+b.dataset.i); } };
  stg.onclick = e => {
    const t = e.target.closest('[data-t]');
    if (t) { const g = D.glossary[t.dataset.t]; stg.querySelector('#def').innerHTML = `<div class="defn"><b>${esc(g.term)}</b><p>${esc(g.plain)}</p><p class="mut"><span class="label">Exam</span> ${esc(g.exam)}</p></div>`; }
    if (e.target.closest('#qs')) quiz(id, stg.firstElementChild, () => go(i + 1));
    if (e.target.closest('#dn')) { S.done[id] = !S.done[id]; save(); show('in-n'); if (S.done[id]) stg.firstElementChild.classList.add('pop'); }
  };
  stg.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  stg.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if (Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy)) go(i + (dx < 0 ? 1 : -1)); }, { passive: true });
  lc = { next: () => go(i + 1), prev: () => go(i - 1), close: closeS };
  show('in-n');
}
addEventListener('keydown', e => { if (qh && ov.hidden && !e.ctrlKey && !e.metaKey && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { if (e.key === ' ') e.preventDefault(); qh(e.key); return; }
  if (!lc || qh || !ov.hidden || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight') lc.next(); else if (e.key === 'ArrowLeft') lc.prev(); else if (e.key === 'Escape') lc.close();
});
let qh = null;
function quiz(id, host = app, onDone) {
  const l = lesson(id), AZ = ['A', 'B', 'C', 'D'], missed = []; let i = 0, score = 0, conf = 'sure';
  const finish = () => {
    qh = null; const tot = l.quiz.length;
    S.quiz[id] = { score, total: tot, ts: Date.now() }; if (score === tot) S.weak[id] = 0; save();
    const msg = score === tot ? 'Clean sheet. Move on.' : score * 2 >= tot ? `${tot - score} missed. Read the answers below, then retry.` : 'This topic is not secure yet. Go back through the core, then retry.';
    host.innerHTML = `<div class="qz"><p class="label">Result</p><h2 class="qscore pop"><span>${score}</span> of ${tot}</h2><p class="coachish">${msg}</p>
      ${missed.length ? `<h3>Review these</h3>${missed.map(m => `<div class="card"><p class="label">${esc(m.q)}</p><p><b>${esc(m.a)}</b></p><p class="mut">${esc(m.e)}</p></div>`).join('')}` : ''}
      <div>${onDone ? '<button class="btn pri" id="qd">Continue</button><button class="btn" id="qr">Retry</button>' : `<a class="btn pri" href="#/lesson/${id}/99">Back to lesson</a><a class="btn" href="#/quiz/${id}">Retry</a>`}</div></div>`;
    if (onDone) { host.querySelector('#qd').onclick = onDone; host.querySelector('#qr').onclick = () => quiz(id, host, onDone); }
    scrollTo(0, 0);
  };
  const show = () => {
    qh = null; if (i >= l.quiz.length) return finish();
    const q = l.quiz[i], last = i + 1 === l.quiz.length; let answered = false;
    host.innerHTML = `<div class="qz in-n"><div class="qseg" aria-hidden="true">${l.quiz.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'cur' : ''}"></i>`).join('')}</div>
      <p class="label">Question ${i + 1} of ${l.quiz.length}</p><h2 class="qq">${esc(q.q)}</h2>
      <div class="conf" role="group" aria-label="How sure are you?"><span class="label">How sure are you?</span>${['sure', 'guess', 'no idea'].map(c => `<button class="seg ${c === conf ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
      <div class="opts">${q.options.map((o, k) => `<button class="opt" data-k="${k}"><b>${AZ[k]}</b><span>${esc(o)}</span></button>`).join('')}</div><div id="fb"></div></div>`;
    host.querySelector('.conf').onclick = e => { const c = e.target.dataset.c; if (c && !answered) { conf = c; host.querySelectorAll('.seg').forEach(b => b.classList.toggle('on', b.dataset.c === c)); } };
    const next = () => { i++; show(); };
    const pick = k => {
      if (answered || k < 0 || k >= q.options.length) return; answered = true;
      const ok = k === q.answer; if (ok) score++; else { S.weak[id] = (S.weak[id] || 0) + (conf === 'sure' ? 2 : 1); missed.push({ q: q.q, a: q.options[q.answer], e: q.explain }); }
      host.querySelectorAll('.opt').forEach((x, j) => { x.disabled = true; if (j === q.answer) x.classList.add('right'); else if (j === k) x.classList.add('wrong'); });
      host.querySelector('#fb').innerHTML = `<div class="fbk ${ok ? 'good' : 'bad'}"><p class="label">${ok ? 'Correct' : 'Not quite'}</p><p class="why">${esc(q.explain)}</p>${!ok && conf === 'sure' ? '<p class="warn">You were sure and wrong. Come back to this one.</p>' : ''}</div><button class="btn pri" id="nx">${last ? 'See result' : 'Next'}</button>`;
      host.querySelector('#nx').onclick = next; host.querySelector('#nx').focus({ preventScroll: true }); save();
    };
    host.querySelectorAll('.opt').forEach(b => b.onclick = () => pick(+b.dataset.k));
    qh = key => { const k = key.toLowerCase(); if (!answered) pick('abcd'.indexOf(k) >= 0 ? 'abcd'.indexOf(k) : '1234'.indexOf(k)); else if (k === 'enter') next(); };
  };
  show();
}
function cards(scope) {
  const q = dueCards(scope), tally = { 1: 0, 3: 0, 4: 0, 5: 0 }; let i = 0;
  const days = (c, g) => { if (g < 3) return 1; const st = S.cards[c.key] || { ef: 2.5, int: 0, reps: 0 }; return st.reps === 0 ? 1 : st.reps === 1 ? 6 : Math.round(st.int * st.ef); };
  const fmt = n => n === 1 ? '1 day' : n + ' days';
  const show = () => {
    qh = null;
    if (i >= q.length) {
      const again = tally[1];
      app.innerHTML = `<p class="label">Session complete</p><h1>${q.length ? `${q.length} card${q.length > 1 ? 's' : ''} reviewed` : 'Nothing due'}</h1><p class="coachish">${!q.length ? 'Finish a lesson to unlock its cards, or come back tomorrow.' : again ? `${again} came back as Again. They return tomorrow. Do not skip them.` : 'Clean session. Come back tomorrow.'}</p><a class="btn pri" href="#/">Home</a><a class="btn" href="#/lessons">Lessons</a>`;
      return;
    }
    const c = q[i];
    app.innerHTML = `<div class="bar2"><i style="width:${i / q.length * 100}%"></i></div><div class="in-n"><p class="label">Card ${i + 1} of ${q.length} · Lesson ${esc(c.lid)}</p>
      <button class="flip" id="fc" aria-label="Reveal answer"><span class="fi"><span class="ff"><small class="label">Question</small><span>${esc(c.front)}</span></span><span class="fb"><small class="label">Answer</small><span>${esc(c.back)}</span></span></span></button>
      <p class="mut hint" id="ht">Tap the card or press Space to reveal.</p>
      <div class="grades" id="gr" hidden>${[['Again', 1], ['Hard', 3], ['Good', 4], ['Easy', 5]].map(([n, g], k) => `<button class="btn" data-g="${g}"><b>${n}</b><small>${fmt(days(c, g))}</small></button>`).join('')}</div></div>`;
    let flipped = false;
    const flip = () => { if (flipped) return; flipped = true; $('#fc').classList.add('flipped'); $('#gr').hidden = false; $('#ht').hidden = true; };
    const grade = g => { if (!flipped || !tally[g] && tally[g] !== 0) return; sm2(c.key, g); tally[g]++; i++; show(); };
    $('#fc').onclick = flip; $('#gr').onclick = e => { const b = e.target.closest('[data-g]'); if (b) grade(+b.dataset.g); };
    qh = k => { if (k === ' ' || k === 'Enter') flip(); else if ('1234'.includes(k) && k) grade([1, 3, 4, 5]['1234'.indexOf(k)]); };
  };
  show();
}
function sm2(key, q) {
  const c = S.cards[key] || { ef: 2.5, int: 0, reps: 0 };
  if (q < 3) { c.reps = 0; c.int = 1; } else { c.int = c.reps === 0 ? 1 : c.reps === 1 ? 6 : Math.round(c.int * c.ef); c.reps++; }
  c.ef = Math.max(1.3, c.ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)); c.due = day(c.int); S.cards[key] = c; save();
}
function glossary(hash) {
  const pre = decodeURIComponent(hash || '');
  app.innerHTML = `<h1>Glossary</h1><input class="f" id="gq" placeholder="Filter terms" value="${esc(pre)}"><div id="gl"></div>`;
  const draw = () => { const q = $('#gq').value.toLowerCase(); $('#gl').innerHTML = Object.values(D.glossary).filter(g => (g.term + g.plain).toLowerCase().includes(q)).sort((a, b) => a.term.localeCompare(b.term))
    .map(g => `<div class="card"><b>${esc(g.term)}</b><p>${esc(g.plain)}</p><p class="mut"><b>Exam:</b> ${esc(g.exam)}</p></div>`).join(''); };
  $('#gq').oninput = draw; draw();
}
function account() {
  app.innerHTML = `<h1>Account</h1>` + (!sb ? '<p>Add your Supabase keys in config.js to enable sync.</p>' : user ? `<p>Signed in as <b>${esc(user.email)}</b>. Progress syncs across devices.</p><button class="btn" id="so">Sign out</button>`
    : `<p>Sign in to sync progress across devices.</p><input class="f" id="em" type="email" placeholder="you@email.com"><button class="btn pri" id="ml">Email me a magic link</button><p id="ms" class="mut"></p>`)
    + `<h2>Offline and install</h2><p class="mut">${navigator.serviceWorker?.controller ? 'Lessons, quizzes and cards work without a connection.' : 'Offline mode switches on after your first full load.'}</p>${dip ? '<button class="btn pri" id="ia">Install app</button>' : '<p class="mut">iPhone: tap Share, then Add to Home Screen. Android Chrome: open the browser menu and choose Install app.</p>'}<h2>Backup</h2><button class="btn" id="ex">${ICON('download')}Export progress</button>`;
  $('#ia')?.addEventListener('click', async () => { dip.prompt(); await dip.userChoice; dip = null; account(); });
  $('#ex')?.addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' })); a.download = 'studyhub-progress.json'; a.click(); });
  $('#so')?.addEventListener('click', e => withLoad(e.currentTarget, 'Signing out', () => sb.auth.signOut()));
  $('#ml')?.addEventListener('click', e => withLoad(e.currentTarget, 'Sending', async () => { const { error } = await sb.auth.signInWithOtp({ email: $('#em').value, options: { emailRedirectTo: location.origin + location.pathname } }); $('#ms').textContent = error ? error.message : 'Check your email.'; }));
}

function route() {
  if (!D) return;
  const h = location.hash || '#/', [, r, a, b] = h.split('/');
  app.removeAttribute('aria-busy'); lc = null; qh = null; document.body.classList.toggle('lesson', r === 'lesson'); bar(true);
  const base = '#/' + (r || '');
  $('#side').innerHTML = `<a class="sbrand" href="#/">StudyHub<span>${esc(D.course.code)}</span></a>` + navHTML(base); $('#bottom').innerHTML = navHTML(base); setMenu(false);
  ({ '': home, lessons, lesson: () => lessonView(a, b), quiz: () => quiz(a), cards: () => cards(a), glossary: () => glossary(a), account }[r || ''] || home)();
  scrollTo(0, 0); app.focus({ preventScroll: true }); setTimeout(() => bar(false), 200);
}
addEventListener('hashchange', route);
if (sb) sb.auth.onAuthStateChange((_, s) => { user = s?.user || null; if (user) pull(); else route(); });

function loadData() {
  return Promise.all([fetch('data/mce321.json').then(r => { if (!r.ok) throw 0; return r.json(); }), fetch('data/coach.json').then(r => r.json()).catch(() => ({}))]).then(
    ([d, c]) => { D = d; C = c; L = d.modules.flatMap(m => m.lessons); route(); },
    () => { app.innerHTML = '<div class="card"><h2 style="margin-top:0">Could not load your course</h2><p class="mut">Check your connection, then try again.</p><button class="btn pri" id="rt">Try again</button></div>'; $('#rt').onclick = e => withLoad(e.currentTarget, 'Loading', loadData); });
}
loadData();

// PWA: install prompt, connectivity, updates
let dip = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); dip = e; });
addEventListener('offline', () => setSync('offline'));
addEventListener('online', () => { setSync(''); push(); });
if (!navigator.onLine) setSync('offline');
function toast(msg, label, fn) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = `<span>${esc(msg)}</span><button class="btn pri">${esc(label)}</button>`;
  t.querySelector('button').onclick = e => { e.currentTarget.classList.add('loading'); e.currentTarget.innerHTML = '<i class="spin" aria-hidden="true"></i><span>Updating</span>'; fn(); };
  document.body.append(t);
}
if ('serviceWorker' in navigator) {
  let had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!had) { had = true; return; } location.reload(); });
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').then(reg => {
    const ready = w => { if (navigator.serviceWorker.controller) toast('A new version is ready.', 'Refresh', () => w.postMessage('SKIP_WAITING')); };
    if (reg.waiting) ready(reg.waiting);
    reg.addEventListener('updatefound', () => { const w = reg.installing; w.addEventListener('statechange', () => { if (w.state === 'installed') ready(w); }); });
  }).catch(() => {}));
}
