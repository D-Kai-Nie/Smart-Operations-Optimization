/* ============================================================
   F3 项目驾驶舱（PRD F3.1–F3.7）
   版式对齐 Axure 导出稿（长滚动看板）：
   项目选择器 → 采购 / 物资 / 分供商 / 资产 页签 → 项目核心指标
   → 招采分析（计划状态分布 / 物料分类分布 / 发起-响应-评审-成交）
   → 合同分析（合同数量与总额 + 合同明细分析）
   → 履约分析（大/中/小分类集采情况 + 核心物料结算平均价格）
   ============================================================ */
(function (D) {
  'use strict';
  const esc = D.esc;

  const PS = {
    tab: 'purchase',                 // 采购 / 物资 / 分供商 / 资产
    planKind: 'month',
    matBig: '', matMid: '', matSmall: '',
    settleView: 'chart',
    contractPage: 1                  // 合同明细分析当前页
  };
  D.projectState = PS;

  const TABS = [['purchase', '采购'], ['material', '物资'], ['supplier', '分供商'], ['asset', '资产']];

  /* ============================================================
     各列表的动态字段（Axure《项目驾驶舱》三个「列表字段选择」面板逐项抄录）
       · 列表字段选择-合同明细（77 项，与采购报表明细同一套）
       · 列表字段选择-物资页签（需用计划 / 结算明细 / 领料 / 退货 / 盘点 / 调拨 / 闲废）
       · 列表字段选择-资源+资产（分供商履约 / 资产调拨 / 资产处置 / 全资产明细）
     ============================================================ */
  const P_COL = function (k, n, w, o) { return Object.assign({ key: k, name: n, width: w || 130 }, o || {}); };
  const P_NUM = function (k, n, w, o) { return P_COL(k, n, w, Object.assign({ num: true }, o || {})); };
  /* 关联单据链接单元格（点击打开 Axure 的各类关联单据弹窗） */
  const P_DOC = function (kind) {
    return function (v) {
      if (v == null || v === '' || v === '—') return '—';
      return '<span class="dsc-table__link" data-pj-doc="' + esc(kind) + '|' + esc(v) + '">' + esc(v) + '</span>';
    };
  };

  /* 物资需用计划 */
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
  const PJ_SUP_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    P_COL('supplier', '分供商', 210, { sticky2: true, link: true }),
    P_COL('cat', '分供商分类', 130), P_COL('grade', '局评价等级', 110),
    P_COL('matBig', '物料大类', 130), P_COL('matMid', '物料中类', 120), P_COL('matSmall', '物料小类', 120),
    P_COL('matCode', '物料编码', 140), P_COL('matDesc', '物料描述', 180),
    P_NUM('contractAmt', '合同金额', 130), P_NUM('perfAmt', '履约金额', 130),
    P_NUM('claimCount', '索赔次数', 110), P_NUM('badReturnCount', '不合格退货次数', 150),
    P_NUM('winAmt', '中标金额', 130), P_NUM('perfRate', '履约率', 100), P_NUM('score', '评价得分', 100)
  ];
  const PJ_SUP_DEF = ['idx', 'supplier', 'cat', 'grade', 'contractAmt', 'perfAmt', 'claimCount', 'badReturnCount'];

  /* ============================================================
     物资页签其余列表 / 资产页签调拨·处置
     字段逐项抄自 Axure《项目驾驶舱》的「列表字段选择-物资页签」（8 状态）与
     「列表字段选择-资源+资产」（state1 资产调拨 / state2 资产处置）
     ============================================================ */
  /* state1 结算明细（两级表头：基本信息 / 明细信息） */
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
  function sel(label, options, ph) {
    return '<select class="dsc-field" data-pj-field="' + esc(label) + '"><option value="">' +
      esc(ph || '请选择') + '</option>' + (options || []).map(function (o) {
        return '<option value="' + esc(o) + '">' + esc(o) + '</option>';
      }).join('') + '</select>';
  }
  function dateInputs(label) {
    return '<input class="dsc-field" type="date" data-pj-field="' + esc(label) + '" value="' +
      esc(D.defaultRange[0]) + '"/><span class="dsc-daterange__sep">~</span>' +
      '<input class="dsc-field" type="date" data-pj-field="' + esc(label) + '结束" value="' +
      esc(D.defaultRange[1]) + '"/>';
  }

  const GRAIN_CARET = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round"><path d="M4 6.5l4 4 4-4"/></svg>';

  /* ---------- 项目（R1：按权限过滤） ---------- */
  function scopedProjects() {
    if (D.scope.level === 1) return D.projects;
    const subs = D.subOrgsByParent[D.scope.name] || [];
    const names = subs.map(function (s) { return s.name; });
    return D.projects.filter(function (x) {
      return x.org === D.scope.name || names.indexOf(x.subOrg) >= 0;
    });
  }

  function curProject(q) {
    const pool = scopedProjects();
    let p = null;
    if (q.project) p = pool.filter(function (x) { return x.name === q.project; })[0];
    if (!p && q.pcode) p = pool.filter(function (x) { return x.code === q.pcode; })[0];
    return p || pool[0] || D.projects[0];
  }

  function section(title, body) {
    return '<section class="project-cockpit-section">' +
      '<div class="dsc-section-head"><h2 class="dsc-section-head__title">' + esc(title) + '</h2></div>' +
      body + '</section>';
  }

  function subHead(title, extra) {
    return '<div class="dsc-subhead"><span class="dsc-subhead__title">' + esc(title) + '</span>' +
      (extra ? '<span class="dsc-subhead__extra">' + extra + '</span>' : '') + '</div>';
  }

  function stat(label, value, unit, digits) {
    return '<div class="dsc-stat"><div class="dsc-stat__label">' + esc(label) + '</div>' +
      '<div class="dsc-stat__value">' + (digits === 0 ? D.fmtInt(value) : D.fmtNum(value, digits == null ? 2 : digits)) +
      '<span class="dsc-stat__unit">' + esc(unit) + '</span></div></div>';
  }

  /* ---------- 项目选择条（右上「项目 [选择器]」，切换即锁定项目） ---------- */
  function projectBar(p) {
    const pool = scopedProjects();
    return '<div class="pj-bar">' +
      '<span class="pj-bar__label">项目</span>' +
      '<select class="pj-select" data-pj-picker>' + pool.map(function (x) {
        return '<option value="' + esc(x.name) + '"' + (x.name === p.name ? ' selected' : '') + '>' +
          esc(x.name) + '</option>';
      }).join('') + '</select>' +
      '</div>';
  }

  /* ---------- 项目信息：定位地图 + 信息栅格 ---------- */
  function projectInfo(p) {
    const info = [
      ['项目类型', p.type], ['承包模式', p.mode],
      ['所属区域', '中国 / ' + p.area + ' / ' + p.city], ['实施单位', (p.subOrg || p.org) + ''],
      ['物资人员配置', '2 人'], ['总包合同金额', D.fmtNum(p.amount, 2) + ' 万元'],
      ['合同开竣工日期', '2026-03-01 ~ 2026-12-31'], ['项目状态', p.status]
    ];
    return '<div class="pj-info">' +
      '<div class="pj-info__map"><div class="dsc-chart" id="pjMiniMap" style="height:100%"></div></div>' +
      '<div class="pj-info__grid">' + info.map(function (kv) {
        return '<div class="pj-info__item"><span class="pj-info__label">' + esc(kv[0]) + '：</span>' +
          '<span class="pj-info__value">' + esc(kv[1]) + '</span></div>';
      }).join('') + '</div>' +
      '</div>';
  }

  /* ---------- 项目核心指标带（截图：7 项 + 公司/全局均值对比） ---------- */
  const KPI_GLYPH = '<svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12.5V8M6.2 12.5V3.5M9.8 12.5V9.5M13.5 12.5V5.5"/></svg>';

  function projMetrics(p) {
    const i = Math.max(0, D.projects.indexOf(p));
    const rnd = D.seedRand(4200 + i * 17);
    const r = function (a, b) { return D.round(a + rnd() * (b - a), 2); };
    /* desc/src 供口径气泡使用（AC9）；未明确的口径标注"待确认"，不臆造 */
    return [
      { name: '总采购金额', value: D.round(p.purchase, 2), unit: '万元',
        note: '总采购金额增加云筑产值单数据纳入计算',
        desc: '项目全周期采购金额合计（含云筑产值单纳入部分）', src: '物资系统 + 招采系统' },
      { name: '集中采购率', value: r(0, 12), unit: '%', company: r(60, 88), global: r(55, 80),
        desc: '项目集中采购金额 ÷ 项目采购总金额 × 100%', src: '物资系统' },
      { name: '履约支付率', value: r(0, 4), unit: '%', company: r(58, 80), global: r(50, 70),
        desc: '按合同实际支付金额 ÷ 按合同应支付金额 × 100%', src: '物资系统 + 财务' },
      { name: '厂家直采率', value: r(55, 92), unit: '%', company: r(62, 86), global: r(48, 68),
        desc: '厂家直采金额 ÷ 采购总金额 × 100%', src: '物资系统' },
      { name: '资产周转率', value: r(0, 6), unit: '%', company: r(48, 68), global: r(44, 62),
        desc: '项目周转材料周转次数折算，口径待确认（Q-08）', src: '物管系统资产模块' },
      { name: '物资设备采购效益率', value: D.round(-520 + rnd() * 80, 2), unit: '%', company: r(9, 16), global: r(11, 19),
        desc: '物资设备采购效益额 ÷ 物资设备采购金额 × 100%（效益额口径待确认 Q-07）', src: '物资系统' },
      { name: '采购成本降低率', value: r(0, 5), unit: '%', company: r(5, 11), global: r(14, 24),
        desc: '采购成本降低额 ÷ 不含税标准成本金额 × 100%', src: '招采系统 + 物资系统' }
    ];
  }

  function metricStrip(p) {
    return '<div class="pj-metrics">' + projMetrics(p).map(function (m) {
      const avg = function (label, v) {
        return '<div class="pj-metric__avg"><span>' + esc(label) + '：</span>' +
          '<b>' + D.fmtNum(v, 2) + '</b> %</div>';
      };
      return '<div class="pj-metric" data-pj-metric="' + esc(m.name) + '">' +
        '<div class="pj-metric__head"><span class="pj-metric__icon">' + KPI_GLYPH + '</span>' +
        '<span class="pj-metric__name">' + esc(m.name) + '</span></div>' +
        '<div class="pj-metric__value">' + D.fmtNum(m.value, 2) + '<span>' + esc(m.unit) + '</span></div>' +
        (m.note ? '<div class="pj-metric__note">' + esc(m.note) + '</div>' : '') +
        (m.company != null ? avg('25年公司均值', m.company) + avg('25年全局均值', m.global) : '') +
        '</div>';
    }).join('') + '</div>';
  }

  /* ---------- 页签条（位于指标带下方，对齐截图） ---------- */
  function tabBar() {
    return '<div class="dsc-tabs project-cockpit-page__tab-bar" data-pj-tab>' + TABS.map(function (t) {
      return '<div class="dsc-tabs__item' + (PS.tab === t[0] ? ' dsc-tabs__item--active' : '') +
        '" data-tab="' + t[0] + '">' + esc(t[1]) + '</div>';
    }).join('') + '</div>';
  }

  /* ---------- 招采分析 ---------- */
  const STATUS_DIST = [['已完成', 4], ['已下达', 5], ['编制中', 2], ['已关闭', 1], ['待下达', 3], ['待审批', 2], ['已作废', 0]];

  function procSection(p) {
    const matDist = D.material.mid.map(function (m, i) {
      return { name: m, value: D.round(45.16 - i * 5.2, 2) };
    }).sort(function (a, b) { return b.value - a.value; });
    return section('招采分析',
      '<div class="dsc-card u-mb-lg"><div class="dsc-card__body">' +
      '  <div class="ck-filter pj-proc-filter"><div class="ck-filter__row">' +
      '    <div class="ck-filter__item"><span class="ck-filter__label">招标开始日期</span>' +
      '      <span class="ck-grain" data-pj-grain>日' + GRAIN_CARET + '</span>' +
      '      <span class="ck-field ck-field--date">' + esc(D.defaultRange[0]) + ' ~ 结束时间</span></div>' +
      '    ' + D.ckField('采购类别', '') +
      '    ' + D.ckField('采购方式', '') +
      '    ' + D.ckField('采购模式', '') +
      '  </div>' +
      '  <div class="ck-filter__foot"><span class="ck-filter__hint" hidden></span>' +
      '  <span class="ck-filter__foot-right">' +
      '    <button class="ck-btn ck-btn--primary" data-pj-query>查询</button>' +
      '    <button class="ck-link" data-pj-clear>清空</button>' +
      '    <button class="ck-link" data-pj-reset>重置</button>' +
      '  </span></div>' +
      '  </div>' +
      '  <div class="dsc-split dsc-split--2">' +
      '    <div>' + subHead('项目采购计划状态分布') +
      '      <div class="dsc-chart" id="pjPlanStatus" style="height:200px"></div></div>' +
      '    <div>' + subHead('项目采购计划物料分类分布') +
      '      <div class="dsc-chart" id="pjPlanMat" style="height:200px"></div></div>' +
      '  </div>' +
      '  <div class="dsc-subhead u-mt-xl"><span class="dsc-subhead__title">采购发起 → 响应 → 评审 → 成交</span>' +
      '    <span class="dsc-subhead__extra">本项目全过程</span></div>' +
      '  <div class="cockpit-proc">' + [
        ['采购发起', [['招标笔数', 46, '笔'], ['计划金额', 1382.6, '万元']]],
        ['采购响应', [['投标单位数', 132, '家'], ['响应率', 92.4, '%']]],
        ['采购评审', [['在线评标率', 96.8, '%'], ['平均评标时长', 6.2, '天']]],
        ['采购成交', [['成交笔数', 41, '笔'], ['平均招采时效', 25.1, '天']]]
      ].map(function (s) {
        return '<div class="cockpit-proc__col"><div class="dsc-subhead__title u-mb-md">' + esc(s[0]) + '</div>' +
          s[1].map(function (kv) {
            return '<div class="cockpit-proc__kv"><span>' + esc(kv[0]) + '</span><b>' +
              D.fmtNum(kv[1], kv[1] % 1 === 0 ? 0 : 1) + '<i>' + esc(kv[2]) + '</i></b></div>';
          }).join('') + '</div>';
      }).join('') + '</div>' +
      '</div></div>');
  }

  /* ---------- 合同分析 ---------- */
  /* 合同明细分析的动态列：与「采购报表 › 明细」同一套 70+ 字段（Axure 列表字段选择-合同明细） */
  const PJ_CONTRACT_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    P_COL('code', '合同编号', 160, { sticky2: true, link: true }),
    P_COL('name', '合同名称', 260),
    P_COL('category', '合同分类', 110), P_COL('type', '合同类型', 130), P_COL('tpl', '合同模板', 150),
    P_COL('status', '合同状态', 100), P_COL('source', '合同来源', 100),
    P_COL('sourceCode', '来源单号', 140, { link: true }), P_COL('owner', '使用主体', 190),
    P_COL('dept', '合同承办部门', 140), P_COL('partyA', '甲方', 180), P_COL('partyB', '乙方', 200),
    P_COL('belong', '所属机构', 130), P_COL('area', '项目区域', 100), P_COL('addr', '项目所在地址', 160),
    P_COL('signDate', '合同签订日期', 130), P_COL('reconDate', '对账日期', 110),
    P_COL('trade', '国际贸易条款', 120), P_COL('transport', '运输条款', 110), P_COL('settleCycle', '结算周期', 110),
    P_COL('creator', '创建人', 90), P_COL('agent', '经办人', 90), P_COL('isStandard', '是否制式', 100),
    P_COL('rowType', '物料行类型', 110), P_COL('matBig', '物料大类', 130), P_COL('matMid', '物料中类', 120),
    P_COL('matSmall', '物料小类', 120), P_COL('matCode', '物料编码', 140), P_COL('matDesc', '物料描述', 170),
    P_COL('brand', '品牌名称', 100), P_COL('otherAttr', '其他采购属性', 130),
    P_NUM('qty', '数量', 100), P_COL('unit', '计量单位', 90), P_COL('priceType', '价格类型', 100),
    P_COL('floatType', '浮动价浮动类型', 130), P_COL('floatLink', '浮动价确价环节', 130),
    P_COL('floatSys', '浮动价外部系统', 130), P_COL('floatArea', '浮动价外部区域', 130),
    P_COL('floatTime', '浮动价时间标准', 130), P_NUM('floatVal', '浮动值(不含税)', 130),
    P_NUM('floatPct', '浮动比例', 110), P_NUM('estPrice', '暂估价(不含税)', 130),
    P_NUM('priceTax', '含税单价', 110), P_NUM('amtTax', '含税金额', 120), P_NUM('taxRate', '税率', 80),
    P_NUM('priceNoTax', '不含税单价', 110), P_NUM('amtNoTax', '不含税金额', 120), P_NUM('taxAmt', '税额', 100),
    P_NUM('inPriceTax', '收入价含税单价', 130), P_NUM('inAmtTax', '收入价含税金额', 130),
    P_NUM('inTaxRate', '收入价税率', 110), P_NUM('inPriceNoTax', '收入价不含税单价', 140),
    P_NUM('inAmtNoTax', '收入价不含税金额', 140),
    P_NUM('costPriceTax', '成本价含税单价', 130), P_NUM('costAmtTax', '成本价含税金额', 130),
    P_NUM('costTaxRate', '成本价税率', 110), P_NUM('costPriceNoTax', '成本价不含税单价', 140),
    P_NUM('costAmtNoTax', '成本价不含税金额', 140),
    P_NUM('orderAmt', '下单金额', 120), P_NUM('orderPct', '下单比例', 100),
    P_NUM('acceptAmt', '验收金额', 120), P_NUM('acceptPct', '验收比例', 100),
    P_NUM('settleAmt', '结算金额', 120), P_NUM('settlePct', '结算比例', 100),
    P_NUM('payPct', '付款比例', 100), P_NUM('shouldPay', '合同应支付金额', 140),
    P_NUM('paidAmt', '合同已支付金额', 140), P_NUM('unpaidAmt', '合同累计应付未付金额', 170),
    P_COL('treasuryCode', '司库一体化合同编号', 160)
  ];
  const PJ_CONTRACT_DEF = ['idx', 'code', 'name', 'type', 'status', 'partyB', 'signDate',
    'matSmall', 'qty', 'priceTax', 'amtTax', 'orderAmt', 'settleAmt'];
  /* 设置列分组（Axure：合同信息 / 合同明细信息） */
  const PJ_CONTRACT_GROUPS = function () {
    const basicKeys = ['code', 'name', 'category', 'type', 'tpl', 'status', 'source', 'sourceCode', 'owner',
      'dept', 'partyA', 'partyB', 'belong', 'area', 'addr', 'signDate', 'reconDate', 'trade', 'transport',
      'settleCycle', 'creator', 'agent', 'isStandard'];
    const infoKeys = PJ_CONTRACT_COLS.map(function (c) { return c.key; })
      .filter(function (k) { return k !== 'idx' && basicKeys.indexOf(k) < 0; });
    const pick = function (ks) {
      return ks.map(function (k) { return PJ_CONTRACT_COLS.filter(function (c) { return c.key === k; })[0]; }).filter(Boolean);
    };
    return [{ title: '合同信息', items: pick(basicKeys) }, { title: '合同明细信息', items: pick(infoKeys) }];
  };

  function contractSection(p) {
    /* 生成量放大后再按本项目所属二级单位过滤：46 条原始数据过滤后只剩个位数，
       分页器只有 1 页（等于没有分页）。600 条过滤后可稳定得到 2~4 页 */
    const rows = D.genContractRows(600, function (r) { return r.org2 === p.org; });
    const cols = D.colsOf('pj-contract', PJ_CONTRACT_COLS, PJ_CONTRACT_DEF);
    const size = 10;
    const pages = Math.max(1, Math.ceil(rows.length / size));
    if (PS.contractPage > pages) PS.contractPage = pages;
    const paged = rows.slice((PS.contractPage - 1) * size, (PS.contractPage - 1) * size + size);
    return section('合同分析',
      '<div class="dsc-card u-mb-lg"><div class="dsc-card__body">' +
      '  <div class="project-cockpit-page__kpis">' +
      stat('项目合同数量', rows.length, '个', 0) + stat('项目合同总额', 1164.43, '万元') +
      stat('合同已下单金额', 986.20, '万元') + stat('合同已结算金额', 763.55, '万元') +
      '  </div>' +
      '  <div class="dsc-filter-inline u-mt-lg">' +
      '    <div class="dsc-filter-inline__item"><span class="dsc-filter-inline__label">合同签订日期</span>' +
      '      ' + dateInputs('日期范围') + '</div>' +
      '    <div class="dsc-filter-inline__item"><span class="dsc-filter-inline__label">合同类型</span>' +
      '      <select class="dsc-field" data-pj-field="合同类型"><option value="">请选择合同类型</option>' +
      ['物资采购合同', '设备采购合同', '劳务分包合同', '专业分包合同', '专业服务合同',
        '物资租赁合同', '机械设备租赁合同', '运输类合同', '调拨采购合同', '废旧物资销售合同']
        .map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('') +
      '</select></div>' +
      '    <div class="dsc-filter-inline__item"><span class="dsc-filter-inline__label">乙方</span>' +
      '      <input class="dsc-field" type="text" data-pj-field="乙方" placeholder="请输入乙方名称"/></div>' +
      '  </div>' +
      '</div></div>' +
      '<div class="dsc-card">' +
      '<div class="dsc-card__header"><div class="dsc-card__title">合同明细分析</div>' +
      '<div class="dsc-card__extra">共 ' + rows.length + ' 条　·　' +
      PJ_CONTRACT_COLS.length + ' 个可选字段' +
      D.colGear('data-pj-columns', '设置列：合同明细分析（合同信息 / 合同明细信息，共 ' +
        PJ_CONTRACT_COLS.length + ' 个字段）') + '</div></div>' +
      D.table({
        cols: cols, rows: paged.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }),
        maxHeight: 460, foot: D.pager({ page: PS.contractPage, size: size, total: rows.length })
      }) + '</div>');
  }

  /* ---------- 履约分析 ---------- */
  function fulfillSection(p) {
    const rows = D.genSettlePriceRows();
    return section('履约分析',
      '<div class="dsc-card u-mb-lg"><div class="dsc-card__body">' +
      '  <div class="dsc-filter-inline u-mb-lg">' +
      '    <div class="dsc-filter-inline__item"><span class="dsc-filter-inline__label">结算创建日期</span>' +
      '      ' + dateInputs('日期范围') + '</div>' +
      '    <div class="dsc-filter-inline__item"><span class="dsc-filter-inline__label">物料大分类</span>' +
      sel('物料大分类', D.material.big) + '</div>' +
      '    <div class="dsc-filter-inline__item"><span class="dsc-filter-inline__label">物料中分类</span>' +
      sel('物料中分类', D.material.mid) + '</div>' +
      '    <div class="dsc-filter-inline__item"><span class="dsc-filter-inline__label">物料小分类</span>' +
      sel('物料小分类', D.material.small) + '</div>' +
      '  </div>' +
      '  <div class="project-cockpit-page__kpis">' +
      stat('总采购金额', 164.43, '万元') + stat('集中采购金额', 2.95, '万元') +
      stat('采购签约金额', 1382.60, '万元') + stat('集中采购率', 1.79, '%') +
      '  </div>' +
      '</div></div>' +
      '<div class="cockpit-rank3">' +
      '</div>' +
      '<div class="dsc-split dsc-split--2 u-mb-lg">' +
      '  <div class="dsc-card"><div class="dsc-card__header">' +
      '    <div class="dsc-card__title">物料大分类履约集采情况</div></div>' +
      '    <div class="dsc-card__body"><div class="dsc-chart" id="pjBig" style="height:200px"></div></div></div>' +
      '  <div class="dsc-card"><div class="dsc-card__header">' +
      '    <div class="dsc-card__title">物料中分类履约集采情况</div></div>' +
      '    <div class="dsc-card__body"><div class="dsc-chart" id="pjMid" style="height:200px"></div></div></div>' +
      '</div>' +
      '<div class="dsc-split dsc-split--2">' +
      '  <div class="dsc-card"><div class="dsc-card__header">' +
      '    <div class="dsc-card__title">物料小分类履约集采情况</div>' +
      '    <div class="dsc-card__extra">TOP 10</div></div>' +
      '    <div class="dsc-card__body"><div class="dsc-chart" id="pjSmall" style="height:200px"></div></div></div>' +
      '  <div class="dsc-card"><div class="dsc-card__header">' +
      '    <div class="dsc-card__title">项目核心物料结算平均价格</div></div>' +
      '    <div class="dsc-card__body">' +
      D.table({
        cols: [
          { key: 'idx', name: '序号', width: 56, sticky: true },
          { key: 'name', name: '物料名称', width: 150 },
          { key: 'unit', name: '计量单位', width: 100 },
          { key: 'value', name: '结算平均价格', width: 130, num: true }
        ], rows: rows.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }), maxHeight: 200
      }) + '</div></div>' +
      '</div>');
  }

  /* ---------- 物资 / 分供商 / 资产（页签切换时替换招采分析块） ---------- */
  /* 区块通用查询条件（Axure《项目驾驶舱》各列表上方的查询条件；展开后按钮统一在右下角） */
  function pjFilter(fields, more, adv) {
    /* 默认收起：与 Axure《项目驾驶舱》查询条件的「展开 / 收起」一致（此前一律铺开，
       展开按钮点了也没变化）。adv === false 时不渲染更多条件与展开入口。 */
    return '<div class="ck-filter ck-filter--panel">' +
      '<div class="ck-filter__row">' + fields.map(function (f) { return D.ckField(f[0], f[1] || ''); }).join('') + '</div>' +
      '<div class="ck-filter__more" hidden>' +
      (more || []).map(function (f) { return D.ckField(f[0], f[1] || ''); }).join('') + '</div>' +
      D.ckActions(adv !== false) + '</div>';
  }

  /* 列表区块通用构件：查询条件（Axure 同一套「展开/收起」）→ 卡片头（标题 + 条数 + 设置列齿轮）→ 表格
     pjListBlock：只要区块本体（供一个 section 下挂多个列表）；pjList：区块 + 外层 section */
  function pjList(o) { return section(o.section || o.title, pjListBlock(o)); }
  function pjListBlock(o) {
    return pjFilter(o.fields, o.more) +
      '<div class="dsc-card' + (o.last ? '' : ' u-mb-lg') + '">' +
      '<div class="dsc-card__header"><div class="dsc-card__title">' + esc(o.title) + '</div>' +
      '<div class="dsc-card__extra">' + (o.tip ? esc(o.tip) + '　·　' : '') + '共 ' + o.rows.length + ' 条' +
      D.colGear('data-pj-cols="' + o.key + '"', '设置列：' + o.title + '（Axure 列表字段选择）') +
      '</div></div>' +
      D.table({
        cols: D.colsOf(o.key, PJ_LISTS[o.key].cols, PJ_LISTS[o.key].def),
        rows: o.rows.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }),
        maxHeight: o.height || 360
      }) + '</div>';
  }

  function materialTab(p) {
    const plans = D.genPlanRows(PS.planKind);
    const planCols = D.colsOf('pj-plan', PJ_PLAN_COLS, PJ_PLAN_DEF);
    /* 区块名与 Axure《项目驾驶舱 › 物资页签》的区块标题（fs=20）逐字对齐：
       物资计划情况 → 物资验收情况 → 物资使用情况 → 项目结算情况 */
    return section('物资计划情况',
      pjFilter([['计划月份'], ['月度需用计划号'], ['物料大类'], ['物料中类'], ['物料小类']],
        [['物料描述'], ['计划使用部位'], ['领用单位'], ['领料单号'], ['编制人'], ['一级库'], ['项目名称']]) +
      '<div class="dsc-card u-mb-lg">' +
      '<div class="dsc-card__header"><div class="dsc-card__title">需用计划列表</div>' +
      '<div class="dsc-card__extra"><span class="dsc-tabs dsc-tabs--pill" style="margin:0" data-plankind>' +
      [['month', '月度计划'], ['day', '日常计划']].map(function (k) {
        return '<div class="dsc-tabs__item' + (PS.planKind === k[0] ? ' dsc-tabs__item--active' : '') +
          '" data-pk="' + k[0] + '">' + k[1] + '</div>';
      }).join('') + '</span>' +
      D.colGear('data-pj-cols="pj-plan"', '设置列：需用计划列表（Axure 列表字段选择-物资页签）') + '</div></div>' +
      D.table({
        cols: planCols, rows: plans.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }),
        maxHeight: 420
      }) + '</div>') +
      section('物资验收情况',
        pjListBlock({ title: '物资验收列表', key: 'pj-accept', rows: D.genAcceptRows(), last: true,
          tip: '收验货 → 收料单据链路',
          fields: [['结算月份'], ['结算周期'], ['结算明细类型'], ['分供商名称']],
          more: [['物料大类'], ['物料中类'], ['物料小类'], ['一级库'], ['责任人'], ['是否对账']] })) +
      section('物资使用情况',
        pjListBlock({ title: '物资领料列表', key: 'pj-pick', rows: D.genPickRows(),
          tip: '点击领料单号查看关联对账单',
          fields: [['领料单号'], ['领用单位'], ['一级库'], ['物料大类'], ['物料中类'], ['物料小类'], ['使用部位']],
          more: [['责任人'], ['对账单号']] }) +
        pjListBlock({ title: '物资退货列表', key: 'pj-return', rows: D.genReturnRows(),
          tip: '点击退货单号 / 是否结算查看关联结算单',
          fields: [['退货单号'], ['退货类型'], ['收货单号'], ['物料大类'], ['物料中类'], ['物料小类']],
          more: [['分供商名称'], ['合同'], ['结算单'], ['退货日期']] }) +
        pjListBlock({ title: '物资盘点列表', key: 'pj-inv', rows: D.genInventoryRows(),
          tip: '点击盘点方案编号查看盘点单',
          fields: [['盘点单号'], ['实施单位'], ['盘点类型'], ['盘点范围'], ['物料大类'], ['物料中类'], ['物料小类']],
          more: [['供应商'], ['库房名称'], ['合同'], ['订单编号'], ['发货单号'], ['收料单号'], ['领料单号']] }) +
        pjListBlock({ title: '物资调拨台账', key: 'pj-transfer', rows: D.genTransferRows(),
          tip: '调入 / 调出双视角',
          fields: [['调拨单号'], ['调拨类型'], ['调出公司'], ['调入公司'], ['调出项目'], ['调入项目'],
            ['调出项目实施单位'], ['调入项目实施单位'], ['物料小类']],
          more: [['物料大类'], ['物料中类'], ['物料描述'], ['发起单位类型']] }) +
        pjListBlock({ title: '闲置废旧物资处理台账', key: 'pj-scrap', rows: D.genScrapRows(), last: true,
          tip: '处理方式：销售 / 销毁',
          fields: [['处理方案编号'], ['处理记录编号'], ['处理方式'], ['收购方'], ['处理人'], ['废宝类型']],
          more: [['供应商'], ['物料大类'], ['物料中类'], ['物料小类'], ['处理日期']] })) +
      section('项目结算情况',
        pjListBlock({ title: '项目结算明细列表', key: 'pj-settle', rows: D.genSettleRows(30), last: true,
          tip: '物料大类 → 中类 → 小类三级可下钻',
          fields: [['结算单'], ['合同'], ['供应商'], ['物料大类'], ['物料中类'], ['物料小类']],
          more: [['合同签订日期'], ['结算日期'], ['是否办理总结算'], ['结算单状态']], height: 420 }));
  }

  function supplierTab(p) {
    const rows = D.genSupplierRows(30);
    const cols = D.colsOf('pj-supplier', PJ_SUP_COLS, PJ_SUP_DEF);
    return section('分供商履约',
      pjFilter([['分供商'], ['分供商分类'], ['局评价等级'], ['物料大类']],
        [['物料中类'], ['物料小类'], ['物料编码'], ['项目名称']]) +
      '<div class="dsc-card"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">本项目分供商台账</div>' +
      '<div class="dsc-card__extra">共 ' + rows.length + ' 条' +
      D.colGear('data-pj-cols="pj-supplier"', '设置列：分供商履约台账（Axure 列表字段选择-资源+资产）') + '</div></div>' +
      D.table({
        cols: cols, rows: rows.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }),
        maxHeight: 460
      }) + '</div>');
  }

  /* 资产台账全数据（Axure 列表字段选择-资源+资产 · 全资产明细数据） */
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
  const PJ_DOC_KINDS = {
    recon: { title: '领料关联对账单', hint: '由领料单发起的对账记录，对账后方可进入结算流程。',
      rows: function (c) { return [['对账单号', 'DZ' + c.slice(2)], ['关联领料单号', c], ['对账状态', '已对账'],
        ['对账日期', '2026-03-18'], ['对账人', '李彬 （800120）'], ['差异数量', '0']]; } },
    returnSettle: { title: '退货关联结算单', hint: '退货单冲减原结算单金额，退货数量与结算数量需一致。',
      rows: function (c) { return [['结算单号', 'JS' + c.slice(2)], ['关联退货单号', c], ['结算单状态', '已生效'],
        ['结算月份', '2026-03'], ['冲减金额', '—'], ['结算人', '孙倩 （800236）']]; } },
    pick: { title: '领料单', hint: '领料单由项目物资员在移动端发起，出库后自动回写库存。',
      rows: function (c) { return [['领料单号', c], ['领用单位', '一分公司'], ['一级库', '局本级库'],
        ['责任人', '李彬'], ['领用数量', '86.00'], ['验收数量', '85.14'], ['是否对账', '已对账']]; } },
    receive: { title: '收料单', hint: '收货过磅后生成收料单，作为结算的数量依据。',
      rows: function (c) { return [['收料单号', c], ['业务类型', '采购入库'], ['收料日期', '2026-03-06'],
        ['收料人', '张伟'], ['收料数量', '20 + 已入库'], ['质检结论', '合格']]; } },
    deliver: { title: '发货单', hint: '分供商发货后同步至平台，与收料单按订单编号关联。',
      rows: function (c) { return [['发货单号', c], ['订单编号', 'DD2026000019'], ['分供商', '渝丰科技股份有限公司'],
        ['发货日期', '2026-03-04'], ['车牌号', '皖A·8F216']]; } },
    accept: { title: '验收单', hint: '验收单记录进场验收的数量、质量与随行资料。',
      rows: function (c) { return [['验收单号', c], ['验收状态', '已验收'], ['验收日期', '2026-03-06'],
        ['验收结论', '合格'], ['验收人', '李彬'], ['资料附件', '材质证明 ×1、合格证 ×1']]; } },
    inv: { title: '盘点单', hint: '盘点方案下的盘点记录，盘盈盘亏写入库存调整单。',
      rows: function (c) { return [['盘点方案编号', c], ['盘点类型', '全盘'], ['盘点范围', '全部库房'],
        ['账面数量', '1,200.00'], ['实盘数量', '1,186.00'], ['盘亏数量', '14.00'], ['盘点状态', '已完成']]; } },
    transfer: { title: '调拨单', hint: '调出方发起 → 调入方验收，双方合计口径保持一致。',
      rows: function (c) { return [['调拨单号', c], ['调拨类型', '调出'], ['申请数量', '60.00'],
        ['调出发货数量', '58.80'], ['调入验收数量', '57.60'], ['发起单位类型', '三级单位'], ['调拨状态', '已完成']]; } },
    scrap: { title: '闲废物资处理单', hint: '经审批后的废旧物资方可销售或销毁。',
      rows: function (c) { return [['处理申请编号', c], ['废宝类型', '废钢筋'], ['处理方式', '销售'],
        ['处理数量', '12.00'], ['销售单价', '1,200.00'], ['收购方', '废宝回收有限公司'], ['处理人', '李彬']]; } },
    assetTransfer: { title: '资产调拨单', hint: '资产调拨同时结转原值、已摊折旧与净值。',
      rows: function (c) { return [['资产调拨单号', c], ['资产状态', '在用'], ['调出公司', '中国建筑第八工程局有限公司'],
        ['调入公司', '第四建设有限公司'], ['调拨总额（不含税）', '—'], ['调拨状态', '已完成']]; } },
    assetDispose: { title: '资产处置单', hint: '达到处置条件的资产（闲置 / 报废）方可发起处置审批。',
      rows: function (c) { return [['资产处置单号', c], ['达处置条件', '已达到'], ['处置数量', '—'],
        ['原值（万元）', '—'], ['净值（万元）', '—'], ['处置状态', '已处置']]; } },
    settle: { title: '结算单', hint: '结算单按结算周期汇总验收数量与金额，生效后进入付款流程。',
      rows: function (c) { return [['结算单号', c], ['结算单状态', '已生效'], ['结算月份', '2026-03'],
        ['结算周期', '月结30天'], ['结算明细类型', '正常结算'], ['含税金额', '—'], ['结算人', '孙倩 （800236）']]; } },
    order: { title: '采购订单', hint: '订单由采购计划或需用计划生成，是下单比例指标的取数来源。',
      rows: function (c) { return [['订单编号', c], ['合同编号', 'HT-2025000013'], ['下单日期', '2026-03-02'],
        ['供应商', '渝丰科技股份有限公司'], ['订单金额（万元）', '—'], ['订单状态', '已生效']]; } },
    contract: { title: '采购合同', hint: '合同明细可在「采购页签 › 合同分析」查看全量字段。',
      rows: function (c) { return [['合同编号', c], ['合同状态', '已生效'], ['合同签订日期', '2026-02-26'],
        ['乙方', '渝丰科技股份有限公司'], ['合同金额（万元）', '—'], ['合同承办部门', '物资管理部']]; } },
    asset: { title: '资产单据', hint: '在用 / 闲置 / 报废 / 维保 四状态明细，只读。',
      rows: function (c) { return [['资产编码', c], ['当前状态', '在用'], ['验收状态', '已验收'],
        ['盘点状态', '已盘点'], ['是否调拨', '否'], ['是否处置', '否']]; } }
  };
  function pjDocModal(kind, code) {
    const d = PJ_DOC_KINDS[kind] || PJ_DOC_KINDS.asset;
    D.modal({
      cls: 'dsc-drill-dialog', title: d.title + ' · ' + code, width: 720,
      body: '<div class="dsc-note dsc-note--info u-mb-md">' + esc(d.hint) + '</div>' +
        '<table class="dsc-table"><tbody>' + d.rows(code).map(function (kv) {
          return '<tr><td class="u-muted" style="width:170px">' + esc(kv[0]) + '</td><td>' + esc(kv[1]) + '</td></tr>';
        }).join('') + '</tbody></table>',
      buttons: [{ text: '关闭', cls: '', act: 'cancel' }]
    });
  }

  /* 「列表字段选择」注册表：齿轮 → 该表的字段全集与默认列（Axure 面板逐状态对应） */
  const PJ_LISTS = {
    'pj-plan': { cols: PJ_PLAN_COLS, def: PJ_PLAN_DEF, title: '需用计划列表' },
    'pj-accept': { cols: PJ_ACCEPT_COLS, def: PJ_ACCEPT_DEF, title: '物资验收列表' },
    'pj-pick': { cols: PJ_PICK_COLS, def: PJ_PICK_DEF, title: '物资领料列表' },
    'pj-return': { cols: PJ_RETURN_COLS, def: PJ_RETURN_DEF, title: '物资退货列表' },
    'pj-inv': { cols: PJ_INV_COLS, def: PJ_INV_DEF, title: '物资盘点列表' },
    'pj-transfer': { cols: PJ_TRANSFER_COLS, def: PJ_TRANSFER_DEF, title: '物资调拨台账' },
    'pj-scrap': { cols: PJ_SCRAP_COLS, def: PJ_SCRAP_DEF, title: '闲置废旧物资处理台账' },
    'pj-settle': { cols: PJ_SETTLE_COLS, def: PJ_SETTLE_DEF, title: '项目结算明细列表' },
    'pj-supplier': { cols: PJ_SUP_COLS, def: PJ_SUP_DEF, title: '分供商履约台账' },
    'pj-asset': { cols: PJ_ASSET_COLS, def: PJ_ASSET_DEF, title: '资产台账全数据' },
    'pj-atrans': { cols: PJ_ATRANS_COLS, def: PJ_ATRANS_DEF, title: '资产调拨台账' },
    'pj-adisp': { cols: PJ_ADISP_COLS, def: PJ_ADISP_DEF, title: '资产处置台账' }
  };

  /* 资产周转情况（Axure《项目驾驶舱 › 资产页签》首个区块；指标取数同资产管理看板） */
  function assetTurnoverSection() {
    const i = Math.max(0, D.projects.indexOf(curProject(D.projectState.__q || {})));
    const cats = ['施工机械', '临建设施', '办公设备', '生活设施', '测量仪器'];
    const rows = cats.map(function (c, k) {
      const amt = D.round(1860 - k * 268.4 + (i % 5) * 42, 1);
      const out = D.round(amt * (0.12 + k * 0.03), 1);
      const times = D.round(2.6 - k * 0.32, 2);
      return { cat: c, amt: amt, out: out, times: times, rate: D.round(times / 4 * 100, 1) };
    });
    return section('资产周转情况',
      '<div class="dsc-card"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">资产周转率明细</div>' +
      '<div class="dsc-card__extra">周转率 = 年度调出金额 ÷ 资产原值　·　口径见 PRD Q-08（待确认）</div></div>' +
      '<div class="dsc-split dsc-split--2">' +
      '<div class="dsc-card__body"><div class="dsc-chart" id="pjAssetTurn" style="height:240px"></div></div>' +
      '<div class="dsc-card__body">' +
      D.table({
        cols: [
          { key: 'idx', name: '序号', width: 56 },
          { key: 'cat', name: '资产类别', width: 130 },
          { key: 'amt', name: '资产原值(万元)', width: 140, num: true },
          { key: 'out', name: '调出金额(万元)', width: 140, num: true },
          { key: 'times', name: '周转次数', width: 110, num: true },
          { key: 'rate', name: '资产周转率', width: 110, pct: true }
        ], rows: rows.map(function (r, k) { return Object.assign({ idx: k + 1 }, r); }), maxHeight: 240
      }) + '</div></div></div>');
  }

  function assetTab(p) {
    const rows = D.genAssetRows(30);
    const cols = D.colsOf('pj-asset', PJ_ASSET_COLS, PJ_ASSET_DEF);
    /* 区块名与 Axure《项目驾驶舱 › 资产页签》的区块标题（fs=20）逐字对齐：
       资产周转情况 → 资产调拨与处置 → 资产台账全数据 */
    return assetTurnoverSection() +
      section('资产调拨与处置',
        pjListBlock({ title: '资产调拨台账', key: 'pj-atrans', rows: D.genAssetTransferRows(),
          tip: '调拨总额 / 原值总额 双口径',
          fields: [['资产调拨单'], ['资产编号'], ['调出公司'], ['调出项目'], ['调出项目实施单位'], ['调入公司']],
          more: [['调入项目'], ['调入项目实施单位'], ['资产属性'], ['资产类别'], ['资产状态'],
            ['调拨申请时间'], ['调拨完成时间']] }) +
        pjListBlock({ title: '资产处置台账', key: 'pj-adisp', rows: D.genAssetDisposeRows(), last: true,
          tip: '达处置条件的资产方可发起处置',
          fields: [['资产处置单'], ['资产编号'], ['资产状态'], ['资产属性'], ['资产类别'], ['达处置条件']],
          more: [['品牌'], ['其他采购属性'], ['存放地点'], ['保管人'], ['处置日期']] })) +
      section('资产台账全数据',
        pjFilter([['资产状态'], ['资产属性'], ['资产类别'], ['存放地点']],
          [['保管单位'], ['使用人'], ['是否验收'], ['是否盘点'], ['是否调拨'], ['是否处置']]) +
        '<div class="dsc-card"><div class="dsc-card__header">' +
        '<div class="dsc-card__title">资产台账全数据</div>' +
        '<div class="dsc-card__extra">在用 / 闲置 / 报废 / 维保 四状态可穿透　·　共 ' + rows.length + ' 条' +
        D.colGear('data-pj-cols="pj-asset"', '设置列：资产台账全数据（Axure 列表字段选择-资源+资产）') + '</div></div>' +
        D.table({
          cols: cols, rows: rows.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }),
          maxHeight: 460
        }) + '</div>');
  }

  /* ============================================================
     页面
     ============================================================ */
  D.pages.project = function (q) {
    const p = curProject(q);
    PS.project = p.name;
    PS.__q = q || {};
    const body = PS.tab === 'material' ? materialTab(p)
      : PS.tab === 'supplier' ? supplierTab(p)
        : PS.tab === 'asset' ? assetTab(p) : '';
    return '<div class="dsc-page project-cockpit-page">' +
      projectBar(p) +
      (D.scope.level === 1 ? '' : '<div class="dsc-note dsc-note--warn u-mb-lg">已按组织权限过滤（R1/R2）：' +
        '项目选择器仅列出权限内项目；项目级汇总与明细同样受权限约束。</div>') +
      projectInfo(p) +
      metricStrip(p) +
      tabBar() +
      '<div class="pj-tabbody">' +
      (body || (procSection(p) + contractSection(p) + fulfillSection(p))) +
      '</div>' +
      '</div>';
  };

  /* ============================================================
     渲染后绑定
     ============================================================ */
  D.pages.project.after = function (root, q) {
    const p = curProject(q || {});
    const page = root.querySelector('.project-cockpit-page');
    if (!page) return;

    const sel = root.querySelector('[data-pj-picker]');
    if (sel) sel.addEventListener('change', function () { PS.contractPage = 1; D.nav('project', { project: sel.value }); });

    /* 各区块查询条件：复用看板同一套交互（查询 / 清空 / 重置 / 展开 + 就地条件反馈） */
    if (D.ckCommonAfter) D.ckCommonAfter(root);

    /* 合同明细分析分页（D.bindPager 统一走全局 __pagerCb） */
    D.__pagerCb = function (o) {
      const next = o.page || PS.contractPage;
      if (next === PS.contractPage) return;
      PS.contractPage = next;
      D.toast('合同明细已切换到第 ' + next + ' 页');
      D.render();
    };

    /* 项目定位小地图（浅色版中国地图，高亮项目所在省并标注项目名） */
    const mini = root.querySelector('#pjMiniMap');
    if (mini) {
      D.mapMini(mini, { focus: D.provinceOf(p.city), marker: p.name });
    }

    /* 指标卡口径气泡（AC9）：hover 或点击指标卡显示定义 / 口径 / 来源 */
    const defs = {};
    projMetrics(p).forEach(function (m) { defs[m.name] = m; });
    root.querySelectorAll('[data-pj-metric]').forEach(function (el) {
      const m = defs[el.getAttribute('data-pj-metric')];
      if (m && m.desc) D.metricTip(el, m);
    });

    /* 指标卡点击 → 下钻提示（PRD F3：项目级指标只读展示） */
    D.delegate(root, [
      { sel: '[data-pj-metric]', fn: function (el) {
        D.toast(el.getAttribute('data-pj-metric') + '：项目级指标由后台计算，本平台只读展示');
      } },
      { sel: '[data-pj-grain]', fn: function (el) {
        const next = { '日': '月', '月': '季', '季': '年', '年': '日' };
        const nv = next[el.textContent.trim()] || '日';
        el.innerHTML = nv + GRAIN_CARET;
        D.toast('招标开始日期粒度切换为「' + nv + '」');
      } },
      { sel: '[data-pj-query]', fn: function () {
        D.toast('查询完成：' + D.defaultRange[0] + ' 至 ' + D.defaultRange[1]);
      } },
      { sel: '[data-pj-clear]', fn: function () {
        root.querySelectorAll('.ck-filter .ck-field--date').forEach(function (el) { el.textContent = '　~　'; });
        D.toast('已清空查询条件');
      } },
      { sel: '[data-pj-reset]', fn: function () { D.toast('已重置查询条件'); D.render(); } }
    ]);

    ['pjPlanStatus', 'pjPlanMat'].forEach(function (id, idx) {
      const el = root.querySelector('#' + id);
      if (!el) return;
      if (idx === 0) {
        D.donutChart(el, STATUS_DIST.filter(function (s) { return s[1] > 0; }).map(function (s, i) {
          return { key: s[0], name: s[0], value: s[1], color: D.PALETTE[i % D.PALETTE.length] };
        }), { height: 200, hole: 0.6, centerText: '计划条目', centerValue: '17', legend: true });
      } else {
        const rows = D.material.mid.map(function (m, i) { return { name: m, value: D.round(45.16 - i * 5.2, 2) }; });
        D.barChart(el, {
          categories: rows.map(function (r) { return r.name; }),
          series: [{ name: '采购计划金额(万元)', data: rows.map(function (r) { return r.value; }), color: '#008EE0' }]
        }, { height: 200, unit: ' 万元', yDigits: 0 });
      }
    });

    /* 资产周转情况：周转次数 / 调出金额 双轴组合图 */
    const at = root.querySelector('#pjAssetTurn');
    if (at) {
      const cats = ['施工机械', '临建设施', '办公设备', '生活设施', '测量仪器'];
      D.comboChart(at, {
        categories: cats,
        series: [
          { name: '资产原值', data: cats.map(function (c, k) { return D.round(1860 - k * 268.4, 1); }),
            type: 'bar', color: '#7FC8F1', color2: '#CDE9FB', unit: '万元' },
          { name: '调出金额', data: cats.map(function (c, k) { return D.round(1860 * (0.12 + k * 0.03), 1); }),
            type: 'bar', color: '#0093E5', color2: '#8FD3F4', unit: '万元' },
          { name: '周转次数', data: cats.map(function (c, k) { return D.round(2.6 - k * 0.32, 2); }),
            type: 'line', axis: 'right', color: '#D0021B' }
        ]
      }, { height: 240, rotateX: 24, yDigits: 0, yUnit: '万元', y2Unit: '次', padB: 56, padR: 44 });
    }

    [['pjBig', 1], ['pjMid', 2], ['pjSmall', 3]].forEach(function (pair) {
      const el = root.querySelector('#' + pair[0]);
      if (!el) return;
      const rows = D.genMaterialMarket('钢材', pair[1]).slice(0, 8);
      D.hbarChart(el, rows.map(function (r) { return { name: r.name, value: r.amt }; }),
        { rowH: 22, padL: 96, padR: 58, unit: ' 万元', digits: 0, nameMax: 9 });
    });

    page.addEventListener('click', function (e) {
      const t = e.target;
      const tabEl = t.closest('[data-tab]');
      if (tabEl) {
        PS.tab = tabEl.getAttribute('data-tab'); PS.contractPage = 1;
        D.render();
        /* P1-3：页签条吸顶后，切换时把内容顶到页签条正下方 ——
           页头（地图 + 信息栅格 + 7 指标带）很高，否则切完还要手动滚一屏才看得到内容 */
        const body = document.querySelector('.pj-tabbody');
        const bar = document.querySelector('.project-cockpit-page__tab-bar');
        if (body && bar) {
          const stickyTop = parseFloat(getComputedStyle(bar).top) || 96;
          const top = body.getBoundingClientRect().top + window.scrollY -
            (stickyTop + bar.getBoundingClientRect().height + 8);
          window.scrollTo(0, Math.max(0, Math.round(top)));
        }
        return;
      }
      const pk = t.closest('[data-pk]');
      if (pk) { PS.planKind = pk.getAttribute('data-pk'); D.render(); return; }
      if (t.closest('[data-pj-query]')) { D.toast('查询完成（' + D.defaultRange[0] + ' 至 ' + D.defaultRange[1] + '）'); return; }
      if (t.closest('[data-pj-reset]')) { PS.planKind = 'month'; PS.matBig = PS.matMid = PS.matSmall = ''; D.toast('已重置查询条件'); D.render(); return; }
      if (t.closest('[data-pj-export]')) { D.toast('导出任务已提交'); return; }
      const cfg = t.closest('[data-pj-columns]');
      if (cfg) {
        /* 设置列：真正改变表格字段（原先只弹提示不改表） */
        const groups = PJ_CONTRACT_GROUPS();
        D.openColPicker({ key: 'pj-contract', title: '合同明细分析',
          all: groups[0].items.concat(groups[1].items), def: PJ_CONTRACT_DEF, groups: groups, after: D.render });
        return;
      }
      /* 各列表右上角齿轮：按 Axure 的「列表字段选择」面板给出该表字段 */
      const pjCols = t.closest('[data-pj-cols]');
      if (pjCols) {
        const key = pjCols.getAttribute('data-pj-cols');
        const m = PJ_LISTS[key];
        if (!m) return;
        D.openColPicker({ key: key, title: m.title,
          all: m.cols.filter(function (c) { return c.key !== 'idx'; }), def: m.def, after: D.render });
        return;
      }
      /* 关联单据弹窗（领料↔对账单 / 退货↔结算 / 验收 / 盘点 / 调拨 / 处置 / 结算 / 订单 / 合同） */
      const doc = t.closest('[data-pj-doc]');
      if (doc) {
        const pr = doc.getAttribute('data-pj-doc').split('|');
        pjDocModal(pr[0], pr[1]);
        return;
      }
      const link = t.closest('.dsc-table__link');
      if (link) {
        if (link.hasAttribute('data-plan-ref')) { D.toast('关联订单：本计划单已引用采购订单'); return; }
        if (link.hasAttribute('data-asset-doc')) {
          const code = link.getAttribute('data-asset-doc');
          D.modal({
            cls: 'dsc-drill-dialog', title: '资产单据 · ' + code, width: 720,
            body: '<div class="dsc-note dsc-note--info u-mb-md">资产四状态（在用 / 闲置 / 报废 / 维保）明细，只读。</div>' +
              '<table class="dsc-table"><tbody>' +
              [['资产编号', code], ['当前状态', '在用'], ['保管单位', p.subOrg || p.org],
                ['验收状态', '已验收'], ['盘点状态', '已盘点']].map(function (kv) {
                return '<tr><td class="u-muted" style="width:130px">' + kv[0] + '</td><td>' + esc(kv[1]) + '</td></tr>';
              }).join('') + '</tbody></table>',
            buttons: [{ text: '关闭', cls: '', act: 'cancel' }]
          });
          return;
        }
        D.toast('打开单据详情：' + (link.getAttribute('data-link') || link.textContent));
      }
    });
  };
})(window.APP);
