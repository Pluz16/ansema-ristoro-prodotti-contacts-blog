// ANSEMA — Ristoro: Prezzi / Vini / Bevande (stable)
// - Scope DOM dentro #ristoro
// - Guardie per vista attiva (root.dataset.view)
// - Reset forte su cambio tab + render in microtask
// - Deep-link interno data-jump="prezzi:apericena" (seleziona chip e vista)
// - Opzionale: supporto hash #ristoro:apericena su load
(function(){
  'use strict';

  const root = document.getElementById('ristoro');
  if(!root) return;

  // URLs dai data-* della sezione
  const MENU_URL = root.dataset.menuUrl;
  const WINE_URL = root.dataset.wineUrl;
  const BEV_URL  = root.dataset.bevandeUrl;

  // Nodi UI (scopati alla sezione)
  const tabs      = root.querySelectorAll('.tab');           // <button class="tab" data-view="prezzi|vini|bevande">
  const filterbar = root.querySelector('#filterbar');        // <div id="filterbar">
  const grid      = root.querySelector('#grid');             // <div id="grid">
  const dialog    = root.querySelector('#info-dialog');      // <div id="info-dialog" hidden>
  const dialogClose = dialog?.querySelector('.info__close');
  const dialogTitle = dialog?.querySelector('#info-title');
  const dialogBody  = dialog?.querySelector('#info-body');

  // Stato
  let VIEW = 'prezzi';
  root.dataset.view = VIEW;
  const DATA = { menu:null, vini:null, bevande:null };
  const filters = {
    prezzi:  { meal: 'pranzo' },           // pranzo | cena | apericena
    vini:    { color: 'tutti' },           // chip colore
    bevande: { scope:'tutti', cat:'tutti', color:'tutti' }
  };

  // Utils
  const euro = (n)=> (typeof n==='number') ? `€${n.toFixed(2).replace('.00','')}` : '—';
  const esc  = (s)=> String(s||'').replace(/[&<>"]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m]));
  const by   = (k)=> (a,b)=> (a[k]||'').toString().localeCompare((b[k]||'').toString(), 'it', {numeric:true});

  // Caricamento JSON in parallelo
  Promise.allSettled([
    fetch(MENU_URL).then(r=>r.json()),
    fetch(WINE_URL).then(r=>r.json()),
    fetch(BEV_URL).then(r=>r.json())
  ]).then(([m,w,b])=>{
    DATA.menu    = m.value || null;
    DATA.vini    = w.value || null;
    DATA.bevande = b.value || null;

    // Supporto hash tipo #ristoro:apericena (opzionale)
    if(location.hash.startsWith('#ristoro:')){
      const meal = location.hash.split(':')[1] || 'apericena';
      VIEW = 'prezzi'; root.dataset.view = 'prezzi';
      if(['pranzo','cena','apericena'].includes(meal)) filters.prezzi.meal = meal;
      // seleziona il tab Prezzi a UI
      tabs.forEach(t=>{
        const on = t.dataset.view==='prezzi';
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
      });
    }

    draw(true);
  }).catch(console.error);

  /* --------------------- Switch tab --------------------- */
  tabs.forEach(t=>{
    t.addEventListener('click', ()=>{
      // ARIA & stato
      tabs.forEach(x=>{
        x.classList.remove('is-active');
        x.setAttribute('aria-selected','false');
      });
      t.classList.add('is-active');
      t.setAttribute('aria-selected','true');

      // Vista attiva
      VIEW = t.dataset.view;                 // 'prezzi' | 'vini' | 'bevande'
      root.dataset.view = VIEW;

      // Reset minimi di stato sui filtri quando cambio macro-vista
      if(VIEW==='prezzi')  filters.prezzi.meal = filters.prezzi.meal || 'pranzo';
      if(VIEW==='vini')    filters.vini.color  = filters.vini.color  || 'tutti';
      if(VIEW==='bevande'){filters.bevande.scope='tutti'; filters.bevande.cat='tutti'; filters.bevande.color='tutti';}

      // Chiudi dialog info se aperto
      if(dialog && !dialog.hidden) closeInfo();

      // Render
      draw(true);
    });
  });

  /* --------------------- Disegno vista --------------------- */
  function draw(forceReset=false){
    if(forceReset){
      filterbar?.replaceChildren();
      grid?.replaceChildren();
      if(grid) grid.className = 'grid';
    }else{
      if(grid) grid.className = 'grid';
    }

    // Filtri specifici della vista corrente
    renderFilters();

    // Rimanda il contenuto a microtask per evitare race dei vecchi listener
    queueMicrotask(()=>{
      const v = root.dataset.view;
      if(v==='prezzi')      renderPrezzi();
      else if(v==='vini')   renderVini();
      else                  renderBevande();

      // Fallback: se la griglia è rimasta vuota per side-effect, ridisegna una volta
      if(grid && grid.children.length===0){
        if(v==='prezzi')      renderPrezzi();
        else if(v==='vini')   renderVini();
        else                  renderBevande();
      }
    });
  }

  /* ======================= PREZZI ======================= */
  function renderPrezzi(){
    if(root.dataset.view!=='prezzi') return;
    const m = DATA.menu;
    if(!m){ grid.innerHTML = '<p>Dati prezzi non disponibili.</p>'; return; }

    // Mappa sezione
    const map = { pranzo:'pranzo', cena:'cena', apericena:'merenda_sinoira' };
    const secId = map[filters.prezzi.meal] || 'pranzo';
    const sec = m.sections?.find(s=> s.id===secId);
    if(!sec){ grid.innerHTML = '<p>Nessun dato per questa sezione.</p>'; return; }

    // Flat list items (da groups o items)
    let items = [];
    if(Array.isArray(sec.groups)){
      sec.groups.forEach(g=> (g.items||[]).forEach(it=> items.push({ group:g.title, ...it })));
    }else{
      items = sec.items || [];
    }

    grid.innerHTML = items.map(it=>{
      const p1  = it.price ? euro(it.price) : '';
      const pr  = it.price_range ? `${euro(it.price_range[0])}–${euro(it.price_range[1])}` : '';
      const vars= it.variants ? it.variants.map(v=>`${esc(v.size)} ${euro(v.price)}`).join(' / ') : '';
      const priceHtml = p1 || pr || vars || '—';

      const hasInfo = !!(it.description || it.note || it.options);
      const infoBtn = hasInfo
        ? `<button class="btn btn--ghost js-info" data-kind="menu" data-payload='${esc(JSON.stringify(it))}'>Info</button>`
        : '';

      return `
        <article class="row">
          <div>
            <div class="row__title">${esc(it.name)}</div>
            ${it.group ? `<div class="row__meta">${esc(it.group)}</div>` : ''}
            ${it.note  ? `<div class="row__meta">${esc(it.note)}</div>` : ''}
          </div>
          <div class="row__right">
            <strong class="price">${priceHtml}</strong>
            ${infoBtn}
          </div>
        </article>
      `;
    }).join('');
    bindInfo();
  }

  function renderPrezziFilters(){
    if(root.dataset.view!=='prezzi') return;
    filterbar.innerHTML = `
      <div class="stack">
        <button class="chip" data-meal="pranzo"    aria-pressed="${filters.prezzi.meal==='pranzo'}">Pranzo</button>
        <button class="chip" data-meal="cena"      aria-pressed="${filters.prezzi.meal==='cena'}">Cena</button>
        <button class="chip" data-meal="apericena" aria-pressed="${filters.prezzi.meal==='apericena'}">Apericena</button>
      </div>
    `;
    filterbar.querySelectorAll('[data-meal]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        if(root.dataset.view!=='prezzi') return;
        filterbar.querySelectorAll('[data-meal]').forEach(b=>b.setAttribute('aria-pressed','false'));
        btn.setAttribute('aria-pressed','true');
        filters.prezzi.meal = btn.dataset.meal;
        renderPrezzi();
      });
    });
  }

  /* ======================= VINI ======================= */
  function renderVini(){
    if(root.dataset.view!=='vini') return;
    const w = DATA.vini;
    if(!w){ grid.innerHTML = '<p>Dati vini non disponibili.</p>'; return; }

    const items = (w.items||[]).slice().sort((a,b)=> (a.display_order||999)-(b.display_order||999));
    const filtered = items.filter(i=>{
      const color = i.color || i.style || '';
      return filters.vini.color==='tutti' || color===filters.vini.color;
    });

    grid.innerHTML = filtered.map(i=>{
      const prod = i.producer ? `${esc(i.producer.name)}${i.producer.location?', '+esc(i.producer.location):''}` : '';
      const tag  = (i.color||i.style) ? `<span class="badge">${esc(i.color||i.style)}</span>` : '';
      const hasInfo = !!(i.story || (i.method && (i.method.primary || i.method.aging_months_on_lees)));
      const infoBtn = hasInfo
        ? `<button class="btn btn--ghost js-info" data-kind="vino" data-payload='${esc(JSON.stringify({story:i.story||'', method:i.method||null}))}'>Info</button>`
        : '';

      return `
        <article class="card card--text">
          <div class="card__body">
            <h3 class="card__title">${esc(i.name)}</h3>
            <div class="card__meta">${prod}</div>
            <div>${tag}</div>
          </div>
          <footer class="card__foot">
            <strong class="price">${euro(i.price_eur)}</strong>
            <div class="actions">${infoBtn}</div>
          </footer>
        </article>
      `;
    }).join('');
    bindInfo();
  }

  function renderViniFilters(){
    if(root.dataset.view!=='vini') return;
    const w = DATA.vini;
    const items = (w&&w.items) ? w.items : [];
    const colors = Array.from(new Set(items.map(i=> i.color||i.style||'').filter(Boolean)));

    filterbar.innerHTML = `
      <div class="stack">
        <button class="chip" data-color="tutti" aria-pressed="${filters.vini.color==='tutti'}">Tutti</button>
        ${colors.map(c=>`<button class="chip" data-color="${esc(c)}" aria-pressed="${filters.vini.color===c}">${esc(c)}</button>`).join('')}
      </div>
    `;
    filterbar.querySelectorAll('[data-color]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        if(root.dataset.view!=='vini') return;
        filterbar.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed','false'));
        btn.setAttribute('aria-pressed','true');
        filters.vini.color = btn.dataset.color;
        renderVini();
      });
    });
  }

  /* ======================= BEVANDE ======================= */
  function renderBevande(){
    if(root.dataset.view!=='bevande') return;
    const b = DATA.bevande;
    if(!b){ grid.innerHTML = '<p>Dati bevande non disponibili.</p>'; return; }

    let items = (b.items||[]).slice().sort(by('name'));
    // scope
    items = items.filter(x=> filters.bevande.scope==='tutti' ? true : x.scope===filters.bevande.scope);
    // categoria
    if(filters.bevande.cat!=='tutti'){
      items = items.filter(x=> x.category===filters.bevande.cat);
    }
    // vino → colore
    if(filters.bevande.cat==='vino' && filters.bevande.color!=='tutti'){
      items = items.filter(x=> (x.wine_color||'').toLowerCase()===filters.bevande.color);
    }

    grid.innerHTML = items.map(i=>{
      const meta = [
        i.category   ? `<span class="badge">${esc(i.category)}</span>` : '',
        i.wine_color ? `<span class="badge">${esc(i.wine_color)}</span>` : ''
      ].join(' ');

      const price = i.price ? euro(i.price)
        : i.price_range ? `${euro(i.price_range[0])}–${euro(i.price_range[1])}`
        : i.variants ? i.variants.map(v=>`${esc(v.size)} ${euro(v.price)}`).join(' / ')
        : '—';

      const hasInfo = !!(i.note || i.producer || i.variants);
      const infoBtn = hasInfo
        ? `<button class="btn btn--ghost js-info" data-kind="bev" data-payload='${esc(JSON.stringify({ note:i.note||'', producer:i.producer||'', variants:i.variants||null }))}'>Info</button>`
        : '';

      return `
        <article class="card card--text">
          <div class="card__body">
            <h3 class="card__title">${esc(i.name)}</h3>
            <div class="card__meta">${meta}</div>
          </div>
          <footer class="card__foot">
            <strong class="price">${price}</strong>
            <div class="actions">${infoBtn}</div>
          </footer>
        </article>
      `;
    }).join('');
    bindInfo();
  }

  function renderBevandeFilters(){
    if(root.dataset.view!=='bevande') return;
    filterbar.innerHTML = `
      <div class="stack">
        <button class="chip" data-scope="tutti"      aria-pressed="${filters.bevande.scope==='tutti'}">Tutte</button>
        <button class="chip" data-scope="analcolici" aria-pressed="${filters.bevande.scope==='analcolici'}">Analcolici</button>
        <button class="chip" data-scope="alcolici"   aria-pressed="${filters.bevande.scope==='alcolici'}">Alcolici</button>
      </div>
      <div class="stack" id="bev-cat"></div>
      <div class="stack" id="bev-wine-colors"></div>
    `;

    const catHost = filterbar.querySelector('#bev-cat');
    const colHost = filterbar.querySelector('#bev-wine-colors');

    function paintCats(){
      if(root.dataset.view!=='bevande') return;
      catHost.innerHTML = (filters.bevande.scope==='alcolici') ? `
        <button class="chip" data-cat="tutti"    aria-pressed="${filters.bevande.cat==='tutti'}">Tutte le categorie</button>
        <button class="chip" data-cat="vino"     aria-pressed="${filters.bevande.cat==='vino'}">Vino</button>
        <button class="chip" data-cat="birra"    aria-pressed="${filters.bevande.cat==='birra'}">Birra</button>
        <button class="chip" data-cat="vermouth" aria-pressed="${filters.bevande.cat==='vermouth'}">Vermouth</button>
        <button class="chip" data-cat="grappa"   aria-pressed="${filters.bevande.cat==='grappa'}">Grappa</button>
      ` : '';
      bindCats();
      paintWineColors();
    }

    function paintWineColors(){
      if(root.dataset.view!=='bevande') return;
      colHost.innerHTML = (filters.bevande.scope==='alcolici' && filters.bevande.cat==='vino') ? `
        <button class="chip" data-wcolor="tutti"    aria-pressed="${filters.bevande.color==='tutti'}">Tutti i colori</button>
        <button class="chip" data-wcolor="bianco"   aria-pressed="${filters.bevande.color==='bianco'}">Bianco</button>
        <button class="chip" data-wcolor="rosso"    aria-pressed="${filters.bevande.color==='rosso'}">Rosso</button>
        <button class="chip" data-wcolor="rosato"   aria-pressed="${filters.bevande.color==='rosato'}">Rosato</button>
        <button class="chip" data-wcolor="spumante" aria-pressed="${filters.bevande.color==='spumante'}">Spumante</button>
        <button class="chip" data-wcolor="orange"   aria-pressed="${filters.bevande.color==='orange'}">Orange</button>
      ` : '';
      bindWineColors();
    }

    function bindScope(){
      filterbar.querySelectorAll('[data-scope]').forEach(b=>{
        b.addEventListener('click', ()=>{
          if(root.dataset.view!=='bevande') return;
          filterbar.querySelectorAll('[data-scope]').forEach(x=>x.setAttribute('aria-pressed','false'));
          b.setAttribute('aria-pressed','true');
          filters.bevande.scope = b.dataset.scope;
          filters.bevande.cat   = 'tutti';
          filters.bevande.color = 'tutti';
          paintCats();
          renderBevande();
        });
      });
    }
    function bindCats(){
      filterbar.querySelectorAll('[data-cat]').forEach(b=>{
        b.addEventListener('click', ()=>{
          if(root.dataset.view!=='bevande') return;
          filterbar.querySelectorAll('[data-cat]').forEach(x=>x.setAttribute('aria-pressed','false'));
          b.setAttribute('aria-pressed','true');
          filters.bevande.cat   = b.dataset.cat;
          filters.bevande.color = 'tutti';
          paintWineColors();
          renderBevande();
        });
      });
    }
    function bindWineColors(){
      filterbar.querySelectorAll('[data-wcolor]').forEach(b=>{
        b.addEventListener('click', ()=>{
          if(root.dataset.view!=='bevande') return;
          filterbar.querySelectorAll('[data-wcolor]').forEach(x=>x.setAttribute('aria-pressed','false'));
          b.setAttribute('aria-pressed','true');
          filters.bevande.color = b.dataset.wcolor;
          renderBevande();
        });
      });
    }

    bindScope();
    paintCats();
  }

  /* ======================= Dialog INFO ======================= */
  function bindInfo(){
    if(!dialog) return;
    grid.querySelectorAll('.js-info').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const kind = btn.dataset.kind;
        const data = JSON.parse(btn.dataset.payload || '{}');
        openInfo(kind, data);
      });
    });
  }
  function openInfo(kind, data){
    if(!dialog) return;
    dialogTitle.textContent = 'Dettagli';
    dialogBody.innerHTML = '';

    if(kind==='menu'){
      dialogTitle.textContent = 'Dettaglio';
      const parts = [];
      if(data.description) parts.push(`<p>${esc(data.description)}</p>`);
      if(data.options) parts.push(`<div><h4>Opzioni</h4><ul class="ing-list">${data.options.map(o=>`<li>${esc(o.label)} — ${euro(o.price)}</li>`).join('')}</ul></div>`);
      if(data.note) parts.push(`<p class="row__meta">${esc(data.note)}</p>`);
      dialogBody.innerHTML = parts.join('') || '<p>Informazioni non disponibili.</p>';
    }
    if(kind==='vino'){
      dialogTitle.textContent = 'Dettaglio vino';
      const parts = [];
      if(data.story) parts.push(`<p>${esc(data.story)}</p>`);
      if(data.method){
        const m = data.method;
        parts.push(`<div class="kv">
          ${m.primary?`<div><strong>Metodo</strong><span>${esc(m.primary)}</span></div>`:''}
          ${m.aging_months_on_lees?`<div><strong>Sosta sui lieviti</strong><span>${esc(m.aging_months_on_lees)} mesi</span></div>`:''}
        </div>`);
      }
      dialogBody.innerHTML = parts.join('') || '<p>Informazioni non disponibili.</p>';
    }
    if(kind==='bev'){
      dialogTitle.textContent = 'Dettaglio bevanda';
      const parts = [];
      if(data.producer) parts.push(`<div class="kv"><div><strong>Produttore</strong><span>${esc(data.producer)}</span></div></div>`);
      if(data.variants){
        parts.push(`<div><h4>Varianti</h4><ul class="ing-list">${data.variants.map(v=>`<li>${esc(v.size)} — ${euro(v.price)}</li>`).join('')}</ul></div>`);
      }
      if(data.note) parts.push(`<p>${esc(data.note)}</p>`);
      dialogBody.innerHTML = parts.join('') || '<p>Informazioni non disponibili.</p>';
    }

    dialog.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeInfo(){
    dialog.hidden = true;
    document.body.style.overflow = '';
  }
  dialogClose?.addEventListener('click', closeInfo);
  dialog?.addEventListener('click', (e)=>{ if(e.target===dialog) closeInfo(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && dialog && !dialog.hidden) closeInfo(); });

  /* ======================= Filtri: dispatcher ======================= */
  function renderFilters(){
    const v = root.dataset.view;
    if(v==='prezzi')      renderPrezziFilters();
    else if(v==='vini')   renderViniFilters();
    else                  renderBevandeFilters();
  }

  /* ======================= Deep-link interno ======================= */
  // Esempio: <a data-jump="prezzi:apericena" href="#ristoro">...</a>
  document.addEventListener('click', (e)=>{
    const link = e.target.closest('a[data-jump]');
    if(!link) return;

    const val = String(link.dataset.jump || '');
    const [view, arg] = val.split(':'); // 'prezzi', 'apericena'
    if(view !== 'prezzi') return;

    e.preventDefault();

    // Attiva visivamente il tab "prezzi"
    tabs.forEach(x=>{
      const on = x.dataset.view==='prezzi';
      x.classList.toggle('is-active', on);
      x.setAttribute('aria-selected', String(on));
    });

    // Imposta vista e chip
    VIEW = 'prezzi';
    root.dataset.view = 'prezzi';
    if(['pranzo','cena','apericena'].includes(arg)) filters.prezzi.meal = arg;
    else filters.prezzi.meal = 'apericena';

    draw(true);
    root.scrollIntoView({ behavior:'smooth', block:'start' });
  });

})();
