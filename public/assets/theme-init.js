/* Start every document in dark mode before stylesheets and images paint. */
(function () {
  var root = document.documentElement;
  root.setAttribute('data-theme', 'dark');
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#100F0D');
})();
