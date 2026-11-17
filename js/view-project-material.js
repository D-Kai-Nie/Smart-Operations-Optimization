/* 项目驾驶舱 › 物资页签（由 view-project.js 拆分） */
(function (D) {
  'use strict';
  const S = D.projectShared;
  const esc = D.esc;
  const PS = S.PS, PJ_ROWS = S.PJ_ROWS, PJ_PLAN_MIX = S.PJ_PLAN_MIX;
  const section = S.section, subHead = S.subHead;
  const pjFilter = S.pjFilter, pjListBlock = S.pjListBlock, pjPager = S.pjPager;
  const pjScopeRows = S.pjScopeRows, pjFilterRows = S.pjFilterRows, pjPageRows = S.pjPageRows, pjAggTop = S.pjAggTop;
  const P_COL = S.P_COL, P_NUM = S.P_NUM, P_DOC = S.P_DOC;
  const PJ_PLAN_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    P_COL('planCode', '计划单号', 150, { sticky2: true, link: true }),
    P_COL('planMonth', '计划月份', 110),
    P_COL('matBig', '物料大类', 130), P_COL('matMid', '物料中类', 120), P_COL('matSmall', '物料小类', 120),
    P_COL('matCode', '物料编码', 140), P_COL('matDesc', '物料描述', 170), P_COL('unit', '计量单位', 90),
    P_NUM('qty', '计划数量', 110), P_NUM('checkQty', '盘点数量', 110),
    P_COL('autoPlan', '是否生成日常计划', 150),
    P_COL('part', '计划使用部位', 130), P_COL('pickUnit', '领用单位', 130),
    P_COL('madeDate', '编制日期', 120), P_COL('maker', '编制人', 100),
    P_COL('needDate', '需用时间', 120), P_COL('status', '状态', 100),
    P_COL('quoted', '是否引用', 100, { render: function (v) {
      return '<span class="dsc-table__link" data-plan-ref>' + esc(v) + '</span>';
    } })
  ];
  const PJ_PLAN_DEF = ['idx', 'planCode', 'planMonth', 'matBig', 'matMid', 'matSmall', 'matCode', 'matDesc',
    'unit', 'qty', 'checkQty', 'autoPlan', 'part', 'pickUnit', 'madeDate', 'maker', 'needDate', 'status', 'quoted'];

  /* 收验货 / 收料 / 领料 / 退货台账 */
  const PJ_ACCEPT_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    P_COL('acceptCode', '收验货单号', 150, { sticky2: true, link: true }),
    P_COL('deliverCode', '发货单号', 150, { link: true }), P_COL('receiveCode', '收料单号', 150, { link: true }),
    P_COL('pickCode', '领料单号', 150, { link: true }), P_COL('orderCode', '订单编号', 150, { link: true }),
    P_COL('settleCode', '结算单号', 150, { link: true }),
    P_COL('supplier', '分供商名称', 200),
    P_COL('matBig', '物料大类', 130), P_COL('matMid', '物料中类', 120), P_COL('matSmall', '物料小类', 120),
    P_COL('matDesc', '物料描述', 170), P_COL('brand', '品牌', 90),
    P_COL('bizType', '业务类型', 110), P_COL('attr', '其他采购属性', 120),
    P_COL('unit', '计量单位', 90),
    P_NUM('qty', '数量', 100), P_NUM('acceptQty', '验收数量', 110), P_NUM('pickQty', '领用数量', 110),
    P_COL('part', '使用部位', 120), P_COL('level1', '一级库', 130),
    P_COL('owner', '责任人', 90), P_COL('isRecon', '是否对账', 100),
    P_COL('settleMonth', '结算月份', 110), P_COL('settleCycle', '结算周期', 110),
    P_COL('detailType', '结算明细类型', 120),
    P_COL('date', '日期', 110), P_COL('status', '状态', 100)
  ];
  const PJ_ACCEPT_DEF = ['idx', 'acceptCode', 'deliverCode', 'receiveCode', 'pickCode', 'orderCode', 'settleCode',
    'supplier', 'matSmall', 'unit', 'qty', 'acceptQty', 'pickQty', 'date', 'status'];

  /* 分供商履约 */

  const PJ_SETTLE_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    P_COL('acceptCode', '验收单号', 150, { sticky2: true, render: P_DOC('accept'), group: '基本信息' }),
    P_COL('settleCode', '结算单号', 160, { render: P_DOC('settle'), group: '基本信息' }),
    P_COL('settleCycle', '结算周期', 110, { group: '基本信息' }),
    P_COL('detailType', '结算明细类型', 130, { group: '基本信息' }),
    P_COL('docCode', '单据编号', 140, { group: '基本信息' }),
    P_COL('date', '日期', 110, { group: '基本信息' }),
    P_COL('settleStatus', '结算单状态', 110, { group: '基本信息' }),
    P_COL('settleMonth', '结算月份', 110, { group: '基本信息' }),
    P_COL('matBig', '物料大类', 130, { group: '明细信息' }),
    P_COL('matMid', '物料中类', 140, { group: '明细信息' }),
    P_COL('matSmall', '物料小类', 120, { group: '明细信息' }),
    P_COL('matCode', '物料编码', 130, { group: '明细信息' }),
    P_COL('matDesc', '物料描述', 200, { group: '明细信息' }),
    P_NUM('qty', '数量', 100, { group: '明细信息' }),
    P_COL('unit', '计量单位', 90, { group: '明细信息' }),
    P_NUM('priceTax', '含税单价', 110, { group: '明细信息' }),
    P_NUM('amtTax', '含税金额', 120, { group: '明细信息' }),
    P_NUM('taxRate', '税率', 90, { group: '明细信息' }),
    P_NUM('priceNoTax', '不含税单价', 120, { group: '明细信息' }),
    P_NUM('amtNoTax', '不含税金额', 130, { group: '明细信息' }),
    P_NUM('taxAmt', '税额', 110, { group: '明细信息' }),
    P_COL('contractCode', '合同单号', 150, { render: P_DOC('contract'), group: '明细信息' }),
    P_COL('orderCode', '订单编号', 140, { render: P_DOC('order'), group: '明细信息' }),
    P_COL('deliverCode', '发货单号', 140, { render: P_DOC('deliver'), group: '明细信息' }),
    P_COL('pickCode', '领料单号', 140, { render: P_DOC('pick'), group: '明细信息' }),
    P_COL('receiveCode', '收料单号', 140, { render: P_DOC('receive'), group: '明细信息' }),
    P_COL('settleType', '结算单类型', 110, { group: '明细信息' })
  ];
  const PJ_SETTLE_DEF = ['idx', 'acceptCode', 'settleCode', 'settleMonth', 'settleStatus', 'matBig', 'matMid',
    'matSmall', 'matDesc', 'qty', 'unit', 'priceTax', 'amtTax'];

  /* state2 领料 */
  const PJ_PICK_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    P_COL('pickCode', '领料单号', 160, { sticky2: true, render: P_DOC('recon') }),
    P_COL('pickUnit', '领用单位', 190), P_COL('level1', '一级库', 130), P_COL('owner', '责任人', 100),
    P_COL('matBig', '物料大类', 130), P_COL('matMid', '物料中类', 140), P_COL('matSmall', '物料小类', 120),
    P_COL('matDesc', '物料描述', 200), P_COL('brand', '品牌', 100),
    P_COL('bizType', '业务类型', 110), P_COL('unit', '计量单位', 90),
    P_COL('otherAttr', '其他采购属性', 120), P_COL('part', '使用部位', 120),
    P_NUM('qty', '领用数量', 110), P_NUM('acceptQty', '验收数量', 110),
    P_COL('isRecon', '是否对账', 110, { render: P_DOC('recon') })
  ];
  const PJ_PICK_DEF = ['idx', 'pickCode', 'pickUnit', 'level1', 'matBig', 'matMid', 'matSmall', 'matDesc',
    'unit', 'qty', 'acceptQty', 'isRecon'];

  /* state3 退货 */
  const PJ_RETURN_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    P_COL('returnCode', '退货单号', 160, { sticky2: true, render: P_DOC('returnSettle') }),
    P_COL('supplier', '分供商名称', 220),
    P_COL('matBig', '物料大类', 130), P_COL('matMid', '物料中类', 140), P_COL('matSmall', '物料小类', 120),
    P_COL('matDesc', '物料描述', 200), P_COL('unit', '计量单位', 90),
    P_NUM('qty', '退货数量', 110),
    P_COL('receiveCode', '关联收货单号', 150, { render: P_DOC('receive') }),
    P_NUM('returnAmt', '退货金额', 120), P_NUM('receiveQty', '收货数量', 110), P_NUM('returnPrice', '退货单价', 110),
    P_COL('isSettled', '是否结算', 110, { render: P_DOC('returnSettle') }), P_COL('returnType', '退货类型', 130)
  ];
  const PJ_RETURN_DEF = ['idx', 'returnCode', 'supplier', 'matBig', 'matMid', 'matSmall', 'matDesc', 'unit',
    'qty', 'returnAmt', 'returnType', 'isSettled'];

  /* state4 盘点 */
  const PJ_INV_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    P_COL('invCode', '盘点方案编号', 160, { sticky2: true, render: P_DOC('inv') }),
    P_COL('implOrg', '实施单位', 190), P_COL('invType', '盘点类型', 110), P_COL('scope', '盘点范围', 130),
    P_COL('warehouse', '库房名称', 130), P_COL('supplier', '分供商名称', 200),
    P_COL('matBig', '物料大类', 130), P_COL('matMid', '物料中类', 140), P_COL('matSmall', '物料小类', 120),
    P_COL('matDesc', '物料描述', 200), P_COL('brand', '品牌', 100),
    P_NUM('bookQty', '账面数量', 110), P_COL('otherAttr', '其他采购属性', 120), P_COL('unit', '计量单位', 90)
  ];
  const PJ_INV_DEF = ['idx', 'invCode', 'implOrg', 'invType', 'scope', 'warehouse', 'matBig', 'matMid',
    'matSmall', 'matDesc', 'unit', 'bookQty'];

  /* state5 调拨 */
  const PJ_TRANSFER_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    P_COL('transferCode', '调拨单号', 160, { sticky2: true, render: P_DOC('transfer') }),
    P_COL('transferType', '调拨类型', 110),
    P_COL('outOrg', '调出公司', 190), P_COL('outImpl', '调出项目实施单位', 200),
    P_COL('outProject', '调出项目', 220), P_COL('inOrg', '调入公司', 190),
    P_COL('inImpl', '调入项目实施单位', 200), P_COL('inProject', '调入项目', 220),
    P_COL('matBig', '物料大类', 130), P_COL('matMid', '物料中类', 140), P_COL('matSmall', '物料小类', 120),
    P_COL('matDesc', '物料描述', 200), P_COL('brand', '品牌', 100), P_COL('unit', '计量单位', 90),
    P_NUM('applyQty', '申请数量', 110), P_NUM('outQty', '调出发货数量', 130), P_NUM('inQty', '调入验收数量', 130),
    P_NUM('priceNoTax', '不含税单价', 120), P_NUM('amtNoTax', '不含税金额', 120), P_NUM('taxRate', '税率', 90),
    P_NUM('amtTax', '含税金额', 120), P_COL('fromOrgType', '发起单位类型', 120),
    P_COL('contractCode', '调拨合同号', 160)
  ];
  const PJ_TRANSFER_DEF = ['idx', 'transferCode', 'transferType', 'outOrg', 'outProject', 'inOrg', 'inProject',
    'matBig', 'matMid', 'matSmall', 'matDesc', 'unit', 'applyQty', 'inQty'];

  /* state6/7 闲置废旧物资处理 */
  const PJ_SCRAP_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    P_COL('applyCode', '处理申请编号', 160, { sticky2: true, render: P_DOC('scrap') }),
    P_COL('assetCode', '资产编号', 150, { render: P_DOC('asset') }), P_COL('batchCode', '批次编码', 160),
    P_COL('scrapType', '废宝类型', 110),
    P_COL('matBig', '物料大类', 130), P_COL('matMid', '物料中类', 140), P_COL('matSmall', '物料小类', 120),
    P_COL('matDesc', '物料描述', 200), P_COL('unit', '计量单位', 90),
    P_NUM('qty', '处理数量', 110), P_NUM('amt', '销售金额', 120),
    P_COL('way', '处理方式', 110), P_NUM('price', '销售单价', 120),
    P_COL('buyer', '收购方', 180), P_COL('date', '处理时间', 120),
    P_NUM('estQty', '暂估数量', 110), P_COL('handler', '处理人', 100)
  ];
  const PJ_SCRAP_DEF = ['idx', 'applyCode', 'scrapType', 'matBig', 'matMid', 'matSmall', 'matDesc', 'unit',
    'qty', 'way', 'amt', 'buyer', 'date', 'handler'];

  /* 资产调拨（列表字段选择-资源+资产 state1） */

  function pjPlanMixTable() {
    const total = PJ_PLAN_MIX.reduce(function (a, x) { return a + x[1]; }, 0);
    const rows = PJ_PLAN_MIX.map(function (x, i) {
      return { idx: i + 1, name: x[0], amt: x[1], cAmt: D.round(x[1] * x[2] / 100, 2),
        pct: D.round(x[1] / total * 100, 2), cRate: x[2] };
    });
    return D.table({ cols: [
      { key: 'idx', name: '序号', width: 56 },
      { key: 'name', name: '物料小类', width: 130 },
      { key: 'amt', name: '总采购金额(万元)', width: 150, num: true },
      { key: 'cAmt', name: '集中采购金额(万元)', width: 160, num: true },
      { key: 'pct', name: '占比', width: 100, pct: true },
      { key: 'cRate', name: '集中采购率', width: 120, pct: true }
    ], rows: rows, maxHeight: 320 });
  }
  /* 物资验收：按物料大类统计验收单数量（笔） */
  function pjAcceptDist() {
    const rows = D.genAcceptRows();
    const m = {};
    rows.forEach(function (r) { m[r.matBig] = (m[r.matBig] || 0) + 1; });
    return Object.keys(m).map(function (k) { return { name: k, value: m[k] }; })
      .sort(function (a, b) { return b.value - a.value; });
  }
  /* 物资使用：按物料中类 / 小类汇总领用金额（万元） */
  function pjPickDist(key) {
    const rows = D.genPickRows();
    const m = {};
    rows.forEach(function (r) {
      const k = r[key];
      if (!k) return;
      m[k] = (m[k] || 0) + (r.amtTax || 0);
    });
    return Object.keys(m).map(function (k) { return { name: k, value: D.round(m[k] / 1e4, 2) }; })
      .sort(function (a, b) { return b.value - a.value; }).slice(0, 8);
  }

  function materialTab(p) {
    /* 列表数据统一按当前项目收口（组织 / 项目字段改写，见 pjScopeRows） */
    const plansAll = pjScopeRows(D.genPlanRows(PS.planKind), p);
    PJ_ROWS['pj-plan'] = plansAll;
    const plans = pjFilterRows('pj-plan', plansAll);
    const planView = pjPageRows('pj-plan', plans);
    const planCols = D.colsOf('pj-plan', PJ_PLAN_COLS, PJ_PLAN_DEF);
    const pickRows = pjScopeRows(D.genPickRows(), p), returnRows = D.genReturnRows(),
      invRows = pjScopeRows(D.genInventoryRows(), p), transferRows = pjScopeRows(D.genTransferRows(), p),
      scrapRows = D.genScrapRows();
    /* 区块名与 Axure《项目驾驶舱 › 物资页签》的区块标题（fs=20）逐字对齐：
       物资计划情况 → 物资验收情况 → 物资使用情况 → 项目结算情况 */
    return section('物资计划情况',
      '<div class="dsc-card u-mb-lg"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">物料小类计划占比情况</div>' +
      '<div class="dsc-card__extra">计划金额（万元）· 7 个物料小类</div></div>' +
      '<div class="dsc-split dsc-split--2-3">' +
      '<div class="dsc-card__body"><div class="dsc-chart" id="pjPlanMix" style="height:240px"></div></div>' +
      '<div class="dsc-card__body">' + pjPlanMixTable() + '</div></div></div>' +
      pjFilter([['计划月份'], ['物料大类'], ['物料中类'], ['物料小类']],
        [['月度需用计划号'], ['物料描述'], ['计划使用部位'], ['领用单位'], ['领料单号'], ['编制人'],
          ['一级库'], ['项目名称']],
        undefined, 'pj-plan') +
      '<div class="dsc-card u-mb-lg">' +
      '<div class="dsc-card__header"><div class="dsc-card__title">需用计划列表</div>' +
      '<div class="dsc-card__extra"><span class="dsc-tabs dsc-tabs--pill" style="margin:0" data-plankind>' +
      [['month', '月度计划'], ['day', '日常计划']].map(function (k) {
        return '<div class="dsc-tabs__item' + (PS.planKind === k[0] ? ' dsc-tabs__item--active' : '') +
          '" data-pk="' + k[0] + '">' + k[1] + '</div>';
      }).join('') + '</span>' +
      D.colGear('data-pj-cols="pj-plan"', '设置列：需用计划列表（Axure 列表字段选择-物资页签）') + '</div></div>' +
      D.table({
        cols: planCols,
        rows: planView.rows.map(function (r, i) { return Object.assign({ idx: planView.start + i + 1 }, r); }),
        maxHeight: 420, foot: pjPager('pj-plan', planView)
      }) + (plans.length ? '' : '<div class="dsc-table__footnote">没有符合筛选条件的记录，请调整条件后重新查询</div>') +
      '</div>') +
      section('物资验收情况',
        '<div class="dsc-card u-mb-lg"><div class="dsc-card__header">' +
        '<div class="dsc-card__title">物资验收单分布</div>' +
        '<div class="dsc-card__extra">按物料大类 · 验收单数量（笔）</div></div>' +
        '<div class="dsc-card__body"><div class="dsc-chart" id="pjAcceptDist" style="height:220px"></div></div></div>' +
        pjListBlock({ title: '物资验收列表', key: 'pj-accept', rows: pjScopeRows(D.genAcceptRows(), p), last: true,
          tip: '收验货 → 收料单据链路',
          fields: [['结算月份'], ['结算周期'], ['结算明细类型'], ['分供商名称']],
          more: [['物料大类'], ['物料中类'], ['物料小类'], ['一级库'], ['责任人'], ['是否对账']] })) +
      section('物资使用情况',
        '<div class="dsc-card u-mb-lg"><div class="dsc-card__header">' +
        '<div class="dsc-card__title">物料领用金额分布</div>' +
        '<div class="dsc-card__extra">按物料中类 / 小类 · 领用金额（万元）</div></div>' +
        '<div class="dsc-split dsc-split--2">' +
        '<div class="dsc-card__body">' + subHead('物料中类领用金额') +
        '<div class="dsc-chart" id="pjPickMid" style="height:220px"></div></div>' +
        '<div class="dsc-card__body">' + subHead('物料小类领用金额') +
        '<div class="dsc-chart" id="pjPickSmall" style="height:220px"></div></div></div></div>' +
        pjListBlock({ title: '物资领料列表', key: 'pj-pick', rows: pickRows,
          tip: '点击领料单号查看关联对账单',
          fields: [['领料单号'], ['领用单位'], ['物料大类'], ['物料中类'], ['物料小类']],
          more: [['一级库'], ['使用部位'], ['责任人'], ['对账单号']],
          rank: { title: '领用单位数量排名TOP8', rows: pjAggTop(pickRows, 'qty', 8, 'pickUnit'), unit: '', digits: 0 } }) +
        pjListBlock({ title: '物资退货列表', key: 'pj-return', rows: returnRows,
          tip: '点击退货单号 / 是否结算查看关联结算单',
          fields: [['退货单号'], ['退货类型'], ['物料大类'], ['物料小类']],
          more: [['收货单号'], ['物料中类'], ['分供商名称'], ['合同'], ['结算单'], ['退货日期']] }) +
        pjListBlock({ title: '物资盘点列表', key: 'pj-inv', rows: invRows,
          tip: '点击盘点方案编号查看盘点单',
          rank: { title: '库房盘点数量TOP8', rows: pjAggTop(invRows, 'bookQty', 8, 'warehouse'), unit: '', digits: 0 },
          fields: [['盘点单号'], ['实施单位'], ['盘点类型'], ['物料大类'], ['物料小类']],
          more: [['盘点范围'], ['物料中类'], ['供应商'], ['库房名称'], ['合同'], ['订单编号'], ['发货单号'],
            ['收料单号'], ['领料单号']] }) +
        pjListBlock({ title: '物资调拨台账', key: 'pj-transfer', rows: transferRows,
          tip: '调入 / 调出双视角',
          rank: { title: '调出单位申请数量TOP8', rows: pjAggTop(transferRows, 'applyQty', 8, 'outOrg'), unit: '', digits: 0 },
          fields: [['调拨单号'], ['调拨类型'], ['调出公司'], ['调入公司'], ['物料小类']],
          more: [['调出项目'], ['调入项目'], ['调出项目实施单位'], ['调入项目实施单位'],
            ['物料大类'], ['物料中类'], ['物料描述'], ['发起单位类型']] }) +
        pjListBlock({ title: '闲置废旧物资处理台账', key: 'pj-scrap', rows: scrapRows, last: true,
          tip: '处理方式：销售 / 销毁',
          fields: [['处理方案编号'], ['处理方式'], ['收购方'], ['废宝类型']],
          more: [['处理记录编号'], ['处理人'], ['供应商'], ['物料大类'], ['物料中类'], ['物料小类'],
            ['处理日期']] })) +
      section('项目结算情况',
        pjListBlock({ title: '项目结算明细列表', key: 'pj-settle', rows: pjScopeRows(D.genSettleRows(30), p), last: true,
          tip: '物料大类 → 中类 → 小类三级可下钻',
          fields: [['结算单'], ['供应商'], ['物料大类'], ['物料小类']],
          more: [['合同'], ['物料中类'], ['合同签订日期'], ['结算日期'], ['是否办理总结算'], ['结算单状态']],
          height: 420 }));
  }

  /* 分供商页签：KPI / TOP10 / 中标签约转化 / 履约分布 / 资源履约质量表（对齐 Axure） */

  D.projectLists['pj-plan'] = { cols: PJ_PLAN_COLS, def: PJ_PLAN_DEF, title: '需用计划列表' };
  D.projectLists['pj-accept'] = { cols: PJ_ACCEPT_COLS, def: PJ_ACCEPT_DEF, title: '物资验收列表' };
  D.projectLists['pj-pick'] = { cols: PJ_PICK_COLS, def: PJ_PICK_DEF, title: '物资领料列表' };
  D.projectLists['pj-return'] = { cols: PJ_RETURN_COLS, def: PJ_RETURN_DEF, title: '物资退货列表' };
  D.projectLists['pj-inv'] = { cols: PJ_INV_COLS, def: PJ_INV_DEF, title: '物资盘点列表' };
  D.projectLists['pj-transfer'] = { cols: PJ_TRANSFER_COLS, def: PJ_TRANSFER_DEF, title: '物资调拨台账' };
  D.projectLists['pj-scrap'] = { cols: PJ_SCRAP_COLS, def: PJ_SCRAP_DEF, title: '闲置废旧物资处理台账' };
  D.projectLists['pj-settle'] = { cols: PJ_SETTLE_COLS, def: PJ_SETTLE_DEF, title: '项目结算明细列表' };
  D.projectShared.pjAcceptDist = pjAcceptDist;
  D.projectShared.pjPickDist = pjPickDist;
  D.projectTabs.material = materialTab;
})(window.APP);
