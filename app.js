import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const $ = s => document.querySelector(s), app = $('#app');
const ICON = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const day = (o = 0) => new Date(Date.now() + o * 864e5).toISOString().slice(0, 10);
let D, L = [], S, user = null, timer;
const sb = SUPABASE_URL.startsWith('http') ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const blank = () => ({ done: {}, quiz: {}, weak: {}, cards: {}, days: {}, t: 0 });
S = { ...blank(), ...JSON.parse(localStorage.getItem('sh') || '{}') };
function save() {
  S.t = Date.now(); S.days[day()] = 1;
  localStorage.setItem('sh', JSON.stringify(S));
  clearTimeout(timer); timer = setTimeout(push, 1200);
}
async function push() { if (sb && user) await sb.from('user_state').upsert({ user_id: user.id, data: S, updated_at: new Date().toISOString() }); }
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

function home() {
  const done = L.filter(l => S.done[l.id]).length, next = L.find(l => !S.done[l.id]);
  const weak = Object.entries(S.weak).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  app.innerHTML = `<h1>${esc(D.course.code)}</h1><p class="mut">${esc(D.course.title)}</p>
  <div class="grid"><div class="card" style="display:flex;gap:14px;align-items:center">${ring(done / L.length)}<div class="stat"><b>${done}/${L.length}</b>lessons done</div></div>
  <div class="card stat"><b>${streak()}</b>day streak</div>
  <div class="card stat"><b>${weekDays()}/7</b>study days this week</div>
  <a class="card stat" href="#/cards"><b>${dueCards().length}</b>flashcards due</a></div>
  ${next ? `<h2>Up next</h2><a class="card" href="#/lesson/${next.id}"><b>${next.id} · ${esc(next.title)}</b><br><span class="mut">${esc(next.one_line)}</span></a>` : '<h2>All lessons complete</h2>'}
  ${weak.length ? `<h2>Weakest topics</h2>${weak.map(([id]) => `<a class="card" href="#/quiz/${id}">${id} · ${esc(lesson(id).title)}<br><span class="mut">Retake the quiz</span></a>`).join('')}` : ''}`;
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
    ...chunks.map((c, k) => ({ t: chunks.length > 1 ? `The core, part ${k + 1}` : 'The core', h: () => `<p class="label">The core${chunks.length > 1 ? `, ${k + 1} of ${chunks.length}` : ''}</p><ul class="core">${c.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` })),
    { t: 'Terms', h: () => `<p class="label">Key terms</p><p class="mut">Tap a term.</p><div>${l.terms.map(t => `<button class="chip" data-t="${t}">${esc(D.glossary[t].term)}</button>`).join('')}</div><div id="def"></div>` },
    { t: 'Watch', h: () => `<p class="label">Watch</p>${v.id ? `<iframe class="vid" loading="lazy" allowfullscreen title="Lesson video" src="https://www.youtube-nocookie.com/embed/${v.id}?start=${v.start || 0}${v.end ? '&end=' + v.end : ''}"></iframe>` : `<div class="card">No approved video yet. <a target="_blank" rel="noopener" href="${v.search_fallback}">Search YouTube</a></div>`}` },
    { t: 'Check', h: () => `<p class="label">Check</p><h2 style="margin-top:0">Test yourself</h2><p>${l.quiz.length} questions. Rate your confidence before each answer.</p>${S.quiz[id] ? `<p class="mut">Last score: ${S.quiz[id].score} of ${S.quiz[id].total}</p>` : ''}<a class="btn pri" href="#/quiz/${id}">Start quiz</a>` },
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
  const show = cls => { stg.innerHTML = `<section class="scr ${cls}" aria-live="polite">${secs[i].h()}</section>`; upd(); scrollTo(0, 0); };
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
    if (e.target.closest('#dn')) { S.done[id] = !S.done[id]; save(); show('in-n'); if (S.done[id]) stg.firstElementChild.classList.add('pop'); }
  };
  stg.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  stg.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if (Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy)) go(i + (dx < 0 ? 1 : -1)); }, { passive: true });
  lc = { next: () => go(i + 1), prev: () => go(i - 1), close: closeS };
  show('in-n');
}
addEventListener('keydown', e => {
  if (!lc || !ov.hidden || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight') lc.next(); else if (e.key === 'ArrowLeft') lc.prev(); else if (e.key === 'Escape') lc.close();
});
function quiz(id) {
  const l = lesson(id); let i = 0, score = 0, conf = 'sure';
  const show = () => {
    if (i >= l.quiz.length) { S.quiz[id] = { score, total: l.quiz.length, ts: Date.now() }; save();
      app.innerHTML = `<h1 class="pop">${score}/${l.quiz.length}</h1><p>${score === l.quiz.length ? 'Perfect. Move on.' : 'Review the missed points, then retry.'}</p><a class="btn pri" href="#/lesson/${id}/99">Back to lesson</a><a class="btn" href="#/quiz/${id}">Retry</a>`; return; }
    const q = l.quiz[i];
    app.innerHTML = `<p class="mut">${esc(l.title)} · ${i + 1}/${l.quiz.length}</p><h2 style="margin-top:0">${esc(q.q)}</h2>
    <div class="conf" role="group" aria-label="Confidence">${['sure', 'guess', 'no idea'].map(c => `<button class="btn ${c === conf ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
    ${q.options.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join('')}<div id="fb"></div>`;
    app.querySelector('.conf').onclick = e => { if (e.target.dataset.c) { conf = e.target.dataset.c; app.querySelectorAll('.conf button').forEach(b => b.classList.toggle('on', b.dataset.c === conf)); } };
    app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const k = +b.dataset.k, ok = k === q.answer; if (ok) score++; else S.weak[id] = (S.weak[id] || 0) + (conf === 'sure' ? 2 : 1);
      app.querySelectorAll('.opt').forEach((x, j) => { x.disabled = true; if (j === q.answer) x.classList.add('right'); else if (j === k) x.classList.add('wrong'); });
      $('#fb').innerHTML = `<div class="tip">${ok ? 'Correct.' : 'Not quite.'} ${esc(q.explain)}${!ok && conf === 'sure' ? ' <b>You were sure. Watch this one.</b>' : ''}</div><button class="btn pri" id="nx">${i + 1 < l.quiz.length ? 'Next' : 'Finish'}</button>`;
      save(); $('#nx').onclick = () => { i++; show(); };
    });
  };
  show();
}
function cards(scope) {
  const q = dueCards(scope); let i = 0;
  const show = () => {
    if (i >= q.length) { app.innerHTML = `<h1>${q.length ? 'Done for today' : 'Nothing due'}</h1><p class="mut">Cards return on a spaced schedule.</p><a class="btn pri" href="#/">Home</a>`; return; }
    const c = q[i];
    app.innerHTML = `<p class="mut">${i + 1}/${q.length} · ${c.lid}</p><button class="card face" id="fc" style="width:100%">${esc(c.front)}</button><div id="gr"></div>`;
    $('#fc').onclick = () => { $('#fc').textContent = c.back; $('#gr').innerHTML = [['Again', 1], ['Hard', 3], ['Good', 4], ['Easy', 5]].map(([n, g]) => `<button class="btn" data-g="${g}">${n}</button>`).join(''); };
    $('#gr').onclick = e => { const g = +e.target.dataset.g; if (!g) return; sm2(c.key, g); i++; show(); };
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
    + `<h2>Backup</h2><button class="btn" id="ex">${ICON('download')}Export progress</button>`;
  $('#ex')?.addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' })); a.download = 'studyhub-progress.json'; a.click(); });
  $('#so')?.addEventListener('click', async () => { await sb.auth.signOut(); });
  $('#ml')?.addEventListener('click', async () => { const { error } = await sb.auth.signInWithOtp({ email: $('#em').value, options: { emailRedirectTo: location.origin + location.pathname } }); $('#ms').textContent = error ? error.message : 'Check your email.'; });
}

function route() {
  if (!D) return;
  const h = location.hash || '#/', [, r, a, b] = h.split('/');
  lc = null; document.body.classList.toggle('lesson', r === 'lesson');
  const base = '#/' + (r || '');
  $('#side').innerHTML = `<a class="sbrand" href="#/">StudyHub<span>${esc(D.course.code)}</span></a>` + navHTML(base); $('#bottom').innerHTML = navHTML(base); setMenu(false);
  ({ '': () => { home(); fillRings(); }, lessons, lesson: () => lessonView(a, b), quiz: () => quiz(a), cards: () => cards(a), glossary: () => glossary(a), account }[r || ''] || home)();
  scrollTo(0, 0); app.focus({ preventScroll: true });
}
addEventListener('hashchange', route);
if (sb) sb.auth.onAuthStateChange((_, s) => { user = s?.user || null; if (user) pull(); else route(); });

fetch('data/mce321.json').then(r => r.json()).then(d => { D = d; L = d.modules.flatMap(m => m.lessons); route(); });
