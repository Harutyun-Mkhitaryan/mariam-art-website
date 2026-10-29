/* Mariam-Art — site-wide search.
   Loads a per-language JSON index built at compile time, scores matches with a
   small typo-tolerant matcher, groups results and drives an accessible overlay.
   Opens with the header button, ⌘K / Ctrl+K, or the "/" key. */
(function () {
  'use strict';

  var configNode = document.getElementById('site-config');
  var cfg = {};
  try { cfg = JSON.parse(configNode ? configNode.textContent || '{}' : '{}'); } catch (e) { cfg = {}; }
  var t = (cfg.t && cfg.t.search) || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var overlay = $('[data-search]');
  if (!overlay) return;

  var input = $('[data-search-input]', overlay);
  var list = $('[data-search-results]', overlay);
  var closeBtn = $('[data-search-close]', overlay);
  var index = null;
  var loading = false;
  var active = -1;
  var items = [];
  var lastFocus = null;
  var debounce;

  /* ------------------------------------------------------------ normalising */
  function fold(s) {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')   // strip Latin/Cyrillic accents
      .replace(/[և՝՞՚՜։]/g, '') // Armenian punctuation
      .replace(/[«»"'`’‚„]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Levenshtein capped at 2 — enough for a one-letter slip, cheap to run. */
  function near(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 2) return 99;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i; var best = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(
          prev[j] + 1, cur[j - 1] + 1,
          prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
        );
        if (cur[j] < best) best = cur[j];
      }
      if (best > 2) return 99;
      prev = cur.slice();
    }
    return prev[b.length];
  }

  function scoreEntry(entry, terms) {
    var title = entry._t || (entry._t = fold(entry.title));
    var body = entry._b || (entry._b = fold([entry.title, entry.subtitle, entry.text, (entry.tags || []).join(' ')].join(' ')));
    var words = entry._w || (entry._w = body.split(' '));
    var total = 0;

    for (var i = 0; i < terms.length; i++) {
      var term = terms[i], best = 0;
      if (title.indexOf(term) === 0) best = 120;
      else if (title.indexOf(term) > -1) best = 90;
      else if (body.indexOf(term) > -1) best = 55;
      else {
        for (var w = 0; w < words.length; w++) {
          if (words[w].length < 3) continue;
          var d = near(term, words[w]);
          if (d <= 2) { best = Math.max(best, d === 1 ? 34 : 20); }
        }
      }
      if (!best) return 0;                       // every term must land somewhere
      total += best;
    }
    return total + (entry.weight || 0);
  }

  function highlight(text, terms) {
    if (!text) return '';
    var frag = document.createDocumentFragment();
    var folded = fold(text);
    var marks = [];
    terms.forEach(function (term) {
      var from = 0, at;
      while ((at = folded.indexOf(term, from)) > -1) {
        marks.push([at, at + term.length]); from = at + term.length;
      }
    });
    if (!marks.length) { frag.appendChild(document.createTextNode(text)); return frag; }
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [marks[0]];
    marks.slice(1).forEach(function (m) {
      var last = merged[merged.length - 1];
      if (m[0] <= last[1]) last[1] = Math.max(last[1], m[1]); else merged.push(m);
    });
    var cursor = 0;
    merged.forEach(function (m) {
      if (m[0] > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, m[0])));
      var el = document.createElement('mark');
      el.textContent = text.slice(m[0], m[1]);
      frag.appendChild(el);
      cursor = m[1];
    });
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    return frag;
  }

  /* ----------------------------------------------------------------- index */
  function loadIndex() {
    if (index || loading) return Promise.resolve(index);
    loading = true;
    return fetch(cfg.searchIndex, { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (json) { index = json.entries || []; loading = false; return index; })
      .catch(function () { loading = false; index = []; return index; });
  }

  /* --------------------------------------------------------------- render */
  function message(main, sub) {
    list.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'search__empty';
    var p = document.createElement('p'); p.className = 'body'; p.textContent = main;
    box.appendChild(p);
    if (sub) { var s = document.createElement('p'); s.className = 'caption mt-xs'; s.textContent = sub; box.appendChild(s); }
    list.appendChild(box);
    items = []; active = -1;
  }

  function render(results, terms) {
    list.innerHTML = '';
    items = [];
    if (!results.length) return;

    var order = ['work', 'category', 'page', 'faq'];
    var labels = {
      work: t.groupWorks || 'Works', category: t.groupCategories || 'Categories',
      page: t.groupPages || 'Pages', faq: t.groupFaq || 'Questions'
    };
    var grouped = {};
    results.forEach(function (r) { (grouped[r.type] = grouped[r.type] || []).push(r); });

    order.forEach(function (type) {
      var group = grouped[type];
      if (!group || !group.length) return;
      var head = document.createElement('p');
      head.className = 'search__group-title';
      head.textContent = labels[type] || type;
      list.appendChild(head);

      group.forEach(function (entry) {
        var a = document.createElement('a');
        a.className = 'search__item';
        a.href = entry.url;
        a.setAttribute('role', 'option');

        if (entry.image) {
          var img = document.createElement('img');
          img.className = 'search__thumb'; img.src = entry.image; img.alt = '';
          img.loading = 'lazy'; img.width = 52; img.height = 40;
          a.appendChild(img);
        }
        var box = document.createElement('span');
        var title = document.createElement('span');
        title.className = 'search__item-title';
        title.appendChild(highlight(entry.title, terms));
        box.appendChild(title);
        if (entry.subtitle) {
          var sub = document.createElement('span');
          sub.className = 'search__item-sub';
          sub.style.display = 'block';
          sub.appendChild(highlight(entry.subtitle, terms));
          box.appendChild(sub);
        }
        a.appendChild(box);
        list.appendChild(a);
        items.push(a);
      });
    });
    active = -1;
  }

  function run(query) {
    var q = fold(query);
    if (!q) { message(t.start || 'Start typing to search.'); return; }
    var terms = q.split(' ').filter(function (x) { return x.length > 1; });
    if (!terms.length) { message(t.start || 'Start typing to search.'); return; }

    loadIndex().then(function (entries) {
      var scored = [];
      entries.forEach(function (e) {
        var s = scoreEntry(e, terms);
        if (s > 0) scored.push({ e: e, s: s });
      });
      scored.sort(function (a, b) { return b.s - a.s; });
      var results = scored.slice(0, 24).map(function (x) { return x.e; });
      if (!results.length) {
        message((t.empty || 'Nothing found for "{query}".').replace('{query}', query),
                t.emptyHint || '');
        return;
      }
      render(results, terms);
      var count = $('[data-search-count]', overlay);
      if (count) {
        count.textContent = results.length === 1
          ? (t.resultsOne || '1 result')
          : (t.resultsMany || '{n} results').replace('{n}', results.length);
      }
    });
  }

  /* ---------------------------------------------------------------- open */
  function open(seed) {
    lastFocus = document.activeElement;
    overlay.setAttribute('data-open', 'true');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    loadIndex();
    if (typeof seed === 'string') input.value = seed;
    input.focus();
    input.select();
    if (input.value) run(input.value); else message(t.start || 'Start typing to search.');
  }

  function close() {
    overlay.setAttribute('data-open', 'false');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function move(step) {
    if (!items.length) return;
    if (active > -1) items[active].removeAttribute('data-active');
    active = (active + step + items.length) % items.length;
    var el = items[active];
    el.setAttribute('data-active', 'true');
    el.scrollIntoView({ block: 'nearest' });
  }

  $$('[data-search-open]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

  input.addEventListener('input', function () {
    clearTimeout(debounce);
    var v = input.value;
    debounce = setTimeout(function () { run(v); }, 110);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter' && active > -1) { e.preventDefault(); items[active].click(); }
  });

  document.addEventListener('keydown', function (e) {
    var isOpen = overlay.getAttribute('data-open') === 'true';
    if (isOpen && e.key === 'Escape') { e.preventDefault(); close(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); isOpen ? close() : open(); return; }
    if (isOpen) return;
    var tag = (e.target && e.target.tagName) || '';
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && !e.target.isContentEditable) {
      e.preventDefault(); open('');
    }
  });

  /* keep focus inside the overlay while it is open */
  overlay.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var focusables = $$('a[href], button, input', overlay).filter(function (el) { return el.offsetParent !== null; });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* deep link: /gallery/?q=leaf opens the overlay pre-filled */
  var qp = new URLSearchParams(location.search).get('q');
  if (qp) open(qp);
})();
