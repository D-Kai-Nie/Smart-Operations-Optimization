/* asset-board（由 view-cockpit.js 的共享 helper 拆分） */
(function (D) {
  'use strict';
  const esc = D.esc;
  const CS = D.cockpitState;
  const UI = D.ckUI;
  const CARET = UI.CARET;
  const section = UI.section, subHead = UI.subHead, pageHead = UI.pageHead, scopeNote = UI.scopeNote;
  const field = UI.field, metricCards = UI.metricCards, metricTabs = UI.metricTabs;
  const detailListHead = UI.detailListHead, filterFoot = UI.filterFoot, setFilterMore = UI.setFilterMore;
  const bindMetricTips = UI.bindMetricTips, metricColPicker = UI.metricColPicker,
        metricListTable = UI.metricListTable, commonAfter = UI.commonAfter;
  /* ============================================================
     资产管理 › 资产管理看板
     内容基准：`资产管理看板.png`（源页面「核心数据 · 资产」，截图左下角的缩略框为 Axure 面板，忽略）
     版式：沿用已评审优化的 ck-* 语言
     ============================================================ */
  const ASB = {
    metric: 'turnover', page: 1, size: 10,
    /* 统计区间（真日期控件）+ 顶部核心指标共用的一套查询条件与反馈；
       指标明细表直接复用这套条件，不再维护独立的明细筛选 */
    period: ['2025-06-01', '2026-05-31'],
    conds: {},
    hint: '',
    advanced: false,
    /* 项目资产调拨图下钻：空 = 二级单位，非空 = 该二级单位下的三级单位 */
    transferUnit: ''
  };

  /* 卡片值不写死：由下方 AB_RANK 的二级单位率值按资产金额加权汇总（见 abAggRate），
     与「指标明细表 · 合计行」同一个口径——卡片与列表不会再出现 73.53% / 6.46% 这种两套数 */
  const AB_IND = [
    { key: 'turnover', name: '资产周转率', value: 0, unit: '%', dec: 2,
      desc: '资产周转额 ÷ 资产平均原值 × 100%', src: '物管系统资产模块' },
    { key: 'idle', name: '资产闲置率', value: 0, unit: '%', dec: 2,
      desc: '闲置资产原值 ÷ 资产总原值 × 100%', src: '物管系统资产模块' },
    { key: 'doneTurnover', name: '竣工项目资产周转率', value: 0, unit: '%', dec: 2,
      desc: '竣工项目资产周转额 ÷ 竣工项目资产平均原值 × 100%（口径待确认 Q-08）', src: '物管系统资产模块' },
    { key: 'doneIdle', name: '竣工项目资产闲置率', value: 0, unit: '%', dec: 2,
      desc: '竣工项目闲置资产原值 ÷ 竣工项目资产总原值 × 100%（口径待确认 Q-08）', src: '物管系统资产模块' },
    { key: 'depRate', name: '资产折旧率', value: 0, unit: '%', dec: 2,
      desc: '当期折旧额 ÷ 资产原值 × 100%', src: '财务系统' }
  ];
  function abMetric(key) {
    return AB_IND.filter(function (m) { return m.key === key; })[0] || AB_IND[0];
  }
  const AB_MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'];
  /* 截图实测：折线在 88%~100% 区间，标注 95.79% / 95.12% / 93.45% */
  const AB_TREND = [95.79, 96.35, 96.28, 96.10, 95.86, 95.12, 94.72, 94.35, 94.02, 93.78, 93.60, 93.45];

  /* 每个指标的趋势都由「该指标卡片值」反推：形状取源图曲线，末点收敛到卡片值。
     此前是「源曲线 + 指标序号×0.6」的偏移，导致资产闲置率（卡片 5.85%）的趋势却画在 96% 量级，
     与资产周转率卡片（73.53%）和它自己的趋势（95.79→93.45）也对不上 */
  function abMetricTrend(m) {
    const last = AB_TREND[AB_TREND.length - 1] || 1;
    const k = (m && m.value != null ? m.value : last) / last;
    return AB_TREND.map(function (v) { return D.round(v * k, 2); });
  }

  /* 二级单位资产明细：21 个单位 × 分页。
     数据不是等差序列（原先周转率每行正好差 0.42、金额每行正好降 4.5%、调出额固定占 90%），
     改为「按单位规模派生 + 确定性扰动」：金额逐行不规则递减、调出占比 86.6%~94.8%、
     周转率有升有降；合计仍严格等于各行之和（296,947.26 / 329,611.44） */
  const AB_RANK = [
    ['一公司', 22022.71, 25162.23, 7.47],
    ['二公司', 21602.05, 24154.44, 7.14],
    ['四公司', 20980.19, 22337.68, 7.25],
    ['三公司', 20015.33, 23072.96, 6.83],
    ['东北公司', 18201.74, 20780.31, 5.95],
    ['总承包公司', 18169.38, 20088.52, 5.73],
    ['南方公司', 17856.02, 18859.73, 5.64],
    ['西南公司', 16002.72, 17504.42, 6.75],
    ['华南公司', 15393.45, 16923.25, 5.42],
    ['华北公司', 14381.28, 15809.50, 4.30],
    ['土木公司', 12907.06, 14818.98, 4.82],
    ['华东公司', 12335.60, 13422.14, 3.79],
    ['安装公司', 12271.65, 13966.90, 4.89],
    ['西北公司', 11592.28, 12870.63, 4.20],
    ['西南建设', 10452.40, 12008.43, 3.51],
    ['八局建投', 10177.37, 11252.99, 3.91],
    ['发展建设分公司', 9816.30, 10522.26, 1.69],
    ['轨道公司', 8834.02, 9387.23, 1.42],
    ['装饰公司', 8510.14, 9821.94, 2.23],
    ['北京公司', 8256.67, 8713.60, 1.04],
    ['文旅博览公司', 7168.90, 8133.30, 1.60]
  ];
  const AB_RANK_N = AB_RANK.length;
  /* 全局项目资产合计金额（万元）：与指标明细表合计行同口径，供「项目资产类别」柱图与区块头部共用 */
  const AB_TOTAL_AMT = D.round(AB_RANK.reduce(function (a, r) { return a + r[2]; }, 0), 2);
  /* 各指标的二级单位率值 = 该单位资产周转率 × 指标系数（量级对齐源图：周转 ~5%、闲置 ~4%、竣工周转 ~60%、折旧 ~5%） */
  const AB_RATE_FACTOR = { turnover: 1, idle: 0.72, doneTurnover: 12, doneIdle: 0.64, depRate: 1.06 };
  function abUnitRate(r, key) {
    return D.round(r[3] * (AB_RATE_FACTOR[key] || 1), 2);
  }
  /* 汇总率 = Σ(单位率 × 资产总金额) ÷ Σ资产总金额（折旧用资产原值，与单位率的分母一致） */
  function abAggRate(key, rows) {
    const list = rows || AB_RANK;
    const wOf = function (r) { return key === 'depRate' ? r[2] * 1.15 : r[2]; };
    const den = list.reduce(function (a, r) { return a + wOf(r); }, 0) || 1;
    const num = list.reduce(function (a, r) { return a + abUnitRate(r, key) * wOf(r); }, 0);
    return D.round(num / den, 2);
  }
  AB_IND.forEach(function (m) { m.value = abAggRate(m.key); });

  /* ---------- 明细筛选：顶部核心指标查询直接驱动指标明细表 ----------
     21 个二级单位行没有项目级维度字段，按单位名做确定性派生（同一单位每次都得同一值），
     使「项目类型 / 状态 / 业态 / 承包模式 / 地区 / 物料分类」都能落到行上；
     「组织」按二级单位名称精确匹配。 */
  const AB_ATTRS = {
    '地区': function () { return D.AREAS; },
    '物料分类': function () { return D.material.mid; },
    '项目类型': function () { return D.TYPES; },
    '项目状态': function () { return D.STATUS; },
    '项目业态': function () { return D.FORMATS; },
    '承包模式': function () { return D.MODES; }
  };
  function abHash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function abUnitAttr(name, key) {
    const list = AB_ATTRS[key] ? AB_ATTRS[key]() : null;
    return list && list.length ? list[abHash(name + '#' + key) % list.length] : '';
  }
  /* 资产类别是资产行级维度，一个单位可以同时持有多个分类。
     按单位名稳定派生 4~7 个分类：既能命中多个单位，又不会所有单位全命中。 */
  function abUnitCats(name) {
    const start = abHash(name + '#cat') % AB_CATS.length;
    const count = 4 + abHash(name + '#catn') % 4;
    const out = [];
    for (let i = 0; i < count; i++) out.push(AB_CATS[(start + i) % AB_CATS.length].name);
    return out;
  }
  /* 每个单位派生一个可用日期，默认区间内覆盖全部单位；
     用户收窄日期后，指标明细表会真实过滤 */
  const AB_PERIOD_START = Date.UTC(2025, 5, 1);
  function abUnitDate(name) {
    const day = abHash(name + '#period') % 365;
    return new Date(AB_PERIOD_START + day * 86400000).toISOString().slice(0, 10);
  }
  function abInPeriod(name) {
    const start = ASB.period[0], end = ASB.period[1];
    if (!start && !end) return true;
    const d = abUnitDate(name);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  }
  function abMatchUnit(r, conds) {
    return Object.keys(conds).every(function (k) {
      const v = conds[k];
      if (!v) return true;
      if (k === '组织') {
        return v.indexOf('中国建筑第八工程局') === 0 || r[0] === v;
      }
      if (k === '资产类别') {
        return abUnitCats(r[0]).indexOf(v) >= 0;
      }
      return abUnitAttr(r[0], k) === v;
    });
  }
  function abFilteredUnits() {
    return abVisibleUnits().filter(function (r) {
      return abInPeriod(r[0]) && abMatchUnit(r, ASB.conds);
    });
  }
  /* 统计区间：真日期控件，顶部核心指标与指标明细表共用 */
  function abDateRange() {
    return '<div class="ck-filter__item"><span class="ck-filter__label">日期选择</span>' +
      '<span class="ck-grain" data-ck-grain="日期选择">' + esc(CS.settleGrain) + CARET + '</span>' +
      '<span class="ck-daterange">' +
      '<input class="ck-field ck-field--date" type="date" data-ab-period="start" value="' + esc(ASB.period[0]) + '"/>' +
      '<span class="ck-daterange__sep">~</span>' +
      '<input class="ck-field ck-field--date" type="date" data-ab-period="end" value="' + esc(ASB.period[1]) + '"/>' +
      '</span></div>';
  }
  /* 资产筛选底栏：复用通用 filterFoot，只替换为 data-ab-* 属性 */
  function abActions() {
    return filterFoot({
      advAttr: 'data-ab-adv', advLabel: ASB.advanced ? '收起' : '展开', advOn: ASB.advanced,
      hint: ASB.hint,
      queryAttr: 'data-ab-query', clearAttr: 'data-ab-clear', resetAttr: 'data-ab-reset'
    });
  }
  /* 图表标题右侧的合计金额：与资源看板「全局使用率」同一套灰色标签 + 蓝色数值 */
  function abTotal(label, value, tip) {
    return '<span class="ck-subhead__extra ck-subhead__extra--rate" title="' + esc(tip) + '">' +
      '<span class="ck-subhead__rate-label">' + esc(label) + '</span>' +
      '<b>' + D.fmtNum(value, 2) + ' 万元</b></span>';
  }
  function abReadConds(box) {
    const conds = {};
    box.querySelectorAll('[data-ck-field]').forEach(function (f) {
      const v = (f.value || '').trim();
      if (v) conds[f.getAttribute('data-ck-field')] = v;
    });
    return conds;
  }
  function abReadPeriod(box) {
    const s = box.querySelector('[data-ab-period="start"]');
    const e = box.querySelector('[data-ab-period="end"]');
    if (s) ASB.period[0] = s.value || '';
    if (e) ASB.period[1] = e.value || '';
  }
  /* 二级单位资产周转率明细的动态列（Axure 局驾驶舱核心数据 · 资产「设置列」口径） */
  const AB_COLS = [
    { key: 'org2', name: '二级单位', width: 160 },
    { key: 'outAmt', name: '项目调出资产总金额（万元）', width: 220, num: true },
    { key: 'totalAmt', name: '项目资产总金额（万元）', width: 200, num: true },
    { key: 'rate', name: '资产周转率（%）', width: 150, num: true, danger: true },
    { key: 'share', name: '调出占资产额比（%）', width: 170, num: true, pct: true }
  ];
  const AB_COLS_DEF = ['idx', 'org2', 'outAmt', 'totalAmt', 'rate'];
  /* 项目资产分类：按《项目资产类别》数据字典的 11 个枚举值（顺序与字典一致）。
     字典只定义分类，未提供金额；柱图金额按「全局项目资产合计金额 × 示意占比」拆分，
     占比合计 100%，仅用于演示趋势，不冒充取数结果。 */
  const AB_CATS = D.ASSET_CATEGORIES.map(function (c) {
    return { key: c.key, name: c.name, value: c.share };
  });
  const AB_CAT_NAMES = AB_CATS.map(function (x) { return x.name; });
  /* 分类金额：按示意占比拆分全局合计，末项吸收四舍五入差额，保证柱子之和 = 头部合计 */
  function abCatRows() {
    let used = 0;
    return AB_CATS.map(function (x, i) {
      const amt = i === AB_CATS.length - 1
        ? D.round(AB_TOTAL_AMT - used, 2)
        : D.round(AB_TOTAL_AMT * x.value / 100, 2);
      used = D.round(used + amt, 2);
      return {
        name: x.name, amt: amt,
        share: D.round(amt / AB_TOTAL_AMT * 100, 2)
      };
    });
  }
  /* 项目资产调拨：默认取局驾驶舱同源的 8 个二级单位；三级单位取各二级单位下的真实子组织。
     金额沿用原 8 组样本，下钻时按父级金额拆分到子单位，保证子项之和 = 父级。 */
  const AB_TRANSFER_ORGS = D.orgs.slice(0, 8).map(function (o) { return o.name; });
  const AB_COMBO = {
    cost: [14500, 12000, 9000, 7000, 6500, 6200, 6200, 5800],
    out: [1200, 1200, 300, 200, 200, 200, 200, 500]
  };
  function abTransferRows() {
    const parent = ASB.transferUnit;
    if (!parent) {
      return AB_TRANSFER_ORGS.map(function (name, i) {
        return { name: name, cost: AB_COMBO.cost[i], out: AB_COMBO.out[i] };
      });
    }
    const pi = AB_TRANSFER_ORGS.indexOf(parent);
    const cost = pi >= 0 ? AB_COMBO.cost[pi] : 0;
    const out = pi >= 0 ? AB_COMBO.out[pi] : 0;
    const children = D.subOrgsByParent[parent] || [];
    if (!children.length) return [{ name: parent, cost: cost, out: out }];
    const split = function (total, weights) {
      const sum = weights.reduce(function (a, v) { return a + v; }, 0) || 1;
      let used = 0;
      return weights.map(function (w, j) {
        const v = j === weights.length - 1
          ? D.round(total - used, 2)
          : D.round(total * w / sum, 2);
        used = D.round(used + v, 2);
        return v;
      });
    };
    const costW = children.map(function (s, j) { return 1 + ((pi * 3 + j * 5) % 4) * 0.2; });
    const outW = children.map(function (s, j) { return 0.7 + ((pi * 7 + j * 9) % 5) * 0.15; });
    const costs = split(cost, costW);
    const outs = split(out, outW);
    return children.map(function (s, j) {
      return { name: s.shortName, cost: costs[j], out: outs[j] };
    });
  }
  function abTransferTotal(rows) {
    return D.round((rows || abTransferRows()).reduce(function (a, r) { return a + r.out; }, 0), 2);
  }

  /* 资产看板 5 个指标 → 指标字段模型（周转率 / 闲置率 / 折旧率三套口径） */
  const AB_METRIC_MAP = {
    turnover: 'assetTurnover', doneTurnover: 'assetTurnover',
    idle: 'assetIdle', doneIdle: 'assetIdle', depRate: 'assetDepRate'
  };
  /* R2：受限视角只返回本单位行 */
  function abVisibleUnits() {
    const scope = D.scope.name;
    return AB_RANK.filter(function (r) {
      return D.scope.level === 1 || r[0].indexOf(scope.replace(/公司$/, '')) >= 0;
    });
  }
  function abRankTable() {
    const all = abFilteredUnits();
    if (!all.length) {
      return '<div class="ck-table__empty">没有符合筛选条件的二级单位，请调整上方查询条件后重新查询</div>';
    }
    const pages = Math.max(1, Math.ceil(all.length / ASB.size));
    if (ASB.page > pages) ASB.page = pages;
    const metric = AB_METRIC_MAP[ASB.metric] || 'assetTurnover';
    const key = ASB.metric;
    /* 全量行：率值随指标切换；金额与率值同口径（闲置额 = 总资产 × 闲置率、折旧额 = 原值 × 折旧率） */
    const data = all.map(function (r) {
      const total = r[2];
      const rate = abUnitRate(r, key);
      if (metric === 'assetIdle') {
        return { name: r[0], idleAmt: D.round(total * rate / 100, 2), totalAmt: total, rate: rate };
      }
      if (metric === 'assetDepRate') {
        const orig = D.round(total * 1.15, 2);
        return { name: r[0], depAmt: D.round(orig * rate / 100, 2), origAmt: orig, rate: rate };
      }
      return { name: r[0], outAmt: r[1], totalAmt: total, rate: rate };
    });
    const rows = data.slice((ASB.page - 1) * ASB.size, (ASB.page - 1) * ASB.size + ASB.size);
    /* totalRows 传全量：合计行覆盖全部单位且跨页不变；率值按资产金额加权 */
    return metricListTable({ metric: metric, rows: rows, totalRows: data,
      weightKey: metric === 'assetDepRate' ? 'origAmt' : 'totalAmt',
      ds: 'asset', page: ASB.page, size: ASB.size, totalName: '全部 ' + all.length + ' 个单位' });
  }

  function assetBoardView() {
    const m = abMetric(ASB.metric);
    const unitN = abFilteredUnits().length;
    const bc = ASB.conds;
    const transferRows = abTransferRows();
    const transferTotal = abTransferTotal(transferRows);
    const transferTitle = ASB.transferUnit ? '项目资产调拨 · ' + ASB.transferUnit : '项目资产调拨';
    const transferBack = ASB.transferUnit
      ? '<button class="dsc-btn dsc-btn--sm" data-ab-transfer-back style="margin-right:12px">返回二级单位</button>'
      : '';
    const transferHint = ASB.transferUnit
      ? '当前展示「' + esc(ASB.transferUnit) + '」的三级单位；点击上方「返回二级单位」'
      : '点击任一柱形查看该二级单位的三级单位';
    return '<div class="ck-view ck-view--metrics">' +
      /* 核心指标：指标卡 / 页签 / 趋势 / 指标明细表统一放在一个区块内 */
      section('核心指标',
      /* 5 指标卡（与采购 / 物资看板同款：数值在上、名称在下） */
      metricCards(AB_IND, 'data-ab-metric', ASB.metric, 'ck-metrics--5') +

      /* 筛选条（与采购 / 物资同款折叠展开）：查询结果落到下方指标明细表 */
      '<div class="ck-filter ck-filter--panel" data-ab-scope="board">' +
      '<div class="ck-filter__row">' +
      abDateRange() +
      field('项目类型', bc['项目类型'] || '') + field('项目状态', bc['项目状态'] || '') +
      field('组织', bc['组织'] || '') + field('资产类别', bc['资产类别'] || '', AB_CAT_NAMES) +
      '</div>' +
      '<div class="ck-filter__more" ' + (ASB.advanced ? '' : 'hidden') + '>' +
      field('项目业态', bc['项目业态'] || '') + field('承包模式', bc['承包模式'] || '') +
      field('地区', bc['地区'] || '') + field('物料分类', bc['物料分类'] || '') +
      '</div>' + abActions() + '</div>' +

      /* 指标页签 + 红色趋势 */
      metricTabs(AB_IND, 'data-ab-tab', ASB.metric) +
      subHead(m.name + '随时间变化的趋势') +
      '<div class="dsc-chart" id="abTrend" style="height:280px"></div>' +

      /* 指标明细表：与顶部核心指标共用查询条件，不再单独设查询区 */
      detailListHead({ count: unitN, gap: true, gear: 'data-ab-columns' }) +
      abRankTable() +
      '<div data-ab-pager>' + D.pager({ page: ASB.page, size: ASB.size, total: unitN }) + '</div>') +

      /* 项目资产数据分析：类别金额 → 项目资产调拨，两图均横向铺满 */
      section('项目资产数据分析',
        subHead('项目资产类别',
          abTotal('项目资产合计金额', AB_TOTAL_AMT,
            '项目资产合计金额 = 全部二级单位项目资产总金额；分类金额按 11 类示意占比拆分'),
          '单位：万元') +
        '<div class="dsc-chart" id="abCatBar" style="height:340px"></div>' +
        '<div class="ck-legend">' +
        '<span><i style="background:#2468F2"></i>资产现值金额</span>' +
        '<span><i class="ck-legend__line ck-legend__line--rose"></i>占比</span>' +
        '</div>' +

        subHead(transferTitle,
          transferBack + abTotal('项目资产调拨合计金额', transferTotal,
            '项目资产调拨合计金额 = 当前范围内各单位资产调出金额之和'),
          '单位：万元') +
        '<div class="dsc-chart" id="abCombo" style="height:320px" title="' + transferHint + '"></div>' +
        '<div class="ck-legend">' +
        '<span><i style="background:#2468F2"></i>资产原值金额</span>' +
        '<span><i style="background:#7FC4F5"></i>资产调出金额</span>' +
        '<span><i class="ck-legend__line ck-legend__line--rose"></i>资产调出率</span>' +
        '</div>') +

      /* 相关报表：概览型看板需要单位 / 项目级明细的下钻出口（与分供商看板同款） */
      '<div class="dsc-card u-mt-lg"><div class="dsc-card__body dsc-relbar">' +
      '<span class="dsc-relbar__label">相关报表</span>' +
      '<button class="dsc-btn" data-ab-report>资产数据报表</button>' +
      '<span class="dsc-relbar__hint">本页为概览型看板；二级单位 / 项目级资产明细见「资产数据报表」</span>' +
      '</div></div>' +
      '</div>';
  }

  D.pages['asset-board'] = function () {
    return '<div class="dsc-page cockpit-page">' +
      pageHead('资产管理看板', '核心数据 · 资产：资产周转率 / 闲置率 / 折旧率与指标明细表') +
      scopeNote() + assetBoardView() + '</div>';
  }
  function assetBoardAfter(root) {
    bindMetricTips(root, AB_IND, 'data-ab-metric');

    const trend = root.querySelector('#abTrend');
    if (trend) {
      const m = abMetric(ASB.metric);
      D.lineChart(trend, {
        categories: AB_MONTHS,
        series: [{ name: m.name, data: abMetricTrend(m), color: '#D0021B' }]
      }, { height: 280, area: false, lineWidth: 1.8, dotR: 3.5, unit: m.unit, tipDigits: 2,
        dataLabels: true, labelDigits: 2, padL: 64,
        /* 刻度保留 2 位小数：率值区间窄（5.18% 上下，步长 0.05），取整/1 位都会出现重复刻度 */
        yDigits: 2, yUnit: m.unit });
    }

    /* 项目资产类别：柱 = 资产现值金额，线 = 占比（右轴）；横向铺满 */
    const catBar = root.querySelector('#abCatBar');
    if (catBar) {
      const rows = abCatRows();
      D.barChart(catBar, {
        categories: rows.map(function (r) { return r.name; }),
        series: [
          { name: '资产现值金额', data: rows.map(function (r) { return r.amt; }),
            color: '#2468F2', unit: '万元' },
          { name: '占比', data: rows.map(function (r) { return r.share; }),
            color: '#D98C8C', type: 'line', axis: 'right', unit: '%' }
        ]
      }, { height: 340, dataLabels: true, dataLabelUnit: false, barLabelSize: 9,
        barLabelInside: true, labelColor: '#4A5568',
        yDigits: 0, yUnit: '万元', rDigits: 1, y2Unit: '%', y2Color: '#999',
        lineLabels: true, lineLabelDigits: 1, lineLabelUnit: '%',
        lineLabelColor: '#C0504D', lineLabelSize: 9, lineLabelOffset: -10,
        padT: 34, padL: 80, padR: 56, rotateX: 25, padB: 96 });
    }

    /* 项目资产调拨：二级单位 → 点击柱形下钻三级单位；两根金额柱 + 调出率折线保持不变 */
    const combo = root.querySelector('#abCombo');
    if (combo) {
      const rows = abTransferRows();
      const outRate = rows.map(function (r) {
        return r.cost ? D.round(r.out / r.cost * 100, 2) : 0;
      });
      D.barChart(combo, {
        categories: rows.map(function (r) { return r.name; }),
        series: [
          { name: '资产原值金额', data: rows.map(function (r) { return r.cost; }), color: '#2468F2', unit: '万元' },
          { name: '资产调出金额', data: rows.map(function (r) { return r.out; }), color: '#7FC4F5', unit: '万元' },
          { name: '资产调出率', data: outRate, color: '#D98C8C', type: 'line', axis: 'right', unit: '%' }
        ]
      }, { height: 320, yDigits: 0, yUnit: '万元', padR: 64, dataLabels: true,
        dataLabelUnit: false, barLabelSize: 9, barLabelInside: true,
        labelColor: '#4A5568', padT: 34, padL: 80,
        /* 右轴是调出率，必须带 %；二级单位名较长，斜置 30° 避免横向压成一串 */
        rDigits: 1, y2Unit: '%', y2Color: '#999',
        lineLabels: true, lineLabelDigits: 1, lineLabelUnit: '%',
        lineLabelColor: '#C0504D', lineLabelSize: 9, lineLabelOffset: 14,
        rotateX: 30, padB: 96,
        onBarClick: ASB.transferUnit ? null : function (i) {
          const row = rows[i];
          if (!row) return;
          ASB.transferUnit = row.name;
          D.render();
          D.toast('已下钻到「' + row.name + '」的三级单位');
        } });
    }

    D.delegate(root, [
      { sel: '[data-ab-adv]', fn: function (el) {
        ASB.advanced = !ASB.advanced;
        setFilterMore(el, ASB.advanced);
      } },
      { sel: '[data-ab-metric]', fn: function (el) { ASB.metric = el.getAttribute('data-ab-metric'); D.render(); } },
      { sel: '[data-ab-tab]', fn: function (el) { ASB.metric = el.getAttribute('data-ab-tab'); D.render(); } },
      { sel: '[data-ab-transfer-back]', fn: function () {
        ASB.transferUnit = '';
        D.render();
        D.toast('已返回二级单位');
      } },
      { sel: '[data-ab-columns]', fn: function () {
        const k = AB_METRIC_MAP[ASB.metric] || 'assetTurnover';
        metricColPicker(k, abMetric(ASB.metric).name + ' · 指标明细列表');
      } },
      /* 查询：顶部核心指标条件直接落到指标明细表 */
      { sel: '[data-ab-query]', fn: function (el) {
        const box = el.closest('.ck-filter');
        if (!box) return;
        ASB.conds = abReadConds(box);
        abReadPeriod(box);
        ASB.page = 1;
        const periodOn = !!(ASB.period[0] || ASB.period[1]);
        const total = Object.keys(ASB.conds).length + (periodOn ? 1 : 0);
        const hits = abFilteredUnits().length;
        ASB.hint = total
          ? '已按 ' + total + ' 项条件筛选 · 命中 ' + hits + ' 个单位（明细见下方）'
          : '未设置筛选条件，显示全部 ' + abVisibleUnits().length + ' 个单位';
        D.render();
        D.toast(ASB.hint);
      } },
      { sel: '[data-ab-clear]', fn: function () {
        ASB.conds = {};
        ASB.hint = '';
        ASB.period = ['', ''];
        ASB.page = 1;
        D.render();
        D.toast('已清空筛选条件');
      } },
      { sel: '[data-ab-reset]', fn: function () {
        ASB.conds = {};
        ASB.hint = '';
        ASB.period = ['2025-06-01', '2026-05-31'];
        ASB.page = 1;
        D.render();
        D.toast('已重置查询条件');
      } },
      /* 相关报表出口：带上当前组织视角（局总部不传 org） */
      { sel: '[data-ab-report]', fn: function () {
        const org = D.scope.level > 1 ? D.scope.name : '';
        D.toast('打开资产数据报表' + (org ? '（组织视角 ' + org + '）' : ''));
        D.nav('report', org ? { ds: 'asset', org: org } : { ds: 'asset' });
      } }
    ]);

    /* 分页自管（避免走全局 __pagerCb） */
    const pbox = root.querySelector('[data-ab-pager]');
    if (pbox) {
      pbox.addEventListener('click', function (e) {
        const b = e.target.closest('[data-pg]');
        if (!b || b.disabled) return;
        e.stopPropagation();
        ASB.page = +b.getAttribute('data-pg');
        D.toast('已切换到第 ' + ASB.page + ' 页');
        D.render();
      });
      pbox.addEventListener('change', function (e) {
        if (!e.target.matches || !e.target.matches('[data-pg-size]')) return;
        e.stopPropagation();
        ASB.size = +e.target.value; ASB.page = 1; D.render();
      });
    }
  }
  D.pages['asset-board'].after = function (root) {
    assetBoardAfter(root);
    commonAfter(root);
  };
})(window.APP);
