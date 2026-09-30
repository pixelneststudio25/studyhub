import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const $ = s => document.querySelector(s), app = $('#app');
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
const NAV = [['#/', '⌂', 'Home'], ['#/lessons', '☰', 'Lessons'], ['#/cards', '▣', 'Cards'], ['#/glossary', 'Aa', 'Terms'], ['#/account', '☺', 'Account']];
const navHTML = h => NAV.map(([href, ic, t]) => `<a href="${href}" class="${h === href ? 'on' : ''}"><i style="font-style:normal">${ic}</i>${t}</a>`).join('');
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
const ring = (p, n = 96) => { const c = 2 * Math.PI * 40; return `<svg class="ring" viewBox="0 0 100 100" width="${n}" height="${n}"><circle class="bg" cx="50" cy="50" r="40"/><circle class="fg" cx="50" cy="50" r="40" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/></svg>`; };
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
  ${next ? `<h2>Up next</h2><a class="card" href="#/lesson/${next.id}"><b>${next.id} · ${esc(next.title)}</b><br><span class="mut">${esc(next.one_line)}</span></a>` : '<h2>All lessons complete 🎉</h2>'}
  ${weak.length ? `<h2>Weakest topics</h2>${weak.map(([id]) => `<a class="card" href="#/quiz/${id}">${id} · ${esc(lesson(id).title)}<br><span class="mut">Retake the quiz</span></a>`).join('')}` : ''}`;
}
function lessons() {
  app.innerHTML = '<h1>Lessons</h1>' + D.modules.map(m => `<h2>${esc(m.title)}</h2>` + m.lessons.map(l =>
    `<a class="card" href="#/lesson/${l.id}">${S.done[l.id] ? '✓ ' : ''}${l.id} · ${esc(l.title)}${S.quiz[l.id] ? `<br><span class="mut">Quiz: ${S.quiz[l.id].score}/${S.quiz[l.id].total}</span>` : ''}</a>`).join('')).join('');
}
function lessonView(id) {
  const l = lesson(id); if (!l) return home();
  const v = l.videos[0];
  app.innerHTML = `<p class="mut">${esc(l.id)} · Slides ${esc(l.slides)}</p><h1>${esc(l.title)}</h1>
  <div class="tip"><b>In one line:</b> ${esc(l.one_line)}</div>
  <h2>Picture it</h2><p>${esc(l.analogy)}</p>
  <h2>Before you read</h2>${l.recall.map(r => `<p class="tip">${esc(r)}</p>`).join('')}
  <h2>Exam version</h2><ul>${l.exam.map(e => `<li>${esc(e)}</li>`).join('')}</ul>
  <h2>Key terms</h2><div id="tm">${l.terms.map(t => `<button class="chip" data-t="${t}">${esc(D.glossary[t].term)}</button>`).join('')}</div><div id="def"></div>
  <h2>Watch</h2>${v.id ? `<iframe class="vid" loading="lazy" allowfullscreen src="https://www.youtube-nocookie.com/embed/${v.id}?start=${v.start || 0}${v.end ? '&end=' + v.end : ''}"></iframe>` : `<div class="card">No approved video yet. <a target="_blank" rel="noopener" href="${v.search_fallback}">Search YouTube</a></div>`}
  <h2>Practise</h2><a class="btn pri" href="#/quiz/${l.id}">Quiz (${l.quiz.length})</a><a class="btn" href="#/cards/${l.id}">Flashcards (${l.flashcards.length})</a>
  <button class="btn ${S.done[l.id] ? '' : 'pri'}" id="dn">${S.done[l.id] ? '✓ Completed (undo)' : 'Mark complete'}</button>`;
  $('#tm').onclick = e => { const t = e.target.dataset.t; if (t) { const g = D.glossary[t]; $('#def').innerHTML = `<div class="card"><b>${esc(g.term)}</b><p>${esc(g.plain)}</p><p class="mut"><b>Exam:</b> ${esc(g.exam)}</p></div>`; } };
  $('#dn').onclick = e => { S.done[l.id] = !S.done[l.id]; save(); if (S.done[l.id]) e.target.classList.add('pop'); lessonView(id); };
}
function quiz(id) {
  const l = lesson(id); let i = 0, score = 0, conf = 'sure';
  const show = () => {
    if (i >= l.quiz.length) { S.quiz[id] = { score, total: l.quiz.length, ts: Date.now() }; save();
      app.innerHTML = `<h1 class="pop">${score}/${l.quiz.length}</h1><p>${score === l.quiz.length ? 'Perfect. Move on.' : 'Review the missed points, then retry.'}</p><a class="btn pri" href="#/lesson/${id}">Back to lesson</a><a class="btn" href="#/quiz/${id}">Retry</a>`; return; }
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
    + `<h2>Backup</h2><button class="btn" id="ex">Export progress</button>`;
  $('#ex')?.addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' })); a.download = 'studyhub-progress.json'; a.click(); });
  $('#so')?.addEventListener('click', async () => { await sb.auth.signOut(); });
  $('#ml')?.addEventListener('click', async () => { const { error } = await sb.auth.signInWithOtp({ email: $('#em').value, options: { emailRedirectTo: location.origin + location.pathname } }); $('#ms').textContent = error ? error.message : 'Check your email.'; });
}

function route() {
  if (!D) return;
  const h = location.hash || '#/', [, r, a] = h.split('/');
  const base = '#/' + (r || '');
  $('#side').innerHTML = navHTML(base); $('#bottom').innerHTML = navHTML(base); setMenu(false);
  ({ '': home, lessons, lesson: () => lessonView(a), quiz: () => quiz(a), cards: () => cards(a), glossary: () => glossary(a), account }[r || ''] || home)();
  scrollTo(0, 0); app.focus({ preventScroll: true });
}
addEventListener('hashchange', route);
if (sb) sb.auth.onAuthStateChange((_, s) => { user = s?.user || null; if (user) pull(); else route(); });

fetch('data/mce321.json').then(r => r.json()).then(d => { D = d; L = d.modules.flatMap(m => m.lessons); route(); });
