/* ANSEMA - ans.js
   Header appearance + Drawer accessibile + Evidenza voce attiva
   Compatibile con:
   - HEADER: .site-header[data-appearance="on-hero|solid"], #menu-toggle, #nav-drawer, #scrim
   - HERO:   #hero
   - NAV:    .nav-drawer__link (drawer) e #primary-menu a[href] (compat retro)
*/

/* ---------- Header appearance: "on-hero" se l'hero è visibile sotto l'header ---------- */
function computeHeaderAppearance(){
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('#hero');
  if(!header || !hero) return;
  const rect = hero.getBoundingClientRect();
  const headerH = header.offsetHeight || 64;
  const onHero = rect.top < headerH && rect.bottom > 0;
  header.setAttribute('data-appearance', onHero ? 'on-hero' : 'solid');
}
document.addEventListener('DOMContentLoaded', computeHeaderAppearance);
window.addEventListener('load', computeHeaderAppearance);
window.addEventListener('resize', computeHeaderAppearance);
window.addEventListener('orientationchange', computeHeaderAppearance);

// Observer per aggiornare durante lo scroll
(function(){
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('#hero');
  if(!header || !hero) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=> header.setAttribute('data-appearance', e.isIntersecting ? 'on-hero' : 'solid'));
  }, {rootMargin:"-70px 0px 0px 0px", threshold:0.01});
  io.observe(hero);
})();

/* ---------- Drawer accessibile (hamburger) ---------- */
(function(){
  const btn = document.getElementById('menu-toggle');
  const drawer = document.getElementById('nav-drawer');
  const scrim = document.getElementById('scrim');
  if(!btn || !drawer) return;

  let lastFocus = null;
  const focusableSel = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function trapFocus(e){
    if(e.key !== 'Tab') return;
    const nodes = drawer.querySelectorAll(focusableSel);
    if(!nodes.length) return;
    const first = nodes[0];
    const last  = nodes[nodes.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }

  function openDrawer(){
    lastFocus = document.activeElement;
    btn.setAttribute('aria-expanded','true');
    drawer.setAttribute('open','');
    document.body.style.overflow = 'hidden';
    if(scrim){ scrim.dataset.open = 'true'; }
    (drawer.querySelector(focusableSel) || drawer).focus();
    document.addEventListener('keydown', trapFocus);
  }

  function closeDrawer(){
    btn.setAttribute('aria-expanded','false');
    drawer.removeAttribute('open');
    document.body.style.overflow = '';
    if(scrim){ scrim.dataset.open = 'false'; }
    if(lastFocus){ lastFocus.focus(); }
    document.removeEventListener('keydown', trapFocus);
  }

  btn.addEventListener('click', ()=> (btn.getAttribute('aria-expanded') === 'true') ? closeDrawer() : openDrawer());
  if(scrim){ scrim.addEventListener('click', closeDrawer); }
  drawer.addEventListener('click', (e)=> {
    if(e.target.matches('.nav-drawer__link')) closeDrawer();  // chiudi se clic su link del menu
  });
  document.addEventListener('keydown', e=>{ if(e.key === 'Escape' && drawer.hasAttribute('open')) closeDrawer(); });
})();

/* ---------- Evidenzia voce attiva (drawer e nav classico) ---------- */
(function(){
  function normalize(path){
    if(!path) return 'index.html';
    const clean = path.split('#')[0].split('?')[0];
    if(clean.endsWith('/')) return clean + 'index.html';
    return clean;
  }
  const current = normalize((location.pathname || '').toLowerCase());

  function markActive(selector){
    const links = document.querySelectorAll(selector);
    if(!links.length) return;
    links.forEach(a=>{
      const href = a.getAttribute('href') || '';
      let targetPath = href;
      try {
        // gestisce link assoluti e relativi
        const url = new URL(href, location.origin);
        targetPath = url.pathname;
      } catch(_) { /* noop per href relative semplici */ }
      const target = normalize((targetPath || '').toLowerCase());
      if(target === current){
        a.setAttribute('aria-current','page');
      }
    });
  }

  // Drawer moderno
  markActive('.nav-drawer__link[href]');
  // Compat con vecchio menu orizzontale (se presente)
  markActive('#primary-menu a[href]');
})();

/* ---------- (Opzionale) Validazione form se presente in pagina ---------- */
(function(){
  const form = document.querySelector('.js-form');
  if(!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Honeypot
    const hp = form.querySelector('#company');
    if (hp && hp.value.trim() !== '') {
      return; // Bot probabile: esci silenziosamente
    }

    // Campi
    const name = form.querySelector('#name');
    const email = form.querySelector('#email');
    const message = form.querySelector('#message');
    const privacy = form.querySelector('#privacy');

    let ok = true;

    // reset errori
    ['err-name','err-email','err-message'].forEach(id => {
      const el = document.getElementById(id); if (el) el.textContent = '';
    });

    if (name && !name.value.trim()) {
      const el = document.getElementById('err-name'); if (el) el.textContent = 'Inserisci il tuo nome.';
      ok = false;
    }
    const emailVal = (email && email.value || '').trim();
    if (!emailVal || !/^\S+@\S+\.\S+$/.test(emailVal)) {
      const el = document.getElementById('err-email'); if (el) el.textContent = 'Inserisci un’email valida.';
      ok = false;
    }
    if (message && !message.value.trim()) {
      const el = document.getElementById('err-message'); if (el) el.textContent = 'Scrivi il tuo messaggio.';
      ok = false;
    }
    if (privacy && !privacy.checked) {
      alert('Per procedere devi accettare la Privacy Policy.');
      ok = false;
    }

    if (!ok) return;

    // Simulazione invio (sostituisci con fetch POST verso il tuo endpoint/servizio)
    alert('Grazie! La tua richiesta è stata inviata.');
    form.reset();
  });
})();
