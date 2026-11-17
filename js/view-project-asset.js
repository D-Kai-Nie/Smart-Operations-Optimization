/* 项目驾驶舱 › 资产页签（由 view-project.js 拆分） */
(function (D) {
  'use strict';
  const S = D.projectShared;
  const esc = D.esc;
  const PS = S.PS, PJ_ROWS = S.PJ_ROWS, PJ_ASSET_MIX = S.PJ_ASSET_MIX;
  const section = S.section;
  const pjFilter = S.pjFilter, pjListBlock = S.pjListBlock, pjPager = S.pjPager;
  const pjScopeRows = S.pjScopeRows, pjFilterRows = S.pjFilterRows, pjPageRows = S.pjPageRows, pjAggTop = S.pjAggTop;
  const P_COL = S.P_COL, P_NUM = S.P_NUM, P_DOC = S.P_DOC;
  const PJ_ATRANS_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    P_COL('transferCode', '资产调拨单号', 160, { sticky2: true, render: P_DOC('assetTransfer') }),
    P_COL('assetCode', '资产编号', 150), P_COL('batchCode', '批次编号', 160),
    P_COL('desc', '资产描述', 220), P_COL('brand', '品牌', 100),
    P_COL('otherAttr', '其他采购属性', 120), P_COL('assetStatus', '资产状态', 110),
    P_COL('attr', '资产属性', 110), P_COL('category', '资产类别', 130),
    P_COL('fromOrgType', '发起单位类型', 120),
    P_COL('outOrg', '调出公司', 180), P_COL('outImpl', '调出项目实施单位', 200), P_COL('outProject', '调出项目', 220),
    P_COL('inOrg', '调入公司', 180), P_COL('inImpl', '调入项目实施单位', 200), P_COL('inProject', '调入项目', 220),
    P_NUM('applyQty', '调出申请数量', 130), P_NUM('outQty', '调出发货数量', 130),
    P_NUM('priceNoTax', '调拨不含税单价', 140), P_NUM('origPriceNoTax', '原值不含税单价', 140),
    P_NUM('amtNoTax', '调拨总额(不含税)', 150), P_NUM('origAmt', '原值总额(不含税)', 150),
    P_NUM('taxRate', '税率', 90), P_COL('location', '存放地点', 150)
  ];
  const PJ_ATRANS_DEF = ['idx', 'transferCode', 'assetCode', 'desc', 'assetStatus', 'outOrg', 'outProject',
    'inOrg', 'inProject', 'applyQty', 'outQty', 'amtNoTax'];

  /* 资产处置（列表字段选择-资源+资产 state2） */
  const PJ_ADISP_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    P_COL('disposeCode', '资产处置单号', 160, { sticky2: true, render: P_DOC('assetDispose') }),
    P_COL('assetCode', '资产编号', 150), P_COL('batchCode', '批次编号', 160),
    P_COL('desc', '资产描述', 220), P_COL('brand', '品牌', 100),
    P_COL('otherAttr', '其他采购属性', 120), P_COL('assetStatus', '资产状态', 110),
    P_COL('attr', '资产属性', 110), P_COL('category', '资产类别', 130),
    P_NUM('actualQty', '实有数量', 110), P_NUM('turnedTimes', '已周转次数', 120),
    P_COL('condition', '达处置条件', 120), P_NUM('origAmt', '原值(万元)', 120),
    P_NUM('disposeQty', '处置数量', 110), P_NUM('usedYears', '已使用年限', 120),
    P_COL('countType', '计数类型', 110), P_NUM('residual', '残值(万元)', 120),
    P_COL('keeper', '保管信息', 180), P_COL('keeperUser', '保管人', 100),
    P_NUM('netAmt', '净值(万元)', 120)
  ];
  const PJ_ADISP_DEF = ['idx', 'disposeCode', 'assetCode', 'desc', 'assetStatus', 'attr', 'category',
    'actualQty', 'disposeQty', 'usedYears', 'origAmt', 'netAmt'];

  /* ---------- 筛选控件（与数据报表页同构件：真下拉 / 真日期，不是静态文字） ---------- */

  const PJ_ASSET_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    P_COL('assetCode', '资产编码', 150, { sticky2: true, link: true }),
    P_COL('desc', '资产描述', 170), P_COL('attr', '资产属性', 100), P_COL('brand', '资产品牌', 100),
    P_COL('sourceOrg', '来源单位', 130), P_COL('category', '资产类别', 130),
    P_COL('subCategory', '资产二级类别', 130), P_COL('sourceType', '来源类型', 100),
    P_COL('location', '存放地点', 130), P_COL('implOrg', '实施单位', 130),
    P_NUM('assetAmt', '资产总额(万元)', 140), P_COL('keeper', '保管单位', 130), P_COL('user', '使用人', 90),
    P_NUM('assetCount', '资产总数', 110), P_COL('origCode', '原资产编码', 140),
    P_NUM('usingCount', '在用数量', 100), P_NUM('scrapCount', '报废数量', 100),
    P_NUM('idleCount', '闲置数量', 100), P_NUM('repairCount', '维保数量', 100),
    P_COL('acceptStatus', '是否验收', 110), P_COL('invStatus', '是否盘点', 110),
    P_COL('transferType', '是否调拨', 110), P_NUM('disposeAmt', '是否处置', 120),
    P_NUM('buyAmt', '资产购置金额(万元)', 160), P_NUM('depAmt', '调拨摊销折旧金额(万元)', 190),
    P_COL('op', '操作', 100, { render: function (v, row) {
      return '<span class="dsc-table__link" data-asset-doc="' + esc(row.assetCode) + '">查看单据</span>';
    } })
  ];
  const PJ_ASSET_DEF = ['idx', 'assetCode', 'category', 'desc', 'location', 'keeper',
    'assetAmt', 'assetCount', 'acceptStatus', 'invStatus', 'op'];

  /* ============================================================
     关联单据弹窗（Axure《项目驾驶舱》里的 7 个联动弹窗：
       引用订单 / 领料关联对账单 / 退货关联结算 / 总结算 /
       资产台账-是否验收·是否盘点·是否调拨·是否处置）
     ============================================================ */

  function assetTurnoverSection(p) {
    const assetRows = pjScopeRows(D.genAssetRows(8), p).map(function (r, i) {
      const rate = r.assetCount ? D.round(r.usingCount / r.assetCount * 100, 2) : 0;
      return {
        assetCode: r.assetCode, desc: r.desc, category: r.category,
        buyAmt: D.round(r.buyAmt, 2), inAmt: D.round(r.assetAmt * 0.2, 2),
        outAmt: D.round(r.disposeAmt, 2), rate: rate
      };
    });
    return section('资产周转情况',
      '<div class="dsc-card"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">资产类别周转率</div>' +
      '<div class="dsc-card__extra">按物料类别占用原值占比　·　周转率口径见 PRD Q-08（待确认）</div></div>' +
      '<div class="dsc-split dsc-split--2-3 pj-assetsplit">' +
      '<div class="dsc-card__body"><div class="pj-assetmix">' +
      '<div class="dsc-chart" id="pjAssetMix" style="height:220px"></div>' +
      '<div class="pj-assetmix__legend">' + PJ_ASSET_MIX.map(function (x) {
        return '<div class="pj-assetmix__item"><i style="background:' + x.color + '"></i>' +
          '<span>' + esc(x.name) + '</span><b>' + D.fmtNum(x.value, 2) + '%</b></div>';
      }).join('') + '</div></div></div>' +
      '<div class="dsc-card__body">' +
      '<div class="dsc-subhead"><span class="dsc-subhead__title">全资产明细数据</span>' +
      '<span class="dsc-subhead__extra">资产采购 / 调入 / 调出 / 周转率</span></div>' +
      D.table({
        cols: [
          { key: 'idx', name: '序号', width: 56, sticky: true },
          { key: 'assetCode', name: '资产编码', width: 140, sticky2: true },
          { key: 'desc', name: '资产描述', width: 120 },
          { key: 'category', name: '资产类别', width: 110 },
          { key: 'buyAmt', name: '资产采购金额(万元)', width: 140, num: true },
          { key: 'inAmt', name: '项目调入资产金额(万元)', width: 150, num: true },
          { key: 'outAmt', name: '项目调出资产金额(万元)', width: 150, num: true },
          { key: 'rate', name: '资产周转率', width: 100, pct: true }
        ], rows: assetRows.map(function (r, k) { return Object.assign({ idx: k + 1 }, r); }), maxHeight: 260
      }) + '</div></div></div>');
  }

  function assetTab(p) {
    const rowsAll = pjScopeRows(D.genAssetRows(30), p);
    PJ_ROWS['pj-asset'] = rowsAll;
    const rows = pjFilterRows('pj-asset', rowsAll);
    const view = pjPageRows('pj-asset', rows);
    const cols = D.colsOf('pj-asset', PJ_ASSET_COLS, PJ_ASSET_DEF);
    const atRows = pjScopeRows(D.genAssetTransferRows(), p);
    const docTab = PS.assetDoc === 'dispose' ? 'dispose' : 'transfer';
    const docBar = '<div class="dsc-tabs dsc-tabs--pill u-mb-lg" data-pjadjust>' +
      [['transfer', '资产调拨'], ['dispose', '资产处置']].map(function (d) {
        return '<div class="dsc-tabs__item' + (docTab === d[0] ? ' dsc-tabs__item--active' : '') +
          '" data-pdoc="' + d[0] + '">' + d[1] + '</div>';
      }).join('') + '</div>';
    const docBlock = docTab === 'transfer'
      ? pjListBlock({ title: '资产调拨台账', key: 'pj-atrans', rows: atRows, last: true,
        tip: '调拨总额 / 原值总额 双口径',
        fields: [['资产调拨单'], ['资产编号'], ['调出公司'], ['调入公司']],
        more: [['调出项目'], ['调出项目实施单位'], ['调入项目'], ['调入项目实施单位'], ['资产属性'],
          ['资产类别'], ['资产状态'], ['调拨申请时间'], ['调拨完成时间']],
        /* 排名单位是万元，源字段 amtNoTax 是元（表格列不标单位），需先换算 */
        rank: { title: '调出单位金额排名TOP8',
          rows: pjAggTop(atRows.map(function (r) {
            return Object.assign({}, r, { amtWan: D.round((r.amtNoTax || 0) / 1e4, 2) });
          }), 'amtWan', 8, 'outOrg'), unit: '万元', digits: 0 } })
      : pjListBlock({ title: '资产处置台账', key: 'pj-adisp', rows: pjScopeRows(D.genAssetDisposeRows(), p), last: true,
        tip: '达处置条件的资产方可发起处置',
        fields: [['资产处置单'], ['资产编号'], ['资产状态'], ['达处置条件']],
        more: [['资产属性'], ['资产类别'], ['品牌'], ['其他采购属性'], ['存放地点'], ['保管人'],
          ['处置日期']] });
    /* 区块名与 Axure《项目驾驶舱 › 资产页签》的区块标题（fs=20）逐字对齐：
       资产周转情况 → 资产调拨与处置 → 资产台账全数据 */
    return assetTurnoverSection(p) +
      section('资产调拨与处置', docBar + docBlock) +
      section('资产台账全数据',
        pjFilter([['资产状态'], ['资产属性'], ['资产类别'], ['存放地点']],
          [['保管单位'], ['使用人'], ['是否验收'], ['是否盘点'], ['是否调拨'], ['是否处置']],
          undefined, 'pj-asset') +
        '<div class="dsc-card"><div class="dsc-card__header">' +
        '<div class="dsc-card__title">资产台账</div>' +
        '<div class="dsc-card__extra">在用 / 闲置 / 报废 / 维保 四状态可穿透' +
        D.colGear('data-pj-cols="pj-asset"', '设置列：资产台账全数据（Axure 列表字段选择-资源+资产）') + '</div></div>' +
        D.table({
          cols: cols, rows: view.rows.map(function (r, i) { return Object.assign({ idx: view.start + i + 1 }, r); }),
          maxHeight: 460, foot: pjPager('pj-asset', view)
        }) + (rows.length ? '' : '<div class="dsc-table__footnote">没有符合筛选条件的记录，请调整条件后重新查询</div>') +
        '</div>');
  }


  D.projectLists['pj-asset'] = { cols: PJ_ASSET_COLS, def: PJ_ASSET_DEF, title: '资产台账全数据' };
  D.projectLists['pj-atrans'] = { cols: PJ_ATRANS_COLS, def: PJ_ATRANS_DEF, title: '资产调拨台账' };
  D.projectLists['pj-adisp'] = { cols: PJ_ADISP_COLS, def: PJ_ADISP_DEF, title: '资产处置台账' };
  D.projectTabs.asset = assetTab;
})(window.APP);
