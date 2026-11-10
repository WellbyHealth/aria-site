(function(){
  var f = document.getElementById('checkup-form'); if (!f) return;
  var done = document.getElementById('checkup-done'), errBox = f.querySelector('.form-err'), btn = f.querySelector('button[type=submit]');
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function check(focus){
    var first = null;
    f.querySelectorAll('[required]').forEach(function(el){
      var wrap = el.closest('.field'), v = el.value.trim(), msg = '';
      if (!v) msg = el.tagName === 'SELECT' ? 'Please choose one.' : 'Please fill this in.';
      else if (el.type === 'email' && !EMAIL.test(v)) msg = 'Please enter a valid email.';
      var e = wrap.querySelector('.err');
      if (msg){ if (!e){ e = document.createElement('span'); e.className = 'err'; e.id = el.id + '-err'; wrap.appendChild(e); } e.textContent = msg; el.setAttribute('aria-invalid','true'); el.setAttribute('aria-describedby', e.id); if (!first) first = el; }
      else if (e){ e.remove(); el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); }
    });
    if (first && focus) first.focus();
    return !first;
  }
  f.addEventListener('input', function(e){ if (e.target.getAttribute('aria-invalid') === 'true') check(false); });
  f.addEventListener('submit', function(e){
    e.preventDefault(); errBox.hidden = true;
    if (!check(true)) return;
    var d = {}; new FormData(f).forEach(function(v,k){ d[k] = String(v).trim(); });
    if (d.company_site) { f.hidden = true; done.hidden = false; return; }
    delete d.company_site;
    var q = new URLSearchParams(location.search); ['utm_source','utm_medium','utm_campaign'].forEach(function(k){ if (q.get(k)) d[k] = q.get(k); });
    d.referrer = document.referrer.split('?')[0];
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch('/api/checkup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function(r){ if (!r.ok) throw new Error(r.status); f.hidden = true; done.hidden = false; done.focus(); })
      .catch(function(){ errBox.textContent = "That didn't go through. Please try again, or email hello@wellbyhealth.com."; errBox.hidden = false; btn.disabled = false; btn.textContent = 'Book my free checkup'; });
  });
})();
