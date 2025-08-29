
// Menu tabs
(function(){
  const tabs = document.querySelectorAll('.menu__tab');
  const panelsById = new Map();
  document.querySelectorAll('.menu__panel').forEach(p => panelsById.set(p.id, p));
  if(!tabs.length) return;
  function activate(id){
    tabs.forEach(t=>{
      const a = t.dataset.tab===id;
      t.classList.toggle('is-active', a);
      t.setAttribute('aria-selected', a ? 'true' : 'false');
      t.setAttribute('tabindex', a ? '0' : '-1');
    });
    document.querySelectorAll('.menu__panel').forEach(p => p.hidden = true);
    const panelId = `menu-panel-${id}`;
    const panel = panelsById.get(panelId);
    if(panel) panel.hidden = false;
  }
  tabs.forEach(tab => tab.addEventListener('click', ()=> activate(tab.dataset.tab)));
  const tablist = document.querySelector('.menu__tabs');
  tablist.addEventListener('keydown', (e)=>{
    const list = Array.from(tabs);
    let i = list.findIndex(t=>t.getAttribute('aria-selected')==='true');
    if(e.key==='ArrowRight'){ e.preventDefault(); i=(i+1)%list.length; list[i].focus(); activate(list[i].dataset.tab); }
    if(e.key==='ArrowLeft'){ e.preventDefault(); i=(i-1+list.length)%list.length; list[i].focus(); activate(list[i].dataset.tab); }
    if(e.key==='Home'){ e.preventDefault(); list[0].focus(); activate(list[0].dataset.tab); }
    if(e.key==='End'){ e.preventDefault(); list[list.length-1].focus(); activate(list[list.length-1].dataset.tab); }
  });
  // init
  activate('pranzo');
})();

// Drinks: gating + filter (chips visible only after Alcolici)
(function(){
  const scope = document.querySelector('.drinks');
  if(!scope) return;
  const listWrap = scope.querySelector('.drink-list');
  const list = scope.querySelectorAll('.drink-card');
  const typeTabs = scope.querySelectorAll('[data-type-tab]');
  const colorChips = scope.querySelectorAll('[data-color-chip]');
  const chipsWrap = scope.querySelector('.filter-chips');
  let currentType = null;      // no selection initially
  let currentColor = 'tutti';  // default

  function apply(){
    listWrap.hidden = (currentType === null);
    chipsWrap.hidden = !(currentType === 'alcolici');
    if(currentType === null){ return; }
    list.forEach(card=>{
      const t = card.dataset.type; // alcolico | analcolico
      const c = card.dataset.color || 'na';
      let show = false;
      if(currentType === 'alcolici'){
        show = (t==='alcolico') && (currentColor==='tutti' || c===currentColor);
      }else if(currentType === 'analcolici'){
        show = (t==='analcolico');
      }
      card.hidden = !show;
    });
  }

  typeTabs.forEach(btn=>{
    btn.setAttribute('aria-pressed','false'); // reset
    btn.addEventListener('click', ()=>{
      typeTabs.forEach(b=> b.setAttribute('aria-pressed', b===btn ? 'true':'false'));
      currentType = btn.dataset.typeTab;
      currentColor = 'tutti';
      colorChips.forEach(c=> c.setAttribute('aria-pressed', c.dataset.colorChip==='tutti' ? 'true':'false'));
      apply();
    });
  });

  colorChips.forEach(chip=>{
    chip.addEventListener('click', ()=>{
      if(currentType!=='alcolici') return; // guard: chips only active under 'alcolici'
      colorChips.forEach(c=> c.setAttribute('aria-pressed','false'));
      chip.setAttribute('aria-pressed','true');
      currentColor = chip.dataset.colorChip;
      apply();
    });
  });

  apply();
})();
