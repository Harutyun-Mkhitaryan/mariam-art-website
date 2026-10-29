/* Language-aware static entry route. Links remain available without JavaScript. */
(function () {
  var root = document.documentElement;
  var supported = (root.getAttribute('data-locales') || '').split(',').filter(Boolean);
  var fallback = root.getAttribute('data-default-locale') || 'en';
  var base = (root.getAttribute('data-base') || '').replace(/\/$/, '');
  var saved = null;

  try { saved = localStorage.getItem('ma-lang'); } catch (error) { /* private mode */ }

  var choice = supported.indexOf(saved) !== -1 ? saved : null;
  if (!choice) {
    var languages = navigator.languages || [navigator.language || fallback];
    for (var i = 0; i < languages.length && !choice; i++) {
      var code = String(languages[i]).slice(0, 2).toLowerCase();
      if (supported.indexOf(code) !== -1) choice = code;
    }
  }

  location.replace(base + '/' + (choice || fallback) + '/');
})();
