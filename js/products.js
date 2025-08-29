// js/products.js — Card con 2 bottoni, overlay per-pane, chiusura con "−", no allungamento griglia
(function(){
  const scope = document.querySelector('.catalog');
  if(!scope) return;

  const track = document.getElementById('catalog-track');
  const count = document.getElementById('prod-count');
  const chips = Array.from(scope.querySelectorAll('[data-cat]'));
  const prev  = scope.querySelector('#cat-prev');
  const next  = scope.querySelector('#cat-next');
  const mqDesktop = matchMedia('(min-width:1024px)');

  // Featured UI (se manca, la creo)
  let toggleFeaturedBtn = document.getElementById('toggle-featured');
  let featCountEl = document.getElementById('feat-count');
  let totCountEl  = document.getElementById('tot-count');

  if(!toggleFeaturedBtn){
    const bar = document.createElement('div');
    bar.className = 'featuredbar';
    bar.innerHTML = `
      <button id="toggle-featured" class="chip" aria-pressed="true">Solo in evidenza</button>
      <span class="stat">(<span id="feat-count">0</span>/<span id="tot-count">0</span>)</span>
    `;
    scope.querySelector('.container').insertBefore(bar, track);
    toggleFeaturedBtn = bar.querySelector('#toggle-featured');
    featCountEl = bar.querySelector('#feat-count');
    totCountEl  = bar.querySelector('#tot-count');
  }

  let products = [];
  let selectedCats = new Set(['tutti']);
  let showFeaturedOnly = true;
  const MAX_FEATURED = 6;

  const WA = (title)=>`https://wa.me/393000000000?text=${encodeURIComponent('Ordine ' + title)}`;

  // === TEMPLATE CARD ========================================================
  function cardTemplate(p, idx){
    const cats = (p.categoria || []).join(',');
    const title = p.titolo || 'Prodotto';
    const meta  = p.peso ? p.peso : (p.categoria ? p.categoria.join(' · ') : '');
    const priceHTML = renderPrice(p.prezzo); // <-- FIX prezzo strutturato
    const ingList = (p.ingredienti || []).map(i=>`<li>${i}</li>`).join('');
    const dett = [
      p.conservazione ? `<div class="back-meta"><strong>Conservazione</strong>: ${p.conservazione}</div>` : '',
      p.nutrizione    ? `<div class="back-meta"><strong>Nutrizione</strong>: ${p.nutrizione}</div>` : '',
      p.vuoto_a_rendere ? `<div class="back-meta"><strong>Vuoto a rendere</strong>: ${p.vuoto_a_rendere}</div>` : '',
      p.raccolta ? `<div class="back-meta"><strong>Raccolta</strong>: ${p.raccolta}</div>` : '',
      p.produttore ? `<div class="back-meta"><strong>Prodotto da</strong>: ${p.produttore}</div>` : ''
    ].join('');

    const paneId = `pane-${p.slug || ('p'+idx)}`;

    return `
<article class="product-card" data-cat="${cats}" data-featured="${p.featured ? '1' : '0'}" data-title="${title}">
  <div class="product-card__media">
    <img src="${p.img}" alt="${title}">
  </div>

  <div class="product-card__body">
    <div class="product-card__info">
      <h3 class="product-card__title">${title}</h3>
      <p class="product-card__meta">${meta}</p>
    </div>
    <div class="price">${priceHTML}</div>
  </div>

  <div class="product-card__foot" role="group" aria-label="Azioni prodotto">
    <button class="btn btn--ghost btn--toggle" data-pane="ingredienti" type="button">Ingredienti</button>
    <button class="btn btn--ghost btn--toggle" data-pane="dettagli" type="button">Dettagli</button>
  </div>

  <!-- Overlay expander: nascosto e senza impatto layout finché chiuso -->
  <div class="product-card__expander" id="${paneId}" role="region" aria-live="polite" hidden>
    <div class="pane-header">
      <strong class="pane-title">Dettagli</strong>
      <button class="pane-close" aria-label="Chiudi" title="Chiudi">−</button>
    </div>
    <div class="pane-content"><!-- riempito via JS --></div>
  </div>

</article>`;
  }

  // === RENDER + BIND ========================================================
  function render(){
    track.innerHTML = products.map(cardTemplate).join('\n');
    totCountEl && (totCountEl.textContent = String(products.length));
    bindFootButtons();
    applyFilters();
    bindSlider();
    bindGlobalEsc();
  }

  // Imposta overlay assoluto dentro la card (non allunga la griglia)
  function openOverlay(card, which){
    const title    = card.dataset.title || 'Prodotto';
    const expander = card.querySelector('.product-card__expander');
    const content  = expander.querySelector('.pane-content');
    const headerT  = expander.querySelector('.pane-title');

    // Contenuti
    if(which === 'ingredienti'){
      headerT.textContent = 'Ingredienti';
      const ing = card.__data?.ingredienti || [];
      content.innerHTML = `<ul class="ing-list">${ing.map(i=>`<li>${i}</li>`).join('')}</ul>`;
    }else{
      headerT.textContent = 'Dettagli';
      content.innerHTML = card.__data?.__dett || '<p class="back-meta">Nessun dettaglio disponibile.</p>';
    }

    // Stile overlay: assoluto dentro la card
    card.style.position = 'relative';
    expander.hidden = false;
    Object.assign(expander.style, {
      position:'absolute', left:'0', right:'0', bottom:'0',
      background:'#fff', borderTop:'1px solid #000',
      maxHeight: Math.round(card.getBoundingClientRect().height * 0.62) + 'px',
      overflow:'auto', boxShadow:'0 -6px 0 #000'
    });
    card.classList.add('is-pane-open');
    expander.focus?.({preventScroll:true});
  }

  function closeOverlay(card){
    const expander = card.querySelector('.product-card__expander');
    if(!expander || expander.hidden) return;
    expander.hidden = true;
    expander.removeAttribute('style');
    card.classList.remove('is-pane-open');
    // reset bottoni
    card.querySelectorAll('.btn--toggle').forEach(btn=>{
      btn.classList.remove('btn--accent','is-order'); btn.classList.add('btn--ghost');
      btn.textContent = btn.getAttribute('data-pane')==='ingredienti' ? 'Ingredienti' : 'Dettagli';
      btn.removeAttribute('aria-label');
    });
  }

  // Bottoni piede per card
  function bindFootButtons(){
    track.querySelectorAll('.product-card').forEach(card=>{
      const title = card.dataset.title || 'Prodotto';
      const btnIngr = card.querySelector('.btn--toggle[data-pane="ingredienti"]');
      const btnDett = card.querySelector('.btn--toggle[data-pane="dettagli"]');
      const expander = card.querySelector('.product-card__expander');
      const closeBtn = card.querySelector('.pane-close');

      // collega i dati grezzi alla card per render veloce pane
      if(!card.__data){
        // ricavo i dati partendo dalla lista renderizzata
        const p = { titolo:title };
        // NB: in render() potremmo salvare l'oggetto completo:
        // lo facciamo adesso se presente in products
        const found = products.find(x=>x.titolo===title);
        if(found){
          p.ingredienti = found.ingredienti || [];
          p.__dett = [
            found.conservazione ? `<div class="back-meta"><strong>Conservazione</strong>: ${found.conservazione}</div>` : '',
            found.nutrizione ? `<div class="back-meta"><strong>Nutrizione</strong>: ${found.nutrizione}</div>` : '',
            found.vuoto_a_rendere ? `<div class="back-meta"><strong>Vuoto a rendere</strong>: ${found.vuoto_a_rendere}</div>` : '',
            found.raccolta ? `<div class="back-meta"><strong>Raccolta</strong>: ${found.raccolta}</div>` : '',
            found.produttore ? `<div class="back-meta"><strong>Prodotto da</strong>: ${found.produttore}</div>` : ''
          ].join('');
        }else{
          p.ingredienti = [];
          p.__dett = '';
        }
        card.__data = p;
      }

      function setOrder(btn){
        btn.classList.remove('btn--ghost'); btn.classList.add('btn--accent','is-order');
        btn.textContent = 'Ordina';
        btn.setAttribute('aria-label', `Ordina ${title}`);
      }
      function resetToggle(btn){
        btn.classList.remove('btn--accent','is-order'); btn.classList.add('btn--ghost');
        const pane = btn.getAttribute('data-pane'); btn.textContent = pane==='ingredienti' ? 'Ingredienti' : 'Dettagli';
        btn.removeAttribute('aria-label');
      }

      function handleToggle(btn, which){
        if(btn.classList.contains('is-order')){
          window.open(WA(title),'_blank','noopener'); return;
        }
        // Apro overlay su questa card (non tocco le altre)
        openOverlay(card, which);
        // Aggiorno bottoni
        if(which==='ingredienti'){ setOrder(btnIngr); resetToggle(btnDett); }
        else { setOrder(btnDett); resetToggle(btnIngr); }
      }

      btnIngr.addEventListener('click', ()=>handleToggle(btnIngr,'ingredienti'));
      btnDett.addEventListener('click', ()=>handleToggle(btnDett,'dettagli'));

      closeBtn.addEventListener('click', ()=> closeOverlay(card));
      // ESC chiude se focus è dentro la card
      card.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeOverlay(card); });
      // Ricalcola maxHeight overlay su resize se aperto
      window.addEventListener('resize', ()=>{
        if(!expander.hidden){
          expander.style.maxHeight = Math.round(card.getBoundingClientRect().height * 0.62) + 'px';
        }
      }, { passive:true });
    });
  }

  function bindGlobalEsc(){
    document.addEventListener('keydown', (e)=>{
      if(e.key!=='Escape') return;
      const openCards = track.querySelectorAll('.product-card.is-pane-open');
      openCards.forEach(c=> closeOverlay(c));
    });
  }

  // === FILTRI + FEATURED ====================================================
  function applyFilters(){
    const cards = Array.from(track.querySelectorAll('.product-card'));
    const activeCats = selectedCats.has('tutti') ? null : selectedCats;

    let visible = 0, featuredVisible = 0;

    cards.forEach(card=>{
      const cats = (card.dataset.cat || '').split(',').map(s=>s.trim()).filter(Boolean);
      const isFeat = card.dataset.featured === '1';
      const catOK = !activeCats || [...activeCats].some(c => cats.includes(c));
      let show = catOK && (!showFeaturedOnly || isFeat);
      // chiudi eventuale overlay quando nascondi
      if(!show) closeOverlay(card);
      card.hidden = !show;
      if(show){ visible++; if(isFeat) featuredVisible++; }
    });

    if(showFeaturedOnly){
      let kept = 0;
      cards.forEach(card=>{
        if(card.hidden) return;
        if(card.dataset.featured === '1'){
          if(kept < MAX_FEATURED){ kept++; }
          else { card.hidden = true; visible--; }
        }else{
          card.hidden = true; visible--;
        }
      });
      featCountEl && (featCountEl.textContent = String(Math.min(featuredVisible, MAX_FEATURED)));
    }else{
      featCountEl && (featCountEl.textContent = String(featuredVisible));
    }

    count && (count.textContent = visible);

    // Reset scroll mobile alla prima card visibile
    if(!mqDesktop.matches){
      const first = cards.find(c=>!c.hidden);
      if(first){
        const left = first.offsetLeft - track.offsetLeft;
        track.scrollTo({left, behavior:'instant'});
      }
    }
  }

  chips.forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const val = chip.dataset.cat;
      const pressed = chip.getAttribute('aria-pressed') === 'true';
      if(val === 'tutti'){
        selectedCats = new Set(['tutti']);
        chips.forEach(c => c.setAttribute('aria-pressed', c.dataset.cat==='tutti' ? 'true':'false'));
      }else{
        selectedCats.delete('tutti');
        chip.setAttribute('aria-pressed', pressed ? 'false':'true');
        if(pressed) selectedCats.delete(val); else selectedCats.add(val);
        if(selectedCats.size===0){
          selectedCats = new Set(['tutti']);
          chips.forEach(c => c.setAttribute('aria-pressed', c.dataset.cat==='tutti' ? 'true':'false'));
        }else{
          const chipTutti = chips.find(c=>c.dataset.cat==='tutti');
          if(chipTutti) chipTutti.setAttribute('aria-pressed','false');
        }
      }
      applyFilters();
    });
  });

  toggleFeaturedBtn.addEventListener('click', ()=>{
    const pressed = toggleFeaturedBtn.getAttribute('aria-pressed') === 'true';
    showFeaturedOnly = !pressed;
    toggleFeaturedBtn.setAttribute('aria-pressed', showFeaturedOnly ? 'true' : 'false');
    toggleFeaturedBtn.textContent = showFeaturedOnly ? 'Solo in evidenza' : 'Mostra tutti';
    applyFilters();
  });

  // === SLIDER MOBILE ========================================================
  function bindSlider(){
    const step = ()=> Math.max(240, Math.round(track.getBoundingClientRect().width * 0.8));
    const go = (dir)=> track.scrollBy({left: dir*step(), behavior:'smooth'});
    prev && prev.addEventListener('click', ()=>go(-1));
    next && next.addEventListener('click', ()=>go(1));
  }

  // === DATA SOURCE ==========================================================
  function setProducts(data){
    products = Array.isArray(data) ? data : [];
    render();
    // init featured button text
    toggleFeaturedBtn.setAttribute('aria-pressed','true');
    toggleFeaturedBtn.textContent = 'Solo in evidenza';
  }

  if(Array.isArray(window.PRODUCTS)){
    setProducts(window.PRODUCTS);
  }else{
    fetch('assets/prodotti.json')
      .then(r=>r.json())
      .then(setProducts)
      .catch(err=>{
        console.error('Errore caricamento prodotti.json', err);
        track.innerHTML = '<p>Impossibile caricare i prodotti.</p>';
      });
  }
})();

function formatEuro(n){
  if (typeof n !== 'number') return '—';
  return '€' + n.toFixed(2).replace('.', ',');
}

function renderPrice(p){
  if (!p || typeof p !== 'object') return '<span class="price-main">—</span>';
  const full   = formatEuro(p.full);
  const refill = formatEuro(p.refill);
  return `
    <span class="price-main">${full}</span>
    <small class="price-refill">al riacquisto ${refill}</small>
  `;
}

