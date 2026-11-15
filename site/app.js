// Aria site behavior: header state, menus, accordion, sign-up forms, calculators, specialty search, reveal.
(function () {
  document.documentElement.classList.add('js');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  // Header: transparent over the hero, a hairline once scrolled.
  var hdr = $('.hdr'), hero = $('.hero');
  function onScroll() {
    var y = window.scrollY;
    if (hdr) { hdr.classList.toggle('scrolled', y > 8); if (hero) hdr.classList.toggle('on-hero', y < 40); }
  }
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  // Dropdowns
  $$('.dd > button').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var dd = b.parentNode, open = !dd.classList.contains('open');
      $$('.dd.open').forEach(function (x) { x.classList.remove('open'); x.firstElementChild.setAttribute('aria-expanded', 'false'); });
      dd.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', function () { $$('.dd.open').forEach(function (x) { x.classList.remove('open'); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $$('.dd.open').forEach(function (x) { x.classList.remove('open'); }); });

  // Mobile menu
  var mb = $('.menu-btn'), mn = $('.mnav');
  if (mb && mn) mb.addEventListener('click', function () { var o = !mn.classList.contains('open'); mn.classList.toggle('open', o); mb.setAttribute('aria-expanded', String(o)); document.body.style.overflow = o ? 'hidden' : ''; });

  // Accordion with a picture that follows the open row.
  $$('.acc').forEach(function (acc) {
    var items = $$('.acc-item', acc), arts = $$('.acc-art img', acc);
    items.forEach(function (it, i) {
      $('button', it).addEventListener('click', function () {
        items.forEach(function (x, j) { var on = j === i; x.classList.toggle('open', on); $('button', x).setAttribute('aria-expanded', String(on)); });
        arts.forEach(function (a, j) { a.classList.toggle('on', j === i); });
      });
    });
  });

  // Attribution kept for the session.
  var attr = {};
  try { attr = JSON.parse(sessionStorage.getItem('aria_attr') || '{}'); } catch (e) {}
  var q = new URLSearchParams(location.search);
  ['ref', 'utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (q.get(k)) attr[k] = q.get(k); });
  if (!attr.landing) { attr.landing = location.pathname; attr.referrer = document.referrer || ''; }
  try { sessionStorage.setItem('aria_attr', JSON.stringify(attr)); } catch (e) {}

  // Sign-up forms post to /api/waitlist.
  $$('form[data-signup]').forEach(function (f) {
    var email = q.get('email'); var ei = $('input[name=email]', f);
    if (email && ei && !ei.value) ei.value = email;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = { form: f.getAttribute('data-signup'), page: location.pathname };
      new FormData(f).forEach(function (v, k) { data[k] = v; });
      Object.keys(attr).forEach(function (k) { if (!data[k]) data[k] = attr[k]; });
      var msg = $('.form-msg', f) || f.appendChild(Object.assign(document.createElement('p'), { className: 'form-msg' }));
      var btn = $('button[type=submit]', f); if (btn) btn.disabled = true;
      fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json(); })
        .then(function (r) {
          if (!r.ok) throw new Error();
          if (f.getAttribute('data-next')) { location.href = f.getAttribute('data-next') + '?email=' + encodeURIComponent(data.email || ''); return; }
          msg.textContent = 'Thanks. We will be in touch soon.'; f.reset();
        })
        .catch(function () { msg.textContent = 'That did not go through. Check the email and try again.'; })
        .finally(function () { if (btn) btn.disabled = false; });
    });
  });

  // Calculators
  var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  $$('[data-calc]').forEach(function (c) {
    var kind = c.getAttribute('data-calc');
    function run() {
      var a = +($('[name=a]', c).value || 0), b = +(($('[name=b]', c) || {}).value || 0);
      if (kind === 'back') { $('[data-out=year]', c).textContent = money(a * 12 * 0.02); $('[data-out=month]', c).textContent = money(a * 0.02); }
      if (kind === 'float') { $('[data-out=float]', c).textContent = money(a * b / 30); $('[data-out=year]', c).textContent = money(a * 12 * 0.02); }
    }
    $$('input', c).forEach(function (i) { i.addEventListener('input', run); }); run();
  });

  // Specialty search
  var fi = $('#spec-find');
  if (fi) fi.addEventListener('input', function () {
    var t = fi.value.trim().toLowerCase();
    $$('.spec-g').forEach(function (g) {
      var any = false;
      $$('li', g).forEach(function (li) { var hit = !t || li.textContent.toLowerCase().indexOf(t) >= 0 || $('h3', g).textContent.toLowerCase().indexOf(t) >= 0; li.classList.toggle('hide', !hit); any = any || hit; });
      g.classList.toggle('hide', !any);
    });
  });
  // Marketplace: search, filters and sort over the product cards.
  var mf = $('#mk-find'), grid = $('#mk-grid') || $('.pgrid');
  var fd = $('.fdet'); if (fd && matchMedia('(max-width:860px)').matches) fd.open = false;
  if (mf && grid) {
    var cards = $$('.pc', grid), order = cards.slice(), sort = $('#mk-sort'), cnt = $('[data-count]'), none = $('#mk-none');
    var vals = function (n) { return $$('input[name=' + n + ']:checked').map(function (i) { return i.value; }); };
    var run = function () {
      var t = mf.value.trim().toLowerCase(), cs = vals('cat'), ss = vals('ster'), gs = vals('grp').join(' ').split(' ').filter(Boolean), shown = 0;
      cards.forEach(function (c) {
        var ok = (!t || c.getAttribute('data-name').indexOf(t) >= 0) && (!cs.length || cs.indexOf(c.dataset.cat) >= 0) && (!ss.length || ss.indexOf(c.dataset.ster) >= 0) && (!gs.length || gs.indexOf(c.dataset.cat) >= 0);
        c.hidden = !ok; if (ok) shown++;
      });
      if (cnt) cnt.textContent = 'Showing ' + shown + ' of ' + cards.length + ' products';
      if (none) none.hidden = shown > 0;
    };
    var resort = function () {
      var v = sort ? sort.value : 'featured', list = order.slice();
      if (v === 'az') list.sort(function (a, b) { return $('h3', a).textContent.localeCompare($('h3', b).textContent); });
      if (v === 'cat') list.sort(function (a, b) { return a.dataset.cat.localeCompare(b.dataset.cat); });
      list.forEach(function (c) { grid.appendChild(c); });
    };
    mf.addEventListener('input', run);
    $$('.filters input').forEach(function (i) { i.addEventListener('change', run); });
    if (sort) sort.addEventListener('change', resort);
    var clr = $('#mk-clear'); if (clr) clr.addEventListener('click', function () { $$('.filters input').forEach(function (i) { i.checked = false; }); mf.value = ''; run(); });
    $$('.pc-save').forEach(function (b) { b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); }); });
  }

  // Tabs (spend management)
  $$('[data-tabs]').forEach(function (root) {
    var tabs = $$('[role=tab]', root);
    function show(t, focus) {
      tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute('aria-controls')).hidden = !on; });
      if (focus) t.focus();
      t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(t); });
      t.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (n) { e.preventDefault(); show(tabs[(i + n + tabs.length) % tabs.length], true); }
      });
    });
  });

  // Reveal on scroll
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .15 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  setTimeout(function () { $$('.reveal').forEach(function (el) { el.classList.add('in'); }); }, 2500);
})();
