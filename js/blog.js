/* js/blog.js — Lista blog con chip, ricerca, card cliccabili, slug fallback e immagini toAbs */
(function () {
  'use strict';

  var root = document.getElementById('blog');
  if (!root) return;

  // ===== Utils =====
  function toAbs(u) {
    if (!u) return u;
    if (/^(https?:)?\/\//.test(u) || /^data:/.test(u) || u.startsWith('/')) return u;
    var basePath = location.pathname.replace(/[^/]*$/, ''); // cartella pagina
    return basePath + u;
  }
  function byDateDesc(a, b) { return (b.date || '').localeCompare(a.date || ''); }
  function textIncludes(hay, needle) {
    if (!needle) return true;
    hay = (hay || '').toLowerCase();
    needle = (needle || '').toLowerCase().trim();
    return hay.indexOf(needle) !== -1;
  }
  function escapeAttr(str) {
    return (str || '').toString()
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 200); }; }

  // ===== UI refs =====
  var listEl = document.getElementById('blog-list');
  var chipsEl = document.getElementById('blog-chips');
  var qEl = document.getElementById('blog-search');
  var moreEl = document.getElementById('blog-load-more');

  // ===== State =====
  var POSTS = [];
  var isArchive = /(^|\/)blog\.html(\?|#|$)/.test(location.pathname);
  var initialVisible = isArchive ? 9 : 6;
  var step = isArchive ? 9 : 6;

  var visible = initialVisible;
  var query = '';
  var cat = '';
  var allowedCats = { 'Eventi': 1, 'News': 1, 'Ricette': 1, 'Territorio': 1 };

  // ===== Template card =====
  function cardTemplate(p) {
    var href = '/post.html?slug=' + encodeURIComponent(p.slug); // link assoluto
    var img = p.image
      ? '<img class="blog-cover" src="' + escapeAttr(toAbs(p.image)) + '" alt="' + escapeAttr(p.alt || '') + '" loading="lazy">'
      : '';
    var metaParts = [];
    if (p.category) metaParts.push(escapeAttr(p.category));
    if (p.date) metaParts.push(escapeAttr(p.date));
    var metaHTML = metaParts.length ? '<div class="blog-meta">' + metaParts.join(' • ') + '</div>' : '';

    return [
      '<article class="blog-card" role="listitem" data-slug="' + escapeAttr(p.slug) + '" tabindex="0">',
      img,
      '<div class="blog-body">',
      metaHTML,
      '<h3 class="blog-title">' + escapeAttr(p.title || 'Articolo') + '</h3>',
      (p.excerpt ? '<p class="blog-excerpt">' + escapeAttr(p.excerpt) + '</p>' : ''),
      '<div class="blog-cta"><a class="blog-link" href="' + href + '" data-slug="' + escapeAttr(p.slug) + '">Apri articolo</a></div>',
      '</div>',
      '</article>'
    ].join('');
  }

  // ===== Filters =====
  function getFiltered() {
    return POSTS
      .filter(function (p) {
        var okCat = !cat || p.category === cat;
        if (!okCat) return false;
        if (!query) return true;
        var hay = (p.title || '') + ' ' + (p.excerpt || '');
        return textIncludes(hay, query);
      })
      .sort(byDateDesc);
  }

  function updateActiveChip() {
    if (!chipsEl) return;
    var chips = Array.from(chipsEl.querySelectorAll('.chip'));
    chips.forEach(function (c) { c.classList.remove('is-active'); });
    var btn = chips.find(function (c) { return (c.getAttribute('data-cat') || '') === cat; }) ||
      chips.find(function (c) { return (c.getAttribute('data-cat') || '') === ''; });
    btn && btn.classList.add('is-active');
  }

  // ===== Render =====
  function render() {
    var data = getFiltered();
    var subset = data.slice(0, visible);

    if (!subset.length) {
      listEl.innerHTML = '<p>Nessun articolo trovato.</p>';
      if (moreEl) moreEl.style.display = 'none';
      return;
    }

    listEl.innerHTML = subset.map(cardTemplate).join('');

    // “Mostra altri”
    if (data.length > visible) { moreEl && (moreEl.style.display = ''); }
    else { moreEl && (moreEl.style.display = 'none'); }

    // Salva slug al click sul link (fallback sessionStorage)
    Array.from(listEl.querySelectorAll('.blog-link')).forEach(function (a) {
      a.addEventListener('click', function () {
        var s = a.getAttribute('data-slug');
        if (s) { try { sessionStorage.setItem('lastSlug', s); } catch (e) {} }
      });
    });

    // Card cliccabile
    Array.from(listEl.querySelectorAll('.blog-card')).forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('.blog-link')) return;
        var s = card.getAttribute('data-slug');
        if (!s) return;
        try { sessionStorage.setItem('lastSlug', s); } catch (e) {}
        location.href = '/post.html?slug=' + encodeURIComponent(s);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var s = card.getAttribute('data-slug');
          if (!s) return;
          try { sessionStorage.setItem('lastSlug', s); } catch (e) {}
          location.href = '/post.html?slug=' + encodeURIComponent(s);
        }
      });
    });
  }

  // ===== Events =====
  function bind() {
    if (chipsEl) {
      chipsEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.chip'); if (!btn) return;
        cat = btn.getAttribute('data-cat') || '';
        visible = initialVisible; updateActiveChip(); render();
      });
    }
    if (qEl) {
      qEl.addEventListener('input', debounce(function () {
        query = (qEl.value || '').trim();
        visible = initialVisible; render();
      }, 220));
    }
    if (moreEl) {
      moreEl.addEventListener('click', function () {
        visible += step; render();
      });
    }
  }

  function initFromURL() {
    var sp = new URLSearchParams(location.search);
    var q = sp.get('q'); var c = sp.get('cat');
    if (typeof q === 'string') { query = q.trim(); if (qEl) qEl.value = query; }
    if (typeof c === 'string') { cat = allowedCats[c] ? c : ''; updateActiveChip(); }
  }

  function load() {
    fetch('/assets/blog.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (json) {
        if (!Array.isArray(json)) throw new Error('Formato blog.json non valido');
        POSTS = json.map(function (p) { if (!allowedCats[p.category]) p.category = ''; return p; }).sort(byDateDesc);
        initFromURL(); render();
      })
      .catch(function (err) {
        console.error('Errore blog:', err);
        listEl.innerHTML = '<p>Impossibile caricare gli articoli.</p>';
        if (moreEl) moreEl.style.display = 'none';
      });
  }

  bind();
  load();
})();
