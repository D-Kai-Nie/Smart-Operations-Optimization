(function () {
  setTimeout(function () {
    var m = location.search.match(/tab=([^&]*)/);
    var t = m ? m[1] : 'supplier';
    window.APP.projectState.tab = t;
    if (t === 'asset' && /dispose=1/.test(location.search)) window.APP.projectState.assetDoc = 'dispose';
    window.APP.render();
    window.scrollTo(0, 0);
  }, 500);
})();
