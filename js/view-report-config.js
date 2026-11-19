/* 数据报表 › 列定义 / 默认列 / 筛选字段配置（由 view-report.js 拆分） */
(function (D) {
  'use strict';
  const esc = D.esc;

  /* 资源数据报表 › 分供商合作分析的物料小类值集（按工作目录《物料小类》图片） */
  const SUP_MAT_SMALL = [
    '废旧钢绞线', '钢便桥', '白铁管引出装置', '接地镀铜钢棒', '接地不锈钢',
    '接地铜棒', '管片专用预埋套筒', '网片加工费', '铝网片', '拉条'
  ];

  function C(k, n, w, o) { return Object.assign({ key: k, name: n, width: w || 120 }, o || {}); }

  /* 单据编号链接：点击后由页面统一提示「详情页」（原型不设计详情页） */
  function docLink(code, type) {
    return '<span class="dsc-table__link" data-doclink="' + esc(code) +
      '" data-doc-type="' + esc(type) + '">' + esc(code) + '</span>';
  }
  function docCell(type) {
    return function (v) {
      return v && v !== '—' ? docLink(v, type) : '—';
    };
  }
  /* 多值字段：最多显示 3 项，超出部分收进 title（物料小类 / 资产盘点编号共用）。
     传入 linkType 时，每个可见编号渲染为可点击的单据链接 */
  function multiValue(linkType) {
    return function (v) {
      const list = Array.isArray(v) ? v : (v ? String(v).split('、') : []);
      if (!list.length) return '—';
      const one = function (s) { return linkType ? docLink(s, linkType) : esc(s); };
      const head = list.slice(0, 3).map(one).join('、');
      if (list.length <= 3) return head;
      return head + '<span class="dsc-more" title="全部 ' + list.length + ' 项：' +
        esc(list.join('、')) + '">…</span>';
    };
  }

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
    /* 资产明细表：最小颗粒度 = 资产编码；只保留业务办理字段，
       金额 / 数量类统计字段归入「资产统计报表」（ASSET_STATS_COLS） */
    asset: [
      C('idx', '序号', 56, { sticky: true }),
      C('assetCode', '资产编码', 180, { sticky2: true, link: true }),
      C('desc', '资产名称', 180),
      C('qty', '数量', 100, { sortable: true, render: function (v, r) {
        return v == null || v === '' ? '—' : esc(D.fmtInt(v) + (r.unit || ''));
      } }),
      C('org2', '二级单位', 110), C('org3', '三级单位', 130), C('project', '项目', 220),
      C('sourceType', '来源类型', 100), C('attr', '资产属性', 100), C('brand', '资产品牌', 100),
      C('assetCat', '资产类别', 130),
      C('location', '存放地点', 150),
      C('acceptCode', '验收单', 160, { render: docCell('验收单') }),
      C('invPlanCode', '资产盘点', 180, { render: multiValue('资产盘点') }),
      C('transferCode', '调拨单号', 160, { render: docCell('调拨单') }),
      C('keeper', '保管单位', 130), C('keeperUser', '保管人', 90), C('user', '使用人', 90)
    ],
    /* 附录 F 分供商合作分析（列序对齐 Axure「分供商合作分析」） */
    supplier: [
      C('idx', '序号', 56, { sticky: true }),
      C('name', '分供商名称', 230, { sticky2: true, link: true }),
      C('org2', '二级单位', 110), C('org3', '三级单位', 120),
      C('perfProjCount', '履约合作项目数', 140, { num: true }),
      C('bidCount', '投标次数', 100, { num: true }),
      C('winCount', '中标次数', 100, { num: true }), C('winAmt', '中标金额(万元)', 140, { num: true }),
      C('frameCount', '框架协议份数', 130, { num: true, group: '签约份数' }),
      C('execCount', '执行合同份数', 130, { num: true, group: '签约份数' }),
      C('signCount', '合计份数', 110, { num: true, group: '签约份数' }),
      C('contractAmt', '签订合同额(万元)', 150, { num: true }),
      C('perfAmt', '履约额(万元)', 130, { num: true }),
      C('grade', '局评价等级', 110),
      C('matSmall', '物料小类', 190, { render: multiValue() }),
      C('badCount', '不良行为次数', 130, { num: true }), C('banCount', '禁用次数', 100, { num: true }),
      C('code', '分供商编码', 110), C('cat', '分供商分类', 120)
    ]
  };

  /* 资产统计报表：最小颗粒度 = 项目；固定统计字段（不含可增删的列设置） */
  const ASSET_STATS_COLS = [
    C('idx', '序号', 56, { sticky: true }),
    C('org2', '二级单位', 130, { sticky2: true }),
    C('org3', '三级单位', 160),
    C('project', '项目', 240),
    C('assetAmt', '资产总额（万元）', 150, { num: true }),
    C('assetCount', '资产总数', 110, { num: true }),
    C('usingCount', '在用数量', 110, { num: true }),
    C('idleCount', '闲置数量', 110, { num: true }),
    C('repairCount', '维保数量', 110, { num: true }),
    C('scrapCount', '报废数量', 110, { num: true }),
    C('buyAmt', '资产购置金额（万元）', 170, { num: true }),
    C('disposeAmt', '处置金额（万元）', 150, { num: true }),
    C('depAmt', '调拨摊销折旧金额（万元）', 190, { num: true })
  ];

  const DEFAULT_SHOWN = {
    /* 物资结算明细：列序同 Axure（单据信息 → 物料 → 金额 → 降本），默认展示常用列，
       其余 20+ 字段在「列设置」里可加 */
    settlement: ['idx', 'org2', 'org3', 'project', 'settleCode', 'matSmall', 'unit', 'qty',
      'priceTax', 'amtTax', 'costDown', 'bargainDown', 'benefit'],
    /* 采购报表明细：默认 13 列（对齐样例表头） */
    contract: ['idx', 'name', 'org2', 'org3', 'project', 'code', 'category', 'type', 'status',
      'source', 'sourceCode', 'tpl', 'owner'],
    /* 资产明细表：资产编码 / 资产名称在首屏；其余业务字段在「设置列」里可加 */
    asset: ['idx', 'assetCode', 'desc', 'qty', 'org2', 'org3', 'project', 'assetCat', 'attr',
      'sourceType', 'location', 'keeper', 'keeperUser', 'acceptCode', 'invPlanCode', 'transferCode'],
    supplier: ['idx', 'name', 'org2', 'org3', 'perfProjCount', 'bidCount', 'winCount', 'winAmt',
      'frameCount', 'execCount', 'signCount', 'contractAmt', 'perfAmt', 'grade', 'matSmall',
      'badCount', 'banCount']
  };

  function filterFields(ds, view, RS) {
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
          { name: 'finishDate', label: '项目竣工日期', type: 'daterange', wide: true },
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
          { name: 'signDate', label: '合同签订日期', type: 'daterange', wide: true },
          { name: 'date', label: '结算日期', type: 'daterange', wide: true }
        ];
      }
      /* 物资报表-总览 */
      return [
        { name: 'date', label: '统计日期-范围', type: 'daterange', value: D.defaultRange, wide: true,
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
          { name: 'signDate', label: '合同签订日期', type: 'daterange', wide: true },
          { name: 'createDate', label: '合同创建日期', type: 'daterange', wide: true },
          { name: 'pType', label: '项目类型', type: 'multi', options: D.TYPES },
          { name: 'pStatus', label: '项目状态', type: 'multi', options: D.STATUS },
          { name: 'agent', label: '经办人', type: 'text', ph: '请输入' },
          { name: 'creator', label: '创建人', type: 'text', ph: '请输入' },
          { name: 'category', label: '合同分类', type: 'select', options: D.DICT.contractCategories },
          { name: 'contractType', label: '合同类型', type: 'multi', options: D.DICT.contractFilterTypes },
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
        { name: 'date', label: '统计日期-范围', type: 'daterange', value: D.defaultRange, wide: true,
          grain: ['日', '月', '季', '年'], grainValue: RS.purGrain },
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
    if (ds === 'asset') {
      /* 查询条件与两张表的列对应：二级 / 三级单位 + 项目及项目属性；
         统计报表没有资产类别列，不提供该条件；明细表按资产编码查询并保留类别 / 属性 / 验收状态。
         日期区间占两格，避免原生日期输入溢出 */
      const base = [
        { name: 'date', label: '日期选择', type: 'daterange', value: D.defaultRange, wide: true,
          grain: ['日', '月', '季', '年'], grainValue: RS.assetGrain },
        { name: 'org2', label: '二级单位', type: 'select', options: D.orgs.map(function (o) { return o.name; }) },
        { name: 'org3', label: '三级单位', type: 'select', options: D.subOrgs.map(function (s) { return s.name; }) },
        { name: 'project', label: '项目', type: 'text', ph: '请输入项目名称' },
        { name: 'pType', label: '项目类型', type: 'multi', options: D.TYPES },
        { name: 'pFormat', label: '项目业态', type: 'multi', options: D.FORMATS },
        { name: 'pStatus', label: '项目状态', type: 'multi', options: D.STATUS },
        { name: 'pMode', label: '承包模式', type: 'multi', options: D.MODES },
        { name: 'pArea', label: '项目区域(到地级市)', type: 'tree', options: D.areaTree() }
      ];
      if (RS.assetTab !== 'detail') return base;
      return base.concat([
        { name: 'assetCode', label: '资产编码', type: 'text', ph: '请输入资产编码' },
        { name: 'assetCat', label: '资产类别', type: 'multi', options: D.ASSET_CAT_NAMES },
        { name: 'sourceType', label: '来源类型', type: 'multi', options: D.DICT.assetSourceTypes },
        { name: 'attr', label: '资产属性', type: 'multi', options: D.DICT.assetAttrs },
        { name: 'acceptCode', label: '验收单', type: 'text', ph: '请输入验收单编号' },
        { name: 'invPlanCode', label: '资产盘点', type: 'text', ph: '请输入盘点方案编号' },
        { name: 'keeperUser', label: '保管人', type: 'text', ph: '请输入保管人' }
      ]);
    }
    /* supplier：筛选字段随子页签变化（对齐 Axure 各页签的查询条件） */
    const supOrgs = D.orgs.map(function (o) { return o.name; });
    const supSubs = D.subOrgs.map(function (o) { return o.name; });
    const supDate = { name: 'date', label: '日期选择', type: 'daterange', value: D.defaultRange, wide: true };
    const supCommon = [
      { name: 'org2', label: '二级单位', type: 'select', options: supOrgs },
      { name: 'org3', label: '三级单位', type: 'select', options: supSubs }
    ];
    if (RS.supTab === 'resource') {
      /* 资源明细：时间 + 组织维度；项目字段已移除 */
      return [supDate].concat(supCommon);
    }
    if (RS.supTab === 'cooperation') {
      return [supDate].concat(supCommon, [
        { name: 'name', label: '分供商名称', type: 'text', ph: '请输入' },
        { name: 'grade', label: '局评价等级', type: 'multi', options: D.supplierGrades },
        { name: 'cat', label: '分供商分类', type: 'select', options: D.supplierCats },
        { name: 'matSmall', label: '物料小类', type: 'multi', options: SUP_MAT_SMALL },
        { name: 'code', label: '分供商编码', type: 'text', ph: '请输入' }
      ]);
    }
    /* 资源数据明细的兜底条件（正常情况下 supTab 已归一为 resource / cooperation） */
    return [supDate].concat(supCommon);
  }

  D.reportConfig = {
    COLS: COLS,
    DEFAULT_SHOWN: DEFAULT_SHOWN,
    ASSET_STATS_COLS: ASSET_STATS_COLS,
    SUP_MAT_SMALL: SUP_MAT_SMALL,
    filterFields: filterFields
  };
})(window.APP);
