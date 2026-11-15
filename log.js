// Log screen: add an activity afterwards (forgot to start / stopped by accident). Built once, then reused.
// Uses the app's globals: now(), call(), apply(), toast(), act(), S, WHO, GROUPS, lsGet/lsSet, fail().
(function () {
  var inst = null;
  var MARKUP = '<div class="lwrap">' +
    '<header class="lhd"><h1>Log activity</h1><button class="lx" id="logx" type="button" aria-label="Close">✕</button></header>' +
    '<section><div class="gtabs" id="ltabs" role="tablist" aria-label="Activity groups"></div><div class="chips" id="chips" role="group" aria-label="Activities"></div></section>' +
    '<section id="startBox"></section>' +
    '<div class="seg" id="mode" role="radiogroup" aria-label="Is it finished?"><button type="button" role="radio" data-m="run" aria-checked="true">Still running</button><button type="button" role="radio" data-m="stop" aria-checked="false">Stopped at…</button></div>' +
    '<div id="endWrap" hidden><section id="endBox"></section><section id="durBox" class="durrow" hidden></section></div>' +
    '<div class="bar"><div class="sum" id="sum"><b id="sumB"></b><span id="sumS"></span></div><button class="save" id="save" type="button"></button></div>' +
    '</div>';
  function build() {
    var MIN = 60000, STEP = 1, H = 44;

    var MIN = 60000, STEP = 1, H = 44;
      var sel = null, tab = 'Recent';
    var $ = function (id) { return document.getElementById(id); };
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var base = function () { return Math.floor(now() / MIN) * MIN; }; // now, to the minute
    var clock = function (ts) { var d = new Date(ts); return d.getHours() + ':' + pad(d.getMinutes()); };
    var sameDay = function (a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); };
    var dayStart = function (ts) { var d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
    var addDays = function (ts, n) { var d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); };
    var ymd = function (ts) { var d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    var fmtDay = function (ts) { return new Date(ts).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); };
    var dstr = function (ts, withToday) { return sameDay(ts, base()) ? (withToday ? 'today ' : '') : sameDay(ts, addDays(base(), -1)) ? 'yesterday ' : fmtDay(ts) + ' '; };
    function dur(m) { var h = Math.floor(m / 60), r = m % 60; return h ? (r ? h + ' h ' + r + ' min' : h + ' h') : m + ' min'; }
    function fmtAgo(n) { if (n === 0) return 'now'; if (n < 60) return String(n); var h = Math.floor(n / 60), r = n % 60; return h + 'h' + (r ? ' ' + r : ''); }
    var AGO_MAX = 336 * 60 - 1;
    var AGO_H = []; for (var a = 0; a <= 335; a++) AGO_H.push(a);
    var DUR_H = []; for (var a3 = 0; a3 <= 47; a3++) DUR_H.push(a3);
    var AGO_M = []; for (var a2 = 0; a2 < 60; a2++) AGO_M.push(a2);
    var HOURS = []; for (var h = 0; h < 24; h++) HOURS.push(h);
    // clock minutes go in 5s; an exact minute that came from the "ago" wheel gets its own row so it can still be seen and nudged
    function minsFor(cur) { var v = []; for (var m = 0; m < 60; m += STEP) v.push(m); if (v.indexOf(cur) < 0) { v.push(cur); v.sort(function (x, y) { return x - y; }); } return v; }

    // ---- wheel: scroll-snap list; calls onChange(value) once it settles on a new row
    function Drum(el, values, fmt, onChange, label) {
      var cur = null, timer = null, items = el.children;
      el.setAttribute('role', 'spinbutton'); el.tabIndex = 0; el.setAttribute('aria-label', label);
      function build() { el.innerHTML = values.map(function (v) { return '<div class="it">' + fmt(v) + '</div>'; }).join(''); }
      build();
      function mark(i) { for (var k = 0; k < items.length; k++) { var on = k === i; if (items[k].classList.contains('on') !== on) items[k].classList.toggle('on', on); } }
      function idxNow() { return Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / H))); }
      function set(v) { var i = values.indexOf(v); if (i < 0) i = 0; cur = values[i]; el.scrollTop = i * H; mark(i); el.setAttribute('aria-valuetext', fmt(cur)); }
      el.addEventListener('scroll', function () {
        var i = idxNow(); mark(i);
        clearTimeout(timer);
        timer = setTimeout(function () { var j = idxNow(); if (values[j] !== cur) { cur = values[j]; el.setAttribute('aria-valuetext', fmt(cur)); onChange(cur); } }, 110);
      });
      el.addEventListener('click', function (e) { var it = e.target.closest('.it'); if (it) { var i = Array.prototype.indexOf.call(items, it); el.scrollTo({ top: i * H, behavior: 'smooth' }); } });
      el.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : e.key === 'PageUp' ? -6 : e.key === 'PageDown' ? 6 : 0;
        if (!d) return; e.preventDefault();
        var i = Math.max(0, Math.min(values.length - 1, idxNow() + d)); el.scrollTo({ top: i * H, behavior: 'smooth' });
      });
      // mouse drag (touch scrolls natively)
      var drag = null;
      el.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') { drag = { y: e.clientY, top: el.scrollTop, moved: false }; el.style.scrollSnapType = 'none'; el.setPointerCapture(e.pointerId); } });
      el.addEventListener('pointermove', function (e) { if (drag) { var dy = e.clientY - drag.y; if (Math.abs(dy) > 3) drag.moved = true; el.scrollTop = drag.top - dy; } });
      function end(e) { if (!drag) return; var moved = drag.moved; drag = null; el.style.scrollSnapType = ''; el.scrollTo({ top: idxNow() * H, behavior: 'smooth' }); if (moved) el.dataset.swallow = '1'; }
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
      el.addEventListener('click', function (e) { if (el.dataset.swallow) { delete el.dataset.swallow; e.stopImmediatePropagation(); } }, true);
      function reset(vals, v) { values = vals; build(); set(v); }
      return { set: set, reset: reset };
    }

    var st = { start: base() - 30 * MIN, end: null };
    var open = { start: false, end: false }, openAgo = { start: false, end: false }, openDur = false;
    var pairs = {};

    function Pair(key, host, title) {
      var P = { key: key };
      host.innerHTML =
        '<div class="labrow"><div class="lab">' + title + '</div><div class="dayrow"><div class="day" role="group" aria-label="Which day">' +
        '<button type="button" data-d="p"></button><button type="button" data-d="m"></button><button type="button" data-d="n"></button></div>' +
        '<label class="calw" aria-label="Pick a day"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg><input type="date" id="' + key + 'Cal" aria-label="Pick a day"></label></div></div>' +
        '<div class="pair ' + key + '"><div class="half l" id="' + key + 'L"></div>' +
        '<div class="link"><span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="color:var(--acc)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg></span></div>' +
        '<div class="half r" id="' + key + 'R"></div></div>';
      function agoNow() { return Math.max(0, Math.round((base() - st[key]) / MIN)); }
      function setAgo(a) { a = Math.max(0, Math.min(AGO_MAX, a)); st[key] = base() - a * MIN; paint(); }
      var lab = key === 'start' ? 'it started' : 'it ended';
      P.setAgo = setAgo; P.agoNow = agoNow; P.lab = lab;
      function setDay(dayTs, moveEnd) {
        var d = new Date(st[key]), t = new Date(dayTs); t.setHours(d.getHours(), d.getMinutes(), 0, 0);
        var n = Math.min(t.getTime(), base()), delta = n - st[key];
        st[key] = n;
        if (moveEnd && key === 'start' && st.end !== null) st.end = Math.min(st.end + delta, base());
      }
      host.querySelectorAll('.day button').forEach(function (b) {
        b.addEventListener('click', function () {
          var cur = dayStart(st[key]), isT = sameDay(cur, base()), d = b.dataset.d;
          if (d === 'p') setDay(addDays(cur, -1), false);
          else if (d === 'n' && !isT) setDay(addDays(cur, 1), false);
          paint();
        });
      });
      $(key + 'Cal').addEventListener('change', function (e) {
        var v = e.target.value; if (!v) return; var p = v.split('-'), ts = new Date(+p[0], +p[1] - 1, +p[2]).getTime();
        if (isNaN(ts) || ts > base()) return;
        setDay(ts, true); paint();
      });
      P.host = host;
      return P;
    }
    function agoText(a) { var h = Math.floor(a / 60), m = a % 60; return a === 0 ? 'now' : h >= 48 ? Math.floor(h / 24) + 'd ' + (h % 24) + 'h' : h ? h + 'h ' + pad(m) : String(a); }
    function renderLeft(P) {
      var key = P.key, L = $(key + 'L'), isOpen = openAgo[key], a = P.agoNow(), hrs = Math.floor(a / 60);
      if (!isOpen) {
        if (L.dataset.mode !== 'read') {
          L.dataset.mode = 'read';
          L.innerHTML = '<button class="read" type="button" id="' + key + 'AgoRead" aria-label="Edit how long ago"></button><button class="unit" type="button" id="' + key + 'AgoU"></button>';
          var go = function () { openAgo[key] = true; paint(); };
          $(key + 'AgoRead').addEventListener('click', go); $(key + 'AgoU').addEventListener('click', go);
        }
        var rd = $(key + 'AgoRead'); rd.textContent = agoText(a); rd.classList.toggle('long', hrs > 0);
        $(key + 'AgoU').textContent = (a === 0 ? 'right now' : hrs ? 'ago' : 'min ago') + ' · tap to edit';
      } else {
        if (L.dataset.mode !== 'wheels') {
          L.dataset.mode = 'wheels';
          L.innerHTML = '<div class="agos"><div class="wheel" id="' + key + 'HW"><div class="band"></div><div class="drum" id="' + key + 'AH"></div></div><div class="wheel"><div class="band"></div><div class="drum" id="' + key + 'AM"></div></div></div>' +
            '<div class="agol" id="' + key + 'AgoL"></div><div class="ub"><button class="unit add" type="button" id="' + key + 'AddH">＋ Add hours</button><button class="unit done" type="button" id="' + key + 'ADone">Done</button></div>';
          P.hDrumA = Drum($(key + 'AH'), AGO_H, String, function (v) { P.setAgo(v * 60 + P.agoNow() % 60); }, 'Hours ago ' + P.lab);
          P.mDrumA = Drum($(key + 'AM'), AGO_M, String, function (v) { P.setAgo(Math.floor(P.agoNow() / 60) * 60 + v); }, 'Minutes ago ' + P.lab);
          $(key + 'AddH').addEventListener('click', function () { if (P.agoNow() < 60) P.setAgo(P.agoNow() + 60); });
          $(key + 'ADone').addEventListener('click', function () { openAgo[key] = false; paint(); });
        }
        $(key + 'HW').hidden = hrs === 0;
        $(key + 'AddH').hidden = hrs > 0;
        $(key + 'AgoL').textContent = hrs > 0 ? 'hours · minutes ago' : (a === 0 ? 'minutes ago · now' : 'minutes ago');
        P.hDrumA.set(hrs); P.mDrumA.set(a % 60);
      }
    }
    function renderRight(P) {
      var key = P.key, R = $(key + 'R'), isOpen = open[key];
      if (!isOpen) {
        if (!R.dataset.mode || R.dataset.mode !== 'read') {
          R.dataset.mode = 'read';
          R.innerHTML = '<button class="read" type="button" id="' + key + 'Read" aria-label="Edit ' + (key === 'start' ? 'start' : 'end') + ' time"></button><button class="unit" type="button" id="' + key + 'AtU"></button>';
          $(key + 'Read').addEventListener('click', function () { open[key] = true; paint(); });
          $(key + 'AtU').addEventListener('click', function () { open[key] = true; paint(); });
        }
        $(key + 'Read').textContent = clock(st[key]);
        var w = dstr(st[key]);
        $(key + 'AtU').textContent = (w ? w.trim() : (key === 'start' ? 'started' : 'ended')) + ' · tap to edit';
      } else {
        if (R.dataset.mode !== 'drums') {
          R.dataset.mode = 'drums';
          R.innerHTML = '<div class="drums"><div class="wheel"><div class="band"></div><div class="drum" id="' + key + 'H"></div></div><div class="colon">:</div><div class="wheel"><div class="band"></div><div class="drum" id="' + key + 'M"></div></div></div><button class="unit done" type="button" id="' + key + 'Done">Done</button>';
          function commit() {
            var hh = P.hv, mm = P.mv, d = new Date(base()); d.setHours(hh, mm, 0, 0);
            var n = d.getTime();
            d = new Date(st[key]); d.setHours(hh, mm, 0, 0); n = d.getTime(); // keep the chosen day
            if (n > base()) n -= 86400000; // a clock time later than now can only be the day before
            st[key] = n; paint(true);
          }
          P.hDrum = Drum($(key + 'H'), HOURS, function (v) { return String(v); }, function (v) { P.hv = v; commit(); }, 'Hour');
          P.mDrum = Drum($(key + 'M'), minsFor(0), pad, function (v) { P.mv = v; commit(); P.mDrum.reset(minsFor(v), v); }, 'Minute');
          $(key + 'Done').addEventListener('click', function () { open[key] = false; paint(); });
        }
      }
    }
    function durMins() { return Math.max(0, Math.round(((st.end === null ? base() : st.end) - st.start) / MIN)); }
    function setDur(d) { if (st.end === null) { st.start = base() - Math.max(0, Math.min(AGO_MAX, d)) * MIN; paint(); return; } d = Math.max(1, d); var e = st.start + d * MIN; if (e > base()) e = base(); st.end = e; paint(); }
    function durText(m) { var h = Math.floor(m / 60); return h ? h + 'h ' + pad(m % 60) : String(m); }
    var DUR = {}, DURL = {}, openDurL = false;
    function renderDur() {
      var D = $('durBox'), m = durMins();
      if (!D.firstChild) {
        D.innerHTML = '<button class="dh" type="button" id="durHead" aria-expanded="false"><span class="dl">Lasted</span><span class="dv" id="durRead"></span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button><div class="dopen" id="durOpen" hidden></div>';
        $('durHead').addEventListener('click', function () { openDur = !openDur; paint(); });
      }
      $('durRead').textContent = dur(m); $('durHead').setAttribute('aria-expanded', openDur);
      var O = $('durOpen'); O.hidden = !openDur;
      if (openDur) {
        if (!O.firstChild) {
          O.innerHTML = '<div class="drums"><div class="wheel"><div class="band"></div><div class="drum" id="durHr"></div></div><div class="colon">h</div><div class="wheel"><div class="band"></div><div class="drum" id="durMn"></div></div></div><div class="agol">hours · minutes</div><button class="unit done" type="button" id="durDone">Done</button>';
          DUR.h = Drum($('durHr'), DUR_H, String, function (v) { setDur(v * 60 + durMins() % 60); }, 'Hours it lasted');
          DUR.m = Drum($('durMn'), AGO_M, pad, function (v) { setDur(Math.floor(durMins() / 60) * 60 + v); }, 'Minutes it lasted');
          $('durDone').addEventListener('click', function () { openDur = false; paint(); });
        }
        DUR.h.set(Math.floor(m / 60)); DUR.m.set(m % 60);
      }
    }
    function renderDurLeft() {
      var L = $('endL'), m = durMins(); L.classList.add('durmode');
      if (!openDurL) {
        if (L.dataset.mode !== 'dread') {
          L.dataset.mode = 'dread';
          L.innerHTML = '<button class="read dp" type="button" id="lRead" aria-label="Edit how long it lasted"><span class="lk">Lasted</span><span class="lv"></span></button><button class="unit" type="button" id="lU"></button>';
          var go = function () { openDurL = true; paint(); };
          $('lRead').addEventListener('click', go); $('lU').addEventListener('click', go);
        }
        $('lRead').querySelector('.lv').textContent = durText(m); $('lRead').classList.toggle('long', m >= 60);
        $('lU').textContent = (m >= 60 ? 'hours · min' : 'minutes') + ' · tap to edit';
      } else {
        if (L.dataset.mode !== 'dwheels') {
          L.dataset.mode = 'dwheels';
          L.innerHTML = '<div class="agos"><div class="wheel"><div class="band"></div><div class="drum" id="lHr"></div></div><div class="wheel"><div class="band"></div><div class="drum" id="lMn"></div></div></div><div class="agol">hours · minutes lasted</div><div class="ub"><button class="unit done" type="button" id="lDone">Done</button></div>';
          DURL.h = Drum($('lHr'), DUR_H, String, function (v) { setDur(v * 60 + durMins() % 60); }, 'Hours it lasted');
          DURL.m = Drum($('lMn'), AGO_M, pad, function (v) { setDur(Math.floor(durMins() / 60) * 60 + v); }, 'Minutes it lasted');
          $('lDone').addEventListener('click', function () { openDurL = false; paint(); });
        }
        DURL.h.set(Math.floor(m / 60)); DURL.m.set(m % 60);
      }
    }
    function syncDrums(P) {
      var key = P.key;
      if (open[key] && P.hDrum) { var d = new Date(st[key]); P.hv = d.getHours(); P.mv = d.getMinutes(); P.hDrum.set(P.hv); P.mDrum.reset(minsFor(P.mv), P.mv); }
    }
    function paint(keepClockDrums) {
      var on = st.end !== null;
      $('endWrap').hidden = !on; document.querySelectorAll('#mode button').forEach(function (b) { b.setAttribute('aria-checked', (b.dataset.m === 'stop') === on); });
      ['start'].concat(on ? ['end'] : []).forEach(function (key) {
        var P = pairs[key], endPast = key === 'end' && !sameDay(st.end, base());
        if (endPast) renderDurLeft();
        else { if (key === 'end') { var EL = $('endL'); if (EL.classList.contains('durmode')) { EL.classList.remove('durmode'); EL.dataset.mode = ''; } openDurL = false; } renderLeft(P); }
        renderRight(P);
        var past = !sameDay(st[key], base()); P.host.querySelector('.pair').classList.toggle('solo', past && !endPast); if (past) openAgo[key] = false;
        var cur = dayStart(st[key]), isT = sameDay(cur, base()), after = addDays(cur, 1);
        var Bp = P.host.querySelector('[data-d=p]'), Bm = P.host.querySelector('[data-d=m]'), Bn = P.host.querySelector('[data-d=n]');
        Bp.hidden = false; Bn.hidden = isT; Bp.textContent = isT ? 'Yesterday' : 'Day before';
        Bm.textContent = isT ? 'Today' : (sameDay(cur, addDays(base(), -1)) ? 'Yesterday' : fmtDay(cur));
        Bn.textContent = sameDay(after, base()) ? 'Today' : 'Day after';
        Bp.setAttribute('aria-pressed', false); Bm.setAttribute('aria-pressed', true); Bn.setAttribute('aria-pressed', false);
        var cal = $(key + 'Cal'); cal.value = ymd(st[key]); cal.max = ymd(base()); cal.min = ymd(addDays(base(), -13));
        if (!keepClockDrums || !open[key]) syncDrums(P);
      });
      var bad = on && st.end <= st.start, mins = on ? Math.round((st.end - st.start) / MIN) : 0;
      var endPast2 = on && !sameDay(st.end, base());
      if (endPast2) openDur = false;
      $('durBox').hidden = !on || bad || endPast2; if (on && !bad && !endPast2) renderDur();
      if (!on) openDur = false;
      $('sum').classList.toggle('bad', bad);
      if (bad) { $('sumB').textContent = 'The end is before the start'; $('sumS').textContent = 'Move the end later or the start earlier'; }
      else if (on) { $('sumB').textContent = LBL() + ' · ' + dstr(st.start) + clock(st.start) + ' – ' + (sameDay(st.start, st.end) ? '' : dstr(st.end, true)) + clock(st.end); $('sumS').textContent = dur(mins) + ' · goes to ' + (act(sel).byEnd ? 'the day you woke up' : 'that day') + ' in Notion'; }
      else { $('sumB').textContent = LBL() + ' · timer from ' + dstr(st.start) + clock(st.start); $('sumS').textContent = 'The timer keeps going from there'; }
      var running = !on && S.running && S.running[sel];
      $('save').disabled = bad || !!running || saving;
      if (!saving) $('save').textContent = running ? LBL() + ' is already running' : on ? 'Add to Notion' : 'Start timer from ' + dstr(st.start) + clock(st.start);
      updExtras();
    }

    pairs.start = Pair('start', $('startBox'), 'Started');
    var quick = document.createElement('div'); quick.className = 'quick'; quick.id = 'quick'; quick.setAttribute('role', 'group'); quick.setAttribute('aria-label', 'Quick pick: how long ago it started');
    [[0, 'now'], [5, '5 min'], [15, '15 min'], [30, '30 min'], [60, '1 h'], [120, '2 h']].forEach(function (q) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.a = q[0]; b.textContent = q[1];
      b.addEventListener('click', function () { openAgo.start = false; open.start = false; pairs.start.setAgo(q[0]); }); quick.appendChild(b);
    });
    $('startBox').appendChild(quick);
    var dq = document.createElement('div'); dq.className = 'quick'; dq.id = 'dquick'; dq.setAttribute('role', 'group'); dq.setAttribute('aria-label', 'Quick pick: how long it lasted');
    [[15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 h'], [90, '1.5 h'], [120, '2 h']].forEach(function (q) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.a = q[0]; b.textContent = q[1];
      b.addEventListener('click', function () { openDur = false; openDurL = false; setDur(q[0]); }); dq.appendChild(b);
    });
    $('endWrap').appendChild(dq);
    function updExtras() {
      var ago = Math.round((base() - st.start) / MIN);
      quick.hidden = !sameDay(st.start, base()) || open.start || openAgo.start;
      quick.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', ago === +b.dataset.a); });
      dq.hidden = st.end === null || openDur || openDurL;
      var dm = st.end === null ? -1 : durMins();
      dq.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', dm === +b.dataset.a); });
    }
    pairs.end = Pair('end', $('endBox'), 'Ended');
    document.querySelectorAll('#mode button').forEach(function (b) {
      b.addEventListener('click', function () {
        var want = b.dataset.m === 'stop';
        if (want && st.end === null) {
          open.end = false;
          if (dayStart(st.start) < dayStart(addDays(base(), -1))) st.end = Math.min(st.start + 30 * MIN, base()); // an older day: end shortly after the start, on that day
          else { st.end = base(); if (st.end <= st.start) st.start = st.end - 30 * MIN; }
        }
        else if (!want) st.end = null;
        paint();
      });
    });
    var saving = false;
    function LBL() { return act(sel).label; }
    $('save').addEventListener('click', async function () {
      if (saving || $('save').disabled) return;
      var s = st.start, e = st.end, key = sel, label = LBL();
      saving = true; $('save').disabled = true; $('save').textContent = 'Saving…';
      try {
        apply(await call('log', key, s, e));
        bump(key);
        toast(e === null ? '✓ ' + label + ' timer started' : '✓ ' + label + ' added · ' + dur(Math.round((e - s) / MIN)), true);
        saving = false; Log.close();
      } catch (err) {
        saving = false;
        var m = String(err && err.message || err);
        if (/Already running/.test(m)) toast('That timer is already running.');
        else if (/Too long ago/.test(m)) toast('That is more than 15 days ago.');
        else if (/end must be after/.test(m)) toast('The end has to be after the start.');
        else fail(err);
        paint();
      }
    });
    // ---- activity picker: Recent (most logged from this screen) + the person's own groups
    function groups() { return GROUPS[WHO] || []; }
    function colorOf(k) { var g = groups().filter(function (x) { return x.keys.indexOf(k) >= 0; })[0]; return g ? g.color : '#8b93a3'; }
    function counts() { try { return JSON.parse(lsGet('logcnt:' + WHO) || '{}') || {}; } catch (e) { return {}; } }
    function bump(k) { var c = counts(); c[k] = (c[k] || 0) + 1; lsSet('logcnt:' + WHO, JSON.stringify(c)); }
    function recent() {
      var c = counts(), all = [];
      groups().forEach(function (g) { all = all.concat(g.keys); });
      return all.filter(function (k) { return c[k] > 0; }).sort(function (a, b) { return c[b] - c[a]; }).slice(0, 4);
    }
    function groupOf(k) { var g = groups().filter(function (x) { return x.keys.indexOf(k) >= 0; })[0]; return g ? g.title : null; }
    function chip(k, color, pressed, fn) {
      var a = act(k), b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.style.setProperty('--c', color);
      b.setAttribute('aria-pressed', pressed); b.innerHTML = '<span style="font-size:16px">' + a.icon + '</span>' + a.label; b.addEventListener('click', fn); return b;
    }
    function picker() {
      var T = $('ltabs'); T.innerHTML = '';
      [{ title: 'Recent', color: '#8b93a3' }].concat(groups()).forEach(function (g) {
        var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', g.title === tab); b.style.setProperty('--c', g.color);
        b.innerHTML = '<i></i>' + g.title; b.addEventListener('click', function () { tab = g.title; picker(); }); T.appendChild(b);
      });
      var C = $('chips'); C.innerHTML = '';
      if (tab === 'Recent') {
        var r = recent();
        if (!r.length) { var n = document.createElement('div'); n.className = 'lnote'; n.textContent = 'The activities you log most often will show up here.'; C.appendChild(n); }
        r.forEach(function (k) { C.appendChild(chip(k, colorOf(k), k === sel, function () { sel = k; picker(); paint(); })); });
        return;
      }
      var g = groups().filter(function (x) { return x.title === tab; })[0] || groups()[0];
      if (!g) return;
      g.keys.forEach(function (k) { C.appendChild(chip(k, g.color, k === sel, function () { sel = k; picker(); paint(); })); });
    }
    function reset(key) {
      var all = []; groups().forEach(function (g) { all = all.concat(g.keys); });
      var r = recent();
      sel = key && all.indexOf(key) >= 0 ? key : (r[0] || all[0]);
      tab = key && groupOf(key) ? groupOf(key) : (r.length ? 'Recent' : (groups()[0] || {}).title);
      if (!key && r.length) tab = 'Recent';
      st.start = base() - 30 * MIN; st.end = null; saving = false;
      open.start = open.end = openAgo.start = openAgo.end = false; openDur = openDurL = false;
      ['startL', 'startR', 'endL', 'endR'].forEach(function (id) { $(id).dataset.mode = ''; $(id).classList.remove('durmode'); });
      picker(); paint();
    }
    // keep "x min ago" honest while the screen stays open (never while a wheel is being used)
    setInterval(function () { if (!$('logov').hidden && !open.start && !open.end && !openAgo.start && !openAgo.end && !openDur && !openDurL && !saving) paint(); }, 20000);
    return { reset: reset };

  }
  window.Log = {
    open: function (key) {
      var ov = document.getElementById('logov');
      if (!inst) { ov.innerHTML = MARKUP; inst = build(); document.getElementById('logx').addEventListener('click', window.Log.close); }
      inst.reset(key);
      ov.hidden = false; ov.scrollTop = 0; document.body.style.overflow = 'hidden';
    },
    close: function () { var ov = document.getElementById('logov'); ov.hidden = true; document.body.style.overflow = ''; }
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !document.getElementById('logov').hidden) window.Log.close(); });
})();
