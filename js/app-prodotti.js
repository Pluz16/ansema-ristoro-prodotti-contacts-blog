// js/app.js — Header sticky + nav drawer
(function(){
  const header = document.querySelector('.site-header');
  const hero   = document.querySelector('#hero');
  const menuBtn = document.getElementById('menu-toggle');
  const drawer  = document.getElementById('nav-drawer');

  // Header: trasparente su HERO fermo, bianco al primo scroll
  function setHeaderSolid(){
    const solid = (window.scrollY || 0) > 0;
    header && header.setAttribute('data-appearance', solid ? 'solid' : 'on-hero');
  }
  // Prima applicazione + scroll
  window.addEventListener('scroll', setHeaderSolid, {passive:true});
  window.addEventListener('load', setHeaderSolid);
  setHeaderSolid();

  // Inoltre, se l'hero esiste, osserva l'intersezione (migliora il cambio su resize)
  if(hero && header){
    const io = new IntersectionObserver(([e])=>{
      const onHero = e.isIntersecting && (window.scrollY||0) === 0;
      header.setAttribute('data-appearance', onHero ? 'on-hero' : 'solid');
    }, {threshold:0, rootMargin:'-1px 0px 0px 0px'});
    io.observe(hero);
  }

  // NAV drawer toggle (aria + [open])
  if(menuBtn && drawer){
    const open = ()=>{ menuBtn.setAttribute('aria-expanded','true'); drawer.setAttribute('open',''); document.body.style.overflow='hidden'; };
    const close= ()=>{ menuBtn.setAttribute('aria-expanded','false'); drawer.removeAttribute('open'); document.body.style.overflow=''; };
    menuBtn.addEventListener('click', ()=> (menuBtn.getAttribute('aria-expanded')==='true') ? close() : open());
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && drawer.hasAttribute('open')) close(); });
  }
})();
