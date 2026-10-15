/* ============================================================
   指标明细列表 · 动态字段（指标 × 基本信息 / 指标信息）
   字段清单逐状态导出自 Axure《局驾驶舱 › 核心数据》各指标页签的「设置列」面板：
     · 采购 / 物资：列表字段选择-采购+物资（15 个状态，逐个指标一套）
     · 资产：列表字段选择-资产（5 个状态）
   接口：
     D.METRIC_COLS[key] = { name, basic:[字段名…], info:[[key, 名称, 类型], …], calc(base, org) }
     D.metricRows(units, key) → 每行 {name, basic 值…, info 值…}
   ============================================================ */
(function (D) {
  'use strict';

  /* 基本信息：按指标从原型逐字抄录（不同指标带的单据/维度字段不同） */
  const B = {
    org: ['三级单位', '项目', '项目类型', '项目状态', '项目业态', '承包模式'],
    doc: ['合同', '合同来源', '采购类别', '物料大分类', '物料中分类', '物料小分类', '结算单/产值单'],
    sup: ['供应商'],
    ord: ['订单'],
    mon: ['月份'],
    region: ['区域联盟', '项目联合体']
  };
  const BASIC = {
    costDown: B.org.concat(B.doc, B.region),
    benefit: B.org.concat(B.doc, B.sup, B.region),
    central: B.org.concat(B.doc, B.region),
    subCentral: B.org.concat(B.doc, B.region),
    direct: B.org.concat(B.doc, B.region),
    plan: B.org.concat(B.doc, B.region),
    leadTime: B.org.concat(B.doc, B.region),
    supplyChainDown: B.org.concat(B.doc, B.region),
    bargain: B.org.concat(B.doc, B.region),
    orderRatio: B.org.concat(B.doc, B.region),
    payRatio: B.org.concat(B.doc, B.region),
    monthSettle: B.org.concat(B.doc, B.mon, B.region),
    orderPlan: B.org.concat(B.doc, B.ord, B.mon, B.region),
    totalSettle: B.org.concat(B.doc, B.sup, B.region),
    assetTurnover: B.org.concat(B.region),
    assetIdle: B.org.concat(B.region),
    assetDepRate: B.org.concat(B.region)
  };

  const M = function (k, n) { return [k, n, 'money']; };
  const P = function (k, n) { return [k, n, 'pct']; };
  const C = function (k, n) { return [k, n, 'cnt']; };
  const N = function (k, n, d) { return [k, n, 'num', d]; };

  /* 三个分包口径的金额（元 → 万元） */
  const W = function (yuan) { return D.round((yuan || 0) / 1e4, 2); };
  const r1 = function (v) { return D.round(v, 1); };
  const r2 = function (v) { return D.round(v, 2); };

  D.METRIC_COLS = {
    /* ---------- 采购（核心数据 › 采购） ---------- */
    costDown: {
      name: '采购成本降低率',
      info: [M('matStd', '物资设备标准成本总金额'), M('matBuy', '物资设备采购总金额'),
        M('matSave', '物资设备采购成本降低额'), P('matRate', '物资设备采购成本降低率'),
        M('labStd', '劳务分包标准成本总金额'), M('labBuy', '劳务分包采购总金额'),
        M('labSave', '劳务分包采购成本降低额'), P('labRate', '劳务分包采购成本降低率'),
        M('specStd', '专业分包标准成本总金额'), M('specBuy', '专业分包采购总金额'),
        M('specSave', '专业分包采购成本降低额'), P('specRate', '专业分包采购成本降低率'),
        M('totalSave', '采购成本降低总额'), P('allRate', '综合采购成本降低率')],
      calc: function (b) {
        const mk = function (buy, rate) {
          const std = buy / (1 - rate / 100 || 1);
          return { std: std, save: std - buy };
        };
        const m = mk(b.mat, b.cdMat), l = mk(b.lab, b.cdSpec), s = mk(b.spec, b.cdSpec);
        return {
          matStd: W(m.std), matBuy: W(b.mat), matSave: W(m.save), matRate: b.cdMat,
          labStd: W(l.std), labBuy: W(b.lab), labSave: W(l.save), labRate: b.cdSpec,
          specStd: W(s.std), specBuy: W(b.spec), specSave: W(s.save), specRate: b.cdSpec,
          totalSave: W(m.save + l.save + s.save), allRate: b.cdSum
        };
      }
    },
    benefit: {
      name: '物资设备采购效益率',
      info: [M('materialAmt', '主材采购金额'), M('buyAmt', '采购金额'), P('materialPct', '主材采购占比'),
        M('matIncome', '物资设备总收入金额（万元）'), M('labIncome', '劳务分包总收入金额（万元）'),
        M('matBuy', '物资设备总采购金额（万元）'), M('matSave', '物资设备采购效益额（万元）'), P('matRate', '物资设备采购效益率（%）'),
        M('labBuy', '劳务分包总采购金额（万元）'), M('labSave', '劳务分包采购效益额（万元）'), P('labRate', '劳务分包采购效益率（%）'),
        M('specIncome', '专业分包总收入金额（万元）'), M('specBuy', '专业分包总采购金额（万元）'),
        M('specSave', '专业分包采购效益额（万元）'), P('specRate', '专业分包采购效益率（%）'),
        M('income', '总收入金额（万元）'), M('buy', '总采购金额（万元）'),
        M('save', '采购效益额（万元）'), P('rate', '采购效益率（%）')],
      calc: function (b) {
        const part = function (buy, rate) { const inc = buy * (1 + rate / 100); return { inc: inc, save: inc - buy }; };
        const m = part(b.mat, b.benefit), l = part(b.lab, b.benefit - 1.2), s = part(b.spec, b.benefit + 0.8);
        const buy = b.mat + b.lab + b.spec, inc = m.inc + l.inc + s.inc;
        return {
          materialAmt: W(b.mat), buyAmt: W(buy), materialPct: r2(b.mat / (buy || 1) * 100),
          matIncome: W(m.inc), labIncome: W(l.inc), matBuy: W(b.mat), matSave: W(m.save), matRate: r2(b.benefit),
          labBuy: W(b.lab), labSave: W(l.save), labRate: r2(b.benefit - 1.2),
          specIncome: W(s.inc), specBuy: W(b.spec), specSave: W(s.save), specRate: r2(b.benefit + 0.8),
          income: W(inc), buy: W(buy), save: W(inc - buy), rate: r2((inc - buy) / (buy || 1) * 100)
        };
      }
    },
    central: {
      name: '物资设备集中采购率',
      info: [M('matAmt', '物资设备集中采购金额（万元）'), M('matBuy', '物资设备采购总金额（万元）'), P('matRate', '物资设备集中采购率（%）'),
        M('labAmt', '劳务分包集中采购金额（万元）'), M('labBuy', '劳务分包采购总金额（万元）'), P('labRate', '劳务分包集中采购率（%）'),
        M('specAmt', '专业分包集中采购金额（万元）'), M('specBuy', '专业分包采购总金额（万元）'), P('specRate', '专业分包集中采购率（%）'),
        M('amt', '集中采购金额（万元）'), M('buy', '采购总金额（万元）'), P('rate', '集中采购率（%）'),
        C('cenSup', '集中采购履约供应商数'), C('sup', '履约供应商数'), P('supPct', '集采供应商占比（%）')],
      calc: function (b, o) {
        const on = (o && o.res && o.res.onStock) || 800;
        return {
          matAmt: W(b.mat * b.central / 100), matBuy: W(b.mat), matRate: b.central,
          labAmt: W(b.lab * b.subCentral / 100), labBuy: W(b.lab), labRate: b.subCentral,
          specAmt: W(b.spec * b.subCentral / 100), specBuy: W(b.spec), specRate: b.subCentral,
          amt: W(b.sum * b.central / 100), buy: W(b.sum), rate: b.central,
          cenSup: Math.round(on / 10 * b.central / 100), sup: Math.round(on / 10),
          supPct: r2(b.central)
        };
      }
    },
    subCentral: {
      name: '分包集中采购率',
      info: [M('labAmt', '劳务分包集中采购金额（万元）'), M('labBuy', '劳务分包采购总金额（万元）'), P('labRate', '劳务分包集中采购率（%）'),
        M('specAmt', '专业分包集中采购金额（万元）'), M('specBuy', '专业分包采购总金额（万元）'), P('specRate', '专业分包集中采购率（%）'),
        M('amt', '集中采购金额（万元）'), M('buy', '采购总金额（万元）'), P('rate', '集中采购率（%）'),
        C('cenSup', '集中采购履约供应商数'), C('sup', '履约供应商数'), P('supPct', '集采供应商占比（%）')],
      calc: function (b, o) {
        const on = (o && o.res && o.res.onStock) || 800;
        const lab = b.lab, spec = b.spec;
        return {
          labAmt: W(lab * b.subCentral / 100), labBuy: W(lab), labRate: b.subCentral,
          specAmt: W(spec * b.subCentral / 100), specBuy: W(spec), specRate: b.subCentral,
          amt: W((lab + spec) * b.subCentral / 100), buy: W(lab + spec), rate: b.subCentral,
          cenSup: Math.round(on / 10 * b.subCentral / 100), sup: Math.round(on / 10),
          supPct: r2(b.subCentral)
        };
      }
    },
    direct: {
      name: '厂家直采总占比',
      info: [M('matDirect', '物资设备厂家直采金额（万元）'), M('matBuy', '物资设备采购总金额（万元）'), P('rate', '厂家直采占比（%）'),
        M('catDirect', '对应品类物资设备厂家直采总金额（万元）'), M('catBuy', '对应品类物资设备采购总金额（万元）'),
        P('catRate', '对应品类厂家直采占比（%）')],
      calc: function (b) {
        const buy = b.material || b.mat;
        return {
          matDirect: W(buy * b.direct / 100), matBuy: W(buy), rate: b.direct,
          catDirect: W(buy * b.direct / 100 * 0.62), catBuy: W(buy * 0.62), catRate: b.direct
        };
      }
    },
    plan: {
      name: '采购计划执行率',
      info: [C('matAll', '物资设备总采购计划笔数'), C('matOn', '物资设备按时提交采购计划笔数'),
        C('matChg', '物资设备变更采购计划笔数'), P('matRate', '物资设备采购计划执行率（%）'),
        C('labAll', '劳务分包总采购计划笔数'), C('labOn', '劳务分包按时提交采购计划笔数'),
        C('labChg', '劳务分包变更采购计划笔数'), P('labRate', '劳务分包采购计划执行率（%）'),
        C('specAll', '专业分包总采购计划笔数'), C('specOn', '专业分包按时提交采购计划笔数'),
        C('specChg', '专业分包变更采购计划笔数'), P('specRate', '专业分包采购计划执行率（%）'),
        C('all', '总采购计划笔数'), C('on', '按时提交采购计划笔数'), C('chg', '变更采购计划笔数'),
        P('rate', '采购计划执行率（%）')],
      calc: function (b) {
        const part = function (amt, rate) {
          const all = Math.max(1, Math.round(amt / 1e4 * 1.6));
          return { all: all, on: Math.round(all * rate / 100), chg: Math.round(all * 0.04), rate: rate };
        };
        const m = part(b.mat, b.plan), l = part(b.lab, b.plan - 1.6), s = part(b.spec, b.plan + 0.9);
        const all = m.all + l.all + s.all, on = m.on + l.on + s.on, chg = m.chg + l.chg + s.chg;
        return {
          matAll: m.all, matOn: m.on, matChg: m.chg, matRate: m.rate,
          labAll: l.all, labOn: l.on, labChg: l.chg, labRate: l.rate,
          specAll: s.all, specOn: s.on, specChg: s.chg, specRate: s.rate,
          all: all, on: on, chg: chg, rate: r2(on / (all || 1) * 100)
        };
      }
    },
    leadTime: {
      name: '采购时效',
      info: [N('lead', '平均招采时效（天）', 1), C('online', '线上评标次数'), C('bid', '评标笔数'), P('onlineRate', '在线评标率（%）'),
        C('openBid', '使用公开招标方式招标笔数'), C('bidAll', '总招标次数'), P('openRate', '公开招标率（%）'),
        C('fail', '废标笔数'), P('failRate', '招采废标率（%）')],
      calc: function (b) {
        const all = Math.max(1, Math.round(b.sum / 1e4 * 0.09));
        const bid = Math.round(all * 0.96), online = Math.round(bid * 0.86);
        const openBid = Math.round(all * 0.62), fail = Math.round(all * 0.034);
        return {
          lead: b.lead, online: online, bid: bid, onlineRate: r2(online / (bid || 1) * 100),
          openBid: openBid, bidAll: all, openRate: r2(openBid / (all || 1) * 100),
          fail: fail, failRate: r2(fail / (all || 1) * 100)
        };
      }
    },
    supplyChainDown: {
      name: '降本金额占比',
      info: [M('saveAmt', '降本金额（万元）'), M('output', '项目总包确权产值'), P('rate', '供应链降本金额占比产值（%）'),
        P('onlineRate', '在线评标率（%）'), C('openBid', '使用公开招标方式招标笔数'), C('bidAll', '总招标次数'),
        P('openRate', '公开招标率（%）'), C('fail', '废标笔数'), P('failRate', '招采废标率（%）')],
      calc: function (b) {
        const output = b.sum / 1e4 * 6;
        return {
          saveAmt: W(output * b.downPct / 100), output: W(output), rate: b.downPct,
          onlineRate: 86.2, openBid: Math.round(b.sum / 1e4 * 0.056), bidAll: Math.round(b.sum / 1e4 * 0.09),
          openRate: r2(Math.round(b.sum / 1e4 * 0.056) / (Math.round(b.sum / 1e4 * 0.09) || 1) * 100),
          fail: Math.round(b.sum / 1e4 * 0.0031), failRate: r2(Math.round(b.sum / 1e4 * 0.0031) / (Math.round(b.sum / 1e4 * 0.09) || 1) * 100)
        };
      }
    },

    /* ---------- 物资（核心数据 › 物资） ---------- */
    bargain: {
      name: '二次议价采购成本降低率',
      info: [M('saveAmt', '二次议价 降本金额（万元）'), M('buy', '总采购金额（万元）'), P('rate', '二次议价成本降低率（%）')],
      calc: function (b, o, v) {
        const rate = v == null ? 5.85 : v;
        return { saveAmt: W(b.sum * rate / 100), buy: W(b.sum), rate: rate };
      }
    },
    orderRatio: {
      name: '合同下单比例',
      info: [M('contractAmt', '合同总金额（万元）'), M('orderedAmt', '合同已下单金额（万元）'), P('rate', '合同下单比例（%）')],
      calc: function (b, o, v) {
        const rate = v == null ? 73.53 : v;
        return { contractAmt: W(b.sum * 1.12), orderedAmt: W(b.sum * 1.12 * rate / 100), rate: rate };
      }
    },
    payRatio: {
      name: '按合同履约支付率',
      info: [M('contractBuy', '合同总采购金额（万元）'), M('shouldPay', '合同约定应支付金额（万元）'),
        M('paid', '合同已支付金额（万元）'), P('rate', '按合同履约支付率（%）')],
      calc: function (b, o, v) {
        const rate = v == null ? 45.57 : v;
        const should = W(b.sum) * 0.92;
        return { contractBuy: W(b.sum), shouldPay: r2(should), paid: r2(should * rate / 100), rate: rate };
      }
    },
    monthSettle: {
      name: '月度结算完成率',
      info: [M('monthAmt', '本月结算金额/数量'), M('lastAccept', '上月验收金额/数量'), P('rate', '月度结算完成率（%）')],
      calc: function (b, o, v) {
        const rate = v == null ? 45.57 : v;
        const last = W(b.sum) * 0.34;
        return { monthAmt: r2(last * rate / 100), lastAccept: r2(last), rate: rate };
      }
    },
    orderPlan: {
      name: '订单计划使用率',
      info: [C('planOrder', '引用数字建造计划生成订单数'), C('doneOrder', '完成订单数量'), P('rate', '订单计划使用率（%）')],
      calc: function (b, o, v) {
        const rate = v == null ? 45.57 : v;
        const all = Math.max(1, Math.round(b.sum / 1e4 * 0.08));
        return { planOrder: Math.round(all * rate / 100), doneOrder: all, rate: rate };
      }
    },
    totalSettle: {
      name: '总结算完成率',
      info: [C('doneSettle', '项目总结算完成数量'), C('supplyAll', '项目物资供应总数量'), P('rate', '总结算完成率（%）')],
      calc: function (b, o, v) {
        const rate = v == null ? 45.57 : v;
        const all = Math.max(1, Math.round(((o && o.res && o.res.onStock) || 800) / 12));
        return { doneSettle: Math.round(all * rate / 100), supplyAll: all, rate: rate };
      }
    },

    /* ---------- 资产（核心数据 › 资产） ---------- */
    assetTurnover: {
      name: '资产周转率',
      info: [M('outAmt', '项目调出资产总金额(万元)'), M('totalAmt', '项目资产总金额(万元)'), P('rate', '资产周转率(%)')],
      calc: function (b, o, v) {
        const rate = v == null ? 1.2 : v;
        const total = W(b.sum) * 1.4;
        return { outAmt: r2(total * rate / 100), totalAmt: r2(total), rate: rate };
      }
    },
    assetIdle: {
      name: '资产闲置率',
      info: [M('idleAmt', '闲置资产总额(万元)'), M('totalAmt', '项目资产总金额(万元)'), P('rate', '资产闲置率(%)')],
      calc: function (b, o, v) {
        const rate = v == null ? 2.1 : v;
        const total = W(b.sum) * 1.4;
        return { idleAmt: r2(total * rate / 100), totalAmt: r2(total), rate: rate };
      }
    },
    assetDepRate: {
      name: '资产折旧率',
      info: [M('depAmt', '当期折旧金额(万元)'), M('origAmt', '资产原值(万元)'), P('rate', '资产折旧率(%)')],
      calc: function (b, o, v) {
        const rate = v == null ? 8.4 : v;
        const orig = W(b.sum) * 1.6;
        return { depAmt: r2(orig * rate / 100), origAmt: r2(orig), rate: rate };
      }
    }
  };
  D.METRIC_BASIC = BASIC;

  /* ---------- 基本信息字段的取值（按二级单位聚合/代表性取值） ----------
     原型没有到「单据行」级的明细数据，这里按该单位的下属组织与项目推导出**真实可达**的取值，
     使「设置列」里每一个字段都有值（而不是一片 —） */
  function dom(list) {
    const cnt = {};
    let best = '', n = 0;
    list.forEach(function (v) { if (!v) return; cnt[v] = (cnt[v] || 0) + 1; if (cnt[v] > n) { n = cnt[v]; best = v; } });
    return best;
  }
  D.metricBasicValues = function (short) {
    const o = D.orgMap[short];
    const base = D.reportUnitMetrics(short) || {};
    const i = D.orgs.map(function (x) { return x.name; }).indexOf(short);
    const idx = i < 0 ? 0 : i;
    const subs = D.subOrgsByParent[short] || [];
    const pjs = D.projects.filter(function (p) { return p.org === short; });
    const sumW = (base.sum || 0) / 1e4;                        // 万元
    const S = D.suppliers && D.suppliers.length ? D.suppliers : [];
    const mk = function (n) { return idx * 7 + n; };
    const cat = (base.lab + base.spec) > base.mat ? '分包类' :
      base.spec > base.lab ? '专业分包类' : '物资类';
    return {
      org2: short,
      org3: subs.length ? (subs[0].name + (subs.length > 1 ? ' 等 ' + subs.length + ' 个' : ''))
        : (D.subOrgs[mk(0) % D.subOrgs.length] || {}).name || '—',
      project: pjs.length ? (pjs.length + ' 个（示例：' + pjs[0].name.slice(0, 10) + '…）')
        : (D.projects[mk(0) % D.projects.length] || {}).name || '—',
      /* 没有挂到该单位的项目时，按同一套取值口径兜底，保证每个字段都有值 */
      pType: dom(pjs.map(function (p) { return p.type; })) || D.TYPES[idx % D.TYPES.length],
      pStatus: dom(pjs.map(function (p) { return p.status; })) || D.STATUS[idx % D.STATUS.length],
      pFormat: dom(pjs.map(function (p) { return p.format; })) || D.FORMATS[idx % D.FORMATS.length],
      pMode: dom(pjs.map(function (p) { return p.mode; })) || D.MODES[idx % D.MODES.length],
      contract: D.fmtInt(Math.max(1, Math.round(sumW * 0.26))) + ' 份',
      contractSrc: ['招标', '询比价', '框架协议', '单一来源'][mk(1) % 4],
      purchaseCat: cat,
      matBig: D.material.big[mk(2) % D.material.big.length],
      matMid: D.material.mid[mk(3) % D.material.mid.length],
      matSmall: D.material.small[mk(4) % D.material.small.length],
      settleDoc: D.fmtInt(Math.max(1, Math.round(sumW * 0.18))) + ' 张',
      supplier: S.length ? S[mk(5) % S.length].name : '中建八局物资集中采购中心',
      order: D.fmtInt(Math.max(1, Math.round(sumW * 0.31))) + ' 单',
      month: '2026-09',
      regionAlliance: dom(pjs.map(function (p) { return p.area; })) || D.AREAS[idx % D.AREAS.length],
      projectJV: mk(6) % 3 === 0 ? '是' : '否'
    };
  };

  /* 明细行：单位 × 指标 → { name, 基本信息字段…, 指标信息字段… } */
  D.metricRows = function (units, key, valOf) {
    const spec = D.METRIC_COLS[key];
    if (!spec) return [];
    return units.map(function (u) {
      const short = u.name || u;
      const base = D.reportUnitMetrics(short) || {};
      const o = D.orgMap[short];
      const v = valOf ? valOf(short) : null;
      const info = spec.calc(base, o, v);
      const row = Object.assign({ name: short, full: (D.REPORT_UNITS[short] || [])[0] || '' },
        D.metricBasicValues(short));
      spec.info.forEach(function (f) { row[f[0]] = info[f[0]]; });
      row.amount = base.sum;
      return row;
    });
  };
})(window.APP);
