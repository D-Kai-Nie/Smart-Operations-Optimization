/* 项目驾驶舱 › 采购页签（由 view-project.js 拆分） */
(function (D) {
  'use strict';
  const S = D.projectShared;
  const esc = D.esc;
  const PS = S.PS;
  const section = S.section, subHead = S.subHead, stat = S.stat;
  const sel = S.sel, dateInputs = S.dateInputs, GRAIN_CARET = S.GRAIN_CARET, projMetrics = S.projMetrics;
  const P_COL = S.P_COL, P_NUM = S.P_NUM, P_DOC = S.P_DOC;
  const STATUS_DIST = [['已完成', 4], ['已下达', 5], ['编制中', 2], ['已关闭', 1], ['待下达', 3], ['待审批', 2], ['已作废', 0]];

  function procSection(p) {
    const matDist = D.material.mid.map(function (m, i) {
      return { name: m, value: D.round(45.16 - i * 5.2, 2) };
    }).sort(function (a, b) { return b.value - a.value; });
    return section('招采分析',
      '<div class="dsc-card u-mb-lg"><div class="dsc-card__body">' +
      '  <div class="ck-filter pj-proc-filter"><div class="ck-filter__row">' +
      '    <div class="ck-filter__item"><span class="ck-filter__label">招标开始日期</span>' +
      '      <span class="ck-grain" data-pj-grain>日' + GRAIN_CARET + '</span>' +
      '      <span class="ck-field ck-field--date">' + esc(D.defaultRange[0]) + ' ~ 结束时间</span></div>' +
      '    ' + D.ckField('采购类别', '') +
      '    ' + D.ckField('采购方式', '') +
      '    ' + D.ckField('采购模式', '') +
      '  </div>' +
      '  <div class="ck-filter__foot"><span class="ck-filter__hint" hidden></span>' +
      '  <span class="ck-filter__foot-right">' +
      '    <button class="ck-btn ck-btn--primary" data-pj-query>查询</button>' +
      '    <button class="ck-link" data-pj-clear>清空</button>' +
      '    <button class="ck-link" data-pj-reset>重置</button>' +
      '  </span></div>' +
      '  </div>' +
      '  <div class="dsc-split dsc-split--2">' +
      '    <div>' + subHead('项目采购计划状态分布') +
      '      <div class="dsc-chart" id="pjPlanStatus" style="height:200px"></div></div>' +
      '    <div>' + subHead('项目采购计划物料分类分布') +
      '      <div class="dsc-chart" id="pjPlanMat" style="height:200px"></div></div>' +
      '  </div>' +
      '  <div class="dsc-subhead u-mt-xl"><span class="dsc-subhead__title">采购发起 → 响应 → 评审 → 成交</span>' +
      '    <span class="dsc-subhead__extra">本项目全过程</span></div>' +
      '  <div class="cockpit-proc">' + [
        ['采购发起', [['招标笔数', 46, '笔'], ['计划金额', 1382.6, '万元']]],
        ['采购响应', [['投标单位数', 132, '家'], ['响应率', 92.4, '%']]],
        ['采购评审', [['在线评标率', 96.8, '%'], ['平均评标时长', 6.2, '天']]],
        ['采购成交', [['成交笔数', 41, '笔'], ['平均招采时效', 25.1, '天']]]
      ].map(function (s) {
        return '<div class="cockpit-proc__col"><div class="dsc-subhead__title u-mb-md">' + esc(s[0]) + '</div>' +
          s[1].map(function (kv) {
            return '<div class="cockpit-proc__kv"><span>' + esc(kv[0]) + '</span><b>' +
              D.fmtNum(kv[1], kv[1] % 1 === 0 ? 0 : 1) + '<i>' + esc(kv[2]) + '</i></b></div>';
          }).join('') + '</div>';
      }).join('') + '</div>' +
      '</div></div>');
  }

  /* ---------- 合同分析 ---------- */
  /* 合同明细分析的动态列：与「采购报表 › 明细」同一套 70+ 字段（Axure 列表字段选择-合同明细） */
  const PJ_CONTRACT_COLS = [
    P_COL('idx', '序号', 56, { sticky: true }),
    P_COL('code', '合同编号', 160, { sticky2: true, link: true }),
    P_COL('name', '合同名称', 260),
    P_COL('category', '合同分类', 110), P_COL('type', '合同类型', 130), P_COL('tpl', '合同模板', 150),
    P_COL('status', '合同状态', 100), P_COL('source', '合同来源', 100),
    P_COL('sourceCode', '来源单号', 140, { link: true }), P_COL('owner', '使用主体', 190),
    P_COL('dept', '合同承办部门', 140), P_COL('partyA', '甲方', 180), P_COL('partyB', '乙方', 200),
    P_COL('belong', '所属机构', 130), P_COL('area', '项目区域', 100), P_COL('addr', '项目所在地址', 160),
    P_COL('signDate', '合同签订日期', 130), P_COL('reconDate', '对账日期', 110),
    P_COL('trade', '国际贸易条款', 120), P_COL('transport', '运输条款', 110), P_COL('settleCycle', '结算周期', 110),
    P_COL('creator', '创建人', 90), P_COL('agent', '经办人', 90), P_COL('isStandard', '是否制式', 100),
    P_COL('rowType', '物料行类型', 110), P_COL('matBig', '物料大类', 130), P_COL('matMid', '物料中类', 120),
    P_COL('matSmall', '物料小类', 120), P_COL('matCode', '物料编码', 140), P_COL('matDesc', '物料描述', 170),
    P_COL('brand', '品牌名称', 100), P_COL('otherAttr', '其他采购属性', 130),
    P_NUM('qty', '数量', 100), P_COL('unit', '计量单位', 90), P_COL('priceType', '价格类型', 100),
    P_COL('floatType', '浮动价浮动类型', 130), P_COL('floatLink', '浮动价确价环节', 130),
    P_COL('floatSys', '浮动价外部系统', 130), P_COL('floatArea', '浮动价外部区域', 130),
    P_COL('floatTime', '浮动价时间标准', 130), P_NUM('floatVal', '浮动值(不含税)', 130),
    P_NUM('floatPct', '浮动比例', 110), P_NUM('estPrice', '暂估价(不含税)', 130),
    P_NUM('priceTax', '含税单价', 110), P_NUM('amtTax', '含税金额', 120), P_NUM('taxRate', '税率', 80),
    P_NUM('priceNoTax', '不含税单价', 110), P_NUM('amtNoTax', '不含税金额', 120), P_NUM('taxAmt', '税额', 100),
    P_NUM('inPriceTax', '收入价含税单价', 130), P_NUM('inAmtTax', '收入价含税金额', 130),
    P_NUM('inTaxRate', '收入价税率', 110), P_NUM('inPriceNoTax', '收入价不含税单价', 140),
    P_NUM('inAmtNoTax', '收入价不含税金额', 140),
    P_NUM('costPriceTax', '成本价含税单价', 130), P_NUM('costAmtTax', '成本价含税金额', 130),
    P_NUM('costTaxRate', '成本价税率', 110), P_NUM('costPriceNoTax', '成本价不含税单价', 140),
    P_NUM('costAmtNoTax', '成本价不含税金额', 140),
    P_NUM('orderAmt', '下单金额', 120), P_NUM('orderPct', '下单比例', 100),
    P_NUM('acceptAmt', '验收金额', 120), P_NUM('acceptPct', '验收比例', 100),
    P_NUM('settleAmt', '结算金额', 120), P_NUM('settlePct', '结算比例', 100),
    P_NUM('payPct', '付款比例', 100), P_NUM('shouldPay', '合同应支付金额', 140),
    P_NUM('paidAmt', '合同已支付金额', 140), P_NUM('unpaidAmt', '合同累计应付未付金额', 170),
    P_COL('treasuryCode', '司库一体化合同编号', 160)
  ];
  const PJ_CONTRACT_DEF = ['idx', 'code', 'name', 'type', 'status', 'partyB', 'signDate',
    'matSmall', 'qty', 'priceTax', 'amtTax', 'orderAmt', 'settleAmt'];
  /* 设置列分组（Axure：合同信息 / 合同明细信息） */
  const PJ_CONTRACT_GROUPS = function () {
    const basicKeys = ['code', 'name', 'category', 'type', 'tpl', 'status', 'source', 'sourceCode', 'owner',
      'dept', 'partyA', 'partyB', 'belong', 'area', 'addr', 'signDate', 'reconDate', 'trade', 'transport',
      'settleCycle', 'creator', 'agent', 'isStandard'];
    const infoKeys = PJ_CONTRACT_COLS.map(function (c) { return c.key; })
      .filter(function (k) { return k !== 'idx' && basicKeys.indexOf(k) < 0; });
    const pick = function (ks) {
      return ks.map(function (k) { return PJ_CONTRACT_COLS.filter(function (c) { return c.key === k; })[0]; }).filter(Boolean);
    };
    return [{ title: '合同信息', items: pick(basicKeys) }, { title: '合同明细信息', items: pick(infoKeys) }];
  };

  let PJ_PURCHASE_ROWS = [];
  /* 合同金额按项目规模缩放（合同总额 ≈ 项目总采购金额 × 1.15）：
     生成器里的单价是全局样本量级，不缩放会得到比项目采购额大一个数量级的「项目合同总额」 */
  function pjScaleContracts(rows, purchase) {
    const sum = rows.reduce(function (a, r) { return a + (r.amtTax || 0); }, 0) || 1;
    /* amtTax 单位为元，purchase 单位为万元：目标合同总额 = 项目采购额 × 1.15（万元） */
    const k = (purchase || 4000) * 1e4 * 1.15 / sum;
    const money = ['amtTax', 'amtNoTax', 'taxAmt', 'inAmtTax', 'inAmtNoTax', 'costAmtTax',
      'costAmtNoTax', 'orderAmt', 'acceptAmt', 'settleAmt', 'shouldPay', 'paidAmt', 'unpaidAmt'];
    return rows.map(function (r) {
      const o = Object.assign({}, r);
      o.qty = D.round(r.qty * k, 2);
      money.forEach(function (key) { if (typeof o[key] === 'number') o[key] = D.round(o[key] * k, 2); });
      return o;
    });
  }
  function contractSection(p) {
    /* 只取当前项目的合同：生成器直接注入项目上下文，不再用「按二级单位过滤」的近似口径 */
    const rows = pjScaleContracts(D.genContractRows(40, null, p), p.purchase);
    PJ_PURCHASE_ROWS = rows;
    const cols = D.colsOf('pj-contract', PJ_CONTRACT_COLS, PJ_CONTRACT_DEF);
    const size = 10;
    const pages = Math.max(1, Math.ceil(rows.length / size));
    if (PS.contractPage > pages) PS.contractPage = pages;
    const paged = rows.slice((PS.contractPage - 1) * size, (PS.contractPage - 1) * size + size);
    const sumOf = function (k) {
      return D.round(rows.reduce(function (a, r) { return a + (r[k] || 0); }, 0) / 1e4, 2);
    };
    return section('合同分析',
      '<div class="dsc-card u-mb-lg"><div class="dsc-card__body">' +
      '  <div class="project-cockpit-page__kpis">' +
      stat('项目合同数量', rows.length, '个', 0) + stat('项目合同总额', sumOf('amtTax'), '万元') +
      stat('合同已下单金额', sumOf('orderAmt'), '万元') + stat('合同已结算金额', sumOf('settleAmt'), '万元') +
      '  </div>' +
      '  <div class="dsc-filter-inline u-mt-lg">' +
      '    <div class="dsc-filter-inline__item"><span class="dsc-filter-inline__label">合同签订日期</span>' +
      '      ' + dateInputs('日期范围') + '</div>' +
      '    <div class="dsc-filter-inline__item"><span class="dsc-filter-inline__label">合同类型</span>' +
      '      <select class="dsc-field" data-pj-field="合同类型"><option value="">请选择合同类型</option>' +
      ['物资采购合同', '设备采购合同', '劳务分包合同', '专业分包合同', '专业服务合同',
        '物资租赁合同', '机械设备租赁合同', '运输类合同', '调拨采购合同', '废旧物资销售合同']
        .map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('') +
      '</select></div>' +
      '    <div class="dsc-filter-inline__item"><span class="dsc-filter-inline__label">乙方</span>' +
      '      <input class="dsc-field" type="text" data-pj-field="乙方" placeholder="请输入乙方名称"/></div>' +
      '  </div>' +
      '</div></div>' +
      '<div class="dsc-card">' +
      '<div class="dsc-card__header"><div class="dsc-card__title">合同明细分析</div>' +
      '<div class="dsc-card__extra">共 ' + rows.length + ' 条　·　' +
      PJ_CONTRACT_COLS.length + ' 个可选字段' +
      D.colGear('data-pj-columns', '设置列：合同明细分析（合同信息 / 合同明细信息，共 ' +
        PJ_CONTRACT_COLS.length + ' 个字段）') + '</div></div>' +
      D.table({
        cols: cols, rows: paged.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }),
        maxHeight: 460, foot: D.pager({ page: PS.contractPage, size: size, total: rows.length })
      }) + '</div>');
  }

  /* ---------- 履约分析 ---------- */
  /* 集采情况按当前项目的合同物料分类汇总（此前误用 genMaterialMarket，
     类目是各二级单位 / 三级单位 / 项目名称——项目页不应出现其它单位的数据） */
  function pjFulfillMix(level) {
    const key = level === 1 ? 'matBig' : level === 2 ? 'matMid' : 'matSmall';
    const m = {};
    PJ_PURCHASE_ROWS.forEach(function (r) {
      const k = r[key];
      if (k) m[k] = (m[k] || 0) + (r.amtTax || 0) / 1e4;
    });
    return Object.keys(m).map(function (k) { return { name: k, amt: D.round(m[k], 2) }; })
      .sort(function (a, b) { return b.amt - a.amt; }).slice(0, 8);
  }
  function fulfillSection(p) {
    const rows = D.genSettlePriceRows();
    const rateM = projMetrics(p).filter(function (m) { return m.name === '集中采购率'; })[0] || { value: 0 };
    const rate = rateM.value;
    const central = D.round(p.purchase * rate / 100, 2);
    const contractAmt = D.round(PJ_PURCHASE_ROWS.reduce(function (a, r) {
      return a + (r.amtTax || 0);
    }, 0) / 1e4, 2);
    return section('履约分析',
      '<div class="dsc-card u-mb-lg"><div class="dsc-card__body">' +
      '  <div class="dsc-filter-inline u-mb-lg">' +
      '    <div class="dsc-filter-inline__item"><span class="dsc-filter-inline__label">结算创建日期</span>' +
      '      ' + dateInputs('日期范围') + '</div>' +
      '    <div class="dsc-filter-inline__item"><span class="dsc-filter-inline__label">物料大分类</span>' +
      sel('物料大分类', D.material.big) + '</div>' +
      '    <div class="dsc-filter-inline__item"><span class="dsc-filter-inline__label">物料中分类</span>' +
      sel('物料中分类', D.material.mid) + '</div>' +
      '    <div class="dsc-filter-inline__item"><span class="dsc-filter-inline__label">物料小分类</span>' +
      sel('物料小分类', D.material.small) + '</div>' +
      '  </div>' +
      '  <div class="project-cockpit-page__kpis">' +
      stat('总采购金额', p.purchase, '万元') + stat('集中采购金额', central, '万元') +
      stat('采购签约金额', contractAmt, '万元') + stat('集中采购率', rate, '%') +
      '  </div>' +
      '</div></div>' +
      '<div class="cockpit-rank3">' +
      '</div>' +
      '<div class="dsc-split dsc-split--2 u-mb-lg">' +
      '  <div class="dsc-card"><div class="dsc-card__header">' +
      '    <div class="dsc-card__title">物料大分类履约集采情况</div></div>' +
      '    <div class="dsc-card__body"><div class="dsc-chart" id="pjBig" style="height:200px"></div></div></div>' +
      '  <div class="dsc-card"><div class="dsc-card__header">' +
      '    <div class="dsc-card__title">物料中分类履约集采情况</div></div>' +
      '    <div class="dsc-card__body"><div class="dsc-chart" id="pjMid" style="height:200px"></div></div></div>' +
      '</div>' +
      '<div class="dsc-split dsc-split--2">' +
      '  <div class="dsc-card"><div class="dsc-card__header">' +
      '    <div class="dsc-card__title">物料小分类履约集采情况</div>' +
      '    <div class="dsc-card__extra">TOP 10</div></div>' +
      '    <div class="dsc-card__body"><div class="dsc-chart" id="pjSmall" style="height:200px"></div></div></div>' +
      '  <div class="dsc-card"><div class="dsc-card__header">' +
      '    <div class="dsc-card__title">项目核心物料结算平均价格</div></div>' +
      '    <div class="dsc-card__body">' +
      D.table({
        cols: [
          { key: 'idx', name: '序号', width: 56, sticky: true },
          { key: 'name', name: '物料名称', width: 150 },
          { key: 'unit', name: '计量单位', width: 100 },
          { key: 'value', name: '结算平均价格', width: 130, num: true }
        ], rows: rows.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }), maxHeight: 200
      }) + '</div></div>' +
      '</div>');
  }

  /* ---------- 物资 / 分供商 / 资产（页签切换时替换招采分析块） ----------
     列表筛选：每个列表按自身字段真过滤（此前复用看板逻辑，只记录条件、表格不变） */

  D.projectShared.STATUS_DIST = STATUS_DIST;
  D.projectShared.PJ_CONTRACT_GROUPS = PJ_CONTRACT_GROUPS;
  D.projectShared.PJ_CONTRACT_DEF = PJ_CONTRACT_DEF;
  D.projectShared.pjFulfillMix = pjFulfillMix;
  D.projectTabs.purchase = function (p) {
    return procSection(p) + contractSection(p) + fulfillSection(p);
  };
})(window.APP);
