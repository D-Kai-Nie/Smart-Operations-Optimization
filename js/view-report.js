/* ============================================================
   F4 物资数据报表 / F5 采购数据报表 / F6 分供商数据报表 / F7 资产数据报表
   原型分类：CRUD/list（克制视觉，宽表主导）
   ============================================================ */
(function (D) {
  'use strict';
  const esc = D.esc;

  const RS = {
    page: 1, size: 10,
    shown: {},
    overviewLevel: 2,      // F5 局级总览下钻层级 2=二级 3=三级 4=项目
    overviewOrg: '',
    supTab: 'resource',
    complaintView: 'targetOrg',
    sortKey: '', sortDir: 'asc'
  };
  D.reportState = RS;

  const DS = {
    material: { name: '物资数据报表', note: '物资结算明细全量表（45+ 字段）· 组织下钻：全局 → 二级 → 三级' },
    purchase: { name: '采购数据报表', note: '局级总览（二级 → 三级 → 项目，可返回上一级）+ 合同明细全量表（70+ 字段）' },
    supplier: { name: '分供商数据报表', note: '资源明细 / 合作分析 / 提诉报表 / 反向评价 / 集团黑名单' },
    asset: { name: '资产数据报表', note: '资产明细全量表（30+ 字段）· 组织下钻' }
  };

  /* ---------- 字段集（附录 B/C/D/E/F） ---------- */
  function C(k, n, w, o) { return Object.assign({ key: k, name: n, width: w || 120 }, o || {}); }

  const COLS = {
    /* 附录 D 物资结算明细 */
    settlement: [
      C('idx', '序号', 56, { sticky: true }),
      C('settleCode', '结算单号', 190, { sticky2: true, link: true }),
      C('org2', '二级单位', 110), C('org3', '三级单位', 120), C('project', '项目', 200),
      C('supplier', '供应商', 190),
      C('settleType', '结算单类型', 110), C('settleStatus', '结算单状态', 110),
      C('settleMonth', '结算月份', 100), C('settleCycle', '结算周期', 110),
      C('detailType', '结算明细类型', 120), C('docCode', '单据编号', 150, { link: true }),
      C('date', '日期', 110),
      C('contractCode', '合同编号', 150, { link: true }), C('orderCode', '订单编号', 150, { link: true }),
      C('receiveCode', '收料单号', 150, { link: true }), C('pickCode', '领料单号', 150, { link: true }),
      C('matBig', '物料大类', 130), C('matMid', '物料中类', 120), C('matSmall', '物料小类', 120),
      C('matCode', '物料编码', 140), C('matDesc', '物料描述', 180), C('brand', '品牌', 90),
      C('qty', '数量', 100, { num: true }), C('unit', '计量单位', 90),
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
      C('benefit', '采购效益率', 110, { num: true, pct: true })
    ],
    /* 附录 B 合同明细 */
    contract: [
      C('idx', '序号', 56, { sticky: true }),
      C('code', '合同编号', 150, { sticky2: true, link: true }),
      C('suppCode', '补充协议编号', 140), C('status', '合同状态', 100),
      C('type', '合同类型', 130), C('category', '合同分类', 100),
      C('source', '合同来源', 100), C('sourceCode', '来源单号', 140, { link: true }),
      C('tpl', '合同模板', 150), C('owner', '使用主体', 140),
      C('priceType', '价格类型', 100), C('isStandard', '是否制式', 100),
      C('partyA', '甲方', 180), C('partyB', '乙方', 200),
      C('belong', '所属机构', 130), C('dept', '合同承办部门', 140),
      C('project', '项目', 190), C('projectCode', '项目编号', 130),
      C('area', '项目区域', 100), C('addr', '项目所在地址', 160),
      C('signDate', '合同签订日期', 130), C('reconDate', '对账日期', 110),
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
    /* 附录 E 资产明细 */
    asset: [
      C('idx', '序号', 56, { sticky: true }),
      C('org2', '二级单位', 110, { sticky2: true }), C('org3', '三级单位', 120),
      C('implOrg', '实施单位', 130), C('project', '项目', 190),
      C('assetCode', '资产编号', 150), C('batchCode', '批次编码', 110),
      C('origCode', '原资产编码', 140), C('category', '资产类别', 130),
      C('subCategory', '资产二级类别', 130), C('brand', '资产品牌', 100),
      C('attr', '资产属性', 100), C('desc', '资产描述', 150),
      C('sourceType', '来源类型', 100), C('sourceOrg', '来源单位', 130),
      C('location', '存放地点', 130), C('keeper', '保管单位', 130), C('user', '使用人', 90),
      C('buyAmt', '资产购置金额(万元)', 150, { num: true }), C('assetAmt', '资产总额(万元)', 140, { num: true }),
      C('depAmt', '调拨摊销折旧金额(万元)', 170, { num: true }), C('disposeAmt', '处置金额(万元)', 140, { num: true }),
      C('assetCount', '资产总数', 110, { num: true }), C('usingCount', '在用数量', 100, { num: true }),
      C('idleCount', '闲置数量', 100, { num: true }), C('scrapCount', '报废数量', 100, { num: true }),
      C('repairCount', '维保数量', 100, { num: true }),
      C('acceptStatus', '验收状态', 110), C('acceptCode', '验收单号', 140, { link: true }), C('acceptDate', '验收时间', 110),
      C('invStatus', '盘点状态', 100), C('invPlanCode', '盘点方案编号', 140), C('invDate', '盘点完成时间', 120),
      C('transferCode', '调拨单号', 140, { link: true }), C('transferType', '调拨类型', 100), C('transferDate', '调拨完成时间', 120)
    ],
    /* 附录 F 分供商资源明细 */
    supplier: [
      C('idx', '序号', 56, { sticky: true }),
      C('org2', '二级单位', 110, { sticky2: true }), C('org3', '三级单位', 120), C('project', '项目', 190),
      C('code', '分供商编码', 110), C('name', '分供商名称', 230, { link: true }),
      C('cat', '分供商分类', 120), C('grade', '局评价等级', 110),
      C('bidCode', '招标编号', 140, { link: true }), C('winCount', '中标次数', 100, { num: true }),
      C('winAmt', '中标金额(万元)', 140, { num: true }),
      C('contractCount', '合同签订个数', 130, { num: true }), C('contractAmt', '签订合同额(万元)', 150, { num: true }),
      C('contractCode', '合同编号', 140, { link: true }),
      C('banCount', '禁用次数', 100, { num: true }), C('badCount', '不良行为次数', 130, { num: true }),
      C('perfAmt', '履约额(万元)', 130, { num: true }), C('matMid', '物料中类', 120),
      C('format', '项目业态', 100), C('credit', '征信评分', 100, { num: true })
    ]
  };

  const DEFAULT_SHOWN = {
    settlement: ['idx', 'settleCode', 'org2', 'org3', 'project', 'supplier', 'settleType', 'settleStatus',
      'settleMonth', 'matSmall', 'unit', 'qty', 'priceTax', 'amtTax', 'costDown', 'bargainDown', 'benefit'],
    contract: ['idx', 'code', 'status', 'type', 'source', 'partyA', 'partyB', 'project', 'signDate',
      'matSmall', 'qty', 'unit', 'priceTax', 'amtTax', 'orderAmt', 'settleAmt', 'unpaidAmt'],
    asset: ['idx', 'org2', 'org3', 'project', 'assetCode', 'assetAmt', 'assetCount', 'usingCount',
      'idleCount', 'scrapCount', 'repairCount', 'buyAmt', 'disposeAmt', 'depAmt', 'category', 'acceptStatus'],
    supplier: ['idx', 'org2', 'org3', 'project', 'name', 'cat', 'grade', 'winCount', 'winAmt',
      'contractCount', 'contractAmt', 'perfAmt', 'matMid', 'badCount', 'credit']
  };
  function shownOf(ds) {
    if (!RS.shown[ds]) RS.shown[ds] = DEFAULT_SHOWN[ds].slice();
    return RS.shown[ds];
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
        : ds === 'contract' ? D.genContractRows(80)
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
    const parts = D.scope.level === 1 ? ['全局'] : [D.scope.name];
    if (cur && cur !== D.scope.name) parts.push(cur);
    return '<div class="drill-path report-page__drill-path">' +
      '<span>组织下钻：</span>' +
      parts.map(function (p, i) {
        const last = i === parts.length - 1;
        return (i ? '<span class="drill-path__sep">&gt;</span>' : '') +
          '<span class="drill-path__crumb' + (last ? ' drill-path__crumb--current' : '') + '"' +
          (last ? '' : ' data-drill-reset') + '>' + esc(p) + '</span>';
      }).join('') +
      (lv > 2 ? '<button class="dsc-btn dsc-btn--sm drill-path__back" data-drill-back>返回上一级</button>' : '') +
      '</div>';
  }

  function filterFields(ds) {
    const common = [
      { name: 'date', label: '日期选择', type: 'daterange', value: D.defaultRange },
      { name: 'org', label: '实施单位', type: 'org', ph: '输入单位名称联想选择',
        value: D.scope.level === 1 ? RS.overviewOrg : D.scope.name },
      { name: 'grain', label: '粒度', type: 'select', options: ['日', '月', '季'] },
      { name: 'pType', label: '项目类型', type: 'multi', options: ['房屋建筑工程', '基础设施', '工业厂房', '市政公用工程'] },
      { name: 'pFormat', label: '项目业态', type: 'multi', options: ['住宅', '商业', '教育', '医疗卫生', '厂房', '场馆'] },
      { name: 'pStatus', label: '项目状态', type: 'multi', options: ['在建', '竣工', '停工'] },
      { name: 'pMode', label: '承包模式', type: 'multi', options: ['施工总承包', '工程总承包', 'EPC工程总承包', 'PPP'] },
      { name: 'pArea', label: '项目区域(到地级市)', type: 'tree', options: D.areaTree() }
    ];
    if (ds === 'settlement') {
      return common.concat([
        { name: 'project', label: '项目名称', type: 'text', ph: '请输入项目名称' },
        { name: 'settleType', label: '结算单类型', type: 'multi', options: ['月度结算', '总结算', '临时结算', '退料结算'] },
        { name: 'settleStatus', label: '结算单状态', type: 'multi', options: ['待提交', '审批中', '已生效', '已作废'] },
        { name: 'detailType', label: '结算明细类型', type: 'multi', options: ['正常结算', '退货结算', '领料结算', '调拨结算'] },
        { name: 'matSmall', label: '物料小类', type: 'tree', options: [
          { label: '钢材', children: D.material.small.slice(0, 24).map(function (x) { return { value: x, label: x }; }) },
          { label: '其他材料', children: D.material.small.slice(24).map(function (x) { return { value: x, label: x }; }) }] }
      ]);
    }
    if (ds === 'contract') {
      return common.concat([
        { name: 'dept', label: '承办部门', type: 'select', options: ['物资管理部', '采购管理部', '商务管理部', '工程管理部'] },
        { name: 'project', label: '项目名称', type: 'text', ph: '请输入项目名称' },
        { name: 'contractType', label: '合同类型', type: 'multi', options: ['物资采购合同', '设备采购合同', '劳务分包合同', '专业分包合同', '专业服务合同', '租赁类合同'] },
        { name: 'contractStatus', label: '合同状态', type: 'multi', options: ['已生效', '审批中', '草稿', '已终止'] },
        { name: 'contractCode', label: '合同编号', type: 'text', ph: '请输入合同编号' }
      ]);
    }
    if (ds === 'asset') {
      return common.concat([
        { name: 'project', label: '项目名称', type: 'text', ph: '请输入项目名称' },
        { name: 'assetCode', label: '资产编号', type: 'text', ph: '请输入资产编号' },
        { name: 'category', label: '资产类别', type: 'multi', options: ['项目固定资产', '项目非固定资产'] },
        { name: 'attr', label: '资产属性', type: 'multi', options: ['自有', '租赁', '调拨'] },
        { name: 'acceptStatus', label: '验收状态', type: 'multi', options: ['已验收', '待验收', '验收不通过'] }
      ]);
    }
    /* supplier */
    return common.concat([
      { name: 'project', label: '项目名称', type: 'text', ph: '请输入项目名称' },
      { name: 'grade', label: '局评价等级', type: 'multi', options: D.supplierGrades },
      { name: 'supCat', label: '分供商分类', type: 'multi', options: D.supplierCats },
      { name: 'level', label: '本级库', type: 'select', options: ['全局', '二级单位本级库', '三级单位本级库'] }
    ]);
  }

  /* ---------- F5 局级总览（二级 → 三级 → 项目） ---------- */
  function overviewSection() {
    const lv = RS.overviewLevel;
    const rows = (function () {
      if (lv === 2) {
        return D.scopeOrgs(D.scope.dataOrgs()).map(function (o, i) {
          const k = 0.6 + (i * 7 % 40) / 100;
          return { name: o.name, level: 2, contractCount: Math.round(486 * k), contractAmt: D.round(o.amount * 86, 1),
            orderAmt: D.round(o.amount * 62, 1), settleAmt: D.round(o.amount * 48, 1), payPct: D.round(62 + (i * 3) % 30, 1) };
        }).sort(function (a, b) { return b.contractAmt - a.contractAmt; });
      }
      if (lv === 3) {
        const parent = RS.overviewOrg;
        const subs = D.subOrgsByParent[parent] || [];
        return subs.map(function (s, i) {
          const k = 0.5 + (i * 11 % 45) / 100;
          return { name: s.name, level: 3, contractCount: Math.round(186 * k), contractAmt: D.round(8600 * k, 1),
            orderAmt: D.round(6200 * k, 1), settleAmt: D.round(4800 * k, 1), payPct: D.round(58 + (i * 5) % 36, 1) };
        }).sort(function (a, b) { return b.contractAmt - a.contractAmt; });
      }
      return D.projects.slice(0, 20).map(function (p, i) {
        const k = 0.5 + (i * 13 % 45) / 100;
        return { name: p.name, level: 4, contractCount: Math.round(42 * k), contractAmt: D.round(p.purchase * 1.4, 1),
          orderAmt: D.round(p.purchase * 1.0, 1), settleAmt: D.round(p.purchase * 0.8, 1), payPct: D.round(56 + (i * 7) % 38, 1) };
      }).sort(function (a, b) { return b.contractAmt - a.contractAmt; });
    })();
    const lvName = { 2: '二级单位', 3: '三级单位', 4: '项目' }[lv];
    return '<div class="dsc-card u-mb-lg"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">局级总览 · ' + lvName + '汇总</div>' +
      '<div class="dsc-card__extra">点击行名进入下一级' + (lv > 2 ? '　·　可「返回上一级」' : '') + '</div></div>' +
      D.table({
        cols: [
          { key: 'idx', name: '序号', width: 56, sticky: true },
          { key: 'name', name: lvName, width: 200, sticky2: true, render: function (v, r) {
            return '<span class="dsc-table__link" data-overview="' + esc(v) + '" data-level="' + r.level + '">' + esc(v) + '</span>';
          } },
          { key: 'contractCount', name: '合同数量', width: 110, num: true },
          { key: 'contractAmt', name: '合同总金额(万元)', width: 160, num: true },
          { key: 'orderAmt', name: '下单金额(万元)', width: 150, num: true },
          { key: 'settleAmt', name: '结算金额(万元)', width: 150, num: true },
          { key: 'payPct', name: '付款比例(%)', width: 130, num: true,
            render: function (v) { return D.barHTML(v) + '<span style="margin-left:8px">' + D.fmtNum(v, 1) + '%</span>'; } }
        ], rows: rows.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }),
        totalRow: D.totalOf([{ key: 'contractAmt', num: true }, { key: 'orderAmt', num: true }, { key: 'settleAmt', num: true },
          { key: 'contractCount', num: true }], rows),
        maxHeight: 400
      }) + '</div>';
  }

  /* ---------- F6 分供商 5 页签 ---------- */
  const SUP_TABS = [
    ['resource', '资源数据明细'], ['cooperation', '供应商合作分析'],
    ['complaint', '供应商提诉总览表'], ['review', '反向评价'], ['black', '集团分供商黑名单']
  ];
  const COMPLAINT_VIEWS = [
    ['targetOrg', '被提诉单位'], ['targetManager', '被提诉项目经理'],
    ['supplier', '提诉供应商'], ['supplierPerson', '提诉个人']
  ];

  function supplierBody() {
    if (RS.supTab === 'black') {
      const rows = D.genBlacklistRows();
      return '<div class="dsc-note dsc-note--info u-mb-md">集团分供商黑名单仅展示状态 = 冻结名单，只读不可编辑。</div>' +
        '<div class="dsc-card"><div class="dsc-card__header"><div class="dsc-card__title">集团分供商黑名单</div>' +
        '<div class="dsc-card__extra">共 ' + rows.length + ' 家</div></div>' +
        D.table({
          cols: [
            { key: 'idx', name: '序号', width: 56, sticky: true },
            { key: 'name', name: '供应商名称', width: 260, sticky2: true },
            { key: 'creditNo', name: '信用号码', width: 220 },
            { key: 'status', name: '状态', width: 100, render: function (v) {
              return '<span class="dsc-badge dsc-badge--over">' + esc(v) + '</span>';
            } },
            { key: 'reason', name: '列入原因', width: 140 },
            { key: 'date', name: '列入时间', width: 120 }
          ], rows: rows.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }), maxHeight: 420
        }) + '</div>';
    }
    if (RS.supTab === 'complaint') {
      const rows = D.genComplaintRows(RS.complaintView);
      const keyName = COMPLAINT_VIEWS.filter(function (v) { return v[0] === RS.complaintView; })[0][1];
      const unfinished = rows.filter(function (r) { return r.unfinished === '未完结'; });
      return '<div class="dsc-grid dsc-grid--4 u-mb-lg">' +
        [['提诉总数', rows.length + ' 笔'], ['未完结提诉数', unfinished.length + ' 笔'],
          ['未完结涉及金额', D.fmtNum(unfinished.reduce(function (a, r) { return a + r.amt; }, 0), 1) + ' 万元'],
          ['平均处理时长', D.fmtNum(rows.reduce(function (a, r) { return a + r.days; }, 0) / rows.length, 1) + ' 天']]
          .map(function (kv) {
            return '<div class="dsc-kpi"><div class="dsc-kpi__name">' + esc(kv[0]) + '</div>' +
              '<div class="dsc-kpi__value">' + esc(kv[1]) + '</div></div>';
          }).join('') + '</div>' +
        '<div class="dsc-card"><div class="dsc-card__header"><div class="dsc-card__title">供应商提诉总览表</div>' +
        '<div class="dsc-card__extra">当前视图：' + esc(keyName) + '（切换视图后列设置内容跟随变化）</div></div>' +
        D.table({
          cols: [
            { key: 'idx', name: '序号', width: 56, sticky: true },
            { key: RS.complaintView, name: keyName, width: 240, sticky2: true },
            { key: 'type', name: '提诉类型', width: 120 },
            { key: 'amt', name: '涉及金额(万元)', width: 140, num: true },
            { key: 'unfinished', name: '完结状态', width: 110 },
            { key: 'status', name: '处理状态', width: 110 },
            { key: 'days', name: '处理时长(天)', width: 130, num: true },
            { key: 'date', name: '提诉日期', width: 120 }
          ], rows: rows.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }), maxHeight: 400
        }) + '</div>';
    }
    if (RS.supTab === 'review') {
      const rows = D.genReviewRows();
      return '<div class="dsc-card"><div class="dsc-card__header"><div class="dsc-card__title">分供商反向评价</div>' +
        '<div class="dsc-card__extra">本级库选择：全局 / 二级 / 三级</div></div>' +
        D.table({
          cols: [
            { key: 'idx', name: '序号', width: 56, sticky: true },
            { key: 'name', name: '分供商名称', width: 240, sticky2: true },
            { key: 'cat', name: '分供商分类', width: 120 },
            { key: 'grade', name: '局评价等级', width: 110 },
            { key: 'org', name: '二级单位', width: 130 },
            { key: 'project', name: '项目', width: 190 },
            { key: 'dim1', name: '履约配合(分)', width: 120, num: true },
            { key: 'dim2', name: '结算及时性(分)', width: 140, num: true },
            { key: 'dim3', name: '服务质量(分)', width: 120, num: true },
            { key: 'score', name: '综合评价(分)', width: 130, num: true },
            { key: 'level', name: '评价等级', width: 110 }
          ], rows: rows.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }), maxHeight: 420
        }) + '</div>';
    }
    /* resource / cooperation 走通用宽表 */
    const ds = 'supplier';
    const all = rowsOf(ds).filter(function (r) { return D.scope.canSeeRow(r); });
    const total = all.length;
    const paged = all.slice((RS.page - 1) * RS.size, (RS.page - 1) * RS.size + RS.size);
    return '<div class="dsc-card"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">' + (RS.supTab === 'cooperation' ? '供应商合作分析' : '资源数据明细') + '</div>' +
      '<div class="dsc-card__extra">' + esc(DS.supplier.note) + '</div></div>' +
      D.table({ cols: colsOf(ds), rows: paged.map(function (r, i) { return Object.assign({ idx: (RS.page - 1) * RS.size + i + 1 }, r); }),
        maxHeight: 520, totalRow: D.totalOf(COLS[ds], paged),
        foot: D.pager({ page: RS.page, size: RS.size, total: total }) }) + '</div>';
  }

  /* ============================================================
     页面
     ============================================================ */
  D.pages.report = function (q) {
    const dsKey = q.ds === 'material' ? 'settlement' : q.ds === 'supplier' ? 'supplier' : q.ds === 'asset' ? 'asset' : 'contract';
    const meta = DS[q.ds] || DS.purchase;
    RS.page = 1;

    let body = '';
    if (q.ds === 'purchase' && q.view !== 'detail') {
      /* 卡片头只说明这张表本身——页头已写过"局级总览 + 合同明细全量表"，此处不再重复 */
      body = overviewSection() + '<div class="dsc-card"><div class="dsc-card__header">' +
        '<div class="dsc-card__title">合同明细</div>' +
        '<div class="dsc-card__extra">共 60 条　·　切到「明细」页签查看全量清单行</div></div>' +
        '<div class="dsc-card__body"><div class="dsc-empty">点击上方『局级总览』的行名可逐级下钻（二级 → 三级 → 项目），『返回上一级』回退</div></div></div>';
    } else if (q.ds === 'supplier') {
      body = supplierBody();
    } else {
      const all = rowsOf(dsKey).filter(function (r) { return D.scope.canSeeRow(r); });
      const total = all.length;
      const paged = all.slice((RS.page - 1) * RS.size, (RS.page - 1) * RS.size + RS.size);
      body = '<div class="dsc-card report-page__table-wrap"><div class="dsc-card__header">' +
        '<div class="dsc-card__title">' + esc(meta.name) + '</div>' +
        '<div class="dsc-card__extra">共 ' + total + ' 条　·　字段可自定义显示与排序</div></div>' +
        D.table({
          cols: colsOf(dsKey), rows: paged.map(function (r, i) { return Object.assign({ idx: (RS.page - 1) * RS.size + i + 1 }, r); }),
          maxHeight: 560, totalRow: D.totalOf(COLS[dsKey], paged),
          foot: D.pager({ page: RS.page, size: RS.size, total: total })
        }) + '</div>';
    }

    return '<div class="dsc-page report-page">' +
      '<div class="dsc-page__header report-page__header">' +
      '  <div class="dsc-page__title">' + esc(meta.name) + '</div>' +
      '  <div class="dsc-page__sub">' + esc(meta.note) + '</div>' +
      '  <div class="dsc-page__actions report-page__action-bar">' +
      '    <button class="dsc-btn" data-rp-columns>列设置</button>' +
      '    <button class="dsc-btn" data-rp-export>导出</button>' +
      '  </div>' +
      '</div>' +
      (D.scope.level === 1 ? '' : '<div class="dsc-note dsc-note--warn u-mb-md">已按组织权限过滤（R2）：仅返回本单位及下属数据，超权限明细行不返回。</div>') +
      (q.ds === 'purchase' ? '<div class="dsc-tabs" data-rp-view>' +
        [['overview', '局级总览'], ['detail', '明细']].map(function (v) {
          return '<div class="dsc-tabs__item' + ((q.view || 'overview') === v[0] ? ' dsc-tabs__item--active' : '') +
            '" data-rv="' + v[0] + '">' + v[1] + '</div>';
        }).join('') + '</div>' : '') +
      (q.ds === 'supplier' ? '<div class="dsc-tabs" data-rp-suptab>' + SUP_TABS.map(function (t) {
        return '<div class="dsc-tabs__item' + (RS.supTab === t[0] ? ' dsc-tabs__item--active' : '') +
          '" data-st="' + t[0] + '">' + esc(t[1]) + '</div>';
      }).join('') + '</div>' : '') +
      (q.ds === 'supplier' && RS.supTab === 'complaint' ? '<div class="dsc-tabs dsc-tabs--pill" data-rp-cview>' +
        COMPLAINT_VIEWS.map(function (v) {
          return '<div class="dsc-tabs__item' + (RS.complaintView === v[0] ? ' dsc-tabs__item--active' : '') +
            '" data-cv="' + v[0] + '">' + esc(v[1]) + '</div>';
        }).join('') + '</div>' : '') +
      drillPath(q.ds) +
      D.filterBar({ id: 'rpFilter', cls: 'report-page__filter-bar', fields: filterFields(q.ds), visibleCount: 6 }) +
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

    D.bindOrgSelect(root, [{ name: '局总部', level: 1 }].concat(D.scope.orgOptions()), function (v) {
      RS.overviewOrg = v;
      RS.overviewLevel = v ? (v === '局总部' ? 2 : (D.orgMap[v] ? 3 : 4)) : 2;
      D.toast('已切换实施单位：' + (v || '全局'));
      D.render();
    });
    D.bindFilter(root, 'rpFilter', {
      query: function (v) {
        const cond = [];
        if (v.date && v.date.length) cond.push('时间 ' + v.date[0] + ' ~ ' + v.date[1]);
        if (v.org) cond.push('实施单位 ' + v.org);
        if (v.grain) cond.push('粒度 ' + v.grain);
        D.toast(cond.length ? '已应用：' + cond.join('，') : '已应用查询条件（默认本年度 1 月 1 日 ~ 今日）');
        D.render();
      },
      reset: function () { RS.overviewOrg = ''; RS.overviewLevel = 2; D.toast('已重置为默认条件'); D.render(); },
      clear: function () { D.toast('条件已清空'); D.render(); }
    });

    D.__pagerCb = function (o) {
      if (o.page) RS.page = o.page;
      if (o.size) { RS.size = o.size; RS.page = 1; }
      D.render();
    };
    D.__sortCb = function (k) {
      if (RS.sortKey === k) RS.sortDir = RS.sortDir === 'asc' ? 'desc' : 'asc';
      else { RS.sortKey = k; RS.sortDir = 'desc'; }
      D.render();
    };

    page.addEventListener('click', function (e) {
      const t = e.target;

      const rv = t.closest('[data-rv]');
      if (rv) { D.nav('report', { ds: q.ds, view: rv.getAttribute('data-rv') }); return; }
      const st = t.closest('[data-st]');
      if (st) { RS.supTab = st.getAttribute('data-st'); RS.page = 1; D.render(); return; }
      const cv = t.closest('[data-cv]');
      if (cv) { RS.complaintView = cv.getAttribute('data-cv'); D.render(); return; }

      /* AC25 局级总览逐级下钻 + 返回上一级 */
      const ov = t.closest('[data-overview]');
      if (ov) {
        const name = ov.getAttribute('data-overview');
        const lv = +ov.getAttribute('data-level');
        RS.overviewOrg = name;
        RS.overviewLevel = Math.min(4, lv + 1);
        D.toast('下钻至 ' + name + ' 的' + { 3: '三级单位', 4: '项目' }[RS.overviewLevel] + '汇总');
        D.render();
        return;
      }
      if (t.closest('[data-drill-back]')) {
        RS.overviewLevel = Math.max(2, RS.overviewLevel - 1);
        RS.overviewOrg = RS.overviewLevel === 2 ? '' : RS.overviewOrg;
        D.toast('已返回上一级');
        D.render();
        return;
      }
      if (t.closest('[data-drill-reset]')) {
        RS.overviewLevel = 2; RS.overviewOrg = '';
        D.render();
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
            '<select class="dsc-field"><option>当前显示的 ' + shownOf(dsKey).length + ' 个字段</option><option>全量字段</option></select></div>',
          buttons: [{ text: '取消', cls: '', act: 'cancel' }, { text: '提交导出任务', cls: 'dsc-btn--primary', act: 'ok' }],
          onAction: function () { D.toast('导出任务已提交，完成后站内通知'); }
        });
        return;
      }

      /* 单据编号超链接 → 单据详情 */
      const lk = t.closest('.dsc-table__link');
      if (lk) {
        const code = lk.getAttribute('data-link') || lk.textContent;
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
