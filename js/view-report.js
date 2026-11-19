/* ============================================================
   F4 物资数据报表 / F5 采购数据报表 / F6 资源数据报表 / F7 资产数据报表
   原型分类：CRUD/list（克制视觉，宽表主导）
   ============================================================ */
(function (D) {
  'use strict';
  const esc = D.esc;

  /* 列定义 / 默认列 / 筛选字段见 view-report-config.js（配置与渲染分离） */
  const RC = D.reportConfig;
  const COLS = RC.COLS, DEFAULT_SHOWN = RC.DEFAULT_SHOWN, SUP_MAT_SMALL = RC.SUP_MAT_SMALL;
  const ASSET_STATS_COLS = RC.ASSET_STATS_COLS;
  const filterFields = function (ds, view) { return RC.filterFields(ds, view, RS); };

  const RS = {
    page: 1, sizeBy: {},   // 分页大小按数据集记忆（采购明细默认 15 行/页）
    overviewLevel: 2,      // F5 总览下钻层级 2=二级 3=三级 4=项目
    overviewOrg: '',
    overviewBase: null,    // 下钻时携带的上级金额口径（保证下级合计 = 上级）
    overviewStack: [],     // 下钻路径（不含根）：[二级单位, 三级单位] → 面包屑可逐级点回
    lastRows: [],          // 总览当前行（供下钻时按索引取用）
    purGrain: '日',        // 采购总览统计粒度
    matGrain: '日',        // 物资总览统计粒度
    assetGrain: '日',      // 资产报表统计粒度
    view: '',              // 采购 / 物资报表当前页签（overview=局级总览 / detail=明细）
    conds: {},             // 用户已提交的筛选条件（重绘后回填，不因查询 / 切页签丢失）
    pageKey: '',           // 「数据集+页签」标识：只有换页签/换报表才把页码复位到 1
    condText: '',          // 就地展示的条件摘要（看板同款反馈）
    supTab: 'resource',
    assetTab: 'stats',     // 资产报表：资产统计报表（按项目）/ 资产明细表（按资产编码）
    sortKey: '', sortDir: 'asc'
  };
  D.reportState = RS;

  const DS = {
    material: { name: '物资数据报表', note: '局级总览：物资 6 项核心指标（二级单位，可逐级下钻到三级/项目）　·　明细：物资结算明细全量表（45+ 字段）' },
    purchase: { name: '采购数据报表', note: '总览：采购指标汇总（二级单位，含局合计，可逐级下钻到三级/项目）　·　明细：合同全量清单（70+ 字段）' },
    supplier: { name: '资源数据报表', note: '资源明细 / 合作分析' },
    asset: { name: '资产数据报表' }
  };

  /* 同一分供商固定映射到同一小类，避免汇总后物料小类随机跳动。
     先建名称 → 序号索引，避免每次渲染对 80 行逐行 findIndex */
  let supplierIndex = null;
  function supplierMatSmall(name) {
    if (!supplierIndex) {
      supplierIndex = {};
      D.suppliers.forEach(function (s, i) { supplierIndex[s.name] = i; });
    }
    const i = supplierIndex[name] == null ? -1 : supplierIndex[name];
    const n = 1 + (i < 0 ? 0 : i) % 5;       // 每家 1~5 个小类，便于展示多值与省略
    const out = [];
    for (let k = 0; k < n; k++) out.push(SUP_MAT_SMALL[((i < 0 ? 0 : i) + k * 3) % SUP_MAT_SMALL.length]);
    return out;
  }
  /* 分供商原始行是静态的：映射结果缓存一次，查询只做过滤不重复复制 */
  let supplierRowsCache = null;
  function supplierReportRows() {
    if (!supplierRowsCache) {
      supplierRowsCache = rowsOf('supplier').map(function (r) {
        return Object.assign({}, r, { matSmall: supplierMatSmall(r.name) });
      });
    }
    return supplierRowsCache;
  }

  /* ---------- 字段集（附录 B/C/D/E/F） ---------- */
  /* 列设置统一存进 D.colStore（与看板 / 项目驾驶舱共用一套会话内状态），
     这里只负责把「数据集」映射成稳定的 store key */
  function colStoreKey(ds) { return 'report-' + ds; }
  function shownOf(ds) {
    const key = colStoreKey(ds);
    if (!D.colStore[key]) D.colStore[key] = DEFAULT_SHOWN[ds].slice();
    return D.colStore[key];
  }
  function sizeOf(ds) {
    if (!RS.sizeBy[ds]) RS.sizeBy[ds] = ds === 'contract' ? 15 : 10;
    return RS.sizeBy[ds];
  }
  function colsOf(ds) {
    return D.colsOf(colStoreKey(ds), COLS[ds], DEFAULT_SHOWN[ds]);
  }

  /* ---------- 行数据 ---------- */
  let cache = null;
  function rowsOf(ds) {
    if (!cache) cache = {};
    if (!cache[ds]) {
      cache[ds] = ds === 'settlement' ? D.genSettleRows(80)
        : ds === 'contract' ? D.genContractRows(1000)
          : ds === 'asset' ? D.genAssetRows(80) : D.genSupplierRows(80);
    }
    return cache[ds];
  }

  /* ---------- 组织下钻路径（BR-1：全局→二级→三级→项目） ---------- */
  function drillPath(ds) {
    const scopeName = D.scope.level === 1 ? '' : D.scope.name;
    const lv = RS.overviewLevel;
    const cur = RS.overviewOrg || scopeName;
    if (ds === 'supplier') return '';
    /* 局总部视角从「全局」起算；受限视角从本单位起算，逐级下钻到三级 / 项目 */
    /* C2：路径用栈保存，每一级都可点回（原来只能靠「返回上一级」逐级退） */
    const stack = (RS.overviewStack || []).slice(0, Math.max(0, lv - 2));
    const parts = [D.scope.level === 1 ? '全局' : D.scope.name].concat(stack);
    return '<div class="drill-path report-page__drill-path">' +
      '<span>组织下钻：</span>' +
      parts.map(function (p, i) {
        const last = i === parts.length - 1;
        return (i ? '<span class="drill-path__sep">&gt;</span>' : '') +
          '<span class="drill-path__crumb' + (last ? ' drill-path__crumb--current' : '') + '"' +
          (last ? '>' : ' data-drill-lv="' + (2 + i) + '" title="回到该层级">') + esc(p) + '</span>';
      }).join('') +
      (lv > 2 ? '<button class="dsc-btn dsc-btn--sm drill-path__back" data-drill-back>返回上一级</button>' : '') +
      '</div>';
  }

  /* P1-1：查询条件真的过滤结果集。
     此前「查询」只把条件回填进字段、行数据不变，但「共 N 条」「合计」「分页总数」都跟着条件走不了，
     反馈却写着「已按 N 个条件查询」——点两次就能看出是假的。
     RS.conds 的键就是字段名（= 行对象的字段），因此直接按字段比对：
       · 行上没有该字段 → 该条件不参与过滤（避免把表清空）
       · 日期范围（长度 2 的数组）→ 按字符串区间比较（ISO 日期可直接比大小）
       · 其余 → 值包含匹配 */
  /* 筛选名与行字段的显式映射：配置使用业务名，不要求行对象字段同名 */
  const COND_ALIAS = {
    contract: { contract: 'name', contractType: 'type', contractStatus: 'status' }
  };
  /* 金额区间条件按数值比较；此前文本包含匹配无法表达 >= / <= */
  const NUMERIC_FILTERS = { amtMin: ['amtTax', 'gte'], amtMax: ['amtTax', 'lte'] };
  /* 筛选项值与行值域的口径兼容：报表把租赁合同归为「租赁类合同」，
     行上的类型仍是物资租赁 / 机械设备租赁两种，不能只靠字符串包含 */
  const VALUE_ALIAS = {
    contractType: { '租赁类合同': /租赁合同$/ }
  };

  function applyConds(rows, conds, alias) {
    const pairs = Object.keys(conds || {}).filter(function (k) {
      const v = conds[k];
      if (v == null || v === '') return false;
      return !(Array.isArray(v) && !v.filter(Boolean).length);
    });
    if (!pairs.length) return rows;
    return rows.filter(function (r) {
      return pairs.every(function (k) {
        const num = NUMERIC_FILTERS[k];
        if (num) {
          const n = parseFloat(r[num[0]]);
          const v = parseFloat(conds[k]);
          if (isNaN(n) || isNaN(v)) return true;
          return num[1] === 'gte' ? n >= v : n <= v;
        }
        const key = (alias && alias[k]) || k;
        const rv = r[key];
        if (rv === undefined) return true;
        const v = conds[k];
        if (Array.isArray(v) && v.length === 2 && v[0] && v[1]) {
          const s0 = String(rv);
          return s0 >= String(v[0]).slice(0, 10) && s0 <= String(v[1]).slice(0, 10) + '~';
        }
        if (Array.isArray(v)) {
          const list = v.filter(Boolean);
          return list.some(function (x) {
            const va = VALUE_ALIAS[k] && VALUE_ALIAS[k][x];
            return va ? va.test(String(rv)) : String(rv).indexOf(String(x)) >= 0;
          });
        }
        const scalarAlias = VALUE_ALIAS[k] && VALUE_ALIAS[k][v];
        if (scalarAlias) return scalarAlias.test(String(rv));
        return rv != null && String(rv).indexOf(String(v)) >= 0;
      });
    });
  }
  /* 局级总览的行是「单位」，条件里的二级单位要落到 name 上 */
  const OVERVIEW_ALIAS = { org2: 'name' };

  /* 当前报表页签的最终结果集：条件过滤 + 组织权限 + 按页签聚合。
     查询命中数、表体、合计都从这里取，避免四条管线各写一遍。 */
  function reportRows(dsKey) {
    const visible = function (rows) {
      return rows.filter(function (r) { return D.scope.canSeeRow(r); });
    };
    if (dsKey === 'supplier') {
      if (RS.supTab === 'cooperation') {
        return aggregateSupplierRows(visible(applyConds(supplierReportRows(), RS.conds)));
      }
      if (RS.supTab === 'resource') {
        return aggregateResourceRows(visible(applyConds(D.genResourceRows(80), RS.conds)));
      }
      return [];
    }
    /* 资产统计报表按项目聚合：命中数也要按项目数算，不能报 80 条资产却只显示 N 个项目 */
    if (dsKey === 'asset' && RS.assetTab === 'stats') {
      return aggregateAssetRows(visible(applyConds(rowsOf('asset'), RS.conds)));
    }
    return visible(applyConds(rowsOf(dsKey), RS.conds, COND_ALIAS[dsKey]));
  }

  /* 条件命中数：让「查询」的结果可被核对（反馈里直接写出筛掉后剩多少条）
     必须与表格用同一套口径：表格还要过 D.scope.canSeeRow 的组织权限（R2），
     否则会出现「提示命中 36 条、表里一行都没有」的自相矛盾 */
  function condHits(dsKey, view) {
    if ((dsKey === 'contract' || dsKey === 'settlement') && view !== 'detail') {
      return applyConds(D.scopeOrgs(D.scope.dataOrgs()).map(function (o) { return { name: o.name }; }),
        RS.conds, OVERVIEW_ALIAS).length;
    }
    return reportRows(dsKey).length;
  }

  /* A2：把已提交的条件回填进字段默认值，重绘（查询 / 翻页 / 切页签）后不再被清空 */
  function withConds(fields) {
    return fields.map(function (f) {
      const v = RS.conds[f.name];
      if (v === undefined || v === '') return f;
      if (f.type === 'daterange' && !(Array.isArray(v) && v.length === 2)) return f;
      if ((f.type === 'multi' || f.type === 'tree') && !Array.isArray(v)) return f;
      return Object.assign({}, f, { value: v });
    });
  }
  /* 资产编码链接的详情：直接用当前行数据，不再套用通用「单据详情」模板 */
  function assetDetailHTML(r) {
    const kv = [
      ['资产编码', r.assetCode], ['资产名称', r.desc],
      ['数量', r.qty == null ? '—' : D.fmtInt(r.qty) + (r.unit || '')],
      ['项目', r.project], ['二级单位', r.org2], ['三级单位', r.org3 || '—'],
      ['资产类别', r.assetCat || r.category], ['资产属性', r.attr],
      ['资产品牌', r.brand],
      ['资产总额', D.fmtNum(r.assetAmt, 2) + ' 万元'], ['资产总数', D.fmtInt(r.assetCount)],
      ['在用 / 闲置', D.fmtInt(r.usingCount) + ' / ' + D.fmtInt(r.idleCount)],
      ['维保 / 报废', D.fmtInt(r.repairCount) + ' / ' + D.fmtInt(r.scrapCount)],
      ['资产购置金额', D.fmtNum(r.buyAmt, 2) + ' 万元'], ['处置金额', D.fmtNum(r.disposeAmt, 2) + ' 万元'],
      ['调拨摊销折旧', D.fmtNum(r.depAmt, 2) + ' 万元'],
      ['存放地点', r.location],
      ['保管单位', r.keeper],
      ['保管人', r.keeperUser || '—'],
      ['使用人', r.user],
      ['验收单', r.acceptCode],
      ['资产盘点', Array.isArray(r.invPlanCode) ? r.invPlanCode.join('、') : r.invPlanCode],
      ['调拨单号', r.transferCode || '—']
    ];
    return '<div class="dsc-asset-kv">' + kv.map(function (p) {
      return '<div class="dsc-asset-kv__k">' + esc(p[0]) + '</div><div class="dsc-asset-kv__v">' + esc(p[1]) + '</div>';
    }).join('') + '</div>';
  }

  /* A5：表头排序——数值 / 文本列可点表头升序降序 */
  function sortableCols(cols) {
    return cols.map(function (c) { return (c.num || c.sortable) ? Object.assign({}, c, { sortable: true }) : c; });
  }
  function sortRows(rows, cols) {
    const c = cols.filter(function (x) { return x.key === RS.sortKey; })[0];
    if (!c || !rows.length) return rows;
    const dir = RS.sortDir === 'asc' ? 1 : -1;
    return rows.slice().sort(function (a, b) {
      const x = a[c.key], y = b[c.key];
      if (x == null) return 1;
      if (y == null) return -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x).localeCompare(String(y), 'zh') * dir;
    });
  }
  /* 报表分页：所有表体共用“排序 → 截取当前页 → 行号偏移”的口径 */
  function pagedRows(rows, cols, size) {
    const sorted = sortRows(rows, cols);
    const start = (RS.page - 1) * size;
    return { sorted: sorted, paged: sorted.slice(start, start + size), start: start };
  }
  function numberedRows(rows, start) {
    return rows.map(function (r, i) { return Object.assign({ idx: start + i + 1 }, r); });
  }
  /* 报表表卡：标题 / 字段状态 / 齿轮 / 表体共用同一套外壳 */
  function reportTableCard(o) {
    return '<div class="dsc-card' + (o.wrap === false ? '' : ' report-page__table-wrap') + '">' +
      '<div class="dsc-card__header">' +
      '<div class="dsc-card__title">' + esc(o.title) + '</div>' +
      '<div class="dsc-card__extra">' + (o.extra || '') +
      D.colGear(o.gear, o.gearTip) + '</div></div>' +
      D.table(o.table) + '</div>';
  }

  /* ds 取归一化后的数据集键（settlement / contract / asset / supplier），view 仅采购报表使用 */

  /* ---------- F5 总览：采购指标口径 ---------- */
  /* 序：[法定全称, 物资(亿), 劳务分包(亿), 专业分包(亿), 成本降低率-物资%, 成本降低率-分包%,
          物资设备采购效益率%, 物资设备集中采购率%, 分包集中采购率%, 厂家直采总占比%,
          采购计划执行率%, 采购时效(天), 降本金额占比%]（数值对齐《采购报表总览》样例） */
  const YI = 1e8;
  /* 金额展示：按亿 / 万自适应（对齐样例「456.61亿 / 7,922.29万」） */
  function fmtAmt(v) {
    if (v == null || v === '' || isNaN(v)) return '—';
    const a = Math.abs(v);
    if (a >= YI) return D.fmtNum(v / YI, 2) + '亿';
    if (a >= 1e4) return D.fmtNum(v / 1e4, 2) + '万';
    return D.fmtNum(v, 2);
  }
  function fmtPct(v) { return v == null || v === '' ? '—' : D.fmtNum(v, 2) + '%'; }
  /* 下级汇总：按权重拆分上级金额，保证「下级合计 = 上级」 */
  function splitMetrics(base, weights, names) {
    const tot = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    let acc = { mat: 0, lab: 0, spec: 0, sum: 0 };
    const rows = names.map(function (n, i) {
      const k = weights[i] / tot;
      const m = {
        name: n, mat: base.mat * k, lab: base.lab * k, spec: base.spec * k, sum: base.sum * k,
        cdMat: D.round(base.cdMat + ((i * 17 % 9) - 4) * 0.11, 2),
        cdSpec: D.round(base.cdSpec + ((i * 13 % 7) - 3) * 0.14, 2),
        benefit: D.round(base.benefit + ((i * 11 % 9) - 4) * 0.26, 2),
        central: D.round(base.central + ((i * 7 % 11) - 5) * 0.42, 2),
        subCentral: D.round(base.subCentral + ((i * 5 % 13) - 6) * 0.55, 2),
        direct: D.round(base.direct + ((i * 3 % 15) - 7) * 0.48, 2),
        plan: D.round(base.plan + ((i * 19 % 9) - 4) * 0.31, 2),
        lead: D.round(base.lead + ((i * 23 % 7) - 3) * 0.3, 1),
        downPct: D.round(base.downPct + ((i * 29 % 7) - 3) * 0.19, 2)
      };
      m.cdSum = D.round((m.mat * m.cdMat + (m.lab + m.spec) * m.cdSpec) / (m.sum || 1), 2);
      acc.mat += m.mat; acc.lab += m.lab; acc.spec += m.spec; acc.sum += m.sum;
      return m;
    });
    return { rows: rows, acc: acc };
  }

  /* ---------- 总览（二级 → 三级 → 项目）：采购 / 物资共用 ---------- */
  /* 物资总览指标（列序对齐 Axure《物资数据报表 › 局级总览》） */
  const MAT_KEYS = [
    ['bargain', '二次议价采购成本降低率', 200],
    ['orderRatio', '合同下单比例', 160],
    ['payRatio', '按合同履约支付率', 160],
    ['orderPlan', '订单计划使用率', 160],
    ['monthSettle', '月度结算完成率', 160],
    ['totalSettle', '总结算完成率', 160]
  ];
  const MAT_BASE = { bargain: 5.85, orderRatio: 73.5, payRatio: 68.2, orderPlan: 82.4, monthSettle: 78.6, totalSettle: 74.1 };
  function matMetrics(name) {
    const o = D.orgMap[name];
    if (!o || !o.kpiMat) return null;
    const k = o.kpiMat;
    return { full: (D.REPORT_UNITS[name] || [])[0] || '', bargain: k.secondBargain, orderRatio: k.orderRatio,
      payRatio: k.payRatio, orderPlan: k.orderPlan, monthSettle: k.monthSettle, totalSettle: k.totalSettle };
  }
  function meanMetrics(rows, keys) {
    const acc = {};
    keys.forEach(function (k) {
      const v = rows.map(function (r) { return r[k[0]]; }).filter(function (x) { return x != null; });
      acc[k[0]] = v.length ? D.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length, 2) : null;
    });
    return acc;
  }
  /* 比率类指标的逐级拆分：无金额可拆，按上级口径做确定性扰动（下级均值 ≈ 上级） */
  function splitRatios(base, weights, names, keys) {
    const tot = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    const rows = names.map(function (n, i) {
      const r = { name: n, full: (D.REPORT_UNITS[n] || [])[0] || '' };
      keys.forEach(function (k) {
        const w = weights[i] / tot;
        const bias = ((i * 17 + k[0].length * 5) % 11 - 5) / 8;
        r[k[0]] = Math.max(0, D.round(base[k[0]] * (0.72 + 0.52 * w + bias * 0.06), 2));
      });
      return r;
    });
    /* 整体平移使下级均值 = 上级（比率类只要求均值闭合） */
    keys.forEach(function (k) {
      const cur = meanMetrics(rows, keys)[k[0]];
      if (cur == null || !rows.length) return;
      const d = base[k[0]] - cur;
      rows.forEach(function (r) { r[k[0]] = Math.max(0, D.round(r[k[0]] + d, 2)); });
    });
    const acc = meanMetrics(rows, keys);
    acc.mat = acc.lab = acc.spec = acc.sum = null;
    return { rows: rows, acc: acc };
  }

  /* 局级总览列集：抽成函数，供表格右上角「设置列」复用（同一份定义，按存储的 key 过滤） */
  function ovCols(isMat, lvName) {
    const AMT = { group: '总采购金额（元）', num: true, fmt: fmtAmt };
    const CD = { group: '采购成本降低率', num: true, fmt: fmtPct };
    const nameCol = { key: 'name', name: lvName, width: 240, sticky2: true, render: function (v, r, ri) {
      /* 单位名只保留一个：此处口径为法定全称（对齐产品截图），
         下钻用的组织键仍放在 data-overview，简称放 tooltip，不再两行平铺 */
      const label = (r.full && r.full !== v) ? r.full : v;
      if (r.sumRow || r.hqRow) return '<span title="' + esc(r.full || v) + '">' + esc(label) + '</span>';
      return '<span class="dsc-table__link" data-overview="' + esc(v) + '" data-ov-idx="' + ri +
        '" data-level="' + r.level + '" title="' + esc(v + '　·　点击进入下一级') + '">' + esc(label) + '</span>';
    } };
    const idxCol = { key: 'idx', name: '序号', width: 56, sticky: true };
    /* pct:true 让合计行按「均值」而非求和（比率类指标不可累加） */
    const pctCol = function (k, n, w) { return { key: k, name: n, width: w, num: true, pct: true }; };
    const cols = isMat
      ? [idxCol, nameCol].concat(MAT_KEYS.map(function (k) { return pctCol(k[0], k[1], k[2]); }))
      : [idxCol, nameCol,
        { key: 'mat', name: '物资', width: 100, group: AMT.group, num: true, fmt: fmtAmt },
        { key: 'lab', name: '劳务分包', width: 110, group: AMT.group, num: true, fmt: fmtAmt },
        { key: 'spec', name: '专业分包', width: 110, group: AMT.group, num: true, fmt: fmtAmt },
        { key: 'sum', name: '汇总', width: 110, group: AMT.group, num: true, fmt: fmtAmt },
        { key: 'cdMat', name: '物资', width: 100, group: CD.group, num: true, fmt: fmtPct },
        { key: 'cdSpec', name: '分包', width: 100, group: CD.group, num: true, fmt: fmtPct },
        { key: 'cdSum', name: '汇总', width: 100, group: CD.group, num: true, fmt: fmtPct },
        { key: 'benefit', name: '物资设备采购效益率', width: 170, num: true, fmt: fmtPct },
        { key: 'central', name: '物资设备集中采购率', width: 170, num: true, fmt: fmtPct },
        { key: 'subCentral', name: '分包集中采购率', width: 150, num: true, fmt: fmtPct },
        { key: 'direct', name: '厂家直采总占比', width: 140, num: true, fmt: fmtPct },
        { key: 'plan', name: '采购计划执行率', width: 140, num: true, fmt: fmtPct },
        { key: 'lead', name: '采购时效（天）', width: 130, num: true, fmt: function (v) { return v == null ? '—' : D.fmtNum(v, 1); } },
        { key: 'downPct', name: '降本金额占比', width: 130, num: true, fmt: fmtPct }];
    return cols;
  }

  function overviewSection(dsKey) {
    const lv = RS.overviewLevel;
    const scoped = D.scope.level !== 1;
    const isMat = dsKey === 'settlement';
    const keys = isMat ? MAT_KEYS : null;
    const metricsOf = isMat ? matMetrics : D.reportUnitMetrics;
    let rows = [], acc = null;

    if (lv === 2) {
      const visible = D.scopeOrgs(D.scope.dataOrgs());
      rows = visible.map(function (o) {
        return Object.assign({ name: o.name, level: 2 }, metricsOf(o.name) || {});
      });
      /* 二级单位条件落到单位行上（在算局合计之前过滤，保证「合计 = 下方各单位之和」仍然成立） */
      rows = applyConds(rows, RS.conds, OVERVIEW_ALIAS);
      if (isMat) {
        acc = meanMetrics(rows, keys);
      } else {
        acc = ['mat', 'lab', 'spec', 'sum'].reduce(function (a, k) {
          a[k] = rows.reduce(function (s, r) { return s + (r[k] || 0); }, 0); return a;
        }, {});
        acc.cdMat = wr(rows, 'cdMat', 'mat'); acc.cdSpec = wr(rows, 'cdSpec', function (r) { return r.lab + r.spec; });
        acc.cdSum = wr(rows, 'cdSum', 'sum'); acc.benefit = wr(rows, 'benefit', 'sum');
        acc.central = wr(rows, 'central', 'mat'); acc.subCentral = wr(rows, 'subCentral', function (r) { return r.lab + r.spec; });
        acc.direct = wr(rows, 'direct', 'sum'); acc.plan = wr(rows, 'plan', 'sum');
        acc.downPct = wr(rows, 'downPct', 'sum'); acc.lead = avg(rows, 'lead');
      }
      if (!scoped) {
        /* 局合计行：金额 = 各单位之和（可逐项校验）；采购比率取局口径值（对齐样例） */
        rows = [Object.assign({ name: '中国建筑第八工程局有限公司', level: 2, sumRow: true }, acc,
          isMat ? null : D.REPORT_BUREAU)]
          .concat(isMat ? [] : [{ name: '中建八局总部', level: 2, hqRow: true, plan: 76.92, lead: 25.3,
            mat: null, lab: null, spec: null, sum: null, cdMat: null, cdSpec: null, cdSum: null, benefit: null,
            central: null, subCentral: null, direct: null, downPct: null }])
          .concat(rows);
      }
    } else {
      const PUR_BASE = { mat: lv === 3 ? 1e10 : 1e9, lab: lv === 3 ? 6e9 : 6e8, spec: lv === 3 ? 1.2e10 : 1.2e9,
        sum: lv === 3 ? 2.8e10 : 2.8e9, cdMat: 8, cdSpec: 7, benefit: 14, central: 80, subCentral: 22,
        direct: 50, plan: 92, lead: 24, downPct: 8 };
      const base = RS.overviewBase || metricsOf(RS.overviewOrg) || (isMat ? MAT_BASE : PUR_BASE);
      const subs = D.subOrgsByParent[RS.overviewOrg] || [];
      const names = (lv === 3 && subs.length) ? subs.map(function (s) { return s.name; })
        : D.projects.slice(0, lv === 3 ? 6 : 20).map(function (p) { return p.name; });
      const ws = names.map(function (n, i) { return (lv === 3 ? 0.6 + (i * 11 + 3) % 45 / 100 : 0.5 + (i * 13 + 5) % 45 / 100); });
      const r = isMat ? splitRatios(base, ws, names, keys) : splitMetrics(base, ws, names);
      rows = r.rows.map(function (m) { return Object.assign({ level: lv }, m); });
      acc = r.acc;
    }
    RS.lastRows = rows;

    const lvName = { 2: '二级单位', 3: '三级单位', 4: '项目' }[lv];
    const cols = ovCols(isMat, lvName);

    /* 齿轮只保留一个：此前标题右侧有两个「设置列」入口（都指向同一份列配置），
       说明文案也另占一个 extra；合并成一个入口，文案与齿轮同行 */
    return '<div class="dsc-card u-mb-lg"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">' + (isMat ? '物资指标汇总' : '采购指标汇总') + ' · ' + lvName + '</div>' +
      '<div class="dsc-card__extra">点击单位名进入下一级' + (lv > 2 ? '　·　可「返回上一级」' : '') +
      '　·　首行为局合计' + (isMat ? '（各单位均值）' : '（等于下方各单位之和）') +
      D.colGear('data-rp-cols="ov-' + dsKey + '"',
        '设置列：' + (isMat ? '物资' : '采购') + '指标汇总的显示字段') + '</div></div>' +
      D.table({
        cols: D.colsOf('ov-' + dsKey, cols, cols.map(function (c) { return c.key; })),
        rows: rows.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }),
        totalRow: lv === 2 ? null : (isMat ? D.totalOf(cols, rows)
          : D.totalOf([{ key: 'sum', num: true }, { key: 'mat', num: true },
            { key: 'lab', num: true }, { key: 'spec', num: true }], rows)),
        rowClass: function (r) { return r.sumRow ? 'dsc-row--sum' : ''; },
        maxHeight: 420
      }) + '</div>';
  }
  function wr(rows, key, wKey) {
    let w = 0, s = 0;
    rows.forEach(function (r) {
      const ww = typeof wKey === 'function' ? wKey(r) : r[wKey];
      if (r[key] == null || !ww) return;
      w += ww; s += r[key] * ww;
    });
    return w ? D.round(s / w, 2) : null;
  }
  function avg(rows, key) {
    const v = rows.filter(function (r) { return r[key] != null; });
    return v.length ? D.round(v.reduce(function (a, r) { return a + r[key]; }, 0) / v.length, 1) : null;
  }

  /* ---------- F6 分供商 2 页签 ---------- */
  const SUP_TABS = [
    ['resource', '资源数据明细'], ['cooperation', '分供商合作分析']
  ];
  /* ---------- F7 资产 2 页签：统计报表（按项目）/ 明细表（按资产编码） ---------- */
  const ASSET_TABS = [
    ['stats', '资产统计报表'], ['detail', '资产明细表']
  ];
  /* 资源数据明细：三级单位级资源指标（项目字段已移除；10 个数量列 + 3 个额度列） */
  function resCol(k, n, w, o) { return Object.assign({ key: k, name: n, width: w, num: true }, o || {}); }
  const RES_COLS = [
    { key: 'idx', name: '序号', width: 56, sticky: true },
    { key: 'org2', name: '二级单位', width: 110, sticky2: true },
    { key: 'org3', name: '三级单位', width: 120 },
    resCol('onStock', '在库分供商数量', 140), resCol('quality', '优质分供商数量', 140),
    resCol('quit', '清退分供商数量', 140), resCol('bad', '不良行为分供商数量', 160),
    resCol('newIn', '新增入库分供商数量', 160), resCol('active', '活跃分供商数量', 140),
    resCol('win', '中标分供商数量', 140), resCol('sign', '签约分供商数量', 140),
    resCol('perfCnt', '履约分供商数量', 140), resCol('alt', '备选分供商数量', 140),
    resCol('perf', '分供商履约额(万元)', 160), resCol('perfQuality', '优质分供商履约额(万元)', 200),
    /* 平均履约额不是求和列：合计 = 履约额合计 ÷ 履约分供商数（在 D.totalOf 的基础合计之后算） */
    resCol('avgPerf', '平均履约额(万元)', 160, {
      total: function (rows, t) { return t.perfCnt ? D.round(t.perf / t.perfCnt, 1) : 0; }
    })
  ];

  /* 项目行 → 三级单位行：数量、金额求和；平均履约额按「履约额 ÷ 履约分供商数」重算 */
  const RES_SUM_KEYS = ['onStock', 'quality', 'quit', 'bad', 'newIn', 'active', 'win', 'sign',
    'perfCnt', 'alt', 'perf', 'perfQuality'];
  function aggregateResourceRows(rows) {
    const map = {};
    rows.forEach(function (r) {
      const key = r.org2 + '|' + r.org3;
      const t = map[key] || (map[key] = { org2: r.org2, org3: r.org3 });
      RES_SUM_KEYS.forEach(function (k) { t[k] = (t[k] || 0) + (r[k] || 0); });
    });
    return Object.keys(map).map(function (k) {
      const r = map[k];
      RES_SUM_KEYS.forEach(function (key) { r[key] = D.round(r[key], 1); });
      r.avgPerf = r.perfCnt ? D.round(r.perf / r.perfCnt, 1) : 0;
      return r;
    });
  }

  /* 供应商-项目行 → 分供商 + 三级单位汇总：次数 / 金额求和，履约合作项目数按去重项目数 */
  const COOP_SUM_KEYS = ['bidCount', 'winCount', 'winAmt', 'frameCount', 'execCount',
    'signCount', 'contractAmt', 'perfAmt', 'badCount', 'banCount'];
  function aggregateSupplierRows(rows) {
    const map = {};
    rows.forEach(function (r) {
      /* 按分供商名称汇总：组织列取该分供商首条合作记录所属单位 */
      const key = r.name;
      const t = map[key] || (map[key] = {
        name: r.name, org2: r.org2, org3: r.org3, code: r.code, cat: r.cat,
        grade: r.grade, __projects: {}, __matSmall: {}
      });
      t.__projects[r.project] = 1;
      (Array.isArray(r.matSmall) ? r.matSmall : [r.matSmall]).forEach(function (x) {
        if (x) t.__matSmall[x] = 1;
      });
      COOP_SUM_KEYS.forEach(function (k) { t[k] = (t[k] || 0) + (r[k] || 0); });
    });
    return Object.keys(map).map(function (k) {
      const r = map[k];
      r.perfProjCount = Object.keys(r.__projects).length;
      r.matSmall = SUP_MAT_SMALL.filter(function (x) { return r.__matSmall[x]; });
      delete r.__projects; delete r.__matSmall;
      COOP_SUM_KEYS.forEach(function (key) { r[key] = D.round(r[key], 1); });
      return r;
    });
  }

  /* 资产统计报表：把资产级行按「二级单位 + 三级单位 + 项目」汇总，最小颗粒度 = 项目。
     汇总字段从统计列定义派生，新增统计列时不再需要同步维护第二份 key 清单 */
  const ASSET_SUM_KEYS = ASSET_STATS_COLS.filter(function (c) { return c.num; })
    .map(function (c) { return c.key; });
  function aggregateAssetRows(rows) {
    const map = {}, order = [];
    rows.forEach(function (r) {
      const key = (r.org2 || '') + '|' + (r.org3 || '') + '|' + (r.project || '');
      let t = map[key];
      if (!t) {
        t = map[key] = { org2: r.org2, org3: r.org3, project: r.project };
        order.push(key);
      }
      ASSET_SUM_KEYS.forEach(function (k) {
        if (typeof r[k] === 'number') t[k] = (t[k] || 0) + r[k];
      });
    });
    return order.map(function (k) {
      const r = map[k];
      ASSET_SUM_KEYS.forEach(function (key) { r[key] = D.round(r[key] || 0, 2); });
      return r;
    });
  }
  function assetStatsBody() {
    const all = reportRows('asset');
    const total = all.length;
    const size = sizeOf('asset');
    /* 统计报表也提供设置列：字段清单只含 13 个有效列，默认全部显示 */
    const allKeys = ASSET_STATS_COLS.map(function (c) { return c.key; });
    const cols = D.colsOf('asset-stats', ASSET_STATS_COLS, allKeys);
    const page = pagedRows(all, ASSET_STATS_COLS, size);
    const totalRow = D.totalOf(cols, page.sorted);
    return reportTableCard({
      title: '资产统计报表',
      extra: '最小颗粒度：项目　·　共 ' + total + ' 个项目',
      gear: 'data-rp-stats-cols', gearTip: '设置列：资产统计报表的显示字段',
      table: {
        cols: cols, rows: numberedRows(page.paged, page.start),
        maxHeight: 620, totalRow: totalRow, sortKey: RS.sortKey, sortDir: RS.sortDir,
        foot: '<div class="dsc-table__footnote">合计行按全部 ' + total + ' 个项目汇总（含所有页），不是当前页之和</div>' +
          D.pager({ page: RS.page, size: size, total: total })
      }
    });
  }

  function supplierBody() {
    if (RS.supTab === 'resource') {
      const all = reportRows('supplier');
      const total = all.length;
      const size = sizeOf('supplier');
      const rcols = D.colsOf('sup-resource', RES_COLS, RES_COLS.map(function (c) { return c.key; }));
      const page = pagedRows(all, RES_COLS, size);
      const rtotal = D.totalOf(RES_COLS, page.sorted);
      return reportTableCard({
        wrap: false, title: '资源数据明细', extra: '',
        gear: 'data-rp-cols="sup-resource"', gearTip: '设置列：资源数据明细的显示字段',
        table: {
          cols: sortableCols(rcols), rows: numberedRows(page.paged, page.start),
          maxHeight: 520, totalRow: rtotal, sortKey: RS.sortKey, sortDir: RS.sortDir,
          foot: D.pager({ page: RS.page, size: size, total: total })
        }
      });
    }
    /* cooperation：按分供商汇总；项目字段已移除，改为履约合作项目数 */
    const all = reportRows('supplier');
    const total = all.length;
    const size = sizeOf('supplier');
    const cols = sortableCols(colsOf('supplier'));
    const page = pagedRows(all, cols, size);
    return reportTableCard({
      wrap: false, title: '分供商合作分析', extra: '',
      gear: 'data-rp-columns', gearTip: '设置列：分供商合作分析的显示字段',
      table: {
        cols: cols, rows: numberedRows(page.paged, page.start),
        /* 合计按「全量结果集」算，不能用当前页 */
        maxHeight: 520, totalRow: D.totalOf(cols, page.sorted), sortKey: RS.sortKey, sortDir: RS.sortDir,
        foot: D.pager({ page: RS.page, size: size, total: total })
      }
    });
  }

  /* ============================================================
     页面
     ============================================================ */
  D.pages.report = function (q) {
    const dsKey = q.ds === 'material' ? 'settlement' : q.ds === 'supplier' ? 'supplier' : q.ds === 'asset' ? 'asset' : 'contract';
    const meta = DS[q.ds] || DS.purchase;
    const view = q.view || RS.view || 'overview';   // 页签在页内切换，不全页刷新
    RS.view = view;
    /* 提诉 / 反向评价 / 黑名单页签已移除：历史会话若停在旧页签，回落到资源数据明细 */
    if (q.ds === 'supplier' && !SUP_TABS.some(function (t) { return t[0] === RS.supTab; })) {
      RS.supTab = 'resource';
    }
    if (q.ds === 'asset' && RS.assetTab !== 'detail') RS.assetTab = 'stats';
    /* A1：页码只在「换报表 / 换页签」时复位——此前每次渲染都 RS.page = 1，
       把分页器刚写入的页码覆盖掉，导致报表分页整页失效 */
    const pageKey = dsKey + '|' + view + '|' + RS.supTab + '|' + RS.assetTab;
    if (RS.pageKey !== pageKey) { RS.page = 1; RS.pageKey = pageKey; RS.sortKey = ''; }

    let body = '';
    if ((q.ds === 'purchase' || q.ds === 'material') && view !== 'detail') {
      body = overviewSection(dsKey);
    } else if (q.ds === 'supplier') {
      body = supplierBody();
    } else if (q.ds === 'asset' && RS.assetTab === 'stats') {
      body = assetStatsBody();
    } else {
      const tabbed = q.ds === 'purchase' || q.ds === 'material';
      const all = reportRows(dsKey);
      const total = all.length;
      const size = sizeOf(dsKey);
      const cols = sortableCols(colsOf(dsKey));
      const page = pagedRows(all, cols, size);
      /* 当前显示列里没有数值列时不出现空的合计行；合计按全量结果集而非当前页 */
      const totalRow = cols.some(function (c) { return c.num; }) ? D.totalOf(cols, page.sorted) : null;
      const title = dsKey === 'contract' ? '合同明细' : dsKey === 'settlement' ? '结算明细' : '资产明细表';
      /* 资产明细：表卡右上只写字段显隐，不再重复页头与分页里的「共 N 条」 */
      const extra = dsKey === 'asset'
        ? '显示 ' + cols.length + ' / ' + COLS.asset.length + ' 字段　·　可自定义显示与排序'
        : '共 ' + total + ' ' + (tabbed ? '行' : '条') + '　·　字段可自定义显示与排序';
      /* 合计行是全量口径，页脚写明，避免被当成当前页 10 行之和 */
      const totalNote = dsKey === 'asset' && totalRow
        ? '<div class="dsc-table__footnote">合计行按全部 ' + total + ' 条汇总（含所有页），不是当前页之和</div>' : '';
      body = reportTableCard({
        title: title, extra: extra,
        gear: 'data-rp-columns', gearTip: '设置列：' + title + '的显示字段',
        table: {
          cols: cols, rows: numberedRows(page.paged, page.start),
          maxHeight: tabbed ? 660 : 560, totalRow: totalRow, sortKey: RS.sortKey, sortDir: RS.sortDir,
          foot: totalNote + D.pager({ page: RS.page, size: size, total: total })
        }
      });
    }

    return '<div class="dsc-page report-page">' +
      '<div class="dsc-page__header report-page__header">' +
      '  <div class="dsc-page__title">' + esc(meta.name) + '</div>' +
      (meta.note ? '  <div class="dsc-page__sub">' + esc(meta.note) + '</div>' : '') +
      '  <div class="dsc-page__actions report-page__action-bar">' +
      /* A4：汇总 / 固定口径页签（局级总览、资源数据明细）的列不可增删，
         此前仍显示「列设置」且弹出的是另一个页签的字段——改成明示口径，不再给假入口 */
      '    <button class="dsc-btn" data-rp-export>导出</button>' +
      '  </div>' +
      '</div>' +
      (D.scope.level === 1 ? '' : '<div class="dsc-note dsc-note--warn u-mb-md">已按组织权限过滤（R2）：' +
        (D.scope.level === 3 ? '仅返回本单位数据' : '仅返回本单位及下属数据') +
        '，超权限明细行不返回。</div>') +
      ((q.ds === 'purchase' || q.ds === 'material') ? '<div class="dsc-tabs" data-rp-view>' +
        [['overview', '局级总览'], ['detail', '明细']].map(function (v) {
          return '<div class="dsc-tabs__item' + (view === v[0] ? ' dsc-tabs__item--active' : '') +
            '" data-rv="' + v[0] + '">' + v[1] + '</div>';
        }).join('') + '</div>' : '') +
      (q.ds === 'supplier' ? '<div class="dsc-tabs" data-rp-suptab>' + SUP_TABS.map(function (t) {
        return '<div class="dsc-tabs__item' + (RS.supTab === t[0] ? ' dsc-tabs__item--active' : '') +
          '" data-st="' + t[0] + '">' + esc(t[1]) + '</div>';
      }).join('') + '</div>' : '') +
      (q.ds === 'asset' ? '<div class="dsc-tabs" data-rp-assettab>' + ASSET_TABS.map(function (t) {
        return '<div class="dsc-tabs__item' + (RS.assetTab === t[0] ? ' dsc-tabs__item--active' : '') +
          '" data-at="' + t[0] + '">' + esc(t[1]) + '</div>';
      }).join('') + '</div>' : '') +
      /* 组织下钻路径只属于采购 / 物资「局级总览」——资产报表是逐行明细，用筛选条里的实施单位定位 */
      ((q.ds === 'purchase' || q.ds === 'material') && view !== 'detail' ? drillPath(q.ds) : '') +
      D.filterBar({ id: 'rpFilter', cls: 'report-page__filter-bar', fields: withConds(filterFields(dsKey, view)),
        conds: RS.condText,
        visibleCount: (q.ds === 'purchase' || q.ds === 'material') ? 8
          : q.ds === 'supplier' ? (RS.supTab === 'resource' ? 2 : 4)
            : q.ds === 'asset' ? 4 : 6 }) +
      body +
      '</div>';
  };

  /* ============================================================
     渲染后绑定
     ============================================================ */
  D.pages.report.after = function (root, q) {
    const page = root.querySelector('.report-page');
    if (!page) return;
    const dsKey = q.ds === 'material' ? 'settlement' : q.ds === 'supplier' ? 'supplier' : q.ds === 'asset' ? 'asset' : 'contract';
    const view = q.view || RS.view || 'overview';

    const isAsset = q.ds === 'asset';
    D.bindOrgSelect(root, [{ name: '局总部', level: 1 }].concat(D.scope.orgOptions()), function (v) {
      /* 资产明细的实施单位是普通筛选：点「查询」才生效；采购 / 物资总览仍按组织下钻处理 */
      if (isAsset) return;
      RS.overviewOrg = v;
      RS.overviewLevel = v ? (v === '局总部' ? 2 : (D.orgMap[v] ? 3 : 4)) : 2;
      D.toast('已切换实施单位：' + (v || '全局'));
      D.render();
    });
    D.bindFilter(root, 'rpFilter', {
      query: function (v) {
        const named = {};
        filterFields(dsKey, view).forEach(function (f) { named[f.name] = f.label; });
        if (v.dateGrain) { RS.purGrain = v.dateGrain; RS.matGrain = v.dateGrain; RS.assetGrain = v.dateGrain; }
        /* 资产明细：实施单位是联想输入（不在 [data-f-name] 里），从控件读值作为普通筛选条件 */
        if (isAsset) {
          const orgInput = root.querySelector('#rpFilter .org-select__input');
          const orgVal = orgInput ? orgInput.value.trim() : '';
          /* 「局总部」= 全局，不作为行条件（资产行没有"局总部"这个单位） */
          if (orgVal && orgVal !== '局总部') v.org = orgVal;
        }
        /* A2：条件回填到状态，重绘后不再被清空；A3：空值（未选的多选/空文本）不计入条件数。
           默认统计区间和组织权限自带的单位不是用户设置的条件，不写进反馈 */
        const empty = function (x) { return x == null || x === '' || (Array.isArray(x) && !x.filter(Boolean).length); };
        const defaultOrg = D.scope.level === 1 ? '' : D.scope.name;
        const isDefaultDate = Array.isArray(v.date) && v.date[0] === D.defaultRange[0] && v.date[1] === D.defaultRange[1];
        const keys = Object.keys(v).filter(function (k) {
          return named[k] && !empty(v[k]) &&
            !(k === 'date' && isDefaultDate) && !(k === 'org' && v[k] === defaultOrg);
        });
        const conds = Object.assign({}, v);
        delete conds.dateGrain;
        RS.conds = conds;
        const cond = keys.map(function (k) {
          const val = Array.isArray(v[k]) ? v[k].filter(Boolean).join(' ~ ') : v[k];
          return named[k] + '「' + val + '」';
        });
        RS.condText = cond.length ? '已按 ' + cond.length + ' 个条件筛选 · 命中 ' + condHits(dsKey, view) +
          ' 条：' + cond.slice(0, 3).join('，') + (cond.length > 3 ? ' 等' : '') : '';
        D.toast(RS.condText || '未填筛选条件，返回全量（默认本年度 1 月 1 日 ~ 今日）');
        if ((q.ds === 'purchase' || q.ds === 'material') && view !== 'detail') {
          RS.overviewLevel = 2; RS.overviewOrg = ''; RS.overviewBase = null;
        }
        D.render();
      },
      reset: function () {
        RS.overviewOrg = ''; RS.overviewLevel = 2; RS.overviewBase = null;
        RS.purGrain = '日'; RS.matGrain = '日'; RS.assetGrain = '日';
        RS.conds = {}; RS.condText = ''; RS.page = 1; RS.sortKey = '';
        D.toast('已重置为默认条件'); D.render();
      },
      clear: function () {
        RS.conds = {}; RS.condText = ''; RS.page = 1; RS.sortKey = '';
        D.toast('条件已清空'); D.render();
      }
    });

    D.__pagerCb = function (o) {
      if (o.page) RS.page = o.page;
      if (o.size) { RS.sizeBy[dsKey] = o.size; RS.page = 1; }
      D.render();
    };
    D.__sortCb = function (k) {
      if (RS.sortKey === k) RS.sortDir = RS.sortDir === 'asc' ? 'desc' : 'asc';
      else { RS.sortKey = k; RS.sortDir = 'desc'; }
      RS.page = 1;
      D.render();
    };

    page.addEventListener('click', function (e) {
      const t = e.target;

      /* 局级总览 / 明细：页内切页签（重绘面板，保留筛选与列设置），URL 同步以便分享 */
      const rv = t.closest('[data-rv]');
      if (rv) {
        RS.view = rv.getAttribute('data-rv'); RS.page = 1;
        if (history.replaceState) {
          history.replaceState(null, '', '?page=report&ds=' + encodeURIComponent(q.ds) +
            (RS.view === 'overview' ? '' : '&view=' + RS.view));
        }
        D.render();
        return;
      }
      const st = t.closest('[data-st]');
      if (st) {
        const next = st.getAttribute('data-st');
        /* 各页签的列表字段不同：切页签时清掉上一个页签的条件，避免不可见的条件继续生效 */
        if (next !== RS.supTab) { RS.conds = {}; RS.condText = ''; RS.sortKey = ''; }
        RS.supTab = next; RS.page = 1; D.render(); return;
      }
      /* 资产报表：统计报表（按项目）/ 明细表（按资产编码） */
      const at = t.closest('[data-at]');
      if (at) {
        const next = at.getAttribute('data-at');
        if (next !== RS.assetTab) { RS.conds = {}; RS.condText = ''; RS.sortKey = ''; }
        RS.assetTab = next; RS.page = 1; D.render(); return;
      }

      /* AC25 总览逐级下钻 + 返回上一级 */
      const ov = t.closest('[data-overview]');
      if (ov) {
        const name = ov.getAttribute('data-overview');
        const lv = +ov.getAttribute('data-level');
        const row = RS.lastRows[+ov.getAttribute('data-ov-idx')];
        RS.overviewBase = row;
        RS.overviewOrg = name;
        RS.overviewLevel = Math.min(4, lv + 1);
        RS.overviewStack = (RS.overviewStack || []).slice(0, lv - 2).concat([name]);
        RS.page = 1;
        D.toast('下钻至 ' + name + ' 的' + { 3: '三级单位', 4: '项目' }[RS.overviewLevel] + '汇总');
        D.render();
        return;
      }
      if (t.closest('[data-drill-back]')) {
        RS.overviewLevel = Math.max(2, RS.overviewLevel - 1);
        RS.overviewStack = (RS.overviewStack || []).slice(0, Math.max(0, RS.overviewLevel - 2));
        RS.overviewOrg = RS.overviewLevel === 2 ? '' : RS.overviewOrg;
        RS.overviewBase = null; RS.page = 1;
        D.toast('已返回上一级');
        D.render();
        return;
      }
      /* C2：点面包屑的任意一级直接回到该层 */
      const dl = t.closest('[data-drill-lv]');
      if (dl) {
        const to = +dl.getAttribute('data-drill-lv');
        RS.overviewLevel = to;
        RS.overviewOrg = to <= 2 ? '' : RS.overviewStack[to - 3];
        RS.overviewStack = RS.overviewStack.slice(0, Math.max(0, to - 2));
        RS.overviewBase = null; RS.page = 1;
        D.render();
        return;
      }
      if (t.closest('[data-drill-reset]')) {
        RS.overviewLevel = 2; RS.overviewOrg = ''; RS.overviewBase = null; RS.overviewStack = [];
        D.render();
        return;
      }

      /* 设置列（AC7）：齿轮在各表右上角，汇总类页签用各自的列模型 */
      const gear = t.closest('[data-rp-cols]');
      if (gear) {
        const ck = gear.getAttribute('data-rp-cols');
        if (ck === 'ov-contract' || ck === 'ov-settlement') {
          const isMat = ck === 'ov-settlement';
          const lvNm = { 2: '二级单位', 3: '三级单位', 4: '项目' }[RS.overviewLevel];
          const all = ovCols(isMat, lvNm);
          D.openColPicker({ key: ck, title: isMat ? '物资指标汇总' : '采购指标汇总', all: all,
            def: all.map(function (c) { return c.key; }), after: D.render });
        } else if (ck === 'sup-resource') {
          D.openColPicker({ key: ck, title: '资源数据明细', all: RES_COLS, def: RES_COLS.map(function (c) { return c.key; }), after: D.render });
        }
        return;
      }
      /* 资产统计报表的列设置：字段清单仅 13 个统计列 */
      if (t.closest('[data-rp-stats-cols]')) {
        D.openColPicker({
          key: 'asset-stats', title: '资产统计报表', modalTitle: '列设置 · 资产统计报表',
          all: ASSET_STATS_COLS, def: ASSET_STATS_COLS.map(function (c) { return c.key; }),
          beforeRender: function () { RS.page = 1; },
          after: D.render
        });
        return;
      }
      /* 列设置（AC7）：统一走 D.openColPicker / D.colStore，不再维护第二套 RS.shown 状态 */
      if (t.closest('[data-rp-columns]')) {
        const ds = q.ds === 'supplier' ? 'supplier' : dsKey;
        /* 资产明细表的列设置弹窗按表名命名，不再用页名「资产数据报表」 */
        const title = dsKey === 'asset' ? '资产明细表' : (DS[q.ds] ? DS[q.ds].name : '数据报表');
        D.openColPicker({
          key: colStoreKey(ds), title: title, modalTitle: '列设置 · ' + title,
          okText: '应用', defaultToast: '已恢复默认字段顺序', width: 900,
          all: COLS[ds], def: DEFAULT_SHOWN[ds],
          beforeRender: function () { RS.page = 1; },
          after: D.render
        });
        return;
      }

      if (t.closest('[data-rp-export]')) {
        D.modal({
          title: '导出数据', width: 640,
          body: '<div class="dsc-note dsc-note--info">导出由后端异步生成，不依赖前端浏览器，不受数据量限制；生成后通过浏览器直接下载。</div>' +
            '<div class="u-mt-md"><label class="dsc-metric__label">导出范围</label>' +
            '<select class="dsc-field"><option>当前查询结果（含所有页）</option><option>当前页</option></select></div>' +
            '<div class="u-mt-md"><label class="dsc-metric__label">导出字段</label>' +
            /* 列数取当前页签实际渲染的表头数（汇总类页签的列不走 COLS，取 shownOf 会报错数） */
            '<select class="dsc-field"><option>当前显示的 ' +
            (page.querySelectorAll('.dsc-table thead th').length || shownOf(dsKey).length) +
            ' 个字段</option><option>全量字段</option></select></div>',
          buttons: [{ text: '取消', cls: '', act: 'cancel' }, { text: '提交导出任务', cls: 'dsc-btn--primary', act: 'ok' }],
          onAction: function () { D.toast('导出任务已提交，完成后站内通知'); }
        });
        return;
      }

      /* 资产明细的单据编号：验收单 / 资产盘点 / 调拨单。
         原型不设计单据详情页，点击给出交互提示即可 */
      const docLk = t.closest('[data-doclink]');
      if (docLk) {
        const code = docLk.getAttribute('data-doclink') || docLk.textContent;
        const type = docLk.getAttribute('data-doc-type') || '单据';
        D.toast('打开' + type + '详情：' + code + '（原型未设计详情页）');
        return;
      }
      /* 单据编号超链接 → 单据详情 */
      const lk = t.closest('.dsc-table__link');
      if (lk) {
        const code = lk.getAttribute('data-link') || lk.textContent;
        /* 资产编码：打开资产详情（行数据），而不是通用的单据详情模板 */
        if (dsKey === 'asset') {
          const row = rowsOf('asset').filter(function (r) { return r.assetCode === code; })[0];
          if (row) {
            D.modal({ title: '资产详情', width: 760, body: assetDetailHTML(row),
              buttons: [{ text: '关闭', cls: '', act: 'cancel' }] });
            return;
          }
        }
        D.modal({
          title: '单据详情', width: 720,
          body: '<div class="dsc-note dsc-note--info u-mb-md">单据编号 <b>' + esc(code) + '</b>　点击编号可直接打开单据详情（只读，本平台不提供办理入口）。</div>' +
            '<table class="dsc-table"><tbody>' +
            [['单据编号', code], ['单据类型', dsKey === 'settlement' ? '结算单' : dsKey === 'contract' ? '合同' : '资产'],
              ['所属组织', D.scope.name], ['单据状态', '已生效'], ['创建人', '李彬'], ['数据来源', '来源系统同步（T+1）']]
              .map(function (kv) {
                return '<tr><td class="u-muted" style="width:120px">' + kv[0] + '</td><td>' + esc(kv[1]) + '</td></tr>';
              }).join('') + '</tbody></table>',
          buttons: [{ text: '关闭', cls: '', act: 'cancel' }]
        });
      }
    });
  };
})(window.APP);
