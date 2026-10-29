/* Mariam-Art — site behaviour.
   No dependencies. Every feature degrades to plain HTML if this file fails. */
(function () {
  'use strict';

  var configNode = document.getElementById('site-config');
  var cfg = {};
  try { cfg = JSON.parse(configNode ? configNode.textContent || '{}' : '{}'); } catch (e) { cfg = {}; }
  var t = cfg.t || {};
  var root = document.documentElement;
  var on = function (el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt || false); };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------- theme */
  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set === 'light' || set === 'dark') return set;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(name) {
    name = name === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', name);
    try { localStorage.setItem('mariam-art-theme', name); } catch (e) {}
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', name === 'light' ? '#F7F2E9' : '#100F0D');
    $$('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', name === 'light' ? (t.themeDark || 'Dark') : (t.themeLight || 'Light'));
      b.setAttribute('aria-pressed', String(name === 'light'));
    });
  }

  $$('[data-theme-toggle]').forEach(function (btn) {
    on(btn, 'click', function () { applyTheme(currentTheme() === 'light' ? 'dark' : 'light'); });
  });
  applyTheme(currentTheme());

  /* --------------------------------------------- contact subject deep link */
  var subject = new URLSearchParams(location.search).get('subject');
  var subjectField = $('[data-subject-field]');
  if (subject && subjectField) subjectField.value = subject.slice(0, 160);

  /* -------------------------------------------------------- sticky header */
  var header = $('[data-header]');
  if (header) {
    var stuck = false;
    var onScroll = function () {
      var next = window.scrollY > 24;
      if (next !== stuck) { stuck = next; header.classList.toggle('is-stuck', stuck); }
    };
    on(window, 'scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------- mobile drawer */
  var drawer = $('[data-drawer]');
  var burger = $('[data-drawer-open]');
  var drawerClose = $('[data-drawer-close]');

  function setDrawer(open) {
    if (!drawer) return;
    drawer.setAttribute('data-open', String(open));
    drawer.setAttribute('aria-hidden', String(!open));
    if (burger) burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { var f = drawer.querySelector('a, button'); if (f) f.focus(); }
    else if (burger) burger.focus();
  }
  on(burger, 'click', function () { setDrawer(true); });
  on(drawerClose, 'click', function () { setDrawer(false); });
  if (drawer) $$('a', drawer).forEach(function (a) { on(a, 'click', function () { setDrawer(false); }); });

  /* ------------------------------------------------------- reveal on scroll */
  var revealables = $$('.reveal');
  if (revealables.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------------------------------------------------- gallery filter */
  var gallery = $('[data-gallery]');
  if (gallery) {
    var cards = $$('[data-card]', gallery);
    var counter = $('[data-gallery-counter]');
    var empty = $('[data-gallery-empty]');
    var sortSel = $('[data-gallery-sort]');
    var total = cards.length;

    function readState() {
      var p = new URLSearchParams(location.search);
      var sort = p.get('s');
      return { cat: p.get('c') || 'all', sort: sort === 'title' ? 'title' : 'featured' };
    }

    function apply(state, push) {
      var shown = 0;
      cards.forEach(function (card) {
        var match = state.cat === 'all' || card.getAttribute('data-category') === state.cat;
        card.hidden = !match;
        if (match) shown++;
      });

      var parent = gallery;
      var visible = cards.filter(function (c) { return !c.hidden; });
      visible.sort(function (a, b) {
        if (state.sort === 'title') {
          return (a.getAttribute('data-title') || '').localeCompare(b.getAttribute('data-title') || '', cfg.locale);
        }
        return (+a.getAttribute('data-order')) - (+b.getAttribute('data-order'));
      });
      visible.forEach(function (c) { parent.appendChild(c); });

      $$('[data-filter]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === state.cat));
      });
      if (sortSel) sortSel.value = state.sort;
      if (counter) {
        counter.textContent = (t.counter || '{shown} / {total}')
          .replace('{shown}', shown).replace('{total}', total);
      }
      if (empty) empty.hidden = shown !== 0;

      if (push) {
        var q = new URLSearchParams();
        if (state.cat !== 'all') q.set('c', state.cat);
        if (state.sort !== 'featured') q.set('s', state.sort);
        var url = location.pathname + (q.toString() ? '?' + q : '');
        history.replaceState(null, '', url);
      }
    }

    $$('[data-filter]').forEach(function (btn) {
      on(btn, 'click', function () {
        var s = readState(); s.cat = btn.getAttribute('data-filter'); apply(s, true);
      });
    });
    on(sortSel, 'change', function () {
      var s = readState(); s.sort = sortSel.value; apply(s, true);
    });
    apply(readState(), false);
  }

  /* -------------------------------------------------------------- lightbox */
  var lightbox = $('[data-lightbox]');
  if (lightbox) {
    var lbImg = $('img', lightbox);
    var lastFocus = null;

    function openLb(src, alt) {
      if (!src) return;
      lastFocus = document.activeElement;
      lbImg.src = src; lbImg.alt = alt || '';
      lightbox.setAttribute('data-open', 'true');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      var c = $('[data-lightbox-close]', lightbox); if (c) c.focus();
    }
    function closeLb() {
      lightbox.setAttribute('data-open', 'false');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }
    $$('[data-zoom]').forEach(function (b) {
      on(b, 'click', function () { openLb(b.getAttribute('data-zoom'), b.getAttribute('data-zoom-alt')); });
    });
    on($('[data-lightbox-close]', lightbox), 'click', closeLb);
    on(lightbox, 'click', function (e) { if (e.target === lightbox) closeLb(); });
    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && lightbox.getAttribute('data-open') === 'true') closeLb();
    });
  }

  /* -------------------------------------------------------- artwork gallery */
  var mainShot = $('[data-main-shot]');
  if (mainShot) {
    $$('[data-thumb]').forEach(function (btn) {
      on(btn, 'click', function () {
        var src = btn.getAttribute('data-thumb');
        var img = $('img', btn);
        mainShot.src = src;
        if (img) mainShot.alt = img.alt;
        $$('[data-thumb]').forEach(function (b) { b.setAttribute('aria-current', String(b === btn)); });
        var zoom = $('[data-zoom]');
        if (zoom) zoom.setAttribute('data-zoom', src);
      });
    });
  }

  /* -------------------------------------------------------------- share */
  $$('[data-share]').forEach(function (btn) {
    on(btn, 'click', function () {
      var url = location.href;
      var title = document.title;
      if (navigator.share) {
        navigator.share({ title: title, url: url }).catch(function () {});
        return;
      }
      var done = function () {
        var prev = btn.getAttribute('aria-label');
        btn.setAttribute('aria-label', t.linkCopied || 'Link copied');
        var note = $('[data-share-note]');
        if (note) { note.hidden = false; setTimeout(function () { note.hidden = true; }, 2400); }
        setTimeout(function () { btn.setAttribute('aria-label', prev); }, 2400);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () {});
    });
  });

  /* ------------------------------------------------------------ contact form */
  var form = $('[data-contact-form]');
  if (form) {
    var status = $('[data-form-status]', form);
    var submit = $('[data-form-submit]', form);
    var submitLabel = submit ? submit.textContent : '';

    var validators = {
      name: function (v) { return v.trim().length >= 2; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); },
      message: function (v) { return v.trim().length >= 5; }
    };

    function validateField(input) {
      var key = input.getAttribute('data-validate');
      if (!key || !validators[key]) return true;
      var ok = validators[key](input.value);
      var wrap = input.closest('.field');
      if (wrap) wrap.setAttribute('data-invalid', String(!ok));
      input.setAttribute('aria-invalid', String(!ok));
      return ok;
    }

    $$('[data-validate]', form).forEach(function (input) {
      on(input, 'blur', function () { validateField(input); });
      on(input, 'input', function () {
        var wrap = input.closest('.field');
        if (wrap && wrap.getAttribute('data-invalid') === 'true') validateField(input);
      });
    });

    var counterEl = $('[data-char-count]', form);
    var messageEl = $('[name="message"]', form);
    if (counterEl && messageEl) {
      var max = messageEl.getAttribute('maxlength') || 1000;
      var updateCount = function () { counterEl.textContent = messageEl.value.length + ' / ' + max; };
      on(messageEl, 'input', updateCount); updateCount();
    }

    on(form, 'submit', function (e) {
      e.preventDefault();
      var ok = true;
      $$('[data-validate]', form).forEach(function (i) { if (!validateField(i)) ok = false; });
      if (!ok) { var bad = $('[aria-invalid="true"]', form); if (bad) bad.focus(); return; }

      var honey = $('[name="botcheck"]', form);
      if (honey && honey.value) return;  // silent drop

      var key = form.getAttribute('data-access-key') || '';
      if (!key || key.indexOf('YOUR-') === 0) {
        showStatus('error', t.errorTitle || 'Not configured',
          'Web3Forms access key is missing — add it to site.config.json.');
        return;
      }

      if (submit) { submit.disabled = true; submit.textContent = t.sending || 'Sending…'; }
      var data = new FormData(form);

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data
      })
        .then(function (r) { return r.json(); })
        .then(function (json) {
          if (json && json.success) {
            showStatus('success', t.successTitle || 'Thank you.', t.successBody || '');
            form.reset();
            if (counterEl && messageEl) counterEl.textContent = '0 / ' + (messageEl.getAttribute('maxlength') || 1000);
          } else {
            showStatus('error', t.errorTitle || 'That did not go through.', t.errorBody || '');
          }
        })
        .catch(function () {
          showStatus('error', t.errorTitle || 'That did not go through.', t.errorBody || '');
        })
        .then(function () {
          if (submit) { submit.disabled = false; submit.textContent = submitLabel; }
        });
    });

    function showStatus(state, title, body) {
      if (!status) return;
      status.setAttribute('data-state', state);
      status.innerHTML = '';
      var h = document.createElement('p');
      h.className = 'h4'; h.textContent = title;
      status.appendChild(h);
      if (body) {
        var p = document.createElement('p');
        p.className = 'body-sm mt-xs'; p.textContent = body;
        status.appendChild(p);
      }
      status.setAttribute('role', 'status');
      status.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /* ------------------------------------------------- newsletter (same endpoint) */
  var news = $('[data-newsletter]');
  if (news) {
    on(news, 'submit', function (e) {
      e.preventDefault();
      var input = $('input[type="email"]', news);
      var note = $('[data-newsletter-note]', news);
      if (!input || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())) {
        if (note) { note.hidden = false; note.textContent = t.errEmail || 'Check the email address.'; }
        input && input.focus();
        return;
      }
      var key = news.getAttribute('data-access-key') || '';
      if (!key || key.indexOf('YOUR-') === 0) {
        if (note) { note.hidden = false; note.textContent = 'Web3Forms key missing.'; }
        return;
      }
      var data = new FormData(news);
      fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { Accept: 'application/json' }, body: data
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (note) {
          note.hidden = false;
          note.textContent = j && j.success ? (t.successTitle || 'Thank you.') : (t.errorTitle || 'Try again.');
        }
        if (j && j.success) news.reset();
      }).catch(function () {
        if (note) { note.hidden = false; note.textContent = t.errorTitle || 'Try again.'; }
      });
    });
  }

  /* ------------------------------------------------------- year in footer */
  /* Scoped to its own attribute: [data-year] also lives on gallery cards,
     and writing textContent there would wipe their markup. */
  $$('[data-copyright-year]').forEach(function (el) {
    el.textContent = el.textContent.replace('{year}', new Date().getFullYear());
  });
})();
