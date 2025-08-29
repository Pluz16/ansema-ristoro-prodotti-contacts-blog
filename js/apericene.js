// Slider mobile automatico (pausa su interazione + rispetto prefers-reduced-motion)
// Reset dello scroll quando si passa alla vista desktop per evitare qualsiasi “traiettoria” residua.
(function(){
  const track = document.querySelector('#apericene .mosaic');
  if(!track) return;

  const mqMobile = window.matchMedia('(max-width: 639px)');
  const reduce   = window.matchMedia('(prefers-reduced-motion: reduce)');

  let timer = null;
  let pauseTO = null;

  function stepSize(){
    const first = track.querySelector('img');
    if(!first) return 0;
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.gap) || 0;
    return first.getBoundingClientRect().width + gap;
  }

  function next(){
    const step = stepSize();
    if(step <= 0) return;
    const max = track.scrollWidth - track.clientWidth;
    const atEnd = track.scrollLeft + step >= max - 2;
    track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step, behavior: 'smooth' });
  }

  function stop(){
    if(timer){ clearInterval(timer); timer = null; }
  }

  function start(){
    // Autoplay solo su mobile e se non è attiva la preferenza “riduci animazioni”
    if(!mqMobile.matches || reduce.matches){ stop(); track.scrollLeft = 0; return; }
    stop();
    timer = setInterval(next, 3500);
  }

  function pauseThenResume(){
    stop();
    if(pauseTO) clearTimeout(pauseTO);
    // riprende dopo 6s dall’ultima interazione
    pauseTO = setTimeout(start, 6000);
  }

  // Pausa su interazione
  ['pointerdown','touchstart','keydown','wheel'].forEach(evt=>{
    track.addEventListener(evt, pauseThenResume, {passive:true});
  });

  // Stop quando la pagina non è visibile
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden) stop(); else start();
  });

  // Cambi di viewport/preferenze
  mqMobile.addEventListener('change', ()=>{
    start();
    // quando esco dal mobile azzero lo scroll per essere certo di non avere overflow
    if(!mqMobile.matches) track.scrollLeft = 0;
  });
  reduce.addEventListener('change', start);
  window.addEventListener('resize', start);

  // init
  start();
})();
