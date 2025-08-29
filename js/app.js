(function () {
  const header = document.querySelector('.site-header');
  const hero   = document.getElementById('hero');
  const burger = document.getElementById('menu-toggle');
  const drawer = document.getElementById('nav-drawer');
  const scrim  = document.getElementById('scrim');

  // Header: trasparente su hero, bianco al primo scroll
  if (header && hero && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          header.setAttribute('data-appearance', 'on-hero');
        } else {
          header.setAttribute('data-appearance', 'solid');
        }
      });
    }, { threshold: [0, .6, 1] });
    io.observe(hero);
  } else {
    // fallback
    window.addEventListener('scroll', () => {
      header.setAttribute('data-appearance', (window.scrollY < 80) ? 'on-hero' : 'solid');
    });
  }

  // Drawer: usa [open] e data-open come nel tuo CSS
  function openNav() {
    drawer.setAttribute('open', '');
    scrim.setAttribute('data-open', 'true');
    burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
  }
  function closeNav() {
    drawer.removeAttribute('open');
    scrim.removeAttribute('data-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
  }

  burger?.addEventListener('click', () => {
    const isOpen = drawer.hasAttribute('open');
    isOpen ? closeNav() : openNav();
  });
  scrim?.addEventListener('click', closeNav);
  drawer?.addEventListener('click', (e) => {
    if (e.target.matches('.nav-drawer__link')) closeNav();
  });
})();
