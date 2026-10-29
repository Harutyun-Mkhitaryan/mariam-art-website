/* Restore the visitor's theme before stylesheets and images paint. */
(function () {
  var root = document.documentElement;
  var theme = 'dark';
  try {
    var saved = localStorage.getItem('mariam-art-theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch (e) {}
  root.setAttribute('data-theme', theme);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F7F2E9' : '#100F0D');
})();
