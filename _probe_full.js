(function () {
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function q(s) { return document.querySelector(s); }
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function tab(t) { window.APP.projectState.tab = t; window.APP.render(); window.scrollTo(0, 0); }
  setTimeout(function () {
    try {
      var out = {};
      tab('supplier');
      out.sup = {
        kpis: qa('.pj-supkpis .dsc-kpi').map(function (x) { return clean(x.textContent); }),
        ranks: qa('.pj-rank').map(function (x) { return clean(x.querySelector('.pj-rank__title').textContent); }),
        rankRows: qa('.pj-rank__row').length,
        conv: clean((q('.pj-conv') || {}).textContent),
        distChart: !!q('#pjSupDist svg'),
        title: clean((q('.dsc-card__title') || {}).textContent),
        tableCols: qa('.dsc-table thead th').map(clean).slice(0, 14),
        tableRows: qa('.dsc-table tbody tr').length,
        totalRow: !!q('.dsc-table tbody tr.dsc-total-row'),
        totalText: clean((q('.dsc-table tbody tr.dsc-total-row') || {}).textContent),
        pager: !!q('[data-pjf-pager="pj-supplier"]'),
        names: qa('.dsc-table tbody tr').filter(function (tr) { return !tr.classList.contains('dsc-total-row'); }).map(function (tr) { return clean(tr.children[1].textContent); }).slice(0, 3)
      };
      var p2 = q('[data-pjf-pager="pj-supplier"] [data-pg="2"]');
      if (p2) p2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      out.supPage2 = q('[data-pjf-pager="pj-supplier"] .dsc-pager__btn--active') ? clean(q('[data-pjf-pager="pj-supplier"] .dsc-pager__btn--active').textContent) : '?';
      out.supRows2 = qa('.dsc-table tbody tr').length;
      tab('material');
      out.mat = {
        planChart: !!q('#pjPlanMix svg'),
        planTable: qa('.dsc-table')[0] ? qa('.dsc-table')[0].querySelectorAll('tbody tr').length : 0,
        pickCharts: !!q('#pjPickMid svg') && !!q('#pjPickSmall svg'),
        ranks: qa('.pj-listsplit__rank .pj-rank__title').map(clean),
        pagers: qa('[data-pjf-pager]').length,
        tables: qa('.dsc-table').length
      };
      tab('asset');
      out.asset = {
        mixChart: !!q('#pjAssetMix svg'),
        assetRows: qa('.dsc-table')[0] ? qa('.dsc-table')[0].querySelectorAll('tbody tr').length : 0,
        adjustTabs: qa('[data-pjadjust] [data-pdoc]').map(clean),
        visibleDoc: clean((q('.dsc-card__title') || {}).textContent),
        rank: clean((q('.pj-listsplit__rank .pj-rank__title') || {}).textContent),
        ledgerTitle: qa('.dsc-card__title').map(clean),
        ledgerPager: !!q('[data-pjf-pager="pj-asset"]')
      };
      var pdoc = q('[data-pjadjust] [data-pdoc="dispose"]');
      if (pdoc) pdoc.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      out.assetDispose = { title: clean((q('.dsc-card__title') || {}).textContent), gear: !!q('[data-pj-cols="pj-adisp"]') };
      document.title = 'PROBE ' + JSON.stringify(out);
    } catch (e) { document.title = 'PROBE-ERR ' + e.message + ' @ ' + (e.stack || '').slice(0, 120); }
  }, 1200);
})();
