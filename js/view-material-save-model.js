/* material-save-model：物资管理看板「六项降本」数据模型
   降本字典 / 明细行生成 / 汇总 / 列定义 / 下钻过滤；视图与交互见 view-material-save.js。 */
(function (D) {
  'use strict';
  const esc = D.esc;
  const MS = D.materialBoardState;

  /* 六项降本（金额与占比均截图实测）。
     口径：金额 = 该口径的降本金额；百分比 = 降本金额 ÷ 项目确权产值 × 100%（百分比与金额同源，不另编） */
  const SAVE_SRC = '物资系统 / 财务系统';
  const MB_SAVE = [
    { key: 'total', name: '合计降本', value: '19,131.73', rate: 8.31,
      desc: '六项降本金额合计（= 结算 + 消耗 + 资产 + 验收 + 周转 + 闲废）；占比为合计降本 ÷ 项目确权产值', src: SAVE_SRC },
    { key: 'bargain', name: '结算降本', value: '1,317', rate: 6.88,
      desc: '结算环节形成的降本额（集采引用议价 + 过程履约议价 + 供应链金融溢价 + 结算议价）；占比为该降本额 ÷ 项目确权产值', src: SAVE_SRC },
    { key: 'consume', name: '消耗降本', value: '2,586', rate: 10.50,
      desc: '材料结余降耗 + 过程控耗形成的降本额；占比为该降本额 ÷ 项目确权产值', src: SAVE_SRC },
    { key: 'asset', name: '资产降本', value: '3,528.17', rate: 6.68,
      desc: '使用调拨资产、资产租赁减少新购形成的降本额；占比为该降本额 ÷ 项目确权产值', src: SAVE_SRC },
    { key: 'accept', name: '验收降本', value: '4,136.68', rate: 9.94,
      desc: '数量验收核减 + 双控验收 + 质量验收形成的降本额；占比为该降本额 ÷ 项目确权产值', src: SAVE_SRC },
    { key: 'turnover', name: '周转降本', value: '2,379.51', rate: 13.47,
      desc: '高周转材料替换、提升内部周转、优先使用调拨料具形成的降本额；占比为该降本额 ÷ 项目确权产值', src: SAVE_SRC },
    { key: 'idle', name: '闲废降本', value: '5,184.37', rate: 7.19,
      desc: '废料增值处置、废旧物资回收再利用、永临结合、闲置物资改制再利用形成的降本额；占比为该降本额 ÷ 项目确权产值', src: SAVE_SRC }
  ];
  const MB_SAVE_MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'];
  /* 截图实测：原「议价降本」（现「结算降本」）一—十二月（万元） */
  const MB_SAVE_BASE = [4497.32, 3821.47, 6314.69, 5814.27, 5624.10, 4618.29,
    4019.28, 2997.14, 3001.38, 3004.29, 3049.57, 4815.28];
  const MB_SAVE_FACTOR = { total: 3.97, bargain: 1, consume: 1.96, asset: 2.68, accept: 3.14, turnover: 1.81, idle: 3.94 };
  function mbSaveTrend(key) {
    const f = MB_SAVE_FACTOR[key] || 1;
    /* 确定性抖动（不用 LCG 首值，避免连续种子退化成同一值） */
    return MB_SAVE_BASE.map(function (v, i) {
      return D.round(v * f * (0.94 + ((i * 7 + key.length * 5) % 13) / 100), 2);
    });
  }
  function mbSave(key) {
    return MB_SAVE.filter(function (s) { return s.key === key; })[0] || MB_SAVE[0];
  }


  /* ============================================================
     六项降本 › 降本明细清单
     · 单据口径：字段逐项抄自 Axure《列表字段选择-物资六项降本》（7 状态）
     · 合计降本：扩展为全量 6 大项 18 小项 + 项目确权产值金额
       （18 小项 = 六个状态指标信息的并集；「供应链金融溢价降本金额」在结算与周转中各出现一次，去重后 18 项）
     ============================================================ */
  const MB_SAVE_TYPES = ['bargain', 'consume', 'asset', 'accept', 'turnover', 'idle'];
  /* 18 小项：[key, 名称, 所属大项] */
  const MB_SAVE_SUBS = [
    ['bidSave', '集采引用议价降本金额', 'bargain'],
    ['perfSave', '过程履约议价降本金额', 'bargain'],
    ['finSave', '供应链金融溢价降本金额', 'bargain'],
    ['settleSave', '结算议价降本金额', 'bargain'],
    ['balanceSave', '材料结余降耗金额', 'consume'],
    ['processSave', '材料过程控耗金额', 'consume'],
    ['transferSave', '使用调拨资产降本金额', 'asset'],
    ['leaseSave', '资产租赁减少新购降本金额', 'asset'],
    ['qtySave', '数量验收核减降本金额', 'accept'],
    ['dualSave', '双控验收降本金额', 'accept'],
    ['qualitySave', '质量验收降本金额', 'accept'],
    ['highTurnSave', '使用高周转材料替换常规周转材料降本金额', 'turnover'],
    ['innerTurnSave', '提升内部周转降本金额', 'turnover'],
    ['toolSave', '优先使用调拨料具降本金额', 'turnover'],
    ['scrapSave', '废料增值处置降本金额', 'idle'],
    ['recycleSave', '废旧物资回收再利用降本金额', 'idle'],
    ['tempSave', '永临结合降本金额', 'idle'],
    ['remakeSave', '闲置物资改制再利用降本金额', 'idle']
  ];
  /* 6 大项的合计列（合计降本视图的默认展示项） */
  const MB_SAVE_SUM_COLS = [
    ['bargainAmt', '结算降本金额', 'bargain'], ['consumeAmt', '消耗降本金额', 'consume'],
    ['assetAmt', '资产降本金额', 'asset'], ['acceptAmt', '验收降本金额', 'accept'],
    ['turnoverAmt', '周转降本金额', 'turnover'], ['idleAmt', '闲废降本金额', 'idle']
  ];
  /* 最低维度就是项目：不再有「单号 / 单据状态」这类单据级字段 */
  const MB_SAVE_BASIC = [
    ['org2', '二级单位', 130], ['org3', '三级单位', 150], ['project', '项目名称', 200],
    ['pType', '项目类型', 120], ['unit', '实施单位', 200], ['month', '统计月份', 110],
    ['pStatus', '项目状态', 100], ['pFormat', '项目业态', 110], ['pMode', '承包模式', 130]
  ];
  /* 各口径的专有指标信息（Axure 面板逐状态抄录） */
  const MB_SAVE_METRICS = {
    bargain: MB_SAVE_SUBS.filter(function (x) { return x[2] === 'bargain'; }),
    consume: MB_SAVE_SUBS.filter(function (x) { return x[2] === 'consume'; }),
    asset: MB_SAVE_SUBS.filter(function (x) { return x[2] === 'asset'; }),
    accept: MB_SAVE_SUBS.filter(function (x) { return x[2] === 'accept'; }),
    turnover: MB_SAVE_SUBS.filter(function (x) { return x[2] === 'turnover'; })
      .concat([['finSave', '供应链金融溢价降本金额', 'turnover']]),
    idle: MB_SAVE_SUBS.filter(function (x) { return x[2] === 'idle'; })
  };
  /* 组织链四列都可渲染；其中「排名 / 二级单位」固定，「三级单位 / 项目名称」默认隐藏（在设置列里勾选） */
  const MB_ORG_COLS = ['idx', 'org2', 'org3', 'project'];
  const MB_FIXED_COLS = ['idx', 'org2'];

  /* 「降本明细项查询」：6 大项 + 18 小项两级（下拉按大项分组，分组的首项就是该大项本身） */
  const MB_ITEM_PARENT = {};                       // 小项 key → 所属大项 key
  MB_SAVE_SUBS.forEach(function (x) { MB_ITEM_PARENT[x[0]] = x[2]; });
  function mbItemOpts() {
    /* 复选枚举取 18 小项的并集（「供应链金融溢价降本金额」在结算与周转的列口径里各出现一次，去重后归结算）；
       分组标题自身也是一个可勾选项（勾上 = 整组勾选） */
    return MB_SAVE_TYPES.map(function (k) {
      return { value: k, label: mbSave(k).name,
        children: MB_SAVE_SUBS.filter(function (x) { return x[2] === k; })
          .map(function (x) { return { value: x[0], label: x[1] }; }) };
    });
  }
  function mbItemName(key) {
    if (!key) return '全部明细项';
    const sub = MB_SAVE_SUBS.filter(function (x) { return x[0] === key; })[0];
    return sub ? sub[1] : mbSave(key).name;
  }
  const MB_ALL_SUBS = MB_SAVE_SUBS.map(function (x) { return x[0]; });
  /* 18 小项在各自大项中的标准份额（与大项卡同一套拆分权重），供「降本明细项」勾选范围取数 */
  const MB_ITEM_SHARE = {};
  (function () {
    MB_SAVE_TYPES.forEach(function (k) {
      const list = MB_SAVE_SUBS.filter(function (x) { return x[2] === k; });
      const amt = +String(mbSave(k).value).replace(/,/g, '');
      const part = splitSubs(amt, list, 11 + k.length);
      list.forEach(function (x) { MB_ITEM_SHARE[x[0]] = amt ? part[x[0]] / amt : 0; });
    });
  })();
  /* 勾选集合（默认全选） */
  function mbItemSel() { return MS.items || MB_ALL_SUBS; }
  function mbShareOf(key) { return mbItemSel().indexOf(key) >= 0 ? (MB_ITEM_SHARE[key] || 0) : 0; }
  /* 卡片上的「全量」金额：大项取卡片值，合计取六项之和 */
  function mbCardAmt(key) {
    if (key === 'total') {
      return D.round(MB_SAVE_TYPES.reduce(function (a, k) { return a + mbCardAmt(k); }, 0), 2);
    }
    return +String(mbSave(key).value).replace(/,/g, '');
  }
  /* 勾选范围下的金额 / 占比（未勾选的小项不计入） */
  function mbScopeAmt(key) {
    if (key === 'total') {
      return D.round(MB_SAVE_TYPES.reduce(function (a, k) { return a + mbScopeAmt(k); }, 0), 2);
    }
    const share = MB_SAVE_SUBS.filter(function (x) { return x[2] === key; })
      .reduce(function (a, x) { return a + mbShareOf(x[0]); }, 0);
    return D.round(mbCardAmt(key) * share, 2);
  }
  function mbScopeRate(key) {
    const base = key === 'total' ? mbSave('total').rate : mbSave(key).rate;
    const all = mbCardAmt(key);
    return D.round(base * mbScopeAmt(key) / (all || 1), 2);
  }
  /* 只勾一个小项时，视图口径就是这个明细项（卡片收窄、趋势与主指标列跟随） */
  function mbScopeKey() {
    const sel = mbItemSel();
    return sel.length === 1 ? sel[0] : '';
  }
  /* 列头 ⓘ 的口径气泡（定义 / 口径 / 来源）：只给「口径不自明」的列挂，
     普通字段（金额、占比）不加图标，避免表头变噪 */
  const MB_COL_TIPS = {
    procAmt: { key: 'procAmt', name: '过程降本小计',
      desc: '验收降本 + 消耗降本 + 闲废降本 三项之和（过程履约阶段形成的降本额）',
      unit: '万元', src: SAVE_SRC },
    procRate: { key: 'procRate', name: '过程降本占比',
      desc: '过程降本小计 ÷ 降本额合计 —— 分母是「降本额合计」（当前行范围内六项降本金额之和，不是产值），' +
        '即过程降本金额在全部降本金额中的占比',
      unit: '%', src: SAVE_SRC }
  };
  /* 二级单位取简称；三级单位 = 二级单位简称 + 本级简称 */
  function mbOrg2Label(v) { return D.reportShortOf(String(v || '')); }
  function mbOrg3Label(v, r) {
    const p = mbOrg2Label(r && r.org2);
    if (!v) return p || '—';
    if (!p || String(v).indexOf(p) === 0) return String(v);
    const own = String((r && r.org3Short) || v);
    return own.indexOf(p) === 0 ? own : p + own;
  }

  /* 率值列的合计策略：始终「分子合计 ÷ 分母合计」，不是各行百分比的平均 */
  function mbRateTotal(numKey, denKey) {
    return function (rows) {
      const sum = function (k) {
        return rows.reduce(function (a, r) { return a + (typeof r[k] === 'number' ? r[k] : 0); }, 0);
      };
      const den = sum(denKey);
      return den ? D.round(sum(numKey) / den * 100, 2) : null;
    };
  }
  /* 列模型：合计降本 = 组织链（固定）+ 9 列默认 + 18 小项等隐藏项；单口径 = 组织链 + 该口径小项 + 降本额 / 占比 */
  function mbSaveCols(key) {
    const isTotal = key === 'total';
    const ident = [
      { key: 'idx', name: '排名', width: 70, num: true },
      { key: 'org2', name: '二级单位', width: 130, render: function (v) { return mbDrillLink('org2', v, mbOrg2Label(v)); } },
      { key: 'org3', name: '三级单位', width: 150, render: function (v, r) { return mbDrillLink('org3', v, mbOrg3Label(v, r)); } },
      { key: 'project', name: '项目名称', width: 200, render: function (v) { return mbDrillLink('project', v); } }
    ];
    if (isTotal) {
      /* 两个项目数统计字段前置到指标列最前（紧跟组织链）：先看「这一行统计了几个项目」，再看金额 */
      const metric = [
        { key: 'entCnt', name: '产值项目数', width: 110, num: true },
        { key: 'saveCnt', name: '降本项目数', width: 110, num: true }
      ];
      MB_SAVE_SUM_COLS.forEach(function (c) {
        metric.push({ key: c[0], name: c[1] + '(万元)', width: 140, num: true });
      });
      metric.push({ key: 'saveAmt', name: '降本额合计(万元)', width: 150, num: true });
      metric.push({ key: 'entAmt', name: '项目确权产值金额(万元)', width: 180, num: true });
      metric.push({ key: 'saveRate', name: '降低额占比', width: 120, pct: true,
        total: mbRateTotal('saveAmt', 'entAmt') });
      /* 过程降本小计（验收 + 消耗 + 闲废）与占比：列头 ⓘ 说明构成 / 来源 / 分母 */
      metric.push({ key: 'procAmt', name: '过程降本小计(万元)', width: 170, num: true, info: true });
      metric.push({ key: 'procRate', name: '过程降本占比', width: 150, pct: true, info: true,
        total: mbRateTotal('procAmt', 'saveAmt') });
      const rest = MB_SAVE_BASIC.filter(function (b) { return MB_ORG_COLS.indexOf(b[0]) < 0; })
        .map(function (b) { return { key: b[0], name: b[1], width: b[2] }; })
        .filter(function (c) { return ['code', 'docStatus'].indexOf(c.key) < 0; });
      const subs = MB_SAVE_SUBS.map(function (x) {
        return { key: x[0], name: x[1] + '（万元）', width: 240, num: true };
      });
      return ident.concat(metric).concat(rest).concat(subs);
    }
    const k = MB_SAVE_METRICS[key] ? key : 'bargain';
    /* 选中某个明细项时，主指标列就是该明细项，因此该小项不再重复出现在小项列里 */
    const itemKey = mbScopeKey() && MB_ITEM_PARENT[mbScopeKey()] === k ? mbScopeKey() : '';
    const metric = MB_SAVE_METRICS[k].filter(function (m2) { return m2[0] !== itemKey; })
      .map(function (m2) {
        return { key: m2[0], name: m2[1] + '（万元）', width: 240, num: true };
      });
    metric.push({ key: 'saveAmt', name: (itemKey ? mbItemName(itemKey) : mbSave(k).name) + '（万元）',
      width: 150, num: true });
    metric.push({ key: 'saveRate', name: '降本占比率', width: 110, pct: true,
      total: mbRateTotal('saveAmt', 'entAmt') });
    const rest = MB_SAVE_BASIC.filter(function (b) { return MB_ORG_COLS.indexOf(b[0]) < 0; })
      .map(function (b) { return { key: b[0], name: b[1], width: b[2] }; });
    return ident.concat(metric).concat(rest);
  }
  /* 默认显示列：合计降本 = 二级单位 + 6 大项 + 合计 + 产值 + 占比 + 过程小计/占比 + 项目数；
     单口径 = 二级单位 + 该口径小项 + 降本额 + 占比。三级单位 / 项目名称默认不显示（勾选后行粒度下沉） */
  function mbSaveDef(key) {
    if (key === 'total') {
      return MB_FIXED_COLS.concat(['entCnt', 'saveCnt'])
        .concat(MB_SAVE_SUM_COLS.map(function (c) { return c[0]; }))
        .concat(['saveAmt', 'entAmt', 'saveRate', 'procAmt', 'procRate']);
    }
    const k = MB_SAVE_METRICS[key] ? key : 'bargain';
    return MB_FIXED_COLS.concat(MB_SAVE_METRICS[k].map(function (m2) { return m2[0]; }))
      .concat(['saveAmt', 'saveRate']);
  }
  /* 把一个大项金额按确定性权重拆到它的小项上（各小项之和恒等于该大项） */
  function splitSubs(amt, subs, seed) {
    const w = subs.map(function (x, j) { return 22 + ((seed + j * 7) % 9) * 3; });
    const ws = w.reduce(function (a, b) { return a + b; }, 0);
    const out = {};
    let acc = 0;
    subs.forEach(function (x, j) {
      const v = j === subs.length - 1 ? D.round(amt - acc, 2) : D.round(amt * w[j] / ws, 2);
      out[x[0]] = v;
      acc = D.round(acc + v, 2);
    });
    return out;
  }
  /* 降本明细：最低维度就是项目 —— 一行 = 一个项目。
     金额有正有负（部分项目当期超支，降本为负），供「降本金额正负」筛选 */
  function mbDetailRows() {
    const rows = [];
    D.orgs.forEach(function (o, oi) {
      const subs = D.subOrgsByParent[o.name] || [];
      const pjs = (D.projectsByOrg && D.projectsByOrg[o.name]) || [];
      const mine = pjs.length ? pjs : D.projects.slice(oi * 2, oi * 2 + 3);
      mine.slice(0, 3).forEach(function (p, pi) {
        const seed = oi * 7 + pi * 3;
        const neg = (oi + pi) % 5 === 2;                    // 约 1/5 的项目降本为负
        const noEnt = (oi * 5 + pi) % 11 === 3;             // 少量项目尚未确权产值 → 产值项目数 0、占比不可算
        const noSave = !noEnt && (oi * 3 + pi) % 13 === 5;   // 少量项目当期无降本记录 → 降本项目数 0
        const tAmt = {};
        let sum = 0;
        MB_SAVE_TYPES.forEach(function (t, ti) {
          const base = { bargain: 1, consume: 1.9, asset: 2.6, accept: 3.1, turnover: 1.8, idle: 3.9 }[t];
          const v = noSave ? 0 :
            D.round((180 + base * 320 + ((seed * 37 + ti * 53) % 97) * 6.4) * (neg ? -1 : 1), 2);
          tAmt[t] = v;
          sum = D.round(sum + v, 2);
        });
        const rate = noSave ? 0 : D.round((neg ? -1 : 1) * (4.6 + (seed % 11) * 0.58), 2);
        /* 产值按占比反推：降低额占比 = 合计 ÷ 产值，保证行内自洽；未确权产值的行占比留空 */
        const ent = noEnt ? 0 : D.round(Math.abs(sum) / Math.abs(rate || 1) * 100, 2);
        const sub = subs.length ? subs[pi % subs.length] : null;
        const row = {
          org2: o.name, org3: sub ? sub.name : (p.subOrg || p.org),
          org3Short: sub ? sub.shortName : String(p.subOrg || p.org || ''),
          project: p.name, pType: p.type, unit: (p.subOrg || p.org) + '',
          pStatus: p.status, pFormat: p.format || '房建', pMode: p.mode,
          month: '2026-' + String(1 + (oi + pi) % 9).padStart(2, '0'),
          entAmt: ent, saveTotal: sum,
          saveRateTotal: noEnt ? null : (noSave ? 0 : rate),
          /* 过程降本小计 = 验收 + 消耗 + 闲废；占比 = 过程降本 ÷ 全部降本（口径见需求） */
          procAmt: D.round((tAmt.accept || 0) + (tAmt.consume || 0) + (tAmt.idle || 0), 2),
          entCnt: noEnt ? 0 : 1,
          saveCnt: noSave ? 0 : 1
        };
        row.procRate = sum ? D.round(row.procAmt / sum * 100, 2) : null;
        MB_SAVE_SUM_COLS.forEach(function (c) { row[c[0]] = tAmt[c[2]]; });
        MB_SAVE_TYPES.forEach(function (t, ti) {
          /* 拆分集 = 「归属该大项」的小项（18 小项各归一个大项）：周转口径里的
             「供应链金融溢价降本金额」归在结算降本，不参与周转的拆分 ——
             否则同一字段会被两套拆分先后覆盖，小项之和与所属大项对不上 */
          const part = splitSubs(tAmt[t], MB_SAVE_SUBS.filter(function (x) { return x[2] === t; }), seed + ti);
          Object.keys(part).forEach(function (kk) { row[kk] = part[kk]; });
        });
        /* 单口径视图的两列（降本额 / 降本占比率）按该口径取值 */
        Object.keys(MB_SAVE_METRICS).forEach(function (k) { row['amt_' + k] = tAmt[k]; });
        rows.push(row);
      });
    });
    return rows;
  }
  /* 按当前口径把「降本额 / 降本占比率」两列投影成通用键（列表列定义固定用 saveAmt / saveRate） */
  function mbRowsFor(key) {
    const k = key === 'total' || !MB_SAVE_METRICS[key] ? 'total' : key;
    const sel = mbItemSel();
    /* 一个大项里「被勾选的小项」之和（勾选范围决定取数；小项全勾即该大项全量） */
    const sumSel = function (r, k2) {
      return D.round(MB_SAVE_SUBS.filter(function (x) { return x[2] === k2; })
        .reduce(function (a, x) { return a + (sel.indexOf(x[0]) >= 0 ? (r[x[0]] || 0) : 0); }, 0), 2);
    };
    return mbDetailRows().map(function (r) {
      const amt = k === 'total'
        ? D.round(MB_SAVE_TYPES.reduce(function (a, k2) { return a + sumSel(r, k2); }, 0), 2)
        : sumSel(r, k);
      const ent = r.entAmt || 0;
      const proc = D.round(sumSel(r, 'accept') + sumSel(r, 'consume') + sumSel(r, 'idle'), 2);
      const out = Object.assign({}, r, {
        saveAmt: amt,
        saveRate: ent ? D.round(amt / ent * 100, 2) : null,
        procAmt: proc,
        /* 降本项目数：勾选范围内还有降本记录才算 1（项目行 0/1，单位行是计数） */
        saveCnt: amt ? 1 : 0
      });
      MB_SAVE_SUM_COLS.forEach(function (c) { out[c[0]] = sumSel(r, c[2]); });
      MB_SAVE_TYPES.forEach(function (k2) { out['amt_' + k2] = sumSel(r, k2); });
      out.procRate = out.saveAmt ? D.round(proc / out.saveAmt * 100, 2) : null;
      return out;
    });
  }
  /* 行粒度由「查看层级」控件决定，不再随设置列变化；下钻时至少展开下一级 */
  function mbRowLevel(shown) {
    const keys = shown.map(function (c) { return c.key; });
    let lv = keys.indexOf('project') >= 0 ? 'project' : keys.indexOf('org3') >= 0 ? 'org3' : 'org2';
    if (MS.drill.org2 && lv === 'org2') lv = 'org3';
    if ((MS.drill.org3 || MS.drill.project) && lv !== 'project') lv = 'project';
    return lv;
  }
  const MB_NUM_KEYS = MB_SAVE_SUBS.map(function (x) { return x[0]; })
    .concat(MB_SAVE_SUM_COLS.map(function (c) { return c[0]; }))
    .concat(['saveAmt', 'saveTotal', 'entAmt', 'procAmt', 'entCnt', 'saveCnt']);
  /* 按行粒度汇总：金额与小项金额相加、项目数相加；率值列在汇总后再算「分子 ÷ 分母」 */
  function mbAggRows(rows, lv) {
    if (lv === 'project') return rows;
    const map = {};
    const out = [];
    rows.forEach(function (r) {
      const key = lv === 'org2' ? r.org2 : (r.org2 + '|' + r.org3);
      let g = map[key];
      if (!g) {
        g = Object.assign({}, r);
        /* 组织链按层级保留，不适用的一律留空（表格显示「—」）；项目属性在单位行不适用 */
        g.org3 = lv === 'org3' ? r.org3 : '';
        g.org3Short = lv === 'org3' ? r.org3Short : '';
        g.project = '';
        ['pType', 'unit', 'month', 'pStatus', 'pFormat', 'pMode'].forEach(function (k2) { g[k2] = ''; });
        MB_NUM_KEYS.forEach(function (k2) { g[k2] = 0; });
        map[key] = g;
        out.push(g);
      }
      MB_NUM_KEYS.forEach(function (k2) {
        g[k2] = D.round((g[k2] || 0) + (typeof r[k2] === 'number' ? r[k2] : 0), 2);
      });
    });
    out.forEach(function (g) {
      g.saveRate = g.entAmt ? D.round(g.saveAmt / g.entAmt * 100, 2) : null;
      g.procRate = g.saveAmt ? D.round(g.procAmt / g.saveAmt * 100, 2) : null;
    });
    return out;
  }
  /* 明细清单的合计行：金额 / 项目数列加总；率值列的「分子 ÷ 分母」口径由列上的 total 策略执行 */
  function mbTotalRow(cols, rows) {
    if (!cols.some(function (c) { return c.num; })) return null;
    return D.totalOf(cols, rows);
  }

  /* 本页内下钻：点单位名 / 项目名就地过滤本表（不跳数据报表） */
  function mbDrillLink(level, v, label) {
    if (!v) return '—';
    return '<span class="dsc-table__link" data-mb-drill="' + level + '|' + esc(v) + '">' +
      esc(label == null ? v : label) + '</span>';
  }
  function mbDrillRows(rows) {
    const d = MS.drill;
    return rows.filter(function (r) {
      if (d.org2 && r.org2 !== d.org2) return false;
      if (d.org3 && r.org3 !== d.org3) return false;
      if (d.project && r.project !== d.project) return false;
      return true;
    });
  }
  /* 降本金额正负：按「最终展示的那一行」判断（二级单位行看单位合计，项目行看项目） */
  function mbSignRows(rows) {
    if (MS.sign === '正数') return rows.filter(function (r) { return r.saveAmt > 0; });
    if (MS.sign === '负数') return rows.filter(function (r) { return r.saveAmt < 0; });
    return rows;
  }
  function mbDrillPath() {
    const d = MS.drill;
    if (!d.org2) return '';
    const parts = [['全部', 'all|']];
    parts.push([d.org2, 'org2|' + d.org2]);
    if (d.org3) parts.push([d.org3, 'org3|' + d.org3]);
    if (d.project) parts.push([d.project, 'project|' + d.project]);
    return '<div class="drill-path report-page__drill-path">' +
      '<span>组织下钻：</span>' +
      parts.map(function (p, i) {
        const last = i === parts.length - 1;
        return (i ? '<span class="drill-path__sep">&gt;</span>' : '') +
          '<span class="drill-path__crumb' + (last ? '' : ' drill-path__crumb--link') + '"' +
          (last ? '' : ' data-mb-drill="' + p[1] + '"') + '>' + esc(p[0]) + '</span>';
      }).join('') +
      '<button class="dsc-btn dsc-btn--sm drill-path__back" data-mb-drill-back>返回上一级</button></div>';
  }

  D.materialSaveModel = {
    MB_SAVE, MB_SAVE_MONTHS, MB_SAVE_TYPES, MB_SAVE_SUBS,
    MB_ALL_SUBS, MB_ITEM_PARENT, MB_FIXED_COLS, MB_COL_TIPS,
    mbSave, mbSaveTrend, mbItemOpts, mbItemName, mbItemSel, mbCardAmt,
    mbScopeAmt, mbScopeRate, mbScopeKey, mbSaveCols, mbSaveDef,
    mbRowsFor, mbRowLevel, mbAggRows, mbTotalRow,
    mbDrillRows, mbSignRows, mbDrillPath
  };
})(window.APP);
