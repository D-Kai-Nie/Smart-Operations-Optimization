/* ============================================================
   F3 项目驾驶舱（PRD F3.1–F3.7）
   版式对齐 Axure 导出稿（长滚动看板）：
   项目选择器 → 采购 / 物资 / 分供商 / 资产 页签 → 项目核心指标
   → 招采分析（计划状态分布 / 物料分类分布 / 发起-响应-评审-成交）
   → 合同分析（合同数量与总额 + 合同明细分析）
   → 履约分析（大/中/小分类集采情况 + 核心物料结算平均价格）
   ============================================================ */
(function (D) {
  'use strict';
  const esc = D.esc;

  const PS = {
    tab: 'purchase',                 // 采购 / 物资 / 分供商 / 资产
    planKind: 'month',
    matBig: '', matMid: '', matSmall: '',
    settleView: 'chart',
    contractPage: 1,                 // 合同明细分析当前页
    assetDoc: 'transfer'             // 资产页签：资产调拨 / 资产处置
  };
  D.projectState = PS;

  const TABS = [['purchase', '采购'], ['material', '物资'], ['supplier', '分供商'], ['asset', '资产']];

  /* ============================================================
     各列表的动态字段（Axure《项目驾驶舱》三个「列表字段选择」面板逐项抄录）
       · 列表字段选择-合同明细（77 项，与采购报表明细同一套）
       · 列表字段选择-物资页签（需用计划 / 结算明细 / 领料 / 退货 / 盘点 / 调拨 / 闲废）
       · 列表字段选择-资源+资产（分供商履约 / 资产调拨 / 资产处置 / 全资产明细）
     ============================================================ */
  const P_COL = function (k, n, w, o) { return Object.assign({ key: k, name: n, width: w || 130 }, o || {}); };
  const P_NUM = function (k, n, w, o) { return P_COL(k, n, w, Object.assign({ num: true }, o || {})); };
  /* 关联单据链接单元格（点击打开 Axure 的各类关联单据弹窗） */
  const P_DOC = function (kind) {
    return function (v) {
      if (v == null || v === '' || v === '—') return '—';
      return '<span class="dsc-table__link" data-pj-doc="' + esc(kind) + '|' + esc(v) + '">' + esc(v) + '</span>';
    };
  };

  /* 物资需用计划 */
  function sel(label, options, ph) {
    return '<select class="dsc-field" data-pj-field="' + esc(label) + '"><option value="">' +
      esc(ph || '请选择') + '</option>' + (options || []).map(function (o) {
        return '<option value="' + esc(o) + '">' + esc(o) + '</option>';
      }).join('') + '</select>';
  }
  function dateInputs(label) {
    return '<input class="dsc-field" type="date" data-pj-field="' + esc(label) + '" value="' +
      esc(D.defaultRange[0]) + '"/><span class="dsc-daterange__sep">~</span>' +
      '<input class="dsc-field" type="date" data-pj-field="' + esc(label) + '结束" value="' +
      esc(D.defaultRange[1]) + '"/>';
  }

  const GRAIN_CARET = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round"><path d="M4 6.5l4 4 4-4"/></svg>';

  /* ---------- 项目（R1：按权限过滤） ---------- */
  function scopedProjects() {
    if (D.scope.level === 1) return D.projects;
    const subs = D.subOrgsByParent[D.scope.name] || [];
    const names = subs.map(function (s) { return s.name; });
    return D.projects.filter(function (x) {
      return x.org === D.scope.name || names.indexOf(x.subOrg) >= 0;
    });
  }

  function curProject(q) {
    const pool = scopedProjects();
    let p = null;
    if (q.project) p = pool.filter(function (x) { return x.name === q.project; })[0];
    if (!p && q.pcode) p = pool.filter(function (x) { return x.code === q.pcode; })[0];
    return p || pool[0] || D.projects[0];
  }

  function section(title, body) {
    return '<section class="project-cockpit-section">' +
      '<div class="dsc-section-head"><h2 class="dsc-section-head__title">' + esc(title) + '</h2></div>' +
      body + '</section>';
  }

  function subHead(title, extra) {
    return '<div class="dsc-subhead"><span class="dsc-subhead__title">' + esc(title) + '</span>' +
      (extra ? '<span class="dsc-subhead__extra">' + extra + '</span>' : '') + '</div>';
  }

  function stat(label, value, unit, digits) {
    return '<div class="dsc-stat"><div class="dsc-stat__label">' + esc(label) + '</div>' +
      '<div class="dsc-stat__value">' + (digits === 0 ? D.fmtInt(value) : D.fmtNum(value, digits == null ? 2 : digits)) +
      '<span class="dsc-stat__unit">' + esc(unit) + '</span></div></div>';
  }

  /* ---------- 项目选择条（右上「项目 [选择器]」，切换即锁定项目） ---------- */
  function projectBar(p) {
    const pool = scopedProjects();
    return '<div class="pj-bar">' +
      '<span class="pj-bar__label">项目</span>' +
      '<select class="pj-select" data-pj-picker>' + pool.map(function (x) {
        return '<option value="' + esc(x.name) + '"' + (x.name === p.name ? ' selected' : '') + '>' +
          esc(x.name) + '</option>';
      }).join('') + '</select>' +
      '</div>';
  }

  /* ---------- 项目信息：采购金额构成 + 信息栅格 ----------
     原定位地图占位改为「总采购金额 + 五类构成 + 占比」，五类口径与配色沿用局驾驶舱的采购金额构成；
     金额按项目总采购额派生，五类之和严格等于总额 */
  const PJ_BUY_MIX = [
    { name: '专业分包结算', share: 43.02, color: '#4285F4' },
    { name: '物资结算', share: 27.37, color: '#1F4E79' },
    { name: '劳务分包结算', share: 25.17, color: '#34A853' },
    { name: '设备结算', share: 3.12, color: '#FB923C' },
    { name: '专业服务结算', share: 1.32, color: '#EA4335' }
  ];
  function pjBuyMix(p) {
    const total = D.round(p.purchase, 2);
    let used = 0;
    return PJ_BUY_MIX.map(function (m, i) {
      const v = i === PJ_BUY_MIX.length - 1
        ? D.round(total - used, 2)
        : D.round(total * m.share / 100, 2);
      used = D.round(used + v, 2);
      return { name: m.name, value: v, pct: m.share, color: m.color };
    });
  }
  function projectInfo(p) {
    const info = [
      ['项目类型', p.type], ['承包模式', p.mode],
      ['所属区域', '中国 / ' + p.area + ' / ' + p.city], ['实施单位', (p.subOrg || p.org) + ''],
      ['物资人员配置', '2 人'], ['总包合同金额', D.fmtNum(p.amount, 2) + ' 万元'],
      ['合同开竣工日期', '2026-03-01 ~ 2026-12-31'], ['项目状态', p.status]
    ];
    return '<div class="pj-info">' +
      '<div class="pj-info__buy">' +
      '  <div class="pj-buy__head"><span class="pj-buy__title">采购金额构成</span>' +
      '    <span class="pj-buy__total">总采购金额 <b>' + D.fmtNum(p.purchase, 2) + '</b> 万元</span></div>' +
      '  <div class="pj-buy__body">' +
      '    <div class="pj-buy__ring"><div class="dsc-chart" id="pjBuyPie" style="height:170px"></div></div>' +
      '    <div class="pj-buy__legend">' + pjBuyMix(p).map(function (m) {
        return '<div class="pj-buy__item"><i style="background:' + m.color + '"></i>' +
          '<span class="pj-buy__name">' + esc(m.name) + '</span>' +
          '<b class="pj-buy__amt">' + D.fmtNum(m.value, 2) + '</b>' +
          '<span class="pj-buy__pct">' + D.fmtNum(m.pct, 2) + '%</span></div>';
      }).join('') + '</div>' +
      '  </div>' +
      '  <div class="pj-buy__note">总采购金额增加云筑产值单数据纳入计算</div>' +
      '</div>' +
      '<div class="pj-info__grid">' + info.map(function (kv) {
        return '<div class="pj-info__item"><span class="pj-info__label">' + esc(kv[0]) + '：</span>' +
          '<span class="pj-info__value">' + esc(kv[1]) + '</span></div>';
      }).join('') + '</div>' +
      '</div>';
  }

  /* ---------- 项目核心指标带（截图：7 项 + 公司/全局均值对比） ---------- */
  const KPI_GLYPH = '<svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12.5V8M6.2 12.5V3.5M9.8 12.5V9.5M13.5 12.5V5.5"/></svg>';

  function projMetrics(p) {
    const i = Math.max(0, D.projects.indexOf(p));
    const rnd = D.seedRand(4200 + i * 17);
    const r = function (a, b) { return D.round(a + rnd() * (b - a), 2); };
    /* desc/src 供口径气泡使用（AC9）；未明确的口径标注"待确认"，不臆造。
       总采购金额已上移到页头「采购金额构成」面板，指标带剩 6 项 */
    return [
      { name: '集中采购率', value: r(0, 12), unit: '%', company: r(60, 88), global: r(55, 80),
        desc: '项目集中采购金额 ÷ 项目采购总金额 × 100%', src: '物资系统' },
      { name: '履约支付率', value: r(0, 4), unit: '%', company: r(58, 80), global: r(50, 70),
        desc: '按合同实际支付金额 ÷ 按合同应支付金额 × 100%', src: '物资系统 + 财务' },
      { name: '厂家直采率', value: r(55, 92), unit: '%', company: r(62, 86), global: r(48, 68),
        desc: '厂家直采金额 ÷ 采购总金额 × 100%', src: '物资系统' },
      { name: '资产周转率', value: r(0, 6), unit: '%', company: r(48, 68), global: r(44, 62),
        desc: '项目周转材料周转次数折算，口径待确认（Q-08）', src: '物管系统资产模块' },
      { name: '物资设备采购效益率', value: D.round(-520 + rnd() * 80, 2), unit: '%', company: r(9, 16), global: r(11, 19),
        desc: '物资设备采购效益额 ÷ 物资设备采购金额 × 100%（效益额口径待确认 Q-07）', src: '物资系统' },
      { name: '采购成本降低率', value: r(0, 5), unit: '%', company: r(5, 11), global: r(14, 24),
        desc: '采购成本降低额 ÷ 不含税标准成本金额 × 100%', src: '招采系统 + 物资系统' }
    ];
  }

  function metricStrip(p) {
    return '<div class="pj-metrics">' + projMetrics(p).map(function (m) {
      const avg = function (label, v) {
        return '<div class="pj-metric__avg"><span>' + esc(label) + '：</span>' +
          '<b>' + D.fmtNum(v, 2) + '</b> %</div>';
      };
      return '<div class="pj-metric" data-pj-metric="' + esc(m.name) + '">' +
        '<div class="pj-metric__head"><span class="pj-metric__icon">' + KPI_GLYPH + '</span>' +
        '<span class="pj-metric__name">' + esc(m.name) + '</span></div>' +
        '<div class="pj-metric__value">' + D.fmtNum(m.value, 2) + '<span>' + esc(m.unit) + '</span></div>' +
        (m.note ? '<div class="pj-metric__note">' + esc(m.note) + '</div>' : '') +
        (m.company != null ? avg('25年公司均值', m.company) + avg('25年全局均值', m.global) : '') +
        '</div>';
    }).join('') + '</div>';
  }

  /* ---------- 页签条（位于指标带下方，对齐截图） ---------- */
  function tabBar() {
    return '<div class="dsc-tabs project-cockpit-page__tab-bar" data-pj-tab>' + TABS.map(function (t) {
      return '<div class="dsc-tabs__item' + (PS.tab === t[0] ? ' dsc-tabs__item--active' : '') +
        '" data-tab="' + t[0] + '">' + esc(t[1]) + '</div>';
    }).join('') + '</div>';
  }

  /* ---------- 招采分析 ---------- */
  const PJ_FILTERS = {};   // listKey → { 字段名: 值 }
  const PJ_HINTS = {};     // listKey → 就地反馈
  const PJ_ROWS = {};      // listKey → 未过滤行（查询时算命中数）
  /* 筛选标签 → 行字段：列名对上时直接用列 key，对不上的在这里补别名 */
  const PJ_FIELD_ALIAS = {
    '月度需用计划号': 'planCode', '盘点单号': 'invCode', '处理方案编号': 'applyCode',
    '处理记录编号': 'applyCode', '分供商': 'name', '分供商名称': 'supplier', '供应商': 'supplier',
    '合同': 'contractCode', '合同单号': 'contractCode', '收货单号': 'receiveCode',
    '关联收货单号': 'receiveCode', '领料单号': 'pickCode', '对账单号': 'checkCode',
    '处理日期': 'date', '退货日期': 'date', '结算日期': 'date', '合同签订日期': 'date',
    '调拨申请时间': 'applyDate', '调拨完成时间': 'transferDate', '处置日期': 'disposeDate',
    '是否办理总结算': 'isFinalSettle', '其他采购属性': 'otherAttr', '达处置条件': 'condition',
    '局评价等级': 'grade', '保管人': 'keeperUser', '是否处置': 'disposed'
  };
  function pjRowKey(listKey, label) {
    const def = PJ_LISTS[listKey];
    const cols = def ? def.cols : [];
    const exact = cols.filter(function (c) { return c.name === label; })[0];
    if (exact) return exact.key;
    const near = cols.filter(function (c) {
      return c.name.indexOf(label) === 0 || label.indexOf(c.name) === 0;
    })[0];
    return near ? near.key : (PJ_FIELD_ALIAS[label] || '');
  }
  function pjMatchRow(row, conds, listKey) {
    return Object.keys(conds).every(function (label) {
      const want = String(conds[label]);
      const key = pjRowKey(listKey, label);
      if (key && row[key] != null) return String(row[key]).indexOf(want) >= 0;
      /* 预设日期区间（如 2026-01 ~ 2026-09）：匹配行内任意 ISO 日期字段 */
      const m = want.match(/^(\d{4}-\d{2})\s*~\s*(\d{4}-\d{2})$/);
      if (m) {
        return Object.keys(row).some(function (rk) {
          const rv = row[rk];
          return typeof rv === 'string' && /^\d{4}-\d{2}/.test(rv) &&
            rv.slice(0, 7) >= m[1] && rv.slice(0, 7) <= m[2];
        });
      }
      /* 未映射字段：退化为「任一字段包含」，不让条件被静默忽略 */
      return Object.keys(row).some(function (rk) {
        return row[rk] != null && String(row[rk]).indexOf(want) >= 0;
      });
    });
  }
  function pjFilterRows(listKey, rows) {
    const conds = PJ_FILTERS[listKey];
    if (!conds || !Object.keys(conds).length) return rows;
    return rows.filter(function (r) { return pjMatchRow(r, conds, listKey); });
  }
  /* 列表分页：每个列表独立页码 / 每页条数（Axure 各列表 10 条/页） */
  const PJ_PAGES = {};
  function pjPageOf(listKey) {
    if (!PJ_PAGES[listKey]) PJ_PAGES[listKey] = { page: 1, size: 10 };
    return PJ_PAGES[listKey];
  }
  function pjPageRows(listKey, rows) {
    const pg = pjPageOf(listKey);
    const pages = Math.max(1, Math.ceil(rows.length / pg.size));
    if (pg.page > pages) pg.page = pages;
    if (pg.page < 1) pg.page = 1;
    const start = (pg.page - 1) * pg.size;
    return { rows: rows.slice(start, start + pg.size), page: pg.page, size: pg.size,
      total: rows.length, start: start };
  }
  function pjPager(key, view) {
    return '<div data-pjf-pager="' + esc(key) + '">' +
      D.pager({ page: view.page, size: view.size, total: view.total }) + '</div>';
  }
  function pjFilterActions(listKey, adv, moreOpen) {
    const hint = PJ_HINTS[listKey] || '';
    return '<div class="ck-filter__foot">' +
      (adv ? '<span class="ck-link ck-link--adv' + (moreOpen ? ' ck-link--on' : '') + '" data-ck-adv>' +
        (moreOpen ? '收起' : '展开') + GRAIN_CARET + '</span>' : '') +
      '<span class="ck-filter__hint"' + (hint ? '' : ' hidden') + '>' + esc(hint) + '</span>' +
      '<span class="ck-filter__foot-right">' +
      '<button class="ck-btn ck-btn--primary" data-pjf-query="' + esc(listKey) + '">查询</button>' +
      '<button class="ck-link" data-pjf-clear="' + esc(listKey) + '">清空</button>' +
      '<button class="ck-link" data-pjf-reset="' + esc(listKey) + '">重置</button>' +
      '</span></div>';
  }
  /* 区块通用查询条件（Axure《项目驾驶舱》各列表上方的查询条件；展开后按钮统一在右下角） */
  function pjFilter(fields, more, adv, listKey) {
    /* 默认收起：与 Axure《项目驾驶舱》查询条件的「展开 / 收起」一致。
       adv === false 时不渲染更多条件与展开入口。已生效的条件若来自「更多」，
       重绘后保持展开，避免条件被藏起来。 */
    const cur = PJ_FILTERS[listKey] || {};
    const moreFields = more || [];
    const moreOpen = moreFields.some(function (f) { return !!cur[f[0]]; });
    return '<div class="ck-filter ck-filter--panel"' +
      (listKey ? ' data-pj-filter="' + esc(listKey) + '"' : '') + '>' +
      '<div class="ck-filter__row">' + fields.map(function (f) {
        return pjCkField(f[0], cur[f[0]] || '', f[1]);
      }).join('') + '</div>' +
      '<div class="ck-filter__more"' + (moreOpen ? '' : ' hidden') + '>' +
      moreFields.map(function (f) { return pjCkField(f[0], cur[f[0]] || '', f[1]); }).join('') + '</div>' +
      pjFilterActions(listKey, adv !== false, moreOpen) + '</div>';
  }

  /* 项目驾驶舱的数据边界：生成器是「全公司样本」，项目页只保留当前项目的数据。
     项目 / 二三级单位 / 库房 / 保管单位等组织字段统一改写为当前项目及其上级单位，
     其它二三级单位与其它项目不再出现在列表、排名或图表里。 */
  function pjScopeRows(rows, p) {
    const unit = p.subOrg || p.org;
    const city = p.city || '';
    const wh = function (v) { return String(v || '').split('·').pop() || '一号库'; };
    return (rows || []).map(function (r) {
      const o = Object.assign({}, r);
      if ('project' in o) o.project = p.name;
      if ('projectCode' in o) o.projectCode = p.code;
      if ('org2' in o) o.org2 = p.org;
      if ('org3' in o) o.org3 = unit;
      if ('org' in o && typeof o.org === 'string' && o.org.indexOf('|') >= 0) o.org = p.org + '|' + unit;
      if ('implOrg' in o) o.implOrg = unit;
      if ('pickUnit' in o) o.pickUnit = o.part ? o.part + '施工队' : unit;
      if ('level1' in o) o.level1 = p.org + '本级库';
      if ('sourceOrg' in o) o.sourceOrg = p.org;
      if ('keeper' in o) o.keeper = unit + '物资部';
      if ('owner' in o) o.owner = unit + '项目部';
      if ('belong' in o) o.belong = p.org;
      if ('location' in o) o.location = city + '·' + wh(o.location);
      /* 调拨：一方是本项目（三级），另一方是本项目所属二级单位；
         调出 / 调入方向跟随单据类型，不再出现其它公司的项目 */
      const isIn = o.transferType === '调入' || o.fromOrgType === '调入方';
      if ('outOrg' in o) o.outOrg = isIn ? p.org : unit;
      if ('inOrg' in o) o.inOrg = isIn ? unit : p.org;
      if ('outImpl' in o) o.outImpl = (isIn ? p.org : unit) + '物资部';
      if ('inImpl' in o) o.inImpl = (isIn ? unit : p.org) + '物资部';
      if ('outProject' in o) o.outProject = isIn ? '公司本部' : p.name;
      if ('inProject' in o) o.inProject = isIn ? p.name : '公司本部';
      return o;
    });
  }

  /* 筛选下拉同样按项目收口：单位 / 项目类条件只列当前项目及其所属单位，
     不再让用户选到其它单位 / 项目（即使选了也必然 0 条） */
  let PJ_SCOPE_PROJECT = null;
  function pjCkField(label, value, options) {
    const p = PJ_SCOPE_PROJECT;
    if (!p) return D.ckField(label, value, options);
    const unit = p.subOrg || p.org;
    let list = options || null;
    if (!list) {
      if (label === '实施单位' || label === '调出项目实施单位' || label === '调入项目实施单位') {
        list = [unit];
      } else if (label === '领用单位') {
        list = ['主体结构施工队', '基础工程施工队', '装饰装修施工队', '机电安装施工队', '室外工程施工队'];
      } else if (label === '一级库') {
        list = [p.org + '本级库'];
      } else if (label === '保管单位') {
        list = [unit + '物资部'];
      } else if (label === '调出公司' || label === '调入公司') {
        list = [p.org, unit];
      } else if (label === '调出项目' || label === '调入项目' || label === '项目名称') {
        list = [p.name];
      }
    }
    if (!list) return D.ckField(label, value, options);
    return '<div class="ck-filter__item"><span class="ck-filter__label">' + esc(label) + '</span>' +
      '<select class="ck-field ck-field--select" data-ck-field="' + esc(label) + '">' +
      '<option value="">请选择</option>' + list.map(function (o) {
        return '<option value="' + esc(o) + '"' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('') + '</select></div>';
  }

  /* 列表区块通用构件：查询条件（Axure 同一套「展开/收起」）→ 卡片头（标题 + 条数 + 设置列齿轮）→ 表格
     pjListBlock：只要区块本体（供一个 section 下挂多个列表）；pjList：区块 + 外层 section */
  function pjList(o) { return section(o.section || o.title, pjListBlock(o)); }
  function pjListBlock(o) {
    PJ_ROWS[o.key] = o.rows;
    const rows = pjFilterRows(o.key, o.rows);
    const view = pjPageRows(o.key, rows);
    const tableBody = D.table({
      cols: D.colsOf(o.key, PJ_LISTS[o.key].cols, PJ_LISTS[o.key].def),
      rows: view.rows.map(function (r, i) { return Object.assign({ idx: view.start + i + 1 }, r); }),
      maxHeight: o.height || 360,
      foot: pjPager(o.key, view)
    }) + (rows.length ? '' : '<div class="dsc-table__footnote">没有符合筛选条件的记录，请调整条件后重新查询</div>');
    const body = o.rank
      ? '<div class="pj-listsplit"><div class="pj-listsplit__main">' + tableBody + '</div>' +
        '<div class="pj-listsplit__rank">' +
        pjRankCard(o.rank.title, o.rank.rows, o.rank.unit, o.rank.digits) + '</div></div>'
      : tableBody;
    return pjFilter(o.fields, o.more, undefined, o.key) +
      '<div class="dsc-card' + (o.last ? '' : ' u-mb-lg') + '">' +
      '<div class="dsc-card__header"><div class="dsc-card__title">' + esc(o.title) + '</div>' +
      '<div class="dsc-card__extra">' + (o.tip ? esc(o.tip) : '') +
      D.colGear('data-pj-cols="' + o.key + '"', '设置列：' + o.title + '（Axure 列表字段选择）') +
      '</div></div>' + body + '</div>';
  }

  /* 物资计划：物料小类计划占比（Axure 图 + 小类汇总表） */
  const PJ_PLAN_MIX = [
    ['普通钢筋', 211.97, 78.5], ['普通混凝土', 285.00, 65.2], ['角钢', 68.74, 72.4],
    ['圆钢', 62.25, 69.8], ['三角钢', 151.97, 58.6], ['铝板材', 18.76, 81.2], ['铜线材', 78.32, 76.9]
  ];
  function pjAggTop(rows, valKey, n, nameKey) {
    const m = {};
    const nk = nameKey || 'name';
    rows.forEach(function (r) {
      const name = r[nk];
      if (!name) return;
      if (!m[name]) m[name] = { name: name, value: 0 };
      m[name].value += (r[valKey] || 0);
    });
    return Object.keys(m).map(function (k) { return m[k]; })
      .sort(function (a, b) { return b.value - a.value; }).slice(0, n || 10);
  }
  /* TOP 排名卡（物资 / 分供商页签共用） */
  function pjRankCard(title, rows, unit, digits) {
    return '<div class="pj-rank"><div class="pj-rank__title">' + esc(title) + '</div>' +
      rows.map(function (r, i) {
        return '<div class="pj-rank__row"><span class="pj-rank__no">' + (i + 1) + '</span>' +
          '<span class="pj-rank__name" title="' + esc(r.name) + '">' + esc(r.name) + '</span>' +
          '<b>' + D.fmtNum(r.value, digits == null ? 0 : digits) + '<i>' + esc(unit) + '</i></b></div>';
      }).join('') + '</div>';
  }
  const PJ_DOC_KINDS = {
    recon: { title: '领料关联对账单', hint: '由领料单发起的对账记录，对账后方可进入结算流程。',
      rows: function (c) { return [['对账单号', 'DZ' + c.slice(2)], ['关联领料单号', c], ['对账状态', '已对账'],
        ['对账日期', '2026-03-18'], ['对账人', '李彬 （800120）'], ['差异数量', '0']]; } },
    returnSettle: { title: '退货关联结算单', hint: '退货单冲减原结算单金额，退货数量与结算数量需一致。',
      rows: function (c) { return [['结算单号', 'JS' + c.slice(2)], ['关联退货单号', c], ['结算单状态', '已生效'],
        ['结算月份', '2026-03'], ['冲减金额', '—'], ['结算人', '孙倩 （800236）']]; } },
    pick: { title: '领料单', hint: '领料单由项目物资员在移动端发起，出库后自动回写库存。',
      rows: function (c) { return [['领料单号', c], ['领用单位', '一分公司'], ['一级库', '局本级库'],
        ['责任人', '李彬'], ['领用数量', '86.00'], ['验收数量', '85.14'], ['是否对账', '已对账']]; } },
    receive: { title: '收料单', hint: '收货过磅后生成收料单，作为结算的数量依据。',
      rows: function (c) { return [['收料单号', c], ['业务类型', '采购入库'], ['收料日期', '2026-03-06'],
        ['收料人', '张伟'], ['收料数量', '20 + 已入库'], ['质检结论', '合格']]; } },
    deliver: { title: '发货单', hint: '分供商发货后同步至平台，与收料单按订单编号关联。',
      rows: function (c) { return [['发货单号', c], ['订单编号', 'DD2026000019'], ['分供商', '渝丰科技股份有限公司'],
        ['发货日期', '2026-03-04'], ['车牌号', '皖A·8F216']]; } },
    accept: { title: '验收单', hint: '验收单记录进场验收的数量、质量与随行资料。',
      rows: function (c) { return [['验收单号', c], ['验收状态', '已验收'], ['验收日期', '2026-03-06'],
        ['验收结论', '合格'], ['验收人', '李彬'], ['资料附件', '材质证明 ×1、合格证 ×1']]; } },
    inv: { title: '盘点单', hint: '盘点方案下的盘点记录，盘盈盘亏写入库存调整单。',
      rows: function (c) { return [['盘点方案编号', c], ['盘点类型', '全盘'], ['盘点范围', '全部库房'],
        ['账面数量', '1,200.00'], ['实盘数量', '1,186.00'], ['盘亏数量', '14.00'], ['盘点状态', '已完成']]; } },
    transfer: { title: '调拨单', hint: '调出方发起 → 调入方验收，双方合计口径保持一致。',
      rows: function (c) { return [['调拨单号', c], ['调拨类型', '调出'], ['申请数量', '60.00'],
        ['调出发货数量', '58.80'], ['调入验收数量', '57.60'], ['发起单位类型', '三级单位'], ['调拨状态', '已完成']]; } },
    scrap: { title: '闲废物资处理单', hint: '经审批后的废旧物资方可销售或销毁。',
      rows: function (c) { return [['处理申请编号', c], ['废宝类型', '废钢筋'], ['处理方式', '销售'],
        ['处理数量', '12.00'], ['销售单价', '1,200.00'], ['收购方', '废宝回收有限公司'], ['处理人', '李彬']]; } },
    assetTransfer: { title: '资产调拨单', hint: '资产调拨同时结转原值、已摊折旧与净值。',
      rows: function (c) { return [['资产调拨单号', c], ['资产状态', '在用'], ['调出公司', '中国建筑第八工程局有限公司'],
        ['调入公司', '第四建设有限公司'], ['调拨总额（不含税）', '—'], ['调拨状态', '已完成']]; } },
    assetDispose: { title: '资产处置单', hint: '达到处置条件的资产（闲置 / 报废）方可发起处置审批。',
      rows: function (c) { return [['资产处置单号', c], ['达处置条件', '已达到'], ['处置数量', '—'],
        ['原值（万元）', '—'], ['净值（万元）', '—'], ['处置状态', '已处置']]; } },
    settle: { title: '结算单', hint: '结算单按结算周期汇总验收数量与金额，生效后进入付款流程。',
      rows: function (c) { return [['结算单号', c], ['结算单状态', '已生效'], ['结算月份', '2026-03'],
        ['结算周期', '月结30天'], ['结算明细类型', '正常结算'], ['含税金额', '—'], ['结算人', '孙倩 （800236）']]; } },
    order: { title: '采购订单', hint: '订单由采购计划或需用计划生成，是下单比例指标的取数来源。',
      rows: function (c) { return [['订单编号', c], ['合同编号', 'HT-2025000013'], ['下单日期', '2026-03-02'],
        ['供应商', '渝丰科技股份有限公司'], ['订单金额（万元）', '—'], ['订单状态', '已生效']]; } },
    contract: { title: '采购合同', hint: '合同明细可在「采购页签 › 合同分析」查看全量字段。',
      rows: function (c) { return [['合同编号', c], ['合同状态', '已生效'], ['合同签订日期', '2026-02-26'],
        ['乙方', '渝丰科技股份有限公司'], ['合同金额（万元）', '—'], ['合同承办部门', '物资管理部']]; } },
    asset: { title: '资产单据', hint: '在用 / 闲置 / 报废 / 维保 四状态明细，只读。',
      rows: function (c) { return [['资产编码', c], ['当前状态', '在用'], ['验收状态', '已验收'],
        ['盘点状态', '已盘点'], ['是否调拨', '否'], ['是否处置', '否']]; } }
  };
  function pjDocModal(kind, code) {
    const d = PJ_DOC_KINDS[kind] || PJ_DOC_KINDS.asset;
    D.modal({
      cls: 'dsc-drill-dialog', title: d.title + ' · ' + code, width: 720,
      body: '<div class="dsc-note dsc-note--info u-mb-md">' + esc(d.hint) + '</div>' +
        '<table class="dsc-table"><tbody>' + d.rows(code).map(function (kv) {
          return '<tr><td class="u-muted" style="width:170px">' + esc(kv[0]) + '</td><td>' + esc(kv[1]) + '</td></tr>';
        }).join('') + '</tbody></table>',
      buttons: [{ text: '关闭', cls: '', act: 'cancel' }]
    });
  }

  /* 「列表字段选择」注册表：齿轮 → 该表的字段全集与默认列（Axure 面板逐状态对应） */
  /* 各页签模块把自己的列表字段注册进来（view-project-*.js） */
  D.projectLists = D.projectLists || {};
  const PJ_LISTS = D.projectLists;

  const PJ_ASSET_MIX = [
    { name: '管材', value: 55.04, color: '#4285F4' },
    { name: '电线电缆', value: 34.97, color: '#1F4E79' },
    { name: '电气线路敷设材料', value: 4.50, color: '#34A853' },
    { name: '零星材料', value: 3.34, color: '#FB923C' },
    { name: '光源、灯具、开关', value: 2.15, color: '#EA4335' }
  ];
  /* ---------- 跨页签共享：页签模块从这里取渲染原语 ---------- */
  D.projectTabs = {};
  D.projectShared = {
    PS: PS,
    P_COL: P_COL, P_NUM: P_NUM, P_DOC: P_DOC,
    section: section, subHead: subHead, stat: stat,
    sel: sel, dateInputs: dateInputs, GRAIN_CARET: GRAIN_CARET, projMetrics: projMetrics,
    pjFilter: pjFilter, pjListBlock: pjListBlock, pjPager: pjPager,
    pjScopeRows: pjScopeRows, pjFilterRows: pjFilterRows, pjPageRows: pjPageRows,
    pjAggTop: pjAggTop, pjRankCard: pjRankCard,
    PJ_FILTERS: PJ_FILTERS, PJ_HINTS: PJ_HINTS, PJ_ROWS: PJ_ROWS,
    PJ_PLAN_MIX: PJ_PLAN_MIX, PJ_ASSET_MIX: PJ_ASSET_MIX
  };

  /* ============================================================
     页面
     ============================================================ */
  D.pages.project = function (q) {
    const p = curProject(q);
    PJ_SCOPE_PROJECT = p;
    PS.project = p.name;
    PS.__q = q || {};
    const body = PS.tab === 'material' ? D.projectTabs.material(p)
      : PS.tab === 'supplier' ? D.projectTabs.supplier(p)
        : PS.tab === 'asset' ? D.projectTabs.asset(p) : D.projectTabs.purchase(p);
    return '<div class="dsc-page project-cockpit-page">' +
      projectBar(p) +
      (D.scope.level === 1 ? '' : '<div class="dsc-note dsc-note--warn u-mb-lg">已按组织权限过滤（R1/R2）：' +
        '项目选择器仅列出权限内项目；项目级汇总与明细同样受权限约束。</div>') +
      projectInfo(p) +
      metricStrip(p) +
      tabBar() +
      '<div class="pj-tabbody">' +
      (body || D.projectTabs.purchase(p)) +
      '</div>' +
      '</div>';
  };

  /* ============================================================
     渲染后绑定
     ============================================================ */
  D.pages.project.after = function (root, q) {
    const p = curProject(q || {});
    const page = root.querySelector('.project-cockpit-page');
    if (!page) return;

    const sel = root.querySelector('[data-pj-picker]');
    if (sel) sel.addEventListener('change', function () { PS.contractPage = 1; D.nav('project', { project: sel.value }); });

    /* 各区块查询条件：复用看板同一套交互（查询 / 清空 / 重置 / 展开 + 就地条件反馈） */
    if (D.ckCommonAfter) D.ckCommonAfter(root);

    /* 合同明细分析分页（D.bindPager 统一走全局 __pagerCb） */
    D.__pagerCb = function (o) {
      const next = o.page || PS.contractPage;
      if (next === PS.contractPage) return;
      PS.contractPage = next;
      D.toast('合同明细已切换到第 ' + next + ' 页');
      D.render();
    };

    /* 采购金额构成：五类占比环图（替代原项目定位地图） */
    const buyPie = root.querySelector('#pjBuyPie');
    if (buyPie) {
      D.pieChart(buyPie, pjBuyMix(p), {
        height: 170, hole: 0.55, labels: false, cx: 0.5, digits: 2, unit: '万元'
      });
    }
    /* 总采购金额口径气泡：保留原指标卡上的定义 / 来源说明 */
    const buyTotal = root.querySelector('.pj-buy__total');
    if (buyTotal) {
      D.metricTip(buyTotal, {
        name: '总采购金额', unit: '万元',
        desc: '项目全周期采购金额合计（含云筑产值单纳入部分）',
        src: '物资系统 + 招采系统'
      });
    }

    /* 指标卡口径气泡（AC9）：hover 或点击指标卡显示定义 / 口径 / 来源 */
    const defs = {};
    projMetrics(p).forEach(function (m) { defs[m.name] = m; });
    root.querySelectorAll('[data-pj-metric]').forEach(function (el) {
      const m = defs[el.getAttribute('data-pj-metric')];
      if (m && m.desc) D.metricTip(el, m);
    });

    /* 指标卡点击 → 下钻提示（PRD F3：项目级指标只读展示） */
    D.delegate(root, [
      { sel: '[data-pj-metric]', fn: function (el) {
        D.toast(el.getAttribute('data-pj-metric') + '：项目级指标由后台计算，本平台只读展示');
      } },
      { sel: '[data-pj-grain]', fn: function (el) {
        const next = { '日': '月', '月': '季', '季': '年', '年': '日' };
        const nv = next[el.textContent.trim()] || '日';
        el.innerHTML = nv + GRAIN_CARET;
        D.toast('招标开始日期粒度切换为「' + nv + '」');
      } },
      { sel: '[data-pj-query]', fn: function () {
        D.toast('查询完成：' + D.defaultRange[0] + ' 至 ' + D.defaultRange[1]);
      } },
      { sel: '[data-pj-clear]', fn: function () {
        root.querySelectorAll('.ck-filter .ck-field--date').forEach(function (el) { el.textContent = '　~　'; });
        D.toast('已清空查询条件');
      } },
      { sel: '[data-pj-reset]', fn: function () { D.toast('已重置查询条件'); D.render(); } }
    ]);

    ['pjPlanStatus', 'pjPlanMat'].forEach(function (id, idx) {
      const el = root.querySelector('#' + id);
      if (!el) return;
      if (idx === 0) {
        D.donutChart(el, D.projectShared.STATUS_DIST.filter(function (s) { return s[1] > 0; }).map(function (s, i) {
          return { key: s[0], name: s[0], value: s[1], color: D.PALETTE[i % D.PALETTE.length] };
        }), { height: 200, hole: 0.6, centerText: '计划条目', centerValue: '17', legend: true });
      } else {
        const rows = D.material.mid.map(function (m, i) { return { name: m, value: D.round(45.16 - i * 5.2, 2) }; });
        D.barChart(el, {
          categories: rows.map(function (r) { return r.name; }),
          series: [{ name: '采购计划金额(万元)', data: rows.map(function (r) { return r.value; }), color: '#008EE0' }]
        }, { height: 200, unit: ' 万元', yDigits: 0 });
      }
    });

    /* 资产周转情况：物料类别占用原值构成（环图，替代原 5 类别等差柱线图） */
    const am = root.querySelector('#pjAssetMix');
    if (am) {
      D.pieChart(am, PJ_ASSET_MIX, {
        height: 220, hole: 0.55, labels: false, cx: 0.5, digits: 2, unit: '%'
      });
    }

    [['pjBig', 1], ['pjMid', 2], ['pjSmall', 3]].forEach(function (pair) {
      const el = root.querySelector('#' + pair[0]);
      if (!el) return;
      const rows = D.projectShared.pjFulfillMix(pair[1]);
      D.hbarChart(el, rows.map(function (r) { return { name: r.name, value: r.amt }; }),
        { rowH: 22, padL: 96, padR: 58, unit: ' 万元', digits: 0, nameMax: 9 });
    });

    /* 物资计划：物料小类计划占比（金额，万元） */
    const planMixEl = root.querySelector('#pjPlanMix');
    if (planMixEl) {
      D.barChart(planMixEl, {
        categories: PJ_PLAN_MIX.map(function (x) { return x[0]; }),
        series: [{ name: '计划金额', data: PJ_PLAN_MIX.map(function (x) { return x[1]; }), color: '#0093E5' }]
      }, { height: 240, yDigits: 0, yUnit: '万元', dataLabels: true, labelDigits: 0, rotateX: 24, padB: 64 });
    }
    /* 物资验收：按物料大类的验收单数量 */
    const accDist = root.querySelector('#pjAcceptDist');
    if (accDist) {
      const dist = D.projectShared.pjAcceptDist();
      D.barChart(accDist, {
        categories: dist.map(function (x) { return x.name; }),
        series: [{ name: '验收单数量', data: dist.map(function (x) { return x.value; }), color: '#0093E5' }]
      }, { height: 220, yDigits: 0, yUnit: '笔', dataLabels: true, labelDigits: 0, rotateX: 24, padB: 64 });
    }
    /* 物资使用：物料中类 / 小类领用金额（横向条形） */
    [['pjPickMid', 'matMid'], ['pjPickSmall', 'matSmall']].forEach(function (pair) {
      const el = root.querySelector('#' + pair[0]);
      if (!el) return;
      const rows = D.projectShared.pjPickDist(pair[1]);
      D.hbarChart(el, rows.map(function (r) { return { name: r.name, value: r.value }; }),
        { rowH: 22, padL: 100, padR: 60, unit: ' 万元', digits: 0, nameMax: 10 });
    });

    /* 分供商页签：履约分布（按分供商分类） */
    const supDist = root.querySelector('#pjSupDist');
    if (supDist) {
      const dist = PS.supDist || [];
      D.barChart(supDist, {
        categories: dist.map(function (x) { return x.name; }),
        series: [{ name: '履约额', data: dist.map(function (x) { return x.value; }), color: '#0093E5' }]
      }, { height: 220, yDigits: 0, yUnit: '万元', dataLabels: false });
    }

    /* 各列表分页：独立页码 / 每页条数 */
    root.querySelectorAll('[data-pjf-pager]').forEach(function (box) {
      const key = box.getAttribute('data-pjf-pager');
      D.bindPager(box, function (o) {
        const pg = pjPageOf(key);
        if (o.size) { pg.size = o.size; pg.page = 1; } else { pg.page = o.page; }
        D.render();
      });
    });

    page.addEventListener('click', function (e) {
      const t = e.target;
      const tabEl = t.closest('[data-tab]');
      if (tabEl) {
        PS.tab = tabEl.getAttribute('data-tab'); PS.contractPage = 1;
        D.render();
        /* P1-3：页签条吸顶后，切换时把内容顶到页签条正下方 ——
           页头（地图 + 信息栅格 + 7 指标带）很高，否则切完还要手动滚一屏才看得到内容 */
        const body = document.querySelector('.pj-tabbody');
        const bar = document.querySelector('.project-cockpit-page__tab-bar');
        if (body && bar) {
          const stickyTop = parseFloat(getComputedStyle(bar).top) || 96;
          const top = body.getBoundingClientRect().top + window.scrollY -
            (stickyTop + bar.getBoundingClientRect().height + 8);
          window.scrollTo(0, Math.max(0, Math.round(top)));
        }
        return;
      }
      const pk = t.closest('[data-pk]');
      if (pk) { PS.planKind = pk.getAttribute('data-pk'); pjPageOf('pj-plan').page = 1; D.render(); return; }
      /* 资产调拨 / 资产处置：同一区块内切换一张表（Axure 是页签 + 宽表） */
      const pdoc = t.closest('[data-pdoc]');
      if (pdoc) {
        PS.assetDoc = pdoc.getAttribute('data-pdoc');
        pjPageOf('pj-atrans').page = 1; pjPageOf('pj-adisp').page = 1;
        D.render(); return;
      }
      /* 各列表的查询：只过滤本列表，命中数写回卡片与就地反馈（P0-2） */
      const fq = t.closest('[data-pjf-query]');
      if (fq) {
        const key = fq.getAttribute('data-pjf-query');
        const box = fq.closest('.ck-filter');
        if (box && key) {
          const conds = {};
          box.querySelectorAll('[data-ck-field]').forEach(function (f) {
            const v = (f.value || '').trim();
            if (v) conds[f.getAttribute('data-ck-field')] = v;
          });
          PJ_FILTERS[key] = conds;
          pjPageOf(key).page = 1;
          const n = Object.keys(conds).length;
          const total = (PJ_ROWS[key] || []).length;
          const hits = pjFilterRows(key, PJ_ROWS[key] || []).length;
          PJ_HINTS[key] = n ? '已按 ' + n + ' 个条件筛选 · 命中 ' + hits + ' 条' : '';
          D.render();
          D.toast(n ? '已按 ' + n + ' 个条件筛选，命中 ' + hits + ' 条' : '未设置筛选条件，显示全部 ' + total + ' 条');
        }
        return;
      }
      const fcl = t.closest('[data-pjf-clear]');
      if (fcl) {
        const key = fcl.getAttribute('data-pjf-clear');
        PJ_FILTERS[key] = {}; PJ_HINTS[key] = ''; pjPageOf(key).page = 1;
        D.render(); D.toast('已清空筛选条件');
        return;
      }
      const frs = t.closest('[data-pjf-reset]');
      if (frs) {
        const key = frs.getAttribute('data-pjf-reset');
        PJ_FILTERS[key] = {}; PJ_HINTS[key] = ''; pjPageOf(key).page = 1;
        D.render(); D.toast('已重置为默认条件');
        return;
      }
      if (t.closest('[data-pj-query]')) { D.toast('查询完成（' + D.defaultRange[0] + ' 至 ' + D.defaultRange[1] + '）'); return; }
      if (t.closest('[data-pj-reset]')) { PS.planKind = 'month'; PS.matBig = PS.matMid = PS.matSmall = ''; D.toast('已重置查询条件'); D.render(); return; }
      if (t.closest('[data-pj-export]')) { D.toast('导出任务已提交'); return; }
      const cfg = t.closest('[data-pj-columns]');
      if (cfg) {
        /* 设置列：真正改变表格字段（原先只弹提示不改表） */
        const groups = D.projectShared.PJ_CONTRACT_GROUPS();
        D.openColPicker({ key: 'pj-contract', title: '合同明细分析',
          all: groups[0].items.concat(groups[1].items), def: D.projectShared.PJ_CONTRACT_DEF, groups: groups, after: D.render });
        return;
      }
      /* 各列表右上角齿轮：按 Axure 的「列表字段选择」面板给出该表字段 */
      const pjCols = t.closest('[data-pj-cols]');
      if (pjCols) {
        const key = pjCols.getAttribute('data-pj-cols');
        const m = PJ_LISTS[key];
        if (!m) return;
        D.openColPicker({ key: key, title: m.title,
          all: m.cols.filter(function (c) { return c.key !== 'idx'; }), def: m.def, after: D.render });
        return;
      }
      /* 关联单据弹窗（领料↔对账单 / 退货↔结算 / 验收 / 盘点 / 调拨 / 处置 / 结算 / 订单 / 合同） */
      const doc = t.closest('[data-pj-doc]');
      if (doc) {
        const pr = doc.getAttribute('data-pj-doc').split('|');
        pjDocModal(pr[0], pr[1]);
        return;
      }
      const link = t.closest('.dsc-table__link');
      if (link) {
        if (link.hasAttribute('data-plan-ref')) { D.toast('关联订单：本计划单已引用采购订单'); return; }
        if (link.hasAttribute('data-asset-doc')) {
          const code = link.getAttribute('data-asset-doc');
          D.modal({
            cls: 'dsc-drill-dialog', title: '资产单据 · ' + code, width: 720,
            body: '<div class="dsc-note dsc-note--info u-mb-md">资产四状态（在用 / 闲置 / 报废 / 维保）明细，只读。</div>' +
              '<table class="dsc-table"><tbody>' +
              [['资产编号', code], ['当前状态', '在用'], ['保管单位', p.subOrg || p.org],
                ['验收状态', '已验收'], ['盘点状态', '已盘点']].map(function (kv) {
                return '<tr><td class="u-muted" style="width:130px">' + kv[0] + '</td><td>' + esc(kv[1]) + '</td></tr>';
              }).join('') + '</tbody></table>',
            buttons: [{ text: '关闭', cls: '', act: 'cancel' }]
          });
          return;
        }
        D.toast('打开单据详情：' + (link.getAttribute('data-link') || link.textContent));
      }
    });
  };
})(window.APP);
