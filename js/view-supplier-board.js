/* supplier-board（由 view-cockpit.js 的共享 helper 拆分） */
(function (D) {
  'use strict';
  const esc = D.esc;
  const CS = D.cockpitState;
  const UI = D.ckUI;
  const CARET = UI.CARET;
  const section = UI.section, subHead = UI.subHead, pageHead = UI.pageHead, scopeNote = UI.scopeNote;
  const field = UI.field, actions = UI.actions;
  const bindMetricTips = UI.bindMetricTips, commonAfter = UI.commonAfter;
  /* ============================================================
     资源管理 › 资源管理看板
     内容基准：`分供商管理看板.png`（源页面「核心数据 · 资源」）
     版式：沿用已评审优化的 ck-* 语言（指标卡带 → 筛选 → 区块 + 图表）
     ============================================================ */
  /* go = 点击卡片跳到的区块序号（页内 .ck-sec 的下标）；desc/src 供口径气泡使用 */
  const SB_IND = [
    { name: '在库分供商数量', value: '61,854', unit: '家', last: '55,003', go: 0,
      desc: '截至统计时点在库状态的分供商数量', src: '采购管理系统分供商模块' },
    { name: '活跃分供商', value: '31,855', unit: '家', last: '38,912', go: 0,
      desc: '近 12 个月内有投标、报价或履约记录的分供商数量', src: '招采系统' },
    { name: '履约分供商数量', value: '20,645', unit: '家', last: '18,436', go: 4,
      desc: '统计期内有实际履约记录的分供商数量', src: '物资系统' },
    { name: '分供商履约额', value: '489.22', unit: '亿元', last: '456.31', go: 4,
      desc: '统计期内分供商承接合同的结算金额合计', src: '物资系统 + 采购管理系统' },
    { name: '优质分供商数量', value: '25,793', unit: '家', last: '31,493', go: 0,
      desc: '评价等级为优质的分供商数量，占比 = 优质数量 ÷ 在库分供商数量', src: '采购管理系统分供商模块' },
    { name: '优质分供商履约额', value: '354.57', unit: '亿元', last: '265.32', go: 4,
      desc: '评价为优质的分供商所承接合同的结算金额，占比 = 优质履约额 ÷ 分供商履约额', src: '物资系统 + 采购管理系统' },
    { name: '不良行为分供商数量', value: '658', unit: '家', last: '812', go: 0,
      desc: '存在不良行为记录的分供商数量；占比 = 不良行为分供商数量 ÷ 在库分供商数量（658 ÷ 61,854）；不良行为的判定标准待确认（Q-09）', src: '采购管理系统分供商模块' },
    { name: '清退分供商数量', value: '7,391', unit: '家', last: '6,315', go: 2,
      desc: '当前自然年内出库的分供商数量；占比 = 清退分供商数量 ÷（在库 + 清退）＝ 7,391 ÷ 69,245', src: '采购管理系统分供商模块' }
  ];
  /* 指标卡 key 在初始化时绑定一次，供渲染与口径气泡共用（不要每次 render 改写静态数组） */
  SB_IND.forEach(function (k, ki) { k.key = 'k' + ki; });

  /* 分供商在库情况：27 个二级单位 / 经营区域 / 经营类型 / 分供商分类，四组合计均 = 61,854 家 */
  const SB_STOCK_TOTAL = 61854;
  function sbSplit(total, weights) {
    const sum = weights.reduce(function (a, w) { return a + w; }, 0) || 1;
    const out = weights.map(function (w) { return Math.round(total * w / sum); });
    out[out.length - 1] += total - out.reduce(function (a, v) { return a + v; }, 0);
    return out;
  }
  const SB_STOCK = (function () {
    /* 二级单位图只保留前 10 个；数量为示意样本，占比仍按全局 61,854 计算 */
    const orgNames = D.orgs.map(function (o) { return o.name; }).slice(0, 10);
    const orgCounts = [5210, 4680, 4310, 3960, 3620, 3310, 3020, 2740, 2480, 2260];
    const regions = ['华北地区', '华东地区', '华中地区', '东北地区', '华西地区', '港澳台', '山东区', '华南地区', '海外'];
    const regionWeights = [0.18, 0.22, 0.13, 0.08, 0.10, 0.04, 0.09, 0.12, 0.04];
    const types = ['生产商', '代理商', '经销商', '其他'];
    const typeWeights = [0.42, 0.26, 0.22, 0.10];
    const classes = ['物资供应类', '设备供应类', '租赁服务类', '劳务分包类', '专业分包类',
      '专业服务类', '设计服务类', '运输服务类', '投资服务类', '运营服务类', '其他类'];
    const classWeights = [0.30, 0.14, 0.10, 0.12, 0.14, 0.06, 0.04, 0.04, 0.02, 0.02, 0.02];
    const shares = function (rows) {
      return rows.map(function (v) { return D.round(v / SB_STOCK_TOTAL * 100, 2); });
    };
    const regionCounts = sbSplit(SB_STOCK_TOTAL, regionWeights);
    const typeCounts = sbSplit(SB_STOCK_TOTAL, typeWeights);
    const classCounts = sbSplit(SB_STOCK_TOTAL, classWeights);
    return {
      orgNames: orgNames, orgCounts: orgCounts, orgShares: shares(orgCounts),
      regions: regions, regionCounts: regionCounts, regionShares: shares(regionCounts),
      types: types, typeCounts: typeCounts, typeShares: shares(typeCounts),
      typeColors: ['#2468F2', '#13C2C2', '#F59A23', '#D94A4A'],
      classes: classes, classCounts: classCounts, classShares: shares(classCounts)
    };
  })();

  const SB_BAR = { height: 240, dataLabels: true, labelColor: '#4A5568', xColor: '#666' };
  const SB_BLUE = '#2468F2';
  /* 资源看板柱线图公共配置：三张在库图 + 使用率/评价/合作年限共用，差异项由调用方覆盖 */
  const SB_STOCK_OPT = {
    padT: 32, yDigits: 0, y2Unit: '%', rDigits: 2,
    dataLabels: true, barLabelRaw: true, lineLabels: true,
    lineLabelDigits: 1, lineLabelSize: 8, lineLabelColor: '#C0504D',
    lineLabelOffset: -8, lineLabelUnit: '%'
  };
  const SB_BARLINE_OPT = {
    unit: '家', yDigits: 0, y2Unit: '%', rDigits: 0, y2Color: '#999',
    padT: 34, dataLabels: false, lineLabels: true,
    lineLabelDigits: 1, lineLabelSize: 9, lineLabelColor: '#C0504D',
    lineLabelOffset: -12, lineLabelUnit: '%',
    topLabelSize: 8, topLabelOffset: 6, barWidthScale: 2 / 3
  };
  function sbStockOpt(extra) { return Object.assign({}, SB_STOCK_OPT, extra || {}); }
  function sbBarLineOpt(extra) { return Object.assign({}, SB_BARLINE_OPT, extra || {}); }

  /* 分供商使用率分析（CSV：新增入库→活跃→投标→中标→签约→履约，各级给「数量及转化率」；
     活跃为包含投标 / 中标 / 签约 / 履约的活动集合，各阶段为嵌套口径；
     投标数按活跃的 99% 估算，使「活跃→中标」整体转化率仍为 96.34%；
     转化率 = 本级 ÷ 上一级。使用率 = 履约分供商数量 ÷ 在库分供商数量 = 20,645 ÷ 61,854） */
  const SB_RATE = {
    cats: ['新增入库', '活跃', '投标', '中标', '签约', '履约'],
    data: [9851, 8119, 8038, 7822, 7240, 5839],
    /* 首点 = 新增入库 ÷ 在库 61,854；其余为各阶段相对上一级的转化率 */
    rates: [D.round(9851 / SB_STOCK_TOTAL * 100, 2), 82.42, 99.00, 97.31, 92.56, 80.65],
    rate: '33.38'
  };
  const SB_EVAL = {                                        // 分供商评价分析（Axure：分供商评级）
    cats: ['优秀', '良好', '合格', '不合格'],
    data: [25793, 15464, 12866, 7731], pct: [41.70, 25.00, 20.80, 12.50]   // 四档之和 = 在库 61,854
  };
  /* 引进分供商转化与留存（CSV：新引进 = 新增入库；分片 = 中标 / 未中标且未出库 / 出库，三者之和 = 新引进） */
  const SB_CONVERT = [
    { name: '中标分供商', label: '中标 7,822（79.40%）', value: 7822, color: '#2468F2' },
    { name: '未中标且未出库', label: '未中标且未出库 1,642（16.67%）', value: 1642, color: '#F2B04A' },
    { name: '出库分供商', label: '出库 387（3.93%）', value: 387, color: '#D94A4A' }
  ];
  /* 分供商流失情况分析（出库分供商：合作满五年 / 未满五年 / 未合作，三者之和 = 出库 7,391）
     两枚环形图统一为「蓝 → 黄 → 红」三色 */
  const SB_LOSS = [
    { name: '合作满五年', label: '合作满 5 年 1,999（27.05%）', value: 1999, color: '#2468F2' },
    { name: '合作未满五年', label: '合作未满 5 年 4,312（58.34%）', value: 4312, color: '#F2B04A' },
    { name: '未合作', label: '未合作 1,080（14.61%）', value: 1080, color: '#D94A4A' }
  ];
  /* 合作年限分析：默认全局五档合计（含「未合作」）；点击某一档下钻到二级单位。
     颜色按「5年以上 → 1年以内」由深到浅，未合作单独用中性灰；
     各二级单位四档分档值之和 = 该单位原合作年限总量。 */
  const SB_YEARS = {
    buckets: ['5年以上', '3-5年', '1-3年', '1年以内', '未合作'],
    colors: ['#0B5CAB', '#2E86D9', '#6FB5EE', '#B7DCF6', '#9AA5B1'],
    cats: ['华中公司', '总承包公司', '发展建设分公司', '东北公司', '华北公司', '投资公司', '华南公司'],
    total: [1984, 1500, 1783, 631, 984, 798, 783],
    shares: [0.38, 0.27, 0.21, 0.14],
    unmatched: [260, 190, 170, 140, 120, 100, 100]
  };
  const SB_YEARS_DATA = (function () {
    const rows = [0, 1, 2, 3].map(function (bi) {
      return SB_YEARS.cats.map(function (_, ui) {
        const total = SB_YEARS.total[ui];
        if (bi < 3) return Math.round(total * SB_YEARS.shares[bi]);
        const used = SB_YEARS.shares.slice(0, 3).reduce(function (a, s) {
          return a + Math.round(total * s);
        }, 0);
        return total - used;
      });
    });
    rows.push(SB_YEARS.unmatched.slice());
    return rows;
  })();
  const SB_YEARS_TOTAL = SB_YEARS.buckets.map(function (_, bi) {
    return SB_YEARS_DATA[bi].reduce(function (a, v) { return a + v; }, 0);
  });
  const SB_YEARS_SUM = SB_YEARS_TOTAL.reduce(function (a, v) { return a + v; }, 0);
  const SB_YEARS_PCT = SB_YEARS_TOTAL.map(function (v) { return v / SB_YEARS_SUM * 100; });
  const SBY = { bucket: null };   // null = 全局五档；0~4 = 下钻到对应档位
  /* 分供商履约情况分析（双轴）：各二级单位当前自然年内结算金额（万元）与存在履约的分供商数量。
     金额与数量的单位均值都对齐全局 236.97 万元/家（489.22 亿元 ÷ 20,645 家），
     7 个单位合计占全局 46.83%，与「二级单位数量之和 ≤ 履约分供商总数」自洽 */
  const SB_PERF = {
    cats: ['华中公司', '上海公司', '总承包公司', '华南公司', '北京公司', '东北公司', '土木公司'],
    amt: [467818, 379311, 372182, 300010, 295816, 244046, 231866],
    cnt: [1974, 1601, 1571, 1266, 1248, 1030, 978]
  };
  /* 履约额阈值：默认 500 万元；数量按「500 万元 = 3,146 家」的尾部曲线示意，
     以 20,645 家履约分供商数为上限。原型无逐家履约额明细，曲线仅用于联动演示。 */
  const SBP = { threshold: 500 };
  const SB_PERF_TAIL = { base: 3146, baseThreshold: 500, total: 20645, alpha: 0.6 };
  function sbPerfCount(t) {
    if (!(t > 0)) return SB_PERF_TAIL.total;
    return Math.min(SB_PERF_TAIL.total,
      Math.round(SB_PERF_TAIL.base * Math.pow(SB_PERF_TAIL.baseThreshold / t, SB_PERF_TAIL.alpha)));
  }
  function sbPerfHead() {
    const t = SBP.threshold;
    const tip = '统计期内履约额 ≥ ' + D.fmtInt(t) + ' 万元的分供商数量';
    return '<div class="ck-perfhead">' +
      '<div class="ck-perfhead__item">' +
      '<span class="ck-perfhead__label">履约额阈值' +
      '<span class="ck-info ck-perfhead__tip" tabindex="0" role="img" data-sb-perf-tip aria-label="' + esc(tip) + '">?' +
      '<span class="ck-perfhead__bubble">' + esc(tip) + '</span></span></span>' +
      '<span class="ck-perfhead__inputwrap">' +
      '<input class="ck-field" type="number" min="0" step="10" data-sb-perf-threshold value="' + t + '"/>' +
      '<span class="ck-perfhead__unit">万元</span></span></div>' +
      '<div class="ck-perfhead__item">' +
      '<span class="ck-perfhead__label">达标家数</span>' +
      '<span class="ck-perfhead__value">' + D.fmtInt(sbPerfCount(t)) + '<span>家</span></span></div>' +
      '</div>';
  }

  function sbChart(id, h) {
    return '<div class="dsc-chart" id="' + id + '" style="height:' + (h || 240) + 'px"></div>';
  }
  function sbStockTypeLegend() {
    return '<div class="ck-pielegend ck-pielegend--grid">' + SB_STOCK.types.map(function (t, i) {
      return '<span class="ck-pielegend__item"><i style="background:' + SB_STOCK.typeColors[i] + '"></i>' +
        '<span class="ck-pielegend__name">' + esc(t) + '</span>' +
        '<b>' + D.fmtInt(SB_STOCK.typeCounts[i]) + '（' + SB_STOCK.typeShares[i].toFixed(2) + '%）</b></span>';
    }).join('') + '</div>';
  }
  function sbKpiCards() {
    return '<div class="ck-metrics ck-metrics--8">' + SB_IND.map(function (k) {
      return '<div class="ck-metriccard ck-metriccard--kpirow" data-sb-ind="' + k.key + '" ' +
        'data-sb-go="' + k.go + '" title="点击查看相关区块">' +
        '<div class="ck-metriccard__value">' + esc(k.value) + '<span>' + esc(k.unit) + '</span></div>' +
        '<div class="ck-kpi__name">' + esc(k.name) + '</div>' +
        '<div class="ck-kpi__sub">上年度 ' + esc(k.last) + ' ' + esc(k.unit) + '</div></div>';
    }).join('') + '</div>';
  }
  /* 看板顶部统一筛选条（源图：本级库 / 日期选择 / 物料分类） */
  function sbFilter(extra) {
    return '<div class="ck-filter"><div class="ck-filter__row">' +
      field('本级库', '') +
      '<div class="ck-filter__item"><span class="ck-filter__label">日期选择</span>' +
      '<span class="ck-field ck-field--date">2025-06-01 ~ 2026-05-31</span></div>' +
      (extra || '') + field('物料分类', '') +
      '</div>' + actions() + '</div>';
  }

  function supplierBoardView() {
    return '<div class="ck-view ck-view--metrics">' +
      sbKpiCards() +
      sbFilter() +

      /* 资源在库情况分析：横轴二级单位全宽 + 区域 / 类型 / 分类三列 */
      section('资源在库情况分析',
        '<div class="ck-subhead"><span class="ck-subhead__title">各单位在库分供商</span>' +
        '<span class="ck-subhead__extra">前 10 个二级单位　·　单位：家 / 全局占比</span></div>' +
        sbChart('sbStockOrg', 360) +
        '<div class="dsc-split ck-stock3 u-mt-lg">' +
        '<div>' + subHead('分供商区域分布', '单位：家 / 全局占比') +
        sbChart('sbStockRegion', 300) + '</div>' +
        '<div>' + subHead('分供商经营类型', '单位：家 / 全局占比') +
        sbChart('sbStockType', 230) + sbStockTypeLegend() + '</div>' +
        '<div>' + subHead('分供商分类', '单位：家 / 全局占比') +
        sbChart('sbStockClass', 300) + '</div>' +
        '</div>') +

      /* 资源使用情况分析：使用率 / 评价 + 转化 / 流失，共用同一个区块标题 */
      section('资源使用情况分析',
        '<div class="dsc-split dsc-split--2">' +
        /* 使用率数值属于左图：与子标题同一行、靠右对齐（标题已说明含义，不再重复「分供商使用率」） */
        '<div>' +
        '<div class="ck-subhead"><span class="ck-subhead__title">分供商使用率分析</span>' +
        '<span class="ck-subhead__extra ck-subhead__extra--rate">' +
        '<span class="ck-subhead__rate-label">全局使用率</span><b>' + SB_RATE.rate + '%</b></span></div>' +
        sbChart('sbRate', 260) + '</div>' +
        '<div>' + subHead('分供商评价分析', '分供商评级') + sbChart('sbEval', 260) + '</div>' +
        '</div>' +
        /* 第二排：转化 / 流失，图内保留各自图形名称 */
        '<div class="dsc-split dsc-split--2 u-mt-lg">' +
        '<div>' + subHead('新引进分供商转化情况占比', '单位：家 / 全局占比') +
        sbChart('sbConvert', 280) + sbLegend(SB_CONVERT) + '</div>' +
        '<div>' + subHead('出库分供商中合作满 5 年分供商占比', '单位：家 / 全局占比') +
        sbChart('sbLoss', 280) + sbLegend(SB_LOSS) + '</div>' +
        '</div>') +

      /* 合作年限分析：默认全局五档合计，点击柱子下钻到各二级单位；图全宽、柱宽收为 2/3 */
      section('资源合作年限分析',
        '<div class="ck-subhead"><span class="ck-subhead__title">' +
        (SBY.bucket == null ? '全局合计'
          : esc(SB_YEARS.buckets[SBY.bucket]) + ' · 各二级单位') +
        '</span><span class="ck-subhead__extra">' +
        (SBY.bucket == null ? '点击柱子查看各二级单位'
          : '<button class="dsc-btn dsc-btn--sm" data-sb-years-back>返回</button>') +
        '</span></div>' +
        sbChart('sbYears', 280)) +
      section('分供商履约情况分析',
        sbPerfHead() + sbChart('sbPerf', 300) + sbLegend([
          { name: '分供商履约金额', color: '#2468F2' }, { name: '履约分供商数量', color: '#7FC4F5' }
        ])) +

      /* 相关报表：纯图表页需要一个下钻出口（资源 / 合作明细在资源数据报表里） */
      '<div class="dsc-card"><div class="dsc-card__body dsc-relbar">' +
      '<span class="dsc-relbar__label">相关报表</span>' +
      '<button class="dsc-btn" data-sb-go2="report" data-sb-ds="supplier">资源数据报表</button>' +
      '<button class="dsc-btn" data-sb-go2="compliance">供应商合规分析</button>' +
      '<span class="dsc-relbar__hint">本页为概览型看板；分供商资源与合作明细见「资源数据报表」</span>' +
      '</div></div>' +
      '</div>';
  }
  function sbLegend(list) {
    return '<div class="ck-legend">' + list.map(function (x) {
      return '<span><i style="background:' + x.color + '"></i>' + esc(x.label || x.name) + '</span>';
    }).join('') + '</div>';
  }

  D.pages['supplier-board'] = function () {
    return '<div class="dsc-page cockpit-page">' +
      pageHead('资源管理看板', '核心数据 · 资源：分供商规模 / 使用 / 履约') +
      scopeNote() + supplierBoardView() + '</div>';
  };


  function supplierBoardAfter(root) {
    bindMetricTips(root, SB_IND, 'data-sb-ind');
    function el(id) { return root.querySelector('#' + id); }
    function bar(id, cats, series, opt) {
      const box = el(id);
      if (box) D.barChart(box, { categories: cats, series: series }, Object.assign({}, SB_BAR, opt || {}));
    }
    function donut(id, rows, centerValue) {
      const box = el(id);
      if (box) D.donutChart(box, rows, {
        height: 280, hole: 0.6, centerText: '合计', centerValue: centerValue, digits: 0
      });
    }
    /* 分供商在库情况 */
    const stockOrg = el('sbStockOrg');
    if (stockOrg) {
      D.comboChart(stockOrg, {
        categories: SB_STOCK.orgNames,
        series: [
          { name: '在库分供商数量', data: SB_STOCK.orgCounts, type: 'bar', color: '#2468F2', color2: '#7FC4F5', unit: '家' },
          { name: '全局占比', data: SB_STOCK.orgShares, type: 'line', axis: 'right', color: '#D98C8C' }
        ]
      }, sbStockOpt({
        height: 360, rotateX: 45, padB: 110,
        barLabelSize: 10, yMax: 8000, y2Max: 10
      }));
    }
    const stockRegion = el('sbStockRegion');
    if (stockRegion) {
      D.comboChart(stockRegion, {
        categories: SB_STOCK.regions,
        series: [
          { name: '分供商数量', data: SB_STOCK.regionCounts, type: 'bar', color: '#2468F2', color2: '#7FC4F5', unit: '家' },
          { name: '全局占比', data: SB_STOCK.regionShares, type: 'line', axis: 'right', color: '#D98C8C' }
        ]
      }, sbStockOpt({
        height: 300, rotateX: 35, padB: 80,
        barLabelSize: 9, yMax: 18000, y2Max: 22
      }));
    }
    const stockType = el('sbStockType');
    if (stockType) {
      D.pieChart(stockType, SB_STOCK.types.map(function (t, i) {
        return { name: t, value: SB_STOCK.typeCounts[i], color: SB_STOCK.typeColors[i] };
      }), { height: 230, labels: false, digits: 0, unit: '家', cx: 0.5 });
    }
    const stockClass = el('sbStockClass');
    if (stockClass) {
      D.comboChart(stockClass, {
        categories: SB_STOCK.classes,
        series: [
          { name: '分供商数量', data: SB_STOCK.classCounts, type: 'bar', color: '#2468F2', color2: '#7FC4F5', unit: '家' },
          { name: '全局占比', data: SB_STOCK.classShares, type: 'line', axis: 'right', color: '#D98C8C' }
        ]
      }, sbStockOpt({
        height: 300, rotateX: 40, padB: 88,
        barLabelSize: 7, lineLabelOffset: -14, yMax: 25000, y2Max: 30
      }));
    }

    /* 分供商使用情况 */
    bar('sbRate', SB_RATE.cats, [
      { name: '分供商数量', data: SB_RATE.data, color: SB_BLUE, unit: '家' },
      { name: '占比', data: SB_RATE.rates, type: 'line', axis: 'right', color: '#D98C8C', unit: '%' }
    ], sbBarLineOpt({
      yMax: 14000, y2Max: 100, labelColor: '#334155',
      categoryTopLabels: SB_RATE.data.map(function (v) { return D.fmtInt(v); })
    }));
    bar('sbEval', SB_EVAL.cats, [
      { name: '分供商数量', data: SB_EVAL.data, color: SB_BLUE, unit: '家' },
      { name: '占比', data: SB_EVAL.pct, type: 'line', axis: 'right', color: '#D98C8C', unit: '%' }
    ], sbBarLineOpt({
      yMax: 55000, y2Max: 45,
      categoryTopLabels: SB_EVAL.data.map(function (v) { return D.fmtInt(v); })
    }));
    /* 转化与流失 */
    donut('sbConvert', SB_CONVERT, '9,851');
    donut('sbLoss', SB_LOSS, '7,391');
    /* 合作年限：全局五档 → 点击下钻到二级单位；柱顶统一显示「家数 + 占比」 */
    if (SBY.bucket == null) {
      bar('sbYears', SB_YEARS.buckets, [
        { name: '分供商数量', data: SB_YEARS_TOTAL, colors: SB_YEARS.colors, unit: '家' },
        { name: '占比', data: SB_YEARS_PCT, type: 'line', axis: 'right', color: '#D98C8C', unit: '%' }
      ], sbBarLineOpt({
        yMax: 7000, y2Max: 40, labelColor: '#334155',
        categoryTopLabels: SB_YEARS_TOTAL.map(function (v) { return D.fmtInt(v); }),
        onBarClick: function (i) {
          SBY.bucket = i; D.render();
        }
      }));
    } else {
      const vals = SB_YEARS_DATA[SBY.bucket];
      const total = vals.reduce(function (a, v) { return a + v; }, 0);
      const pct = vals.map(function (v) { return total ? v / total * 100 : 0; });
      bar('sbYears', SB_YEARS.cats, [
        { name: '分供商数量', data: vals, color: SB_YEARS.colors[SBY.bucket], unit: '家' },
        { name: '占比', data: pct, type: 'line', axis: 'right', color: '#D98C8C', unit: '%' }
      ], sbBarLineOpt({
        yMax: Math.ceil(Math.max.apply(null, vals) * 1.35 / 100) * 100,
        y2Max: 25, labelColor: '#334155',
        categoryTopLabels: vals.map(function (v) { return D.fmtInt(v); })
      }));
    }
    bar('sbPerf', SB_PERF.cats, [
      { name: '分供商履约金额', data: SB_PERF.amt, color: SB_BLUE, unit: '万元' },
      { name: '履约分供商数量', data: SB_PERF.cnt, color: '#7FC4F5', unit: '家', axis: 'right' }
    ], { height: 300, yDigits: 0, rDigits: 0, padL: 78, padR: 64, dataLabels: true, dataLabelUnit: false });

    /* 履约额阈值：失焦 / 回车后应用，重绘本区块与数量 */
    const perfTh = root.querySelector('[data-sb-perf-threshold]');
    if (perfTh) {
      perfTh.addEventListener('change', function () {
        const v = Math.round(parseFloat(perfTh.value));
        SBP.threshold = isNaN(v) || v < 0 ? 0 : v;
        D.render();
      });
    }

    D.delegate(root, [
      { sel: '[data-sb-go2]', fn: function (el2) {
        const p2 = el2.getAttribute('data-sb-go2');
        const ds = el2.getAttribute('data-sb-ds');
        D.nav(p2, ds ? { ds: ds } : {});
      } },
      /* 合作年限下钻：返回全局五档 */
      { sel: '[data-sb-years-back]', fn: function () { SBY.bucket = null; D.render(); } },
      /* 指标卡点击 → 滚到对应区块（原先卡片有手型光标但点了没反应） */
      { sel: '[data-sb-go]', fn: function (el2) {
        const secs = root.querySelectorAll('.ck-sec');
        const t = secs[+el2.getAttribute('data-sb-go')];
        if (!t) return;
        t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        t.classList.add('ck-sec--flash');
        setTimeout(function () { t.classList.remove('ck-sec--flash'); }, 1200);
      } }
    ]);
  }
  D.pages['supplier-board'].after = function (root) {
    supplierBoardAfter(root);
    commonAfter(root);
  };
})(window.APP);
