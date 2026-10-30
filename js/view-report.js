/* ============================================================
   F4 物资数据报表 / F5 采购数据报表 / F6 分供商数据报表 / F7 资产数据报表
   原型分类：CRUD/list（克制视觉，宽表主导）
   ============================================================ */
(function (D) {
  'use strict';
  const esc = D.esc;

  const RS = {
    page: 1, size: 10, sizeBy: {},   // 分页大小按数据集记忆（采购明细默认 15 行/页）
    shown: {},
    overviewLevel: 2,      // F5 总览下钻层级 2=二级 3=三级 4=项目
    overviewOrg: '',
    overviewBase: null,    // 下钻时携带的上级金额口径（保证下级合计 = 上级）
    overviewStack: [],     // 下钻路径（不含根）：[二级单位, 三级单位] → 面包屑可逐级点回
    lastRows: [],          // 总览当前行（供下钻时按索引取用）
    purGrain: '日',        // 采购总览统计粒度
    matGrain: '日',        // 物资总览统计粒度
    supGrain: '日',        // 资源数据明细统计粒度
    assetGrain: '日',      // 资产报表统计粒度
    view: '',              // 采购 / 物资报表当前页签（overview=局级总览 / detail=明细）
    conds: {},             // 用户已提交的筛选条件（重绘后回填，不因查询 / 切页签丢失）
    pageKey: '',           // 「数据集+页签」标识：只有换页签/换报表才把页码复位到 1
    condText: '',          // 就地展示的条件摘要（看板同款反馈）
    supTab: 'resource',
    sortKey: '', sortDir: 'asc'
  };
  D.reportState = RS;

  const DS = {
    material: { name: '物资数据报表', note: '局级总览：物资 6 项核心指标（二级单位，可逐级下钻到三级/项目）　·　明细：物资结算明细全量表（45+ 字段）' },
    purchase: { name: '采购数据报表', note: '总览：采购指标汇总（二级单位，含局合计，可逐级下钻到三级/项目）　·　明细：合同全量清单（70+ 字段）' },
    supplier: { name: '分供商数据报表', note: '资源明细 / 合作分析' },
    asset: { name: '资产数据报表', note: '资产明细全量表（30+ 字段）· 支持筛选、列设置与导出' }
  };

  /* ---------- 字段集（附录 B/C/D/E/F） ---------- */
  function C(k, n, w, o) { return Object.assign({ key: k, name: n, width: w || 120 }, o || {}); }

  const COLS = {
    /* 附录 D 物资结算明细（列序对齐 Axure「物资数据报表 › 明细」：
       单据信息 → 物料信息 → 金额信息 → 降本指标 → 关联单据） */
    settlement: [
      C('idx', '序号', 56, { sticky: true }),
      C('org2', '二级单位', 110, { sticky2: true }), C('org3', '三级单位', 120), C('project', '项目', 200),
      C('settleCode', '结算单号', 190, { link: true }),
      C('settleType', '结算单类型', 110), C('settleStatus', '结算单状态', 110),
      C('supplier', '分供商', 190),
      C('settleCycle', '结算周期', 110), C('settleMonth', '结算月份', 100),
      C('detailType', '结算明细类型', 120), C('docCode', '单据编号', 150, { link: true }),
      C('date', '日期', 110),
      C('matBig', '物料大类', 130), C('matMid', '物料中类', 120), C('matSmall', '物料小类', 120),
      C('matCode', '物料编码', 140), C('matDesc', '物料描述', 180), C('brand', '品牌', 90),
      C('unit', '计量单位', 90), C('qty', '数量', 100, { num: true }),
      C('priceTax', '含税单价', 110, { num: true }), C('amtTax', '含税金额', 120, { num: true }),
      C('taxRate', '税率', 80, { num: true }), C('priceNoTax', '不含税单价', 110, { num: true }),
      C('amtNoTax', '不含税金额', 120, { num: true }), C('taxAmt', '税额', 100, { num: true }),
      C('contractAmt', '合同总金额', 120, { num: true }), C('orderedAmt', '合同已下单金额', 140, { num: true }),
      C('settledAmt', '合同已结算金额(包含本次结算)', 210, { num: true }),
      C('unsettledAmt', '合同未结算金额(包含本次结算)', 210, { num: true }),
      C('inPriceTax', '收入价含税单价', 130, { num: true }), C('inAmtTax', '收入价含税金额', 130, { num: true }),
      C('inTaxRate', '收入价税率', 110, { num: true }), C('inPriceNoTax', '收入价不含税单价', 140, { num: true }),
      C('inAmtNoTax', '收入价不含税金额', 140, { num: true }),
      C('costPriceTax', '成本价含税单价', 130, { num: true }), C('costAmtTax', '成本价含税金额', 130, { num: true }),
      C('costTaxRate', '成本价税率', 110, { num: true }), C('costPriceNoTax', '成本价不含税单价', 140, { num: true }),
      C('costAmtNoTax', '成本价不含税金额', 140, { num: true }),
      C('costDown', '成本降低率', 110, { num: true, pct: true, range: [0, 50] }),
      C('bargainDown', '二次议价成本降低率', 150, { num: true, pct: true }),
      C('benefit', '采购效益率', 110, { num: true, pct: true }),
      C('contractCode', '合同编号', 150, { link: true }), C('orderCode', '订单编号', 150, { link: true }),
      C('receiveCode', '收料单号', 150, { link: true }), C('pickCode', '领料单号', 150, { link: true })
    ],
    /* 附录 B 合同明细 */
    contract: [
      C('idx', '序号', 56, { sticky: true }),
      C('name', '合同名称', 300, { sticky2: true }),
      C('code', '合同编号', 160, { link: true }),
      C('org2', '二级单位', 150), C('org3', '三级单位', 200),
      C('suppCode', '补充协议编号', 140), C('status', '合同状态', 100),
      C('type', '合同类型', 130), C('category', '合同分类名称', 130),
      C('source', '合同来源', 100), C('sourceCode', '合同来源单号', 140, { link: true }),
      C('tpl', '合同模板名称', 150), C('owner', '使用主体', 210),
      C('priceType', '价格类型', 100), C('isStandard', '是否制式', 100),
      C('partyA', '甲方', 180), C('partyB', '乙方', 200),
      C('belong', '所属机构', 130), C('dept', '合同承办部门', 140),
      C('project', '项目名称', 190), C('projectCode', '项目编号', 130),
      C('area', '项目区域', 100), C('addr', '项目所在地址', 160),
      C('signDate', '合同签订日期', 130), C('createDate', '合同创建日期', 130), C('reconDate', '对账日期', 110),
      C('settleCycle', '结算周期', 110), C('trade', '国际贸易条款', 120),
      C('transport', '运输条款', 110), C('fundFlow', '资金流向', 100),
      C('creator', '创建人', 90), C('agent', '经办人', 90),
      C('rowType', '物料行类型', 110), C('brand', '品牌名称', 100),
      C('otherAttr', '其他采购属性', 130),
      C('floatType', '浮动价浮动类型', 130), C('floatLink', '浮动价确价环节', 130),
      C('floatSys', '浮动价外部系统', 130), C('floatArea', '浮动价外部区域', 130),
      C('floatTime', '浮动价时间标准', 130), C('floatPct', '浮动比例', 110, { num: true }),
      C('floatVal', '浮动值(不含税)', 130, { num: true }), C('estPrice', '暂估价(不含税)', 130, { num: true }),
      C('matCode', '物料编码', 140), C('matBig', '物料大类', 130),
      C('matMid', '物料中类', 120), C('matSmall', '物料小类', 120), C('matDesc', '物料描述', 170),
      C('qty', '数量', 100, { num: true }), C('unit', '计量单位', 90),
      C('priceTax', '含税单价', 110, { num: true }), C('amtTax', '含税金额', 120, { num: true }),
      C('taxRate', '税率', 80, { num: true }), C('priceNoTax', '不含税单价', 110, { num: true }),
      C('amtNoTax', '不含税金额', 120, { num: true }), C('taxAmt', '税额', 100, { num: true }),
      C('inPriceTax', '收入价含税单价', 130, { num: true }), C('inAmtTax', '收入价含税金额', 130, { num: true }),
      C('inTaxRate', '收入价税率', 110, { num: true }), C('inPriceNoTax', '收入价不含税单价', 140, { num: true }),
      C('inAmtNoTax', '收入价不含税金额', 140, { num: true }),
      C('costPriceTax', '成本价含税单价', 130, { num: true }), C('costAmtTax', '成本价含税金额', 130, { num: true }),
      C('costTaxRate', '成本价税率', 110, { num: true }), C('costPriceNoTax', '成本价不含税单价', 140, { num: true }),
      C('costAmtNoTax', '成本价不含税金额', 140, { num: true }),
      C('costDown', '成本降低率', 110, { num: true, pct: true, range: [0, 50] }),
      C('bargainDown', '二次议价成本降低率', 150, { num: true, pct: true }),
      C('benefit', '采购效益率', 110, { num: true, pct: true }),
      C('hostPriceTax', '承办家含税单价', 130, { num: true }),
      C('orderAmt', '下单金额', 120, { num: true }), C('orderPct', '下单比例', 100, { num: true }),
      C('acceptAmt', '验收金额', 120, { num: true }), C('acceptPct', '验收比例', 100, { num: true }),
      C('settleAmt', '结算金额', 120, { num: true }), C('settlePct', '结算比例', 100, { num: true }),
      C('payPct', '付款比例', 100, { num: true }), C('shouldPay', '合同应支付金额', 140, { num: true }),
      C('paidAmt', '合同已支付金额', 140, { num: true }), C('unpaidAmt', '合同累计应付未付金额', 170, { num: true }),
      C('treasuryCode', '司库一体化合同编号', 160)
    ],
    /* 附录 E 资产明细（列序对齐 Axure「资产数据报表」：
       序号 → 项目 → 二级 → 三级 → 资产编码 → 金额/数量 → 属性/来源 → 状态/单据） */
    asset: [
      C('idx', '序号', 56, { sticky: true }),
      C('project', '项目', 220, { sticky2: true }),
      C('org2', '二级单位', 110), C('org3', '三级单位', 130),
      C('assetCode', '资产编码', 160, { link: true }),
      C('assetAmt', '资产总额(万元)', 140, { num: true }), C('assetCount', '资产总数', 110, { num: true }),
      C('usingCount', '在用数量', 100, { num: true }), C('idleCount', '闲置数量', 100, { num: true }),
      C('repairCount', '维保数量', 100, { num: true }), C('scrapCount', '报废数量', 100, { num: true }),
      C('buyAmt', '资产购置金额(万元)', 160, { num: true }), C('disposeAmt', '处置金额(万元)', 140, { num: true }),
      C('depAmt', '调拨摊销折旧金额(万元)', 180, { num: true }),
      C('sourceType', '来源类型', 100), C('attr', '资产属性', 100), C('brand', '资产品牌', 100),
      C('category', '资产类别', 130), C('subCategory', '资产二级类别', 130),
      C('sourceOrg', '来源单位', 130), C('location', '存放地点', 150),
      C('origCode', '原资产编码', 140), C('batchCode', '批次编码', 110),
      C('implOrg', '实施单位', 130),
      C('acceptStatus', '验收状态', 110), C('acceptCode', '验收单号', 140, { link: true }), C('acceptDate', '验收时间', 110),
      C('invStatus', '盘点状态', 100), C('invPlanCode', '盘点方案编号', 150), C('invDate', '盘点完成时间', 120),
      C('transferCode', '调拨单号', 140, { link: true }), C('transferType', '调拨类型', 100), C('transferDate', '调拨完成时间', 120),
      C('desc', '资产描述', 150), C('keeper', '保管单位', 130), C('user', '使用人', 90)
    ],
    /* 附录 F 分供商合作分析（列序对齐 Axure「分供商合作分析」） */
    supplier: [
      C('idx', '序号', 56, { sticky: true }),
      C('name', '分供商名称', 230, { sticky2: true, link: true }),
      C('org2', '二级单位', 110), C('org3', '三级单位', 120), C('project', '项目', 220),
      C('format', '项目业态', 110),
      C('winCount', '中标次数', 100, { num: true }), C('winAmt', '中标金额(万元)', 140, { num: true }),
      C('bidCode', '招标编号', 170, { link: true }),
      C('contractCount', '合同签订个数', 130, { num: true }), C('contractAmt', '签订合同额(万元)', 150, { num: true }),
      C('contractCode', '合同编号', 170, { link: true }),
      C('perfAmt', '履约额(万元)', 130, { num: true }),
      C('settleCode', '结算单编号', 170, { link: true }),
      C('grade', '局评价等级', 110),
      C('badCount', '不良行为次数', 130, { num: true }), C('banCount', '禁用次数', 100, { num: true }),
      C('code', '分供商编码', 110), C('cat', '分供商分类', 120),
      C('matMid', '物料中类', 120), C('credit', '征信评分', 100, { num: true })
    ]
  };

  const DEFAULT_SHOWN = {
    /* 物资结算明细：列序同 Axure（单据信息 → 物料 → 金额 → 降本），默认展示常用列，
       其余 20+ 字段在「列设置」里可加 */
    settlement: ['idx', 'org2', 'org3', 'project', 'settleCode', 'matSmall', 'unit', 'qty',
      'priceTax', 'amtTax', 'costDown', 'bargainDown', 'benefit'],
    /* 采购报表明细：默认 13 列（对齐样例表头） */
    contract: ['idx', 'name', 'org2', 'org3', 'project', 'code', 'category', 'type', 'status',
      'source', 'sourceCode', 'tpl', 'owner'],
    /* 默认列对齐 Axure：项目 / 资产编码前置（原先资产编码在第 14 列，默认视口看不到） */
    asset: ['idx', 'project', 'org2', 'org3', 'assetCode', 'assetAmt', 'assetCount', 'usingCount',
      'idleCount', 'repairCount', 'scrapCount', 'buyAmt', 'disposeAmt', 'depAmt',
      'category', 'acceptStatus'],
    supplier: ['idx', 'name', 'org2', 'org3', 'project', 'format', 'winCount', 'winAmt', 'bidCode',
      'contractCount', 'contractAmt', 'contractCode', 'perfAmt', 'settleCode', 'grade',
      'badCount', 'banCount']
  };
  function shownOf(ds) {
    if (!RS.shown[ds]) RS.shown[ds] = DEFAULT_SHOWN[ds].slice();
    return RS.shown[ds];
  }
  function sizeOf(ds) {
    if (!RS.sizeBy[ds]) RS.sizeBy[ds] = ds === 'contract' ? 15 : 10;
    return RS.sizeBy[ds];
  }
  function colsOf(ds) {
    return shownOf(ds).map(function (k) { return COLS[ds].filter(function (c) { return c.key === k; })[0]; }).filter(Boolean);
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
    const orgNames = D.scope.dataOrgs();
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
  function applyConds(rows, conds, alias) {
    const pairs = Object.keys(conds || {}).filter(function (k) {
      const v = conds[k];
      if (v == null || v === '') return false;
      return !(Array.isArray(v) && !v.filter(Boolean).length);
    });
    if (!pairs.length) return rows;
    return rows.filter(function (r) {
      return pairs.every(function (k) {
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
          return list.some(function (x) { return String(rv).indexOf(String(x)) >= 0; });
        }
        return rv != null && String(rv).indexOf(String(v)) >= 0;
      });
    });
  }
  /* 局级总览的行是「单位」，条件里的二级单位要落到 name 上 */
  const OVERVIEW_ALIAS = { org2: 'name' };

  /* 条件命中数：让「查询」的结果可被核对（反馈里直接写出筛掉后剩多少条）
     必须与表格用同一套口径：表格还要过 D.scope.canSeeRow 的组织权限（R2），
     否则会出现「提示命中 36 条、表里一行都没有」的自相矛盾 */
  function condHits(dsKey, view) {
    const visible = function (rows) {
      return rows.filter(function (r) { return D.scope.canSeeRow(r); });
    };
    if ((dsKey === 'contract' || dsKey === 'settlement') && view !== 'detail') {
      return applyConds(D.scopeOrgs(D.scope.dataOrgs()).map(function (o) { return { name: o.name }; }),
        RS.conds, OVERVIEW_ALIAS).length;
    }
    if (dsKey === 'supplier') {
      if (RS.supTab === 'resource') return visible(applyConds(D.genResourceRows(80), RS.conds)).length;
      if (RS.supTab !== 'cooperation') return 0;
    }
    return visible(applyConds(rowsOf(dsKey), RS.conds)).length;
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
      ['资产编码', r.assetCode], ['项目', r.project], ['二级单位', r.org2], ['三级单位', r.org3 || '—'],
      ['资产类别', r.category + (r.subCategory ? ' / ' + r.subCategory : '')], ['资产属性', r.attr],
      ['资产品牌', r.brand], ['资产描述', r.desc],
      ['资产总额', D.fmtNum(r.assetAmt, 2) + ' 万元'], ['资产总数', D.fmtInt(r.assetCount)],
      ['在用 / 闲置', D.fmtInt(r.usingCount) + ' / ' + D.fmtInt(r.idleCount)],
      ['维保 / 报废', D.fmtInt(r.repairCount) + ' / ' + D.fmtInt(r.scrapCount)],
      ['资产购置金额', D.fmtNum(r.buyAmt, 2) + ' 万元'], ['处置金额', D.fmtNum(r.disposeAmt, 2) + ' 万元'],
      ['调拨摊销折旧', D.fmtNum(r.depAmt, 2) + ' 万元'],
      ['使用人 / 保管', r.user + ' / ' + r.keeper], ['存放地点', r.location],
      ['验收状态 / 时间', r.acceptStatus + ' / ' + r.acceptDate],
      ['盘点状态', r.invStatus], ['调拨单号', r.transferCode || '—']
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

  /* ds 取归一化后的数据集键（settlement / contract / asset / supplier），view 仅采购报表使用 */
  function filterFields(ds, view) {
    if (ds === 'settlement') {
      const orgOpts = D.orgs.map(function (o) { return o.name; });
      if (view === 'detail') {
        /* 物资报表-明细：字段集对齐 Axure（收起的 6 项在前，其余在「展开」里） */
        return [
          { name: 'org', label: '实施单位', type: 'org', ph: '输入单位名称联想选择',
            value: D.scope.level === 1 ? RS.overviewOrg : D.scope.name },
          { name: 'project', label: '项目名称', type: 'text', ph: '请输入' },
          { name: 'pFormat', label: '项目业态', type: 'multi', options: D.FORMATS },
          { name: 'pType', label: '项目类型', type: 'multi', options: D.TYPES },
          { name: 'finishDate', label: '项目竣工日期', type: 'daterange' },
          { name: 'pStatus', label: '项目状态', type: 'multi', options: D.STATUS },
          { name: 'settleCode', label: '结算单号', type: 'text', ph: '请输入' },
          { name: 'settleType', label: '结算单类型', type: 'select', options: D.settleTypes },
          { name: 'settleStatus', label: '结算单状态', type: 'select', options: D.settleStatuses },
          { name: 'detailType', label: '结算明细类型', type: 'select', options: D.detailTypes },
          { name: 'supplier', label: '分供商', type: 'text', ph: '请输入' },
          { name: 'settleMonth', label: '结算月份', type: 'select', options: D.months12 },
          { name: 'docCode', label: '单据编号', type: 'text', ph: '请输入' },
          { name: 'contractCode', label: '合同编号', type: 'text', ph: '请输入' },
          { name: 'orderCode', label: '订单编号', type: 'text', ph: '请输入' },
          { name: 'receiveCode', label: '收料单号', type: 'text', ph: '请输入' },
          { name: 'pickCode', label: '领料单号', type: 'text', ph: '请输入' },
          { name: 'matBig', label: '物料大类', type: 'select', options: D.material.big },
          { name: 'matSmall', label: '物料小类', type: 'tree', options: [
            { label: '钢材', children: D.material.small.slice(0, 24).map(function (x) { return { value: x, label: x }; }) },
            { label: '其他材料', children: D.material.small.slice(24).map(function (x) { return { value: x, label: x }; }) }] },
          { name: 'brand', label: '品牌', type: 'text', ph: '请输入' },
          { name: 'area', label: '项目区域', type: 'tree', options: D.areaTree() },
          { name: 'pMode', label: '承包模式', type: 'multi', options: D.MODES },
          { name: 'signDate', label: '合同签订日期', type: 'daterange' },
          { name: 'date', label: '结算日期', type: 'daterange' }
        ];
      }
      /* 物资报表-总览 */
      return [
        { name: 'date', label: '统计日期-范围', type: 'daterange', value: D.defaultRange,
          grain: ['日', '月', '季', '年'], grainValue: RS.matGrain },
        { name: 'org2', label: '二级单位', type: 'select', options: orgOpts },
        { name: 'org3', label: '三级单位', type: 'select', options: D.subOrgs.map(function (s) { return s.name; }) },
        { name: 'pStatus', label: '项目状态', type: 'multi', options: D.STATUS },
        { name: 'pType', label: '项目类型', type: 'multi', options: D.TYPES },
        { name: 'matBig', label: '物料大类', type: 'tree', options: D.material.big.map(function (x) { return { value: x, label: x }; }) },
        { name: 'matMid', label: '物料中类', type: 'tree', options: D.material.mid.map(function (x) { return { value: x, label: x }; }) },
        { name: 'matSmall', label: '物料小类', type: 'tree', options: [
          { label: '钢材', children: D.material.small.slice(0, 24).map(function (x) { return { value: x, label: x }; }) },
          { label: '其他材料', children: D.material.small.slice(24).map(function (x) { return { value: x, label: x }; }) }] }
      ];
    }
    if (ds === 'contract') {
      const orgOpts = D.orgs.map(function (o) { return o.name; });
      if (view === 'detail') {
        /* 采购报表-明细：字段集对齐样例（21 项，默认收起，展开后可见其余） */
        return [
          { name: 'org2', label: '二级单位', type: 'select', options: orgOpts },
          { name: 'org3', label: '三级单位', type: 'select', options: D.subOrgs.map(function (s) { return s.name; }) },
          { name: 'project', label: '项目名称', type: 'text', ph: '请输入' },
          { name: 'contract', label: '合同', type: 'text', ph: '请输入' },
          { name: 'partyA', label: '甲方', type: 'text', ph: '请输入' },
          { name: 'partyB', label: '乙方', type: 'text', ph: '请输入' },
          { name: 'signDate', label: '合同签订日期', type: 'daterange' },
          { name: 'createDate', label: '合同创建日期', type: 'daterange' },
          { name: 'pType', label: '项目类型', type: 'multi', options: ['房屋建筑工程', '基础设施', '工业厂房', '市政公用工程'] },
          { name: 'pStatus', label: '项目状态', type: 'multi', options: ['在建', '竣工', '停工'] },
          { name: 'agent', label: '经办人', type: 'text', ph: '请输入' },
          { name: 'creator', label: '创建人', type: 'text', ph: '请输入' },
          { name: 'category', label: '合同分类', type: 'select', options: ['物资类', '分包类', '服务类', '租赁类'] },
          { name: 'contractType', label: '合同类型', type: 'multi', options: ['物资采购合同', '设备采购合同', '劳务分包合同', '专业分包合同', '专业服务合同', '租赁类合同'] },
          { name: 'contractStatus', label: '合同状态', type: 'multi', options: ['已生效', '审批中', '草稿', '已终止'] },
          { name: 'source', label: '合同来源', type: 'multi', options: ['招标', '询比价', '单一来源', '框架协议'] },
          { name: 'sourceCode', label: '合同来源单号', type: 'text', ph: '请输入' },
          { name: 'amtMin', label: '合同金额≥', type: 'text', ph: '请输入' },
          { name: 'amtMax', label: '合同金额≤', type: 'text', ph: '请输入' },
          { name: 'isStandard', label: '是否制式', type: 'select', options: ['是', '否'] },
          { name: 'treasuryCode', label: '司库一体化合同编号', type: 'text', ph: '请输入' }
        ];
      }
      /* 采购报表-总览 */
      return [
        { name: 'date', label: '统计日期-范围', type: 'daterange', value: D.defaultRange,
          grain: ['日', '月', '季', '年'], grainValue: RS.purGrain },
        { name: 'org2', label: '二级单位', type: 'select', options: orgOpts },
        { name: 'org3', label: '三级单位', type: 'select', options: D.subOrgs.map(function (s) { return s.name; }) },
        { name: 'pStatus', label: '项目状态', type: 'multi', options: ['在建', '竣工', '停工'] },
        { name: 'pType', label: '项目类型', type: 'multi', options: ['房屋建筑工程', '基础设施', '工业厂房', '市政公用工程'] },
        { name: 'matBig', label: '物料大类', type: 'tree', options: D.material.big.map(function (x) { return { value: x, label: x }; }) },
        { name: 'matMid', label: '物料中类', type: 'tree', options: D.material.mid.map(function (x) { return { value: x, label: x }; }) },
        { name: 'matSmall', label: '物料小类', type: 'tree', options: [
          { label: '钢材', children: D.material.small.slice(0, 24).map(function (x) { return { value: x, label: x }; }) },
          { label: '其他材料', children: D.material.small.slice(24).map(function (x) { return { value: x, label: x }; }) }] }
      ];
    }
    if (ds === 'asset') {
      /* 资产明细：首屏按 Axure 只保留「日期 / 实施单位 / 项目」，其余属性收进「展开」；
         日期区间占两格，避免两个原生日期输入溢出遮住下一列标签 */
      return [
        { name: 'date', label: '日期选择', type: 'daterange', value: D.defaultRange, wide: true,
          grain: ['日', '月', '季', '年'], grainValue: RS.assetGrain },
        { name: 'org', label: '实施单位', type: 'org', ph: '输入单位名称联想选择',
          /* 资产报表不复用总览的 RS.overviewOrg，避免从采购总览带过来的下钻单位串到本页 */
          value: D.scope.level === 1 ? '' : D.scope.name },
        { name: 'project', label: '项目', type: 'text', ph: '请输入项目名称' },
        { name: 'pType', label: '项目类型', type: 'multi', options: D.TYPES },
        { name: 'pFormat', label: '项目业态', type: 'multi', options: D.FORMATS },
        { name: 'pStatus', label: '项目状态', type: 'multi', options: D.STATUS },
        { name: 'pMode', label: '承包模式', type: 'multi', options: D.MODES },
        { name: 'pArea', label: '项目区域(到地级市)', type: 'tree', options: D.areaTree() },
        { name: 'assetCode', label: '资产编码', type: 'text', ph: '请输入资产编码' },
        { name: 'category', label: '资产类别', type: 'multi', options: ['项目固定资产', '项目非固定资产'] },
        { name: 'attr', label: '资产属性', type: 'multi', options: ['自有', '租赁', '调拨'] },
        { name: 'acceptStatus', label: '验收状态', type: 'multi', options: ['已验收', '待验收', '验收不通过'] }
      ];
    }
    /* supplier：筛选字段随子页签变化（对齐 Axure 各页签的查询条件） */
    const supOrgs = D.orgs.map(function (o) { return o.name; });
    const supSubs = D.subOrgs.map(function (o) { return o.name; });
    const supCommon = [
      { name: 'org2', label: '二级单位', type: 'select', options: supOrgs },
      { name: 'org3', label: '三级单位', type: 'select', options: supSubs },
      { name: 'project', label: '项目', type: 'text', ph: '请输入' }
    ];
    if (RS.supTab === 'resource') {
      /* 资源明细是项目级汇总，查询条件只保留列表里真实存在的组织字段 */
      return supCommon;
    }
    if (RS.supTab === 'cooperation') {
      return supCommon.concat([
        { name: 'name', label: '分供商名称', type: 'text', ph: '请输入' },
        { name: 'format', label: '项目业态', type: 'multi', options: D.FORMATS },
        { name: 'grade', label: '局评价等级', type: 'multi', options: D.supplierGrades },
        { name: 'bidCode', label: '招标编号', type: 'text', ph: '请输入' },
        { name: 'contractCode', label: '合同编号', type: 'text', ph: '请输入' }
      ]);
    }
    /* 资源数据明细的兜底条件（正常情况下 supTab 已归一为 resource / cooperation） */
    return supCommon;
  }

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

    const allCols = cols;
    const showCols = D.colsOf('ov-' + dsKey, allCols, allCols.map(function (c) { return c.key; }));
    return '<div class="dsc-card u-mb-lg"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">' + (isMat ? '物资指标汇总' : '采购指标汇总') + ' · ' + lvName + '</div>' +
      '<div class="dsc-card__extra">' + D.colGear('data-rp-cols="ov-' + dsKey + '"',
        '设置列：' + (isMat ? '物资' : '采购') + '指标汇总的显示字段') + '</div>' +
      '<div class="dsc-card__extra">点击单位名进入下一级' + (lv > 2 ? '　·　可「返回上一级」' : '') +
      '　·　首行为局合计' + (isMat ? '（各单位均值）' : '（等于下方各单位之和）') +
      D.colGear('data-rp-cols="ov-' + (isMat ? 'settlement' : 'contract') + '"',
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
  /* 资源数据明细：项目级资源指标（列集对齐 Axure「资源数据明细」14 个数量列 + 3 个额度列） */
  function resCol(k, n, w, o) { return Object.assign({ key: k, name: n, width: w, num: true }, o || {}); }
  const RES_COLS = [
    { key: 'idx', name: '序号', width: 56, sticky: true },
    { key: 'org2', name: '二级单位', width: 110, sticky2: true },
    { key: 'org3', name: '三级单位', width: 120 }, { key: 'project', name: '项目', width: 220 },
    resCol('onStock', '在库分供商数量', 140), resCol('quality', '优质分供商数量', 140),
    resCol('quit', '清退分供商数量', 140), resCol('bad', '不良行为分供商数量', 160),
    resCol('newIn', '新增入库分供商数量', 160), resCol('active', '活跃分供商数量', 140),
    resCol('win', '中标分供商数量', 140), resCol('sign', '签约分供商数量', 140),
    resCol('perfCnt', '履约分供商数量', 140), resCol('alt', '备选分供商数量', 140),
    resCol('perf', '分供商履约额(万元)', 160), resCol('perfQuality', '优质分供商履约额(万元)', 200),
    resCol('avgPerf', '平均履约额(万元)', 160)
  ];

  function supplierBody() {
    if (RS.supTab === 'resource') {
      const all = applyConds(D.genResourceRows(80), RS.conds).filter(function (r) { return D.scope.canSeeRow(r); });
      const total = all.length;
      const size = sizeOf('supplier');
      const sorted = sortRows(all, RES_COLS);
      const paged = sorted.slice((RS.page - 1) * size, (RS.page - 1) * size + size);
      const rcols = D.colsOf('sup-resource', RES_COLS, RES_COLS.map(function (c) { return c.key; }));
      return '<div class="dsc-card"><div class="dsc-card__header">' +
        '<div class="dsc-card__title">资源数据明细</div>' +
        '<div class="dsc-card__extra">按项目汇总 · 共 ' + total + ' 条　·　数值列可点表头排序' +
        D.colGear('data-rp-cols="sup-resource"', '设置列：资源数据明细的显示字段') + '</div></div>' +
        D.table({ cols: sortableCols(rcols), rows: paged.map(function (r, i) { return Object.assign({ idx: (RS.page - 1) * size + i + 1 }, r); }),
          maxHeight: 520, totalRow: D.totalOf(RES_COLS, sorted), sortKey: RS.sortKey, sortDir: RS.sortDir,
          foot: D.pager({ page: RS.page, size: size, total: total }) }) + '</div>';
    }
    /* cooperation 走通用宽表（默认列对齐 Axure「分供商合作分析」） */
    const ds = 'supplier';
    const all = applyConds(rowsOf(ds), RS.conds).filter(function (r) { return D.scope.canSeeRow(r); });
    const total = all.length;
    const size = sizeOf(ds);
    const sorted = sortRows(all, colsOf(ds));
    const paged = sorted.slice((RS.page - 1) * size, (RS.page - 1) * size + size);
    const cols = sortableCols(colsOf(ds));
    return '<div class="dsc-card"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">分供商合作分析</div>' +
      '<div class="dsc-card__extra">按分供商汇总 · 共 ' + total + ' 条</div></div>' +
      D.table({ cols: cols, rows: paged.map(function (r, i) { return Object.assign({ idx: (RS.page - 1) * size + i + 1 }, r); }),
        /* 合计按「全量结果集」算：此前用 paged（当前页），合计只有第 1 页那 10 行的和 */
        maxHeight: 520, totalRow: D.totalOf(cols, sorted), sortKey: RS.sortKey, sortDir: RS.sortDir,
        foot: D.pager({ page: RS.page, size: size, total: total }) }) + '</div>';
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
    /* A1：页码只在「换报表 / 换页签」时复位——此前每次渲染都 RS.page = 1，
       把分页器刚写入的页码覆盖掉，导致报表分页整页失效 */
    const cfgable = q.ds === 'supplier' ? RS.supTab === 'cooperation'
      : (q.ds === 'purchase' || q.ds === 'material') ? view === 'detail' : true;
    const pageKey = dsKey + '|' + view + '|' + RS.supTab;
    if (RS.pageKey !== pageKey) { RS.page = 1; RS.pageKey = pageKey; RS.sortKey = ''; }

    let body = '';
    if ((q.ds === 'purchase' || q.ds === 'material') && view !== 'detail') {
      body = overviewSection(dsKey);
    } else if (q.ds === 'supplier') {
      body = supplierBody();
    } else {
      const tabbed = q.ds === 'purchase' || q.ds === 'material';
      const all = applyConds(rowsOf(dsKey), RS.conds).filter(function (r) { return D.scope.canSeeRow(r); });
      const total = all.length;
      const size = sizeOf(dsKey);
      const sorted = sortRows(all, colsOf(dsKey));
      const paged = sorted.slice((RS.page - 1) * size, (RS.page - 1) * size + size);
      const cols = sortableCols(colsOf(dsKey));
      /* 当前显示列里没有数值列时不出现空的合计行；合计按全量结果集而非当前页 */
      const totalRow = cols.some(function (c) { return c.num; }) ? D.totalOf(cols, sorted) : null;
      const title = dsKey === 'contract' ? '合同明细' : dsKey === 'settlement' ? '结算明细' : '资产明细';
      /* 资产明细：表卡右上只写字段显隐，不再重复页头与分页里的「共 N 条」 */
      const extra = dsKey === 'asset'
        ? '显示 ' + cols.length + ' / ' + COLS.asset.length + ' 字段　·　可自定义显示与排序'
        : '共 ' + total + ' ' + (tabbed ? '行' : '条') + '　·　字段可自定义显示与排序';
      /* 合计行是全量口径，页脚写明，避免被当成当前页 10 行之和 */
      const totalNote = dsKey === 'asset' && totalRow
        ? '<div class="dsc-table__footnote">合计行按全部 ' + total + ' 条汇总（含所有页），不是当前页之和</div>' : '';
      body = '<div class="dsc-card report-page__table-wrap"><div class="dsc-card__header">' +
        '<div class="dsc-card__title">' + esc(title) + '</div>' +
        '<div class="dsc-card__extra">' + extra +
        D.colGear('data-rp-columns', '设置列：' + title + '的显示字段') + '</div></div>' +
        D.table({
          cols: cols, rows: paged.map(function (r, i) { return Object.assign({ idx: (RS.page - 1) * size + i + 1 }, r); }),
          maxHeight: tabbed ? 660 : 560, totalRow: totalRow, sortKey: RS.sortKey, sortDir: RS.sortDir,
          foot: totalNote + D.pager({ page: RS.page, size: size, total: total })
        }) + '</div>';
    }

    return '<div class="dsc-page report-page">' +
      '<div class="dsc-page__header report-page__header">' +
      '  <div class="dsc-page__title">' + esc(meta.name) + '</div>' +
      '  <div class="dsc-page__sub">' + esc(meta.note) + '</div>' +
      '  <div class="dsc-page__actions report-page__action-bar">' +
      /* A4：汇总 / 固定口径页签（局级总览、资源数据明细）的列不可增删，
         此前仍显示「列设置」且弹出的是另一个页签的字段——改成明示口径，不再给假入口 */
      '    <button class="dsc-btn" data-rp-export>导出</button>' +
      '  </div>' +
      '</div>' +
      (D.scope.level === 1 ? '' : '<div class="dsc-note dsc-note--warn u-mb-md">已按组织权限过滤（R2）：仅返回本单位及下属数据，超权限明细行不返回。</div>') +
      ((q.ds === 'purchase' || q.ds === 'material') ? '<div class="dsc-tabs" data-rp-view>' +
        [['overview', '局级总览'], ['detail', '明细']].map(function (v) {
          return '<div class="dsc-tabs__item' + (view === v[0] ? ' dsc-tabs__item--active' : '') +
            '" data-rv="' + v[0] + '">' + v[1] + '</div>';
        }).join('') + '</div>' : '') +
      (q.ds === 'supplier' ? '<div class="dsc-tabs" data-rp-suptab>' + SUP_TABS.map(function (t) {
        return '<div class="dsc-tabs__item' + (RS.supTab === t[0] ? ' dsc-tabs__item--active' : '') +
          '" data-st="' + t[0] + '">' + esc(t[1]) + '</div>';
      }).join('') + '</div>' : '') +
      /* 组织下钻路径只属于采购 / 物资「局级总览」——资产报表是逐行明细，用筛选条里的实施单位定位 */
      ((q.ds === 'purchase' || q.ds === 'material') && view !== 'detail' ? drillPath(q.ds) : '') +
      D.filterBar({ id: 'rpFilter', cls: 'report-page__filter-bar', fields: withConds(filterFields(dsKey, view)),
        conds: RS.condText,
        visibleCount: (q.ds === 'purchase' || q.ds === 'material') ? 8
          : q.ds === 'supplier' ? 4 : q.ds === 'asset' ? 3 : 6 }) +
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
        if (v.dateGrain) { RS.purGrain = v.dateGrain; RS.matGrain = v.dateGrain; RS.supGrain = v.dateGrain; RS.assetGrain = v.dateGrain; }
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
        RS.purGrain = '日'; RS.matGrain = '日'; RS.supGrain = '日'; RS.assetGrain = '日';
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
      /* 列设置（AC7） */
      if (t.closest('[data-rp-columns]')) {
        const ds = q.ds === 'supplier' ? 'supplier' : dsKey;
        const all = COLS[ds];
        D.modal({
          title: '列设置 · ' + esc(DS[q.ds] ? DS[q.ds].name : '数据报表'), width: 900,
          body: D.columnDialog(all, shownOf(ds)),
          buttons: [{ text: '恢复默认', cls: '', act: 'default' }, { text: '取消', cls: '', act: 'cancel' },
            { text: '应用', cls: 'dsc-btn--primary', act: 'ok' }],
          onAction: function (act, ov2) {
            if (act === 'default') {
              RS.shown[ds] = DEFAULT_SHOWN[ds].slice();
              D.closeModal(); D.render(); D.toast('已恢复默认字段顺序');
              return false;
            }
            const keys = D.readColumnDialog(ov2.querySelector('.dsc-column-dialog'));
            if (!keys.length) { D.toast('请至少选择一个字段', 'warn'); return false; }
            RS.shown[ds] = keys; RS.page = 1;
            D.render();
            D.toast('已应用 ' + keys.length + ' 个显示字段（会话内保持）');
          }
        });
        D.bindColumnDialog(document.getElementById('modalBody'));
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
