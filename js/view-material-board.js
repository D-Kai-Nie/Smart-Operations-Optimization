/* material-board（由 view-cockpit.js 的共享 helper 拆分） */
(function (D) {
  'use strict';
  const esc = D.esc;
  const CS = D.cockpitState;
  const UI = D.ckUI;
  const CARET = UI.CARET;
  const section = UI.section, subHead = UI.subHead, field = UI.field, advActions = UI.advActions;
  const pageHead = UI.pageHead, scopeNote = UI.scopeNote;
  const metricCards = UI.metricCards, metricTabs = UI.metricTabs, detailListHead = UI.detailListHead;
  const metricListTable = UI.metricListTable, metricColPicker = UI.metricColPicker;
  const bindMetricTips = UI.bindMetricTips, commonAfter = UI.commonAfter;
  /* ============================================================
     物资管理 › 物资管理看板
     内容基准：`物资管理看板.png`（页面标题「核心数据 · 物资」）
     版式：沿用「采购管理看板」的 ck-* 语言（指标卡带 → 筛选 → 页签 + 红色趋势 → 明细 → 区块）
     ============================================================ */
  const MS = {
    /* 降本明细的本页内下钻路径（二级单位 → 三级单位 → 项目）；与「跳数据报表」无关 */
    drill: { org2: '', org3: '', project: '' },
    metric: 'bargain',   // 顶部指标带 / 页签当前项
    save: 'total',       // 六项降本当前项
    rankPage: 1, detailPage: 1, size: 10,
    hide: {},              // 六项降本趋势图例的熄灭状态（下标 → true 表示已熄灭）
    sign: '全部',           // 降本金额正负：全部 / 正数 / 负数
    items: null,           // 降本明细项查询：勾选的小项集合（null = 全选）
    msOpen: false,         // 复选下拉面板是否展开（重绘后保持展开）
    kpiMode: 'amt',         // 卡片放大口径：amt = 放大降本金额；rate = 放大产值占比
    more: false,
    /* 闲废物资：已生效的查询条件 + 两份台账各自页码 */
    idle: { doc: 'transfer', org2: '', org3: '', matSmall: '', from: '', to: '',
      project: '', pageT: 1, pageR: 1 },
    idleHide: [false, false],   // 闲废物资柱图图例：物资调拨 / 废旧处理两系列的熄灭状态
    idleSize: 10
  };
  D.materialBoardState = MS;   // 与 projectState / reportState / complianceState 一致：导出供测试与联动使用

  const MB_METRICS = [
    { key: 'bargain', name: '二次议价采购成本降低率', value: 5.85, unit: '%', dec: 2,
      desc: '二次议价成本降低额 ÷ 不含税采购金额 × 100%', src: '物资系统' },
    { key: 'orderRatio', name: '合同下单比例', value: 73.53, unit: '%', dec: 2,
      desc: '已下单合同金额 ÷ 合同总额 × 100%', src: '物资系统' },
    { key: 'payRatio', name: '按合同履约支付率', value: 45.57, unit: '%', dec: 2,
      desc: '按合同实际支付金额 ÷ 按合同应支付金额 × 100%', src: '物资系统 + 财务' },
    { key: 'monthSettle', name: '月度结算完成率', value: 45.57, unit: '%', dec: 2,
      desc: '本月已完成结算金额 ÷ 本月应结算金额 × 100%', src: '物资系统' },
    { key: 'orderPlan', name: '订单计划使用率', value: 45.57, unit: '%', dec: 2,
      desc: '订单引用计划的金额 ÷ 订单总金额 × 100%', src: '物资系统' },
    { key: 'totalSettle', name: '总结算完成率', value: 45.57, unit: '%', dec: 2,
      desc: '已完成结算金额 ÷ 应结算总额 × 100%', src: '物资系统' }
  ];
  const MB_MONTHS = ['2025.04', '2025.05', '2025.06', '2025.07', '2025.08', '2025.09',
    '2025.10', '2025.11', '2025.12', '2026.01', '2026.02', '2026.03'];
  D.materialBoardMonths = MB_MONTHS;   // 六项降本模块复用同一组带年度的月份标签
  /* 截图实测：二次议价采购成本降低率 2025.04—2026.03 月度序列 */
  const MB_TREND_BARGAIN = [3.51, 2.83, 6.35, 4.58, 4.37, 3.86, 3.05, 2.01, 1.98, 1.97, 2.03, 3.24];
  function mbMetricTrend(m) {
    if (m.key === 'bargain') return MB_TREND_BARGAIN.slice();
    /* 截图只给出议价一条曲线，其余 5 项按同一口径生成模拟序列，末点收敛到卡片值 */
    const n = MB_MONTHS.length;
    const out = MB_MONTHS.map(function (_, i) {
      const k = i / (n - 1);
      const wob = (((i * 5 + m.key.length * 3) % 9) - 4) / 55;
      return D.round(m.value * (0.86 + 0.14 * k) * (1 + wob), 2);
    });
    out[n - 1] = m.value;
    return out;
  }
  function mbMetric(key) {
    return MB_METRICS.filter(function (m) { return m.key === key; })[0] || MB_METRICS[0];
  }

  /* 二级单位排行（截图实测 10 行 + 合计） */
  /* 二级单位排行：源图给出前 10 行，其余 11 个二级单位按同一量级补全，
     让「共计 21 条」与分页器成为真实数据（原先 total=60 但只渲染 10 行，翻页不变内容） */
  const MB_RANK = [
    ['一公司', 4780.85, 5789.85, 0.35],
    ['二公司', 4230.85, 4230.85, 0.90],
    ['三公司', 3980.43, 3980.43, 1.90],
    ['四公司', 3889.57, 3889.57, 2.40],
    ['东北公司', 3878.57, 3878.57, 2.60],
    ['总承包公司', 2930.90, 2930.90, 3.10],
    ['南方公司', 2789.79, 2920.45, 3.25],
    ['西南公司', 1685.40, 2874.19, 4.50],
    ['华南公司', 1685.15, 1036.15, 9.80],
    ['华北公司', 1604.32, 2817.54, 10.10],
    ['土木公司', 1498.72, 2023.27, 10.80],
    ['安装公司', 1356.34, 1831.06, 11.85],
    ['华东公司', 1227.49, 1657.11, 12.90],
    ['西北公司', 1110.88, 1499.68, 13.95],
    ['西南建设', 1005.34, 1357.21, 15.00],
    ['八局建投', 909.84, 1228.28, 16.05],
    ['发展建设分公司', 823.40, 1111.59, 17.10],
    ['装饰公司', 745.18, 1005.99, 18.15],
    ['轨道公司', 674.39, 910.42, 19.20],
    ['北京公司', 610.32, 823.93, 20.25],
    ['文旅博览公司', 552.34, 745.66, 21.30]
  ];
  /* 二级单位排行的动态列（字段对齐 Axure 局驾驶舱核心数据「设置列」的基本信息 + 指标信息） */
  const MB_RANK_COLS = [
    { key: 'name', name: '二级单位', width: 200 },
    { key: 'saveAmt', name: '二次议价成本降低额（万元）', width: 220, num: true },
    { key: 'totalAmt', name: '总采购金额（万元）', width: 190, num: true },
    { key: 'rate', name: '二次议价成本降低率', width: 180, num: true, danger: true },
    { key: 'share', name: '议价降本占采购额比', width: 170, num: true, pct: true }
  ];
  const MB_RANK_DEF = ['name', 'saveAmt', 'totalAmt', 'rate'];

  /* 合计取全部 21 行之和；比率类指标不可累加，合计行显示「—」 */
  const MB_RANK_TOTAL = ['41,970.07', '48,542.70'];
  const MB_TOTAL_N = MB_RANK.length;

  /* 二级单位排行 = 当前指标的明细列表（字段随指标切换，齿轮走 metricColPicker 的同一套 store）
     与采购/资产看板同构：D.metricRows 生成「基本信息 + 指标信息」，metricListTable 渲染 合计 + 分页行 */
  function mbRankTable() {
    const scope = D.scope.name;
    const visible = MB_RANK.filter(function (r) {
      return D.scope.level === 1 || r[0].indexOf(scope.replace(/公司$/, '')) >= 0;
    });
    const pages = Math.max(1, Math.ceil(visible.length / MS.size));
    if (MS.rankPage > pages) MS.rankPage = pages;
    const paged = visible.slice((MS.rankPage - 1) * MS.size, (MS.rankPage - 1) * MS.size + MS.size);
    const names = paged.map(function (r) { return r[0]; });
    const metric = MS.metric;
    const rows = D.metricRows(names, metric, function (short) {
      const hit = MB_RANK.filter(function (r) { return r[0] === short; })[0];
      return hit ? hit[3] : null;      // 该单位在当前指标上的取值
    });
    return metricListTable({ metric: metric, rows: rows, ds: 'material',
      page: MS.rankPage, size: MS.size, totalName: '全部 ' + MB_TOTAL_N + ' 个单位' });
  }

  /* 物资管理看板主体：指标卡带 → 主筛选 → 指标页签 + 红色趋势 → 指标明细表 → 六项降本 → 废旧物资处理 */

  function materialBoardView() {
    const m = mbMetric(MS.metric);
    return '<div class="ck-view ck-view--metrics">' +
      /* 核心指标：指标卡 / 页签 / 趋势 / 指标明细表统一放在一个区块内 */
      section('核心指标',
      /* 6 指标卡（与页签双向联动） */
      metricCards(MB_METRICS, 'data-mb-metric', MS.metric, 'ck-metrics--6') +

      /* 主筛选条 */
      '<div class="ck-filter ck-filter--panel">' +
      '<div class="ck-filter__row">' +
      field('项目类型', '') + field('项目状态', '') + field('承包模式', '') +
      '</div><div class="ck-filter__row">' +
      '<div class="ck-filter__item"><span class="ck-filter__label">日期选择</span>' +
      '<span class="ck-grain" data-ck-grain="日期选择">' + esc(CS.settleGrain) + CARET + '</span>' +
      '<span class="ck-field ck-field--date">2025-06-01 ~ 2026-05-31</span></div>' +
      field('二级单位', '') + field('三级单位', '') +
      '</div>' +
      '<div class="ck-filter__more" ' + (CS.advanced ? '' : 'hidden') + '>' +
      field('项目业态', '') + field('地区', '') + field('组织', '') +
      field('物料分类', '') + field('项目名称', '') +
      '</div>' +
      advActions() + '</div>' +

      /* 指标页签 + 红色趋势 */
      metricTabs(MB_METRICS, 'data-mb-tab', MS.metric) +
      subHead(m.name + '随时间变化的趋势') +
      '<div class="dsc-chart" id="mbTrend" style="height:280px"></div>' +

      /* 指标明细表：同一「核心指标」区块内的明细列表 */
      detailListHead({ count: MB_RANK.length, gear: 'data-mb-rank-cols' }) +
      mbRankTable() +
      '<div data-mb-pager="rankPage">' + D.pager({ page: MS.rankPage, size: MS.size, total: MB_RANK.length }) + '</div>') +

      /* 六项降本（含降本明细清单：卡片 → 统一查询 → 趋势 → 清单） */
      D.materialSaveUI.section() +

      D.materialIdleUI.section() +
      '</div>';
  }


  D.pages['material-board'] = function () {
    return '<div class="dsc-page cockpit-page">' +
      pageHead('物资管理看板', '核心数据 · 物资：降本与结算指标，含六项降本、降本明细与闲废物资') +
      scopeNote() + materialBoardView() + '</div>';
  }

  function materialBoardAfter(root) {
    bindMetricTips(root, MB_METRICS, 'data-mb-metric');
    const m = mbMetric(MS.metric);
    const trend = root.querySelector('#mbTrend');
    if (trend) {
      D.lineChart(trend, {
        categories: MB_MONTHS,
        series: [{ name: m.name, data: mbMetricTrend(m), color: '#D0021B' }]
      }, { height: 280, area: false, lineWidth: 1.8, dotR: 3.5, unit: m.unit, tipDigits: 2,
        dataLabels: true, labelDigits: 2, padL: 56 });
    }

    D.delegate(root, [
      /* 指标卡 ↔ 页签 双向联动 */
      { sel: '[data-mb-metric]', fn: function (el) { MS.metric = el.getAttribute('data-mb-metric'); D.render(); } },
      { sel: '[data-mb-tab]', fn: function (el) { MS.metric = el.getAttribute('data-mb-tab'); D.render(); } },
      { sel: '[data-mb-rank-cols]', fn: function () {
        metricColPicker(MS.metric, MB_METRICS.filter(function (x) { return x.key === MS.metric; })[0].name +
          ' · 指标明细列表');
      } }
    ]);

    /* 两个表各自的分页（拦截冒泡，避免走全局 __pagerCb） */
    root.querySelectorAll('[data-mb-pager]').forEach(function (box) {
      const key = box.getAttribute('data-mb-pager');
      box.addEventListener('click', function (e) {
        const b = e.target.closest('[data-pg]');
        if (!b || b.disabled) return;
        e.stopPropagation();
        MS[key] = +b.getAttribute('data-pg');
        D.toast('已切换到第 ' + MS[key] + ' 页');
        D.render();
      });
      box.addEventListener('change', function (e) {
        if (!e.target.matches || !e.target.matches('[data-pg-size]')) return;
        e.stopPropagation();
        MS.size = +e.target.value; MS.rankPage = 1; MS.detailPage = 1; D.render();
      });
    });

  }
  D.pages['material-board'].after = function (root) {
    materialBoardAfter(root);
    D.materialSaveUI.after(root);
    D.materialIdleUI.after(root);
    commonAfter(root);
  };
})(window.APP);
