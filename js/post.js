/* js/post.js — Singolo articolo (slug robusto, immagini toAbs, back link fisso, prev/next) */
(function () {
  'use strict';

  // ===== Utils =====
  function toAbs(u) {
    if (!u) return u;
    if (/^(https?:)?\/\//.test(u) || /^data:/.test(u) || u.startsWith('/')) return u;
    // risolve "assets/..." rispetto alla cartella corrente
    var basePath = location.pathname.replace(/[^/]*$/, ''); // es. "/"
    return basePath + u;
  }
  function byDateDesc(a, b) { return (b.date || '').localeCompare(a.date || ''); }
  function escapeAttr(s) {
    return (s || '').toString()
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Slug dal URL (query, hash, clean), oppure fallback sessionStorage
  function getSlug() {
    var s;
    var sp = new URLSearchParams(location.search);
    s = sp.get('slug'); if (s) return decodeURIComponent(s).trim();

    if (location.hash && location.hash.includes('slug=')) {
      var hsp = new URLSearchParams(location.hash.slice(1));
      s = hsp.get('slug'); if (s) return decodeURIComponent(s).trim();
    }

    var m = location.pathname.match(/post\.html\/([^/?#]+)/i);
    if (m && m[1]) return decodeURIComponent(m[1]).trim();

    var m2 = location.pathname.match(/\/post\/([^/?#]+)/i);
    if (m2 && m2[1]) return decodeURIComponent(m2[1]).trim();

    try { s = sessionStorage.getItem('lastSlug'); if (s) return s.trim(); } catch (e) {}
    return '';
  }

  // Link helper: costruisce URL assoluto per una pagina “pulita”
  function toPagePath(page) {
    // preferisci path “clean”: /prodotti, /blog, /post.html
    if (page === 'prodotti') return '/prodotti';
    if (page === 'blog') return '/blog';
    return '/' + page;
  }

  var slug = getSlug();

  // ===== Riferimenti DOM =====
  var tEl = document.getElementById('post-title');
  var mEl = document.getElementById('post-meta');
  var cEl = document.getElementById('post-content');
  var img = document.getElementById('post-cover');
  var rel = document.getElementById('post-related');
  var main = document.getElementById('post');
  var back = document.getElementById('post-back');   // ← Torna ai prodotti
  var prevA = document.getElementById('post-prev');  // Precedente (più vecchio)
  var nextA = document.getElementById('post-next');  // Successivo (più recente)

  // Fissa subito il back link a /prodotti (assoluto)
  if (back) back.setAttribute('href', toPagePath('prodotti'));

  if (!slug) {
    tEl && (tEl.textContent = 'Articolo non trovato');
    cEl && (cEl.innerHTML = '<p>Parametro <code>slug</code> mancante.</p>');
    return;
  }

  // ===== Load & Render =====
  fetch('/assets/blog.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status + ' su assets/blog.json'); return r.json(); })
    .then(function (posts) {
      if (!Array.isArray(posts)) throw new Error('Formato blog.json non valido');

      // ordina per data desc
      posts = posts.slice().sort(byDateDesc);

      var idx = -1;
      var post = posts.find(function (p, i) {
        var ok = p && typeof p.slug === 'string' && p.slug.trim().toLowerCase() === slug.toLowerCase();
        if (ok) idx = i;
        return ok;
      });

      if (!post) {
        tEl && (tEl.textContent = 'Articolo non trovato');
        cEl && (cEl.innerHTML = '<p>Lo slug <code>' + escapeAttr(slug) + '</code> non esiste in <code>assets/blog.json</code>.</p>');
        return;
      }

      // pulizia fallback
      try { sessionStorage.removeItem('lastSlug'); } catch (e) {}

      // Titolo / Meta
      document.title = (post.title || 'Articolo') + ' • Ansema';
      if (tEl) tEl.textContent = post.title || 'Articolo';
      if (mEl) mEl.textContent = [post.category || '', post.date || ''].filter(Boolean).join(' • ');

      // Aggiorna URL “pulito” in barra se non c'è già
      try {
        var pretty = 'post.html/' + encodeURIComponent(slug);
        if (!location.pathname.endsWith('/' + slug) && !location.search.includes('slug=')) {
          history.replaceState(null, '', pretty);
        }
      } catch (e) { /* no-op */ }

      // Cover (toAbs)
      if (img) {
        if (post.image) {
          img.src = toAbs(post.image);
          img.alt = post.alt || '';
          img.parentElement.style.display = '';
        } else {
          img.removeAttribute('src'); img.removeAttribute('alt');
          img.parentElement.style.display = 'none';
        }
      }

      // Contenuto
      if (cEl) {
        cEl.innerHTML = post.content || '';
        // normalizza immagini nel corpo
        cEl.querySelectorAll('img').forEach(function (im) {
  var src = im.getAttribute('src');
  if (src && !/^(https?:)?\/\//.test(src) && !src.startsWith('/')) {
    im.setAttribute('src', '/assets/' + src.replace(/^\.?\/?assets\/?/, ''));
  }
});
      }

      // Extra classi/stili (opzionali nel JSON)
      if (main && Array.isArray(post.extraClasses)) {
        post.extraClasses.forEach(function (cls) { if (cls) main.classList.add(cls); });
      }
      if (post.extraStyles) {
        var s = document.createElement('style');
        s.textContent = String(post.extraStyles);
        document.head.appendChild(s);
      }

      // Correlati (stessa categoria, priorità tag)
      function pickRelated(base, all, max) {
        max = max || 3;
        if (Array.isArray(base.related) && base.related.length) {
          var map = Object.create(null);
          all.forEach(function (p) { map[p.slug] = p; });
          return base.related.map(function (sl) { return map[sl]; }).filter(Boolean).slice(0, max);
        }
        var baseTags = Array.isArray(base.tags) ? base.tags.map(String) : [];
        var cand = all.filter(function (p) {
          if (!p || p.slug === base.slug) return false;
          if (p.category !== base.category) return false;
          var tags = Array.isArray(p.tags) ? p.tags.map(String) : [];
          return tags.some(function (t) { return baseTags.includes(t); });
        });
        if (cand.length < max) {
          var more = all.filter(function (p) {
            return p && p.slug !== base.slug && p.category === base.category && !cand.includes(p);
          });
          cand = Array.from(new Set(cand.concat(more)));
        }
        return cand.slice(0, max);
      }

      if (rel) {
        var related = pickRelated(post, posts, 3);
        if (related.length) {
          rel.innerHTML = '<h4>Potrebbe interessarti</h4><div class="related-grid">' +
            related.map(function (r) {
              var href = '/post.html?slug=' + encodeURIComponent(r.slug);
              return '<a class="related-item" href="' + href + '">' +
                '<h4>' + escapeAttr(r.title) + '</h4>' +
                '<div class="post-meta">' + escapeAttr(r.category || '') + (r.date ? (' • ' + escapeAttr(r.date)) : '') + '</div>' +
                '<p>' + escapeAttr(r.excerpt || '') + '</p>' +
                '</a>';
            }).join('') +
            '</div>';
        } else {
          rel.innerHTML = '';
        }
      }

      // ===== Prev / Next =====
      // Ordinamento: posts è DESC (più recenti prima).
      // Scelta: "Precedente" = post più vecchio; "Successivo" = post più recente.
      var prevIdx = (idx < posts.length - 1) ? idx + 1 : -1; // più vecchio
      var nextIdx = (idx > 0) ? idx - 1 : -1;               // più recente

      if (prevA) {
        if (prevIdx >= 0) {
          prevA.href = '/post.html?slug=' + encodeURIComponent(posts[prevIdx].slug);
          prevA.textContent = '← Precedente';
          prevA.style.visibility = '';
        } else {
          prevA.href = '#';
          prevA.style.visibility = 'hidden';
        }
      }
      if (nextA) {
        if (nextIdx >= 0) {
          nextA.href = '/post.html?slug=' + encodeURIComponent(posts[nextIdx].slug);
          nextA.textContent = 'Successivo →';
          nextA.style.visibility = '';
        } else {
          nextA.href = '#';
          nextA.style.visibility = 'hidden';
        }
      }

      // JSON-LD minimale
      var ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title || "",
        "datePublished": post.date || "",
        "image": toAbs(post.image || ""),
        "articleBody": (post.content || "").replace(/<[^>]+>/g, ' ').trim()
      });
      document.head.appendChild(ld);
    })
    .catch(function (err) {
      console.error('Errore post:', err);
      if (tEl) tEl.textContent = 'Errore di caricamento';
      if (cEl) cEl.innerHTML = '<p>Impossibile caricare <code>assets/blog.json</code>. Verifica il percorso relativo da <code>post.html</code>.</p>';
    });
})();
