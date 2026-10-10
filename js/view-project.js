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
      '    <div class="ck-filter__item"><button class="ck-btn ck-btn--primary" data-pj-query>查询</button>' +
      '    <button class="ck-link" data-pj-clear>清空</button>' +
      '    <button class="ck-link" data-pj-reset>重置</button></div>' +
      '  </div></div>' +
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
  function contractSection(p) {
    /* 生成量放大后再按本项目所属二级单位过滤：46 条原始数据过滤后只剩个位数，
       分页器只有 1 页（等于没有分页）。600 条过滤后可稳定得到 2~4 页 */
    const rows = D.genContractRows(600, function (r) { return r.org2 === p.org; });
    const cols = [
      { key: 'idx', name: '序号', width: 56, sticky: true },
      { key: 'code', name: '合同编号', width: 150, sticky2: true, link: true },
      { key: 'type', name: '合同类型', width: 130 },
      { key: 'status', name: '合同状态', width: 100 },
      { key: 'partyB', name: '乙方', width: 210 },
      { key: 'signDate', name: '合同签订日期', width: 130 },
      { key: 'matSmall', name: '物料小类', width: 120 },
      { key: 'qty', name: '数量', width: 100, num: true },
      { key: 'priceTax', name: '含税单价', width: 110, num: true },
      { key: 'amtTax', name: '含税金额', width: 130, num: true },
      { key: 'orderAmt', name: '下单金额', width: 130, num: true },
      { key: 'orderPct', name: '下单比例', width: 110, num: true },
      { key: 'acceptAmt', name: '验收金额', width: 130, num: true },
      { key: 'settleAmt', name: '结算金额', width: 130, num: true },
      { key: 'payPct', name: '付款比例', width: 110, num: true },
      { key: 'unpaidAmt', name: '应付未付金额', width: 140, num: true }
    ];
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
      '<div class="dsc-card__extra">共 ' + rows.length + ' 条　' +
      '<button class="dsc-btn dsc-btn--sm" data-pj-columns>列设置</button></div></div>' +
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
  function materialTab(p) {
    const plans = D.genPlanRows(PS.planKind);
    return section('物资需用计划',
      '<div class="dsc-card">' +
      '<div class="dsc-card__header"><div class="dsc-card__title">物资需用计划</div>' +
      '<div class="dsc-card__extra"><span class="dsc-tabs dsc-tabs--pill" style="margin:0" data-plankind>' +
      [['month', '月度计划'], ['day', '日常计划']].map(function (k) {
        return '<div class="dsc-tabs__item' + (PS.planKind === k[0] ? ' dsc-tabs__item--active' : '') +
          '" data-pk="' + k[0] + '">' + k[1] + '</div>';
      }).join('') + '</span></div></div>' +
      D.table({
        cols: [
          { key: 'idx', name: '序号', width: 56, sticky: true },
          { key: 'planCode', name: '计划单号', width: 150, sticky2: true, link: true },
          { key: 'matBig', name: '物料大类', width: 130 },
          { key: 'matMid', name: '物料中类', width: 120 },
          { key: 'matSmall', name: '物料小类', width: 120 },
          { key: 'qty', name: '计划数量', width: 110, num: true },
          { key: 'unit', name: '单位', width: 80 },
          { key: 'needDate', name: '需用时间', width: 120 },
          { key: 'part', name: '使用部位', width: 120 },
          { key: 'quoted', name: '是否引用', width: 100, render: function (v) {
            return '<span class="dsc-table__link" data-plan-ref>' + esc(v) + '</span>';
          } },
          { key: 'status', name: '状态', width: 100 }
        ], rows: plans.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }), maxHeight: 420
      }) + '</div>') +
      section('物资验收与领用',
        '<div class="dsc-card"><div class="dsc-card__header">' +
        '<div class="dsc-card__title">收验货 / 收料 / 领料 / 退货台账</div>' +
        '<div class="dsc-card__extra">全链路单据</div></div>' +
        D.table({
          cols: [
            { key: 'idx', name: '序号', width: 56, sticky: true },
            { key: 'acceptCode', name: '收验货单号', width: 150, sticky2: true, link: true },
            { key: 'deliverCode', name: '发货单号', width: 150, link: true },
            { key: 'receiveCode', name: '收料单号', width: 150, link: true },
            { key: 'orderCode', name: '订单编号', width: 150, link: true },
            { key: 'matSmall', name: '物料小类', width: 120 },
            { key: 'qty', name: '数量', width: 100, num: true },
            { key: 'unit', name: '单位', width: 80 },
            { key: 'date', name: '日期', width: 110 },
            { key: 'status', name: '状态', width: 100 }
          ], rows: D.genAcceptRows().map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }), maxHeight: 380
        }) + '</div>');
  }

  function supplierTab(p) {
    const rows = D.genSupplierRows(30);
    return section('分供商履约',
      '<div class="dsc-card"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">本项目分供商台账</div>' +
      '<div class="dsc-card__extra">共 ' + rows.length + ' 条</div></div>' +
      D.table({
        cols: [
          { key: 'idx', name: '序号', width: 56, sticky: true },
          { key: 'supplier', name: '分供商名称', width: 210, sticky2: true, link: true },
          { key: 'cat', name: '分供商分类', width: 130 },
          { key: 'grade', name: '分供商等级', width: 110 },
          { key: 'winAmt', name: '中标金额', width: 130, num: true },
          { key: 'perfAmt', name: '履约金额', width: 130, num: true },
          { key: 'perfRate', name: '履约率', width: 100, num: true },
          { key: 'score', name: '评价得分', width: 100, num: true }
        ], rows: rows.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }), maxHeight: 460
      }) + '</div>');
  }

  function assetTab(p) {
    const rows = D.genAssetRows(30);
    return section('项目资产',
      '<div class="dsc-card"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">资产台账</div>' +
      '<div class="dsc-card__extra">在用 / 闲置 / 报废 / 维保 四状态可穿透</div></div>' +
      D.table({
        cols: [
          { key: 'idx', name: '序号', width: 56, sticky: true },
          { key: 'assetCode', name: '资产编号', width: 150, sticky2: true, link: true },
          { key: 'category', name: '资产类别', width: 130 },
          { key: 'desc', name: '资产描述', width: 170 },
          { key: 'location', name: '存放地点', width: 130 },
          { key: 'keeper', name: '保管单位', width: 130 },
          { key: 'assetAmt', name: '资产总额(万元)', width: 140, num: true },
          { key: 'acceptStatus', name: '验收状态', width: 110 },
          { key: 'invStatus', name: '盘点状态', width: 110 },
          { key: 'op', name: '操作', width: 100, render: function (v, row) {
            return '<span class="dsc-table__link" data-asset-doc="' + esc(row.assetCode) + '">查看单据</span>';
          } }
        ], rows: rows.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }), maxHeight: 460
      }) + '</div>');
  }

  /* ============================================================
     页面
     ============================================================ */
  D.pages.project = function (q) {
    const p = curProject(q);
    PS.project = p.name;
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
      if (tabEl) { PS.tab = tabEl.getAttribute('data-tab'); PS.contractPage = 1; D.render(); return; }
      const pk = t.closest('[data-pk]');
      if (pk) { PS.planKind = pk.getAttribute('data-pk'); D.render(); return; }
      if (t.closest('[data-pj-query]')) { D.toast('查询完成（' + D.defaultRange[0] + ' 至 ' + D.defaultRange[1] + '）'); return; }
      if (t.closest('[data-pj-reset]')) { PS.planKind = 'month'; PS.matBig = PS.matMid = PS.matSmall = ''; D.toast('已重置查询条件'); D.render(); return; }
      if (t.closest('[data-pj-export]')) { D.toast('导出任务已提交'); return; }
      const cfg = t.closest('[data-pj-columns]');
      if (cfg) {
        const all = [
          ['code', '合同编号', 1], ['type', '合同类型', 1], ['status', '合同状态', 1],
          ['partyB', '乙方', 1], ['signDate', '合同签订日期', 1], ['matSmall', '物料小类', 1],
          ['qty', '数量', 0], ['priceTax', '含税单价', 0], ['amtTax', '含税金额', 1],
          ['orderAmt', '下单金额', 1], ['settleAmt', '结算金额', 1], ['unpaidAmt', '应付未付金额', 0]
        ].map(function (c) { return { key: c[0], name: c[1] }; });
        const shown = ['code', 'type', 'status', 'partyB', 'signDate', 'matSmall', 'amtTax', 'orderAmt', 'settleAmt'];
        D.modal({
          title: '列设置 · 合同明细分析', width: 900,
          body: D.columnDialog(all, shown),
          buttons: [{ text: '取消', cls: '', act: 'cancel' }, { text: '应用', cls: 'dsc-btn--primary', act: 'ok' }],
          onAction: function (act, ov2) {
            const keys = D.readColumnDialog(ov2.querySelector('.dsc-column-dialog'));
            if (!keys.length) { D.toast('请至少选择一个字段', 'warn'); return false; }
            D.toast('列设置已应用（' + keys.length + ' 个字段）');
          }
        });
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
