/* purchase-board（由 view-cockpit.js 的共享 helper 拆分） */
(function (D) {
  'use strict';
  const esc = D.esc;
  const CS = D.cockpitState;
  const UI = D.ckUI;
  const CARET = UI.CARET;
  const section = UI.section, metricCards = UI.metricCards, field = UI.field, advActions = UI.advActions;
  const metricTabs = UI.metricTabs, detailListHead = UI.detailListHead;
  const pageHead = UI.pageHead, scopeNote = UI.scopeNote;
  const metricListTable = UI.metricListTable, metricColPicker = UI.metricColPicker;
  const bindMetricTips = UI.bindMetricTips, commonAfter = UI.commonAfter;
  const MONTHS = UI.MONTHS;
  const METRICS = [
    { key: 'costDown', name: '采购成本降低率', value: 8.2, unit: '%', dec: 2, disp: '8.2',
      desc: '采购成本降低额 ÷ 不含税标准成本金额 × 100%', src: '招采系统 + 物资系统' },
    { key: 'benefit', name: '物资设备采购效益率', value: 15.61, unit: '%', dec: 2,
      desc: '物资设备采购效益额 ÷ 物资设备采购金额 × 100%（效益额口径待确认 Q-07）', src: '物资系统' },
    { key: 'central', name: '物资设备集中采购率', value: 84.46, unit: '%', dec: 2,
      desc: '物资设备集中采购金额 ÷ 物资设备采购总金额 × 100%', src: '物资系统' },
    { key: 'subCentral', name: '分包集中采购率', value: 27.44, unit: '%', dec: 2,
      desc: '分包集中采购金额 ÷ 分包采购总金额 × 100%', src: '招采系统' },
    { key: 'direct', name: '厂家直采总占比', value: 56.68, unit: '%', dec: 2,
      desc: '厂家直采金额 ÷ 采购总金额 × 100%', src: '物资系统' },
    { key: 'plan', name: '采购计划执行率', value: 93.18, unit: '%', dec: 2,
      desc: '已执行采购计划数 ÷ 采购计划总数 × 100%', src: '物资系统' },
    { key: 'leadTime', name: '采购时效', value: 24.8, unit: '天', dec: 1,
      desc: '招标开始至定标平均天数，按自然日均值', src: '招采系统' },
    { key: 'save', name: '降本金额占比', value: 9.25, unit: '%', dec: 2,
      desc: '六项降本合计金额 ÷ 产值 × 100%（产值取数口径见 PRD Q-06）', src: '物资系统 + 财务' }
  ];
  function metricDef(key) {
    return METRICS.filter(function (m) { return m.key === key; })[0] || METRICS[0];
  }

  /* 趋势序列（截图实测 X 轴 2026年01月—09月） */
  const TREND = {
    costDown: [6.55, 7.68, 7.13, 7.48, 9.51, -17.39, 10.71, 16.23, 11.73],
    benefit: [12.4, 13.8, 14.2, 15.1, 15.9, 12.6, 16.4, 17.8, 15.61],
    central: [79.2, 80.4, 81.6, 82.8, 83.5, 78.9, 84.1, 85.2, 84.46],
    subCentral: [22.1, 23.4, 24.6, 25.2, 26.1, 21.8, 26.9, 28.1, 27.44],
    direct: [48.2, 50.1, 51.6, 52.8, 54.2, 49.6, 55.4, 57.2, 56.68],
    plan: [86.4, 88.2, 89.6, 90.4, 91.2, 87.5, 92.1, 93.4, 93.18],
    leadTime: [28.6, 28.2, 27.8, 27.1, 26.4, 28.9, 25.6, 25.1, 24.8],
    save: [6.2, 6.8, 7.1, 7.6, 8.2, 5.9, 8.6, 9.5, 9.25]
  };
  function metricsView() {
    const m = metricDef(CS.metric);
    return '<div class="ck-view ck-view--metrics">' +
      section('核心指标',
      metricCards(METRICS, 'data-ck-metric', CS.metric) +

      '<div class="ck-filter ck-filter--panel">' +
      '<div class="ck-filter__row">' +
      '<div class="ck-filter__item"><span class="ck-filter__label">结算日期</span>' +
      '<span class="ck-grain" data-ck-grain="结算日期">' + esc(CS.settleGrain) + CARET + '</span>' +
      '<span class="ck-field ck-field--date">2025-06-01 ~ 2026-05-31</span></div>' +
      field('二级单位', '') + field('三级单位', '') + field('项目名称', '') +
      '</div><div class="ck-filter__row">' +
      field('项目业态', '') + field('项目类型', '') +
      '</div>' +
      '<div class="ck-filter__more" ' + (CS.advanced ? '' : 'hidden') + '>' +
      field('项目状态', '') + field('承包模式', '') + field('地区', '') +
      field('组织', '') + field('物料分类', '') +
      '</div>' +
      advActions() + '</div>' +

      metricTabs(METRICS, 'data-ck-tab', CS.metric) +
      '<div class="dsc-chart" id="ckTrend" style="height:280px"></div>' +
      detailListHead({ gear: 'data-pb-cols' }) +
      unitTable()) +
      procSection() +
      '</div>';
  }
  const UNIT_ROWS = [
    ['中建八局南方分公司', 57.70, 49.59, 14.07], ['中建八局华南分公司', 72.21, 64.73, 10.36],
    ['中建八局第二建设有限公司', 286.09, 257.16, 10.11], ['中建八局东北分公司', 49.93, 45.11, 9.65],
    ['中建八局华中建设有限公司', 24.64, 22.44, 8.93], ['中建八局华北分公司', 43.66, 40.05, 8.28],
    ['中建八局文旅博览投资发展有限公司', 20.11, 18.48, 8.12], ['中建八局上海分公司', 65.94, 60.59, 8.09],
    ['中建八局发展建设分公司', 83.92, 77.18, 8.03], ['中建八局浙江建设有限公司', 51.49, 47.43, 7.89],
    ['中建八局西北分公司', 31.39, 28.94, 7.80], ['中建八局第三建设有限公司', 154.21, 142.28, 7.74],
    ['中建八局总承包公司', 72.12, 66.79, 7.38], ['中国建筑土木建设有限公司', 43.75, 40.67, 7.00],
    ['中建八局第一建设有限公司', 334.04, 311.06, 6.88], ['中建八局（北京）建设投资有限公司', 20.31, 19.05, 6.20],
    ['中建八局第四建设有限公司', 44.11, 41.39, 6.17], ['中建八局轨道交通建设有限公司', 32.85, 30.86, 6.06],
    ['中建八局装饰工程有限公司', 16.94, 15.93, 6.00], ['中建八局西南分公司', 44.87, 42.29, 5.73],
    ['中建八局新型建造工程公司', 12.94, 12.33, 4.68]
  ];

  /* C1 / E2：看板单位名的统一表达——短名为主（应用内主键），法定全称进 tooltip；
     点击切到该单位的组织视角并打开对应数据报表 */
  function unitLink(shortName, ds) {
    const full = (D.REPORT_UNITS[shortName] || [])[0] || '';
    return '<span class="ck-table__unit dsc-table__link" data-goto-report="' + ds +
      '" data-goto-org="' + esc(shortName) + '" title="' +
      esc((full ? full + '　·　' : '') + '在数据报表中查看该单位') + '">' + esc(shortName) + '</span>';
  }

  function unitTable() {
    /* R2：受限视角下只返回本单位行（超权限行不返回） */
    const scope = D.scope.name;
    const visible = UNIT_ROWS.filter(function (r) {
      return D.scope.level === 1 || r[0].indexOf(scope.replace(/公司$/, '')) >= 0;
    });
    const names = visible.map(function (r) { return D.reportShortOf(r[0]); });
    const metric = CS.metric;                 // 指标页签（8 个指标各自一套字段，随页签切换）
    const rows = D.metricRows(names, metric, function (short) {
      const o = D.orgMap[short];
      return (o && o.kpi && o.kpi[metric] != null) ? o.kpi[metric] : null;
    });
    return metricListTable({ metric: metric, rows: rows, ds: 'purchase', page: 1, size: rows.length,
      totalName: '全部 ' + rows.length + ' 个单位' });
  }

  const PROC_KPIS = [
    { key: 'lead', icon: 'clock', label: '平均招采时效', value: '25.6', unit: '天' },
    { key: 'open', icon: 'bag', label: '公开采购率', value: '--', unit: '%' },
    { key: 'online', icon: 'check', label: '在线评标率', value: '99.08', unit: '%' },
    { key: 'fail', icon: 'cross', label: '招采废标率', value: '9.69', unit: '%' }
  ];
  const PROC_ICON = {
    clock: '<circle cx="32" cy="32" r="24"/><path d="M32 16v16l11 7"/>',
    bag: '<path d="M12 20h40v34H12z"/><path d="M22 20v-6a10 10 0 0 1 20 0v6"/>',
    check: '<rect x="8" y="8" width="48" height="40" rx="2"/><path d="M20 30l9 9 17-19"/><path d="M8 54h48"/>',
    cross: '<rect x="8" y="10" width="48" height="40" rx="2"/><path d="M20 22l24 20M44 22L20 42"/><path d="M8 56h48"/>'
  };
  const PROC_STAGES = [
    { name: '采购发起', value: 11092 }, { name: '采购响应', value: 661 },
    { name: '文件开启', value: 193 }, { name: '采购评审', value: 563 },
    { name: '采购成交', value: 17582 }, { name: '废标', value: 3229 }
  ];

  function procSection() {
    return section('招采分析',
      '<div class="ck-filter"><div class="ck-filter__row">' +
      '<div class="ck-filter__item"><span class="ck-filter__label">招标开始日期</span>' +
      '<span class="ck-grain" data-ck-grain="招标开始日期">' + esc(CS.inGrain) + CARET + '</span>' +
      '<span class="ck-field ck-field--date">2025-06-01 ~ 2026-05-31</span></div>' +
      field('采购类别', '') + field('采购方式', '') + field('采购模式', '') +
      '</div>' +
      '<div class="ck-filter__more"' + (CS.advanced ? '' : ' hidden') + '>' +
      field('二级单位', '') + field('三级单位', '') + field('项目名称', '') +
      '</div>' +
      advActions() + '</div>' +
      '<div class="ck-prockpis">' + PROC_KPIS.map(function (k) {
        return '<div class="ck-prockpi">' +
          '<span class="ck-prockpi__icon"><svg viewBox="0 0 64 64" width="52" height="52" fill="none" ' +
          'stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
          PROC_ICON[k.icon] + '</svg></span>' +
          '<span class="ck-prockpi__main"><span class="ck-prockpi__label">' + esc(k.label) + '</span>' +
          '<span class="ck-prockpi__value">' + esc(k.value) +
          '<i>' + esc(k.unit) + '</i></span></span></div>';
      }).join('') + '</div>' +
      '<div class="ck-stages">' + PROC_STAGES.map(function (s, i) {
        return '<div class="ck-stage">' +
          '<div class="ck-stage__head">' + esc(s.name) + '</div>' +
          '<div class="ck-stage__value">' + D.fmtInt(s.value) + '</div>' +
          '<div class="dsc-chart ck-stage__chart" id="ckStage' + i + '" style="height:96px"></div>' +
          '</div>';
      }).join('') + '</div>');
  }

  /* ============================================================
     页面
     ============================================================ */
  D.pages['purchase-board'] = function () {
    CS.view = 'metrics';
    return '<div class="dsc-page cockpit-page">' +
      pageHead('采购管理看板', '核心指标：指标卡与页签联动，含指标明细表与招采分析') +
      scopeNote() + metricsView() + '</div>';
  }

  function metricsAfter(root) {
    bindMetricTips(root, METRICS, 'data-ck-metric');
    /* 指标卡点击 → 页签联动 */
    D.delegate(root, [
      { sel: '[data-ck-metric]', fn: function (el) { CS.metric = el.getAttribute('data-ck-metric'); D.render(); } },
      { sel: '[data-ck-tab]', fn: function (el) { CS.metric = el.getAttribute('data-ck-tab'); D.render(); } }
    ]);

    const m = metricDef(CS.metric);
    const el = root.querySelector('#ckTrend');
    if (el) {
      D.lineChart(el, {
        categories: MONTHS,
        series: [{ name: m.name, data: TREND[m.key] || TREND.costDown, color: '#D0021B' }]
      }, { height: 280, area: false, lineWidth: 1.8, dotR: 3.5, unit: m.unit, tipDigits: 2,
        dataLabels: true, labelDigits: 2, padL: 56 });
    }

    /* 招采分析 6 阶段迷你面积图 */
    PROC_STAGES.forEach(function (s, i) {
      const c = root.querySelector('#ckStage' + i);
      if (!c) return;
      const rnd = D.seedRand(5500 + i * 29);
      const base = s.value / 9;
      const vals = MONTHS.map(function (x, k) {
        const f = i === 5 && k === 6 ? 0.15 : 1;
        return D.round(base * (0.5 + rnd() * 1.4) * f, 0);
      });
      vals[vals.length - 1] = D.round(base * 1.2, 0);
      D.areaMini(c, vals, { height: 96, categories: ['2026年01月', '2026年05月', '2026年09月'] });
    });
  }
  D.pages['purchase-board'].after = function (root) {
    metricsAfter(root);
    commonAfter(root);
    /* 指标明细表：设置列（齿轮）——真正改变表格字段，不只是弹提示 */
    D.delegate(root, [
      { sel: '[data-pb-cols]', fn: function () {
        metricColPicker(CS.metric, METRICS.filter(function (x) { return x.key === CS.metric; })[0].name +
          ' · 指标明细列表');
      } }
    ]);
  }
})(window.APP);
