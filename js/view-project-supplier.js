/* 项目驾驶舱 › 分供商页签（由 view-project.js 拆分） */
(function (D) {
  'use strict';
  const S = D.projectShared;
  const esc = D.esc;
  const PS = S.PS, PJ_ROWS = S.PJ_ROWS;
  const section = S.section;
  const pjFilter = S.pjFilter, pjPager = S.pjPager;
  const pjScopeRows = S.pjScopeRows, pjFilterRows = S.pjFilterRows, pjPageRows = S.pjPageRows, pjAggTop = S.pjAggTop;
  const P_COL = S.P_COL, P_NUM = S.P_NUM, P_DOC = S.P_DOC;
  const PJ_SUP_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    /* P0：分供商名称在行数据里的字段是 name（此前列 key 写成 supplier，整列渲染成「—」） */
    P_COL('name', '分供商', 210, { sticky2: true, link: true }),
    P_COL('cat', '分供商分类', 130), P_COL('grade', '局评价等级', 110),
    P_COL('matBig', '物料大类', 130), P_COL('matMid', '物料中类', 120), P_COL('matSmall', '物料小类', 120),
    P_COL('matCode', '物料编码', 140), P_COL('matDesc', '物料描述', 180),
    P_NUM('contractAmt', '合同金额', 130), P_NUM('perfAmt', '履约金额', 130),
    P_NUM('claimCount', '索赔次数', 110), P_NUM('badReturnCount', '不合格退货次数', 150),
    P_NUM('winAmt', '中标金额', 130), P_NUM('perfRate', '履约率', 100, { pct: true }),
    /* 评价得分是均值型指标：合计行取全部行平均，不随金额求和 */
    P_NUM('score', '评价得分', 100, {
      total: function (rows) {
        return D.round(rows.reduce(function (a, r) { return a + (r.score || 0); }, 0) / (rows.length || 1), 2);
      }
    })
  ];
  /* 资源履约质量表默认列：分供商 → 分类/等级 → 物料三级 → 合同/履约/履约率/评价得分 */
  const PJ_SUP_DEF = ['idx', 'name', 'cat', 'grade', 'matBig', 'matMid', 'matSmall',
    'contractAmt', 'perfAmt', 'perfRate', 'score'];

  /* ============================================================
     物资页签其余列表 / 资产页签调拨·处置
     字段逐项抄自 Axure《项目驾驶舱》的「列表字段选择-物资页签」（8 状态）与
     「列表字段选择-资源+资产」（state1 资产调拨 / state2 资产处置）
     ============================================================ */
  /* state1 结算明细（两级表头：基本信息 / 明细信息） */

  const pjRankCard = S.pjRankCard;
  function pjSupKpis(rows) {
    const sum = function (k) { return rows.reduce(function (a, r) { return a + (r[k] || 0); }, 0); };
    const perf = sum('perfAmt');
    const good = rows.filter(function (r) { return r.grade === '优秀'; })
      .reduce(function (a, r) { return a + r.perfAmt; }, 0);
    const avg = rows.length ? perf / rows.length : 0;
    const rate = perf ? good / perf * 100 : 0;
    const cards = [
      ['分供商履约额', perf, '万元', 0.82],
      ['优质分供商履约额', good, '万元', 0.76],
      ['平均履约额', avg, '万元', 0.88],
      ['优质分供商履约额占比', rate, '%', 0.96]
    ];
    return '<div class="dsc-grid dsc-grid--4 u-mb-lg pj-supkpis">' + cards.map(function (c) {
      return '<div class="dsc-kpi"><div class="dsc-kpi__name">' + esc(c[0]) + '</div>' +
        '<div class="dsc-kpi__value">' + D.fmtNum(c[1], 2) +
        '<span class="dsc-kpi__unit">' + esc(c[2]) + '</span></div>' +
        '<div class="dsc-kpi__foot">上年度 ' + D.fmtNum(c[1] * c[3], 2) + ' ' + esc(c[2]) + '</div></div>';
    }).join('') + '</div>';
  }
  function pjConversion(rows) {
    const names = {};
    rows.forEach(function (r) { if (r.name) names[r.name] = 1; });
    const win = Object.keys(names).length || rows.length || 1;
    const sign = Math.max(1, Math.round(win * 0.78));
    const perf = Math.max(1, Math.round(sign * 0.72));
    const steps = [['中标分供商', win], ['签约分供商', sign], ['履约分供商', perf]];
    const rates = [sign / win, perf / sign];
    return '<div class="pj-conv">' + steps.map(function (s, i) {
      return '<div class="pj-conv__step"><span>' + esc(s[0]) + '</span><b>' + s[1] + ' 个</b></div>' +
        '<div class="pj-conv__bar"><i style="width:' + Math.max(6, Math.round(s[1] / win * 100)) + '%"></i></div>' +
        (i < rates.length ? '<div class="pj-conv__rate">转化率 ' + D.fmtNum(rates[i] * 100, 1) + '%</div>' : '');
    }).join('') + '</div>';
  }
  function pjSupplierDist(rows) {
    const m = {};
    (rows || []).forEach(function (r) { m[r.cat] = (m[r.cat] || 0) + r.perfAmt; });
    return Object.keys(m).map(function (k) { return { name: k, value: D.round(m[k], 2) }; })
      .sort(function (a, b) { return b.value - a.value; });
  }
  /* 分供商数据原本是「单位级」量级（履约额几十亿），落到单个项目必须压到项目采购规模：
     履约额合计 = 项目总采购金额 × 0.9，四类金额同比例缩放，履约率/得分不受影响 */
  function pjScaleSupplier(rows, purchase) {
    const sum = rows.reduce(function (a, r) { return a + (r.perfAmt || 0); }, 0) || 1;
    const k = (purchase || 4000) * 0.9 / sum;
    return rows.map(function (r) {
      return Object.assign({}, r, {
        contractAmt: D.round(r.contractAmt * k, 2), perfAmt: D.round(r.perfAmt * k, 2),
        payAmt: D.round(r.payAmt * k, 2), winAmt: D.round(r.winAmt * k, 2)
      });
    });
  }
  function supplierTab(p) {
    const rowsAll = pjScaleSupplier(pjScopeRows(D.genSupplierRows(30), p), p.purchase);
    PS.supDist = pjSupplierDist(rowsAll);
    PJ_ROWS['pj-supplier'] = rowsAll;
    const rows = pjFilterRows('pj-supplier', rowsAll);
    const view = pjPageRows('pj-supplier', rows);
    const cols = D.colsOf('pj-supplier', PJ_SUP_COLS, PJ_SUP_DEF);
    /* 合计行：金额列求和；履约率 / 评价得分等均值列由列上的 total 策略处理 */
    const tot = D.totalOf(cols, rows);
    return section('分供商履约',
      pjSupKpis(rowsAll) +
      '<div class="pj-ranks u-mb-lg">' +
      pjRankCard('分供商供货次数排名TOP10', pjAggTop(rowsAll, 'winCount'), '次', 0) +
      pjRankCard('分供商结算金额排名TOP10', pjAggTop(rowsAll, 'perfAmt'), '万元', 0) +
      pjRankCard('分供商支付金额排名TOP10', pjAggTop(rowsAll, 'payAmt'), '万元', 0) +
      '</div>' +
      '<div class="dsc-split dsc-split--2 u-mb-lg">' +
      '<div class="dsc-card"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">分供商中标签约转化</div>' +
      '<div class="dsc-card__extra">中标 → 签约 → 履约</div></div>' +
      '<div class="dsc-card__body">' + pjConversion(rowsAll) + '</div></div>' +
      '<div class="dsc-card"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">分供商履约分布</div>' +
      '<div class="dsc-card__extra">按分供商分类 · 履约额（万元）</div></div>' +
      '<div class="dsc-card__body"><div class="dsc-chart" id="pjSupDist" style="height:220px"></div></div></div>' +
      '</div>' +
      pjFilter([['分供商'], ['分供商分类'], ['局评价等级'], ['物料大类']],
        [['物料中类'], ['物料小类'], ['物料编码'], ['项目名称']], undefined, 'pj-supplier') +
      '<div class="dsc-card"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">资源履约质量表</div>' +
      '<div class="dsc-card__extra">' +
      D.colGear('data-pj-cols="pj-supplier"', '设置列：资源履约质量表（Axure 列表字段选择-资源+资产）') + '</div></div>' +
      D.table({
        cols: cols, rows: view.rows.map(function (r, i) { return Object.assign({ idx: view.start + i + 1 }, r); }),
        maxHeight: 460, totalRow: tot, foot: pjPager('pj-supplier', view)
      }) + (rows.length ? '' : '<div class="dsc-table__footnote">没有符合筛选条件的记录，请调整条件后重新查询</div>') +
      '</div>');
  }

  /* 资产台账全数据（Axure 列表字段选择-资源+资产 · 全资产明细数据） */

  D.projectLists['pj-supplier'] = { cols: PJ_SUP_COLS, def: PJ_SUP_DEF, title: '分供商履约台账' };
  D.projectTabs.supplier = supplierTab;
})(window.APP);
