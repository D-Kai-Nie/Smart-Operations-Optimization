/* ============================================================
   F2 局驾驶舱
   版式基准：工作目录内两张页面截图（1912px 设计稿）
     view=overview 「局级驾驶舱」  采购金额 → 采购物资 → 采购榜单
     view=metrics  「指标总览-采购」 8 指标卡 → 筛选 → 页签+趋势 → 二级单位表 → 招采分析
   交互基准：Axure 导出稿（页签互斥、四视图联动、下钻、列设置、轮播）
   ============================================================ */
(function (D) {
  'use strict';
  const esc = D.esc;
  const R = D.round;

  /* ============================================================
     视图状态
     ============================================================ */
  /* 局驾驶舱各图表的图例熄灭状态（key → { 系列下标: true }）：
     in = 物资进场数据，lv0/lv1/lv2 = 全局 / 二级 / 三级单位物资分析 */
  const CS_LEGEND = { in: {}, lv0: {}, lv1: {}, lv2: {} };
  /* 只把「未熄灭」的系列交给图表 */
  function ckLegendOn(key, series) {
    const off = CS_LEGEND[key] || {};
    return series.filter(function (se, i) { return !off[i]; });
  }
  /* 图例项：可点亮 / 熄灭 */
  function ckLegendItem(key, i, swatch, text) {
    return '<span data-ck-legend="' + key + '|' + i + '"' +
      ((CS_LEGEND[key] || {})[i] ? ' class="is-off"' : '') +
      ' title="点击点亮 / 熄灭该系列">' + swatch + esc(text) + '</span>';
  }
  const CS = {
    view: 'overview',          // overview | metrics
    metric: 'costDown',        // 指标总览当前页签
    settleGrain: '日',         // 结算日期粒度
    inGrain: '日',             // 招标开始日期粒度
    matSmall: '普通钢筋',      // 物资小类
    boardTab: 'project',
    advanced: false,
    sortKey: '', sortDir: 'asc'
  };
  D.cockpitState = CS;

  /* ============================================================
     指标定义（指标总览-采购，截图实测文案与数值）
     ============================================================ */
  /* 每个指标附口径气泡（AC9：指标定义 / 统计口径 / 数据来源）；
     口径按 PRD BR-3 与 §7 数据来源填写，未明确的一律标注"待确认"，不臆造规则 */
  const METRICS = [
    { key: 'costDown', name: '采购成本降低率', value: 8.2, unit: '%', dec: 2, disp: '8.2',
      desc: '采购成本降低额 ÷ 不含税标准成本金额 × 100%', src: '招采系统 + 物资系统' },
    { key: 'benefit', name: '物资设备采购效益率', value: 15.61, unit: '%', dec: 2,
      desc: '物资设备采购效益额 ÷ 物资设备采购金额 × 100%（效益额口径待确认 Q-07）', src: '物资系统' },
    { key: 'central', name: '物资设备集中采购率', value: 84.46, unit: '%', dec: 2,
      desc: '物资设备集中采购金额 ÷ 物资设备采购总金额 × 100%', src: '物资系统' },
    { key: 'subCentral', name: '分包集中采购率', value: 27.44, unit: '%', dec: 2,
      desc: '分包集中采购金额 ÷ 分包采购总金额 × 100%', src: '招采系统' },
    { key: 'direct', name: '厂家直采总占比', value: 56.68, unit: '%', dec: 2,
      desc: '厂家直采金额 ÷ 采购总金额 × 100%', src: '物资系统' },
    { key: 'plan', name: '采购计划执行率', value: 93.18, unit: '%', dec: 2,
      desc: '已执行采购计划数 ÷ 采购计划总数 × 100%', src: '物资系统' },
    { key: 'leadTime', name: '采购时效', value: 24.8, unit: '天', dec: 1,
      desc: '招标开始至定标平均天数，按自然日均值', src: '招采系统' },
    { key: 'save', name: '降本金额占比', value: 9.25, unit: '%', dec: 2,
      desc: '六项降本合计金额 ÷ 产值 × 100%（产值取数口径见 PRD Q-06）', src: '物资系统 + 财务' }
  ];
  function metricDef(key) {
    return METRICS.filter(function (m) { return m.key === key; })[0] || METRICS[0];
  }

  /* 趋势序列（截图实测 X 轴 2026年01月—09月） */
  const TREND = {
    costDown: [6.55, 7.68, 7.13, 7.48, 9.51, -17.39, 10.71, 16.23, 11.73],
    benefit: [12.4, 13.8, 14.2, 15.1, 15.9, 12.6, 16.4, 17.8, 15.61],
    central: [79.2, 80.4, 81.6, 82.8, 83.5, 78.9, 84.1, 85.2, 84.46],
    subCentral: [22.1, 23.4, 24.6, 25.2, 26.1, 21.8, 26.9, 28.1, 27.44],
    direct: [48.2, 50.1, 51.6, 52.8, 54.2, 49.6, 55.4, 57.2, 56.68],
    plan: [86.4, 88.2, 89.6, 90.4, 91.2, 87.5, 92.1, 93.4, 93.18],
    leadTime: [28.6, 28.2, 27.8, 27.1, 26.4, 28.9, 25.6, 25.1, 24.8],
    save: [6.2, 6.8, 7.1, 7.6, 8.2, 5.9, 8.6, 9.5, 9.25]
  };
  const MONTHS = ['2026年01月', '2026年02月', '2026年03月', '2026年04月', '2026年05月',
    '2026年06月', '2026年07月', '2026年08月', '2026年09月'];

  /* ============================================================
     通用片段
     ============================================================ */
  function section(title, body, extra) {
    return '<section class="ck-sec">' +
      '<div class="ck-sec__head"><h2 class="ck-sec__title">' + esc(title) + '</h2>' +
      (extra || '') +
      '<button class="ck-sec__collapse" data-ck-collapse title="收起 / 展开">' + CARET + '</button>' +
      '</div>' +
      '<div class="ck-sec__body">' + body + '</div></section>';
  }
  function subHead(title, extra) {
    return '<div class="ck-subhead"><span class="ck-subhead__title">' + esc(title) + '</span>' +
      (extra ? '<span class="ck-subhead__extra">' + extra + '</span>' : '') + '</div>';
  }
  const CARET = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 6.5l4 4 4-4"/></svg>';

  /* 筛选字段候选值：按字段名给出可选项，供真下拉使用 */
  function optList(label) {
    switch (label) {
      case '二级单位': case '组织':
        return D.orgs.map(function (o) { return o.name; });
      case '三级单位':
        return D.subOrgs.map(function (o) { return o.name; });
      case '实施单位':
        return ['中国建筑第八工程局有限公司'].concat(D.orgs.map(function (o) { return o.name; }));
      case '项目类型': return D.TYPES;
      case '项目业态': return D.FORMATS;
      case '项目状态': return D.STATUS;
      case '承包模式': return D.MODES;
      case '地区': return D.AREAS;
      case '省': return Object.keys(D.CITY_PROVINCE).map(function (c) { return D.CITY_PROVINCE[c]; })
        .filter(function (v, i, a) { return a.indexOf(v) === i; });
      case '市': return Object.keys(D.CITY_PROVINCE);
      case '物料分类': return D.material.mid;
      case '物料小类': return D.material.small;
      case '采购类别': return ['物资类', '分包类', '服务类', '租赁类'];
      case '采购方式': return ['公开招标', '邀请招标', '竞争性谈判', '单一来源', '询价'];
      case '采购模式': return ['集中采购', '分散采购', '厂家直采'];
      case '统计月份': return ['2026-01', '2026-02', '2026-03', '2026-04'];
      /* 项目驾驶舱各列表的查询条件（Axure《项目驾驶舱》筛选条） */
      case '计划月份': case '结算月份': return D.months12;
      case '物料大类': return D.material.big;
      case '物料中类': return D.material.mid;
      case '物料编码': return ['WL100000', 'WL100137', 'WL100274', 'WL100411'];
      case '分供商': case '分供商名称': return D.suppliers.slice(0, 30).map(function (s) { return s.name; });
      case '分供商分类': return D.supplierCats;
      case '领用单位': case '保管单位': return ['一分公司', '二分公司', '安装分公司', '装饰分公司', '第一分公司'];
      case '一级库': return ['局本级库', '一公司本级库', '二公司本级库', '三级单位本级库'];
      case '编制人': case '责任人': case '使用人': return ['李彬', '孙倩', '周磊', '吴迪', '王建国'];
      case '结算周期': return ['月结30天', '月结60天', '季度结算', '节点结算'];
      case '结算明细类型': return D.detailTypes;
      case '是否对账': return ['已对账', '未对账'];
      case '资产状态': return ['在用', '闲置', '报废', '维保'];
      case '资产属性': return ['自有', '租赁', '调拨'];
      case '资产类别': return ['项目固定资产', '项目非固定资产'];
      case '存放地点': return ['现场', '库房', '临建区', '加工区'];
      case '是否验收': case '是否盘点': case '是否调拨': case '是否处置':
        return ['是', '否'];
      case '本级库': return ['局本级库', '二级单位本级库', '三级单位本级库'];
      case '合作年限': return ['1年以内', '1-3年', '3-5年', '5年以上'];
      /* Axure《项目驾驶舱》各列表筛选条（物资 / 资产页签） */
      case '供应商': case '收购方': return D.suppliers.slice(0, 30).map(function (x) { return x.name; });
      case '退货类型': return ['质量退货', '规格退货', '多发货退货', '项目变更退货'];
      case '调拨类型': return ['调入', '调出'];
      case '调出公司': case '调入公司': return D.orgs.map(function (x) { return x.name; });
      case '调出项目实施单位': case '调入项目实施单位':
        return D.subOrgs.slice(0, 20).map(function (x) { return x.name; });
      case '调出项目': case '调入项目': return D.projects.slice(0, 30).map(function (x) { return x.name; });
      case '项目名称': return D.projects.slice(0, 30).map(function (x) { return x.name; });
      case '处理方式': return ['销售', '销毁'];
      case '废宝类型': return ['废钢筋', '废木材', '其他废料'];
      case '处理人': return ['李彬', '王建国', '张伟'];
      case '盘点类型': return ['全盘', '半明盘', '暗盘'];
      case '盘点范围': case '库房名称':
        return ['全部库房', '现场料场', '周转材料库', '一号库', '二号库'];
      case '是否结算': case '是否生成日常计划': case '是否办理总结算': return ['是', '否'];
      case '结算单状态': return ['待提交', '审批中', '已生效', '已作废'];
      case '业务类型': return ['采购入库', '调拨入库', '退料入库'];
      case '其他采购属性': return ['甲供', '甲控', '乙供'];
      case '使用部位': return ['主体结构', '基础工程', '装饰装修', '机电安装', '室外工程'];
      case '计划使用部位': return ['房建施工板块', '基础设施板块', '安装板块', '装饰装修板块'];
      case '达处置条件': return ['已达到', '未达到'];
      case '降本金额正负': return ['全部', '正数', '负数'];
      case '处理日期': case '调拨申请时间': case '调拨完成时间': case '处置日期':
        return ['2026-01 ~ 2026-09', '2026-01 ~ 2026-03', '2026-04 ~ 2026-06', '2026-07 ~ 2026-09'];
      case '降本类型': return ['结算降本', '消耗降本', '资产降本', '验收降本', '周转降本', '闲废降本'];
      default: return null;
    }
  }

  /* 字段级口径提示（源图有 ⓘ 的字段在这里补回来） */
  const FIELD_TIP = {
    '本级库': { name: '本级库', desc: '当前组织层级自有的分供商库。选「局本级库」只看局总部直接管理的那部分，用于区分"本级自有"与"下级汇总"。', src: '采购管理系统分供商模块' },
    '合作年限': { name: '合作年限', desc: '按首次合作日期至今的整年数分档；未满 1 年计入「1年以内」。', src: '采购管理系统分供商模块' }
  };

  /* 筛选字段：有候选值 → 真下拉；无候选值（项目名称/结算单）→ 真输入框。
     早先是静态 span，点不动，与数据报表页的真控件行为不一致 */
  function field(label, value) {
    const list = optList(label);
    const info = FIELD_TIP[label]
      ? '<i class="ck-info" data-ck-info="' + esc(label) + '" title="点击查看口径说明">i</i>' : '';
    if (!list) {
      return '<div class="ck-filter__item"><span class="ck-filter__label">' + esc(label) + info + '</span>' +
        '<input class="ck-field ck-field--input" type="text" data-ck-field="' + esc(label) +
        '" placeholder="请输入" value="' + esc(value || '') + '"/></div>';
    }
    return '<div class="ck-filter__item"><span class="ck-filter__label">' + esc(label) + info + '</span>' +
      '<select class="ck-field ck-field--select" data-ck-field="' + esc(label) + '">' +
      '<option value="">请选择</option>' + list.map(function (o) {
        return '<option value="' + esc(o) + '"' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('') + '</select></div>';
  }
  function dateRange(v) {
    return '<div class="ck-filter__item"><span class="ck-filter__label">结算日期-范围</span>' +
      '<span class="ck-field ck-field--date">' + esc(v[0]) + ' ~ ' + esc(v[1]) + '</span></div>';
  }
  D.ckField = field;   // 供项目驾驶舱等页面复用同一套筛选字段
  D.ckActions = actions;   // 供合规看板等页面复用同一套筛选条底栏（展开 + 查询/清空/重置）
  /* 底栏：展开（左，与 Axure 筛选条一致）+ 条件反馈 + 查询/清空/重置（右下角）。
     此前按钮塞在最后一行字段中间，展开后还会被「更多条件」挤开，操作位不固定。
     adv：true → 展开/收起开关（data-ck-adv）；{ attr, label } → 自定义属性与文案 */
  function actions(adv) {
    const a = adv === true ? { attr: 'data-ck-adv', label: '展开' } : (adv || null);
    return '<div class="ck-filter__foot">' +
      (a && a.attr ? '<span class="ck-link ck-link--adv" ' + a.attr + '>' + (a.label || '展开') + CARET + '</span>' : '') +
      '<span class="ck-filter__hint" hidden></span>' +
      '<span class="ck-filter__foot-right">' +
      '<button class="ck-btn ck-btn--primary" data-ck-query>查询</button>' +
      '<button class="ck-link" data-ck-clear>清空</button>' +
      '<button class="ck-link" data-ck-reset>重置</button>' +
      '</span></div>';
  }
  /* 带状态的「展开 / 收起」入口：重绘后文案必须与 CS.advanced 的实际显隐一致，
     否则会出现「文案=展开 但更多条件已铺开」的状态分叉 */
  function advActions() { return actions({ attr: 'data-ck-adv', label: CS.advanced ? '收起' : '展开' }); }
  /* 读取筛选条里所有真控件的取值 */
  function readConds(box) {
    const out = [];
    box.querySelectorAll('[data-ck-field]').forEach(function (el) {
      const v = (el.value || '').trim();
      if (v) out.push(el.getAttribute('data-ck-field') + '：' + v);
    });
    return out;
  }
  /* 就地反馈：把生效条件写在操作区左侧（toast 会飘走，且离操作点远） */
  function showConds(el, conds) {
    const box = el.closest('.ck-filter');
    const hint = box && box.querySelector('.ck-filter__hint');
    if (!hint) return;
    /* P1-1：看板是汇总口径，条件不改变结果集 —— 反馈文案不能写「已按 N 个条件查询」，
       否则点两次就能看出筛选没生效（数据报表页是真过滤，那里会写「命中 M 条」） */
    hint.textContent = conds.length ? '已记录 ' + conds.length + ' 个筛选条件（看板为汇总视图，明细不随条件变化）'
      : '未设置筛选条件，显示全部';
    hint.hidden = false;
  }

  /* ============================================================
     视图一：局级驾驶舱
     ============================================================ */
  const SETTLE_MIX = [
    { name: '专业分包结算', value: 657.88, color: '#4285F4' },
    { name: '物资结算', value: 418.62, color: '#1F4E79' },
    { name: '劳务分包结算', value: 384.91, color: '#34A853' },
    { name: '设备结算', value: 47.66, color: '#FB923C' },
    { name: '专业服务结算', value: 20.24, color: '#EA4335' }
  ];

  const BIG_KPI = [
    { icon: '年', label: '本年度采购金额', value: '1,424.02', unit: '亿元', sub: '上年度　818.84　亿元' },
    { icon: '季', label: '本季度采购金额', value: '1.78', unit: '亿元' },
    { icon: '月', label: '本月度采购金额', value: '0.59', unit: '亿元' },
    { icon: 'build', label: '累计上线项目', value: '9,224', unit: '个' },
    { icon: 'crane', label: '本年度新上线项目', value: '1,210', unit: '个' },
    { icon: 'gauge', label: '本年度采购目标完成率', value: '47.47', unit: '%' }
  ];

  const KPI_ICON = {
    build: '<path d="M3 14.5V4.5h8v10"/><path d="M11 7.5h3v7"/><path d="M2 14.5h13"/><path d="M5.5 7h1M8 7h1M5.5 9.5h1M8 9.5h1M5.5 12h1M8 12h1"/>',
    crane: '<path d="M2 14.5h13"/><path d="M5 14.5V3.5h9"/><path d="M5 3.5l4 3.5"/><path d="M11 3.5v3"/><path d="M9.5 6.5h3v2h-3z"/>',
    gauge: '<path d="M2.5 12a6 6 0 1 1 11 0"/><path d="M8 12l3.5-4"/><circle cx="8" cy="12" r="1"/>'
  };

  function overviewView() {
    return '<div class="ck-view ck-view--overview">' +
      amountSection() +
      materialSection() +
      boardSection() +
      '</div>';
  }

  /* ---------- 采购金额 ---------- */
  function amountSection() {
    return section('采购金额',
      '<div class="ck-amount">' +
      '  <div class="ck-amount__pie">' + subHead('采购金额构成') +
      '    <div class="dsc-chart" id="ckPie" style="height:330px"></div></div>' +
      '  <div class="ck-amount__kpis">' + BIG_KPI.map(function (k) {
        return '<div class="ck-bigkpi">' +
          '<div class="ck-bigkpi__icon">' + bigIcon(k.icon) + '</div>' +
          '<div class="ck-bigkpi__main">' +
          '<div class="ck-bigkpi__label">' + esc(k.label) + '</div>' +
          '<div class="ck-bigkpi__value">' + esc(k.value) + '<span>' + esc(k.unit) + '</span></div>' +
          (k.sub ? '<div class="ck-bigkpi__sub">' + esc(k.sub) + '</div>' : '') +
          '</div></div>';
      }).join('') + '</div>' +
      '</div>');
  }
  function bigIcon(kind) {
    if (KPI_ICON[kind]) {
      return '<svg viewBox="0 0 16 16" width="46" height="46" fill="none" stroke="currentColor" stroke-width="0.9" ' +
        'stroke-linecap="round" stroke-linejoin="round">' + KPI_ICON[kind] + '</svg>';
    }
    return '<span class="ck-bigkpi__glyph">' + esc(kind) + '</span>';
  }

  /* ---------- 采购物资 ---------- */
  const MAT_SMALLS = ['普通钢筋', '预应力钢筋', '圆钢', '角钢', '方钢', '扁钢',
    '普通钢板', '花纹钢板', '镀锌钢板', '压型钢板', '不锈钢板', '钢绞线',
    '普通混凝土', '透水混凝土', '泡沫混凝土', '水泥砂浆', '水泥', '预制构件'];

  function materialSection() {
    const cats = MAT_SMALLS.slice(0, 20);
    const rnd = D.seedRand(20261008);
    const amt = cats.map(function (c, i) { return D.round(i === 0 ? 16.19 : 2 + rnd() * 14, 2); });
    const qty = cats.map(function () { return D.round(200 + rnd() * 1400, 2); });
    const price = cats.map(function () { return D.round(180 + rnd() * 3200, 2); });
    return section('采购物资',
      subHead('物资进场数据') +
      '<div class="ck-filter">' +
      '<div class="ck-filter__row">' +
      dateRange(D.defaultRange) +
      field('二级单位', '') + field('三级单位', '') + field('项目状态', '') +
      '</div><div class="ck-filter__row">' +
      field('项目类型', '') + field('项目业态', '') +
      '</div>' +
      '<div class="ck-filter__more" ' + (CS.advanced ? '' : 'hidden') + '>' +
      field('承包模式', '') + field('地区', '') + field('实施单位', '') +
      '</div>' +
      advActions() +
      '</div>' +
      '<div class="dsc-chart" id="ckInData" style="height:340px"></div>' +
      '<div class="ck-legend">' +
      ckLegendItem('in', 0, '<i style="background:#2F80ED"></i>', '金额') +
      ckLegendItem('in', 1, '<i style="background:#34A853"></i>', '数量') +
      ckLegendItem('in', 2, '<i class="ck-legend__line ck-legend__line--red"></i>', '均价') +
      '</div>' +

      subHead('物资小类分析') +
      '<div class="ck-filter">' +
      '<div class="ck-filter__row">' +
      '<div class="ck-filter__item"><span class="ck-filter__label">日期</span>' +
      '<span class="ck-field ck-field--date">' + esc(D.defaultRange[0]) + ' ~ ' + esc(D.defaultRange[1]) + '</span></div>' +
      field('省', '') + field('市', '') +
      '<div class="ck-filter__item"><span class="ck-filter__label">物料小类<b class="ck-req">*</b></span>' +
      '<span class="ck-field ck-field--ro">' + esc(CS.matSmall) + '</span></div>' +
      '</div>' +
      actions() + '</div>' +
      '<div class="ck-matcards">' + MAT_CARDS.map(function (c, i) {
        return '<div class="ck-matcard' + (CS.matSmall === c.name ? ' ck-matcard--active' : '') +
          '" data-ck-matcard="' + esc(c.name) + '">' +
          '<div class="ck-matcard__left">' +
          '<div class="ck-matcard__head"><span class="ck-matcard__icon">' + matIcon(i) + '</span>' +
          '<span class="ck-matcard__name">' + esc(c.name) + '</span></div>' +
          '<div class="ck-matcard__row"><span>采购总金额</span><b>' + esc(c.amt) + '</b><i>亿元</i></div>' +
          '<div class="ck-matcard__row"><span>采购总数量</span><b>' + esc(c.qty) + '</b><i>' + esc(c.qtyUnit) + '</i></div>' +
          '<div class="ck-matcard__row"><span>采购平均价</span><b>' + esc(c.price) + '</b><i>' + esc(c.priceUnit) + '</i></div>' +
          '</div>' +
          '<div class="ck-matcard__right"><div class="ck-matcard__pctlabel">采购总金额占比</div>' +
          '<div class="dsc-chart" id="ckRing' + i + '" style="height:100px;width:100px"></div></div>' +
          '</div>';
      }).join('') + '</div>' +
      LEVELS.map(function (lv, i) {
        return subHead(lv.title) + '<div class="dsc-chart" id="ckLv' + i + '" style="height:240px"></div>' +
          '<div class="ck-legend">' +
          ckLegendItem('lv' + i, 0, '<i style="background:#2FBD8A"></i>', '金额') +
          ckLegendItem('lv' + i, 1, '<i style="background:#7FC8F1"></i>', '数量') +
          ckLegendItem('lv' + i, 2, '<i class="ck-legend__line ck-legend__line--red"></i>', '均价') +
          '</div>';
      }).join(''));
  }

  const MAT_CARDS = [
    { name: '钢筋', amt: '127.46', qty: '506.91', qtyUnit: '万吨', price: '2,514.41', priceUnit: '元/吨', pct: 28.49 },
    { name: '混凝土', amt: '73.59', qty: '2,864.81', qtyUnit: '万m³', price: '256.87', priceUnit: '元/m³', pct: 16.45 },
    { name: '水泥', amt: '7.83', qty: '250.45', qtyUnit: '万吨', price: '312.50', priceUnit: '元/吨', pct: 1.75 },
    { name: '电力电缆', amt: '17.59', qty: '5,434.04', qtyUnit: '万m', price: '32.37', priceUnit: '元/m', pct: 3.93 }
  ];
  function matIcon(i) {
    const paths = [
      '<circle cx="5" cy="5" r="2.2"/><circle cx="11" cy="5" r="2.2"/><circle cx="5" cy="11" r="2.2"/><circle cx="11" cy="11" r="2.2"/><path d="M7 5h2M7 11h2M5 7v2M11 7v2"/>',
      '<path d="M1.5 13.5h13"/><path d="M4 13.5V7l4-2.5L12 7v6.5"/><circle cx="6" cy="15" r="1"/><circle cx="10" cy="15" r="1"/><path d="M4 9h8"/>',
      '<path d="M5 1.5h6v3H5z"/><path d="M3.5 4.5h9l1 10h-11z"/><path d="M6 8.5h4M6 11.5h4"/>',
      '<path d="M3 3v10"/><path d="M3 5h4M3 8h4M3 11h4"/><circle cx="9.5" cy="5" r="1.4"/><circle cx="12" cy="8" r="1.4"/><circle cx="9.5" cy="11" r="1.4"/>'
    ];
    return '<svg viewBox="0 0 16 16" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + paths[i % 4] + '</svg>';
  }

  const LEVELS = [
    { title: '全局物资分析', key: 'all' },
    { title: '二级单位物资分析', key: 'l2' },
    { title: '三级单位物资分析', key: 'l3' }
  ];

  /* ---------- 采购榜单 ---------- */
  function medal(i) {
    if (i > 2) return '<span class="ck-medal__no">' + (i + 1) + '</span>';
    const c = ['#F5C518', '#B9C2CC', '#D08B4F'][i];
    return '<span class="ck-medal" style="color:' + c + '"><svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">' +
      '<path d="M5 1.5h6v3.2a3 3 0 0 1-6 0z"/><path d="M5 2.2H3.2v1.4a2 2 0 0 0 1.6 1.9M11 2.2h1.8v1.4a2 2 0 0 1-1.6 1.9"/>' +
      '<path d="M7.2 7.4h1.6v2H7.2z"/><path d="M5 14.5h6v-1.6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/></svg></span>';
  }

  const BOARD = [
    { key: 'project', name: '项目履约情况top100', col: '项目名称', unit: '亿' },
    { key: 'supplier', name: '供应商履约情况top100', col: '供应商名称', unit: '亿' },
    { key: 'material', name: '物料品类采购金额top100', col: '物料小类', unit: '亿' }
  ];

  function boardRows(kind) {
    const rnd = D.seedRand(77000 + kind.length * 13);
    const names = kind === 'project'
      ? ['麒麟科技创新园三期经济适用房', '中新广州知识城JLXC-F1地块', '聊热入济长距离供热北线工程',
        '京台高速公路齐河至济南段', '蚌埠医学院第一附属医院', '庆云至章丘高速公路工程',
        '四川绵阳工业园新型显示产业园', '阿里巴巴江苏总部项目', '济南新旧动能转换起步区',
        '横琴科学城（二期）标段一', '滨州市G228丹东线滨州段']
      : kind === 'supplier'
        ? ['中建八局（山东）供应链科技有限公司', '江苏中禧建设有限公司', '山东建盛贸易有限公司',
          '中建八局新型建造工程有限公司', '蚌埠禹王土石方工程有限公司', '梁平县荣安建筑劳务有限公司',
          '上海豫天铄供应链有限公司', '中建钢构股份有限公司', '中建东方装饰有限公司',
          '江苏智锐测绘建筑科技有限公司', '上海迪耀光电科技有限公司']
        : ['普通钢筋', '普通混凝土', '钢结构制作件', '电力电缆', '自卸车', '挖掘机', '碎石',
          '混凝土用砂', '水泥', '焊接钢管', '木模板'];
    return names.map(function (n, i) {
      return { name: n, value: D.round(i === 0 ? 27.84 : 24 - i * 1.6 + (rnd() - 0.5) * 2, 2) };
    });
  }

  function boardSection() {
    return section('采购榜单',
      '<div class="ck-filter"><div class="ck-filter__row">' +
      '<div class="ck-filter__item"><span class="ck-filter__label">日期</span>' +
      '<span class="ck-field ck-field--date">' + esc(D.defaultRange[0]) + ' ~ ' + esc(D.defaultRange[1]) + '</span></div>' +
      field('二级单位', '') + field('三级单位', '') +
      '</div>' +
      actions() + '</div>' +
      '<div class="ck-board">' + BOARD.map(function (b) {
        return '<div class="ck-board__col">' +
          '<div class="ck-board__title">' + esc(b.name) + '</div>' +
          '<table class="ck-table ck-table--board"><thead><tr>' +
          '<th style="width:56px">排序</th><th>' + esc(b.col) + '</th><th class="is-num">采购金额（元）</th>' +
          '</tr></thead><tbody>' +
          boardRows(b.key).map(function (r, i) {
            return '<tr><td class="is-center">' + medal(i) + '</td>' +
              '<td class="ck-table__name" title="' + esc(r.name) + '">' + esc(r.name) + '</td>' +
              '<td class="is-num">' + D.fmtNum(r.value, 2) + '亿</td></tr>';
          }).join('') + '</tbody></table></div>';
      }).join('') + '</div>');
  }

  /* ============================================================
     视图二：指标总览-采购
     ============================================================ */
  /* 与其余三个看板同构：用 section() 分区，而不是把指标/筛选/页签/趋势/表平铺 */
  function metricsView() {
    const m = metricDef(CS.metric);
    return '<div class="ck-view ck-view--metrics">' +
      section('指标总览',
      '<div class="ck-metrics">' + METRICS.map(function (x) {
        return '<div class="ck-metriccard' + (CS.metric === x.key ? ' ck-metriccard--active' : '') +
          '" data-ck-metric="' + x.key + '">' +
          '<div class="ck-metriccard__value">' + (x.disp || D.fmtNum(x.value, x.dec)) +
          '<span>' + esc(x.unit) + '</span></div>' +
          '<div class="ck-metriccard__label">' + esc(x.name) + '</div></div>';
      }).join('') + '</div>' +

      '<div class="ck-filter ck-filter--panel">' +
      '<div class="ck-filter__row">' +
      '<div class="ck-filter__item"><span class="ck-filter__label">结算日期</span>' +
      '<span class="ck-grain" data-ck-grain="结算日期">' + esc(CS.settleGrain) + CARET + '</span>' +
      '<span class="ck-field ck-field--date">2025-06-01 ~ 2026-05-31</span></div>' +
      field('二级单位', '') + field('三级单位', '') + field('项目名称', '') +
      '</div><div class="ck-filter__row">' +
      field('项目业态', '') + field('项目类型', '') +
      '</div>' +
      '<div class="ck-filter__more" ' + (CS.advanced ? '' : 'hidden') + '>' +
      field('项目状态', '') + field('承包模式', '') + field('地区', '') +
      field('组织', '') + field('物料分类', '') +
      '</div>' +
      advActions() + '</div>' +

      '<div class="ck-tabsrow">' + METRICS.map(function (x) {
        return '<div class="ck-tab' + (CS.metric === x.key ? ' ck-tab--active' : '') + '" data-ck-tab="' + x.key + '">' +
          esc(x.name) + '</div>';
      }).join('') + '</div>' +
      '<div class="dsc-chart" id="ckTrend" style="height:280px"></div>') +

      section('二级单位明细', unitTable(),
        D.colGear('data-pb-cols', '设置列：本指标的明细列表字段（基本信息 + 指标信息）')) +
      procSection() +
      '</div>';
  }

  /* 二级单位明细（截图实测：单位名称 / 不含税标准成本 / 不含税采购金额 / 降低率） */
  const UNIT_ROWS = [
    ['中建八局南方分公司', 57.70, 49.59, 14.07], ['中建八局华南分公司', 72.21, 64.73, 10.36],
    ['中建八局第二建设有限公司', 286.09, 257.16, 10.11], ['中建八局东北分公司', 49.93, 45.11, 9.65],
    ['中建八局华中建设有限公司', 24.64, 22.44, 8.93], ['中建八局华北分公司', 43.66, 40.05, 8.28],
    ['中建八局文旅博览投资发展有限公司', 20.11, 18.48, 8.12], ['中建八局上海分公司', 65.94, 60.59, 8.09],
    ['中建八局发展建设分公司', 83.92, 77.18, 8.03], ['中建八局浙江建设有限公司', 51.49, 47.43, 7.89],
    ['中建八局西北分公司', 31.39, 28.94, 7.80], ['中建八局第三建设有限公司', 154.21, 142.28, 7.74],
    ['中建八局总承包公司', 72.12, 66.79, 7.38], ['中国建筑土木建设有限公司', 43.75, 40.67, 7.00],
    ['中建八局第一建设有限公司', 334.04, 311.06, 6.88], ['中建八局（北京）建设投资有限公司', 20.31, 19.05, 6.20],
    ['中建八局第四建设有限公司', 44.11, 41.39, 6.17], ['中建八局轨道交通建设有限公司', 32.85, 30.86, 6.06],
    ['中建八局装饰工程有限公司', 16.94, 15.93, 6.00], ['中建八局西南分公司', 44.87, 42.29, 5.73],
    ['中建八局新型建造工程公司', 12.94, 12.33, 4.68]
  ];

  /* C1 / E2：看板单位名的统一表达——短名为主（应用内主键），法定全称进 tooltip；
     点击切到该单位的组织视角并打开对应数据报表 */
  function unitLink(shortName, ds) {
    const full = (D.REPORT_UNITS[shortName] || [])[0] || '';
    return '<span class="ck-table__unit dsc-table__link" data-goto-report="' + ds +
      '" data-goto-org="' + esc(shortName) + '" title="' +
      esc((full ? full + '　·　' : '') + '在数据报表中查看该单位') + '">' + esc(shortName) + '</span>';
  }

  /* ============================================================
     指标明细列表（Axure：驾驶舱 › 核心数据 各指标页签的「设置列」）
     列 = 排名 + 基本信息(勾选) + 指标信息(勾选)，随指标页签切换，每个指标一套字段
     ============================================================ */
  const BASIC_KEY = {
    '三级单位': 'org3', '项目': 'project', '项目类型': 'pType', '项目状态': 'pStatus',
    '项目业态': 'pFormat', '承包模式': 'pMode', '合同': 'contract', '合同来源': 'contractSrc',
    '采购类别': 'purchaseCat', '物料大分类': 'matBig', '物料中分类': 'matMid', '物料小分类': 'matSmall',
    '结算单/产值单': 'settleDoc', '供应商': 'supplier', '订单': 'order', '月份': 'month',
    '区域联盟': 'regionAlliance', '项目联合体': 'projectJV'
  };
  /* 指标的全部可选字段（基本信息 + 指标信息），带类型便于渲染与合计 */
  function metricFieldList(metric) {
    const spec = D.METRIC_COLS[metric];
    if (!spec) return { basic: [], info: [] };
    const basic = (D.METRIC_BASIC[metric] || []).map(function (label) {
      return { key: BASIC_KEY[label], name: label, type: 'text' };
    });
    const info = spec.info.map(function (f) { return { key: f[0], name: f[1], type: f[2], digits: f[3] }; });
    /* 最后一个比率字段就是该指标本身，按 Axure 图例标红（其余分量保持常规色） */
    const head = info.filter(function (c) { return c.type === 'pct'; }).pop();
    if (head) head.danger = true;
    return { basic: basic, info: info };
  }
  function metricDef(metric) {
    const fl = metricFieldList(metric);
    return ['name'].concat(fl.info.map(function (c) { return c.key; }));
  }
  const MONEY = function (v, c) {
    if (v == null) return '—';
    if (c.type === 'pct') return D.fmtNum(v, 2) + '%';
    if (c.type === 'cnt') return D.fmtInt(v);
    if (c.type === 'num') return D.fmtNum(v, c.digits == null ? 1 : c.digits);
    return D.fmtNum(v, 2);
  };
  /* 合计行：金额/数量求和，比率取均值 */
  function metricTotal(rows, cols) {
    const t = {};
    cols.forEach(function (c) {
      const vals = rows.map(function (r) { return r[c.key]; }).filter(function (v) { return typeof v === 'number'; });
      if (!vals.length) return;
      const s = vals.reduce(function (a, b) { return a + b; }, 0);
      t[c.key] = c.type === 'pct' ? D.round(s / vals.length, 2) : D.round(s, 2);
    });
    return t;
  }
  /* 指标明细表：rows 由 D.metricRows 产出（含 name 与全部指标字段） */
  function metricListTable(o) {
    const fl = metricFieldList(o.metric);
    const all = [{ key: 'name', name: o.unitHead || '二级单位', type: 'text' }].concat(fl.basic, fl.info);
    const cols = D.colsOf('metric-' + o.metric, all, o.def || metricDef(o.metric));
    const tot = metricTotal(o.rows, cols);
    const val = function (r, c) {
      if (c.key === 'name') return unitLink(r.name, o.ds);      // 单位名只保留简称，全称进 tooltip
      const v = r[c.key];
      if (v == null || v === '') return '<span class="u-tertiary">—</span>';
      if (c.type === 'text') return '<span class="ck-table__tx">' + esc(v) + '</span>';
      return MONEY(v, c);
    };
    const totalCell = function (c) {
      if (c.key === 'name') return o.totalName || '';
      if (c.type === 'text' && tot[c.key] == null) return '';   // 维度字段不参与合计，留空
      return tot[c.key] == null ? '—' : MONEY(tot[c.key], c);
    };
    return '<div class="ck-table-wrap dsc-scroll">' +
      '<table class="ck-table ck-table--metrics"><thead><tr><th style="width:80px">排名</th>' +
      cols.map(function (c) {
        return '<th class="' + (c.type === 'text' ? '' : 'is-num') + (c.danger ? ' ck-table__danger' : '') + '">' +
          esc(c.name) + '</th>';
      }).join('') + '</tr></thead><tbody>' +
      '<tr class="ck-table__total"><td class="is-center">合计</td>' +
      cols.map(function (c) { return '<td class="' + (c.type === 'text' ? 'is-center' : 'is-num') + '">' + totalCell(c) + '</td>'; }).join('') +
      '</tr>' +
      o.rows.map(function (r, i) {
        return '<tr><td class="is-center">' + ((o.page - 1) * o.size + i + 1) + '</td>' +
          cols.map(function (c) {
            return '<td class="' + (c.type === 'text' ? 'is-center' : 'is-num') + (c.danger ? ' ck-table__danger' : '') +
              '">' + val(r, c) + '</td>';
          }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  /* 齿轮：按指标打开「设置列」，字段按 基本信息 / 指标信息 分组 */
  function metricColPicker(metric, title, after) {
    const fl = metricFieldList(metric);
    const unitCol = { key: 'name', name: '二级单位', type: 'text' };
    const basic = [unitCol].concat(fl.basic);
    const all = basic.concat(fl.info);
    /* 分组与 Axure 一致：基本信息（含二级单位）/ 指标信息 */
    D.openColPicker({
      key: 'metric-' + metric, title: title, all: all, def: metricDef(metric),
      groups: [{ title: '基本信息', items: basic }, { title: '指标信息', items: fl.info }],
      after: after || D.render
    });
  }

  /* 二级单位明细的动态列：字段取自 Axure《局驾驶舱 › 核心数据》「设置列」面板（基本信息 + 指标信息），
     列出该表真实可算的字段——原来那张「列设置」只弹一个提示、不改变任何内容 */
  const PB_UNIT_COLS = [
    { key: 'name', name: '二级单位名称', width: 260 },
    { key: 'stdAmt', name: '不含税标准成本金额（元）', width: 200, num: true },
    { key: 'buyAmt', name: '不含税采购金额（元）', width: 190, num: true },
    { key: 'saveAmt', name: '采购成本降低额（元）', width: 190, num: true },
    { key: 'rate', name: '采购成本降低率', width: 150, num: true, danger: true },
    { key: 'share', name: '标准成本占比', width: 130, num: true, pct: true }
  ];
  const PB_UNIT_DEF = ['name', 'stdAmt', 'buyAmt', 'saveAmt', 'rate', 'share'];

  function unitTable() {
    /* R2：受限视角下只返回本单位行（超权限行不返回） */
    const scope = D.scope.name;
    const visible = UNIT_ROWS.filter(function (r) {
      return D.scope.level === 1 || r[0].indexOf(scope.replace(/公司$/, '')) >= 0;
    });
    const names = visible.map(function (r) { return D.reportShortOf(r[0]); });
    const metric = CS.metric;                 // 指标页签（8 个指标各自一套字段，随页签切换）
    const rows = D.metricRows(names, metric, function (short) {
      const o = D.orgMap[short];
      return (o && o.kpi && o.kpi[metric] != null) ? o.kpi[metric] : null;
    });
    return metricListTable({ metric: metric, rows: rows, ds: 'purchase', page: 1, size: rows.length,
      totalName: '全部 ' + rows.length + ' 个单位' });
  }

  const PROC_KPIS = [
    { key: 'lead', icon: 'clock', label: '平均招采时效', value: '25.6', unit: '天' },
    { key: 'open', icon: 'bag', label: '公开采购率', value: '--', unit: '%' },
    { key: 'online', icon: 'check', label: '在线评标率', value: '99.08', unit: '%' },
    { key: 'fail', icon: 'cross', label: '招采废标率', value: '9.69', unit: '%' }
  ];
  const PROC_ICON = {
    clock: '<circle cx="32" cy="32" r="24"/><path d="M32 16v16l11 7"/>',
    bag: '<path d="M12 20h40v34H12z"/><path d="M22 20v-6a10 10 0 0 1 20 0v6"/>',
    check: '<rect x="8" y="8" width="48" height="40" rx="2"/><path d="M20 30l9 9 17-19"/><path d="M8 54h48"/>',
    cross: '<rect x="8" y="10" width="48" height="40" rx="2"/><path d="M20 22l24 20M44 22L20 42"/><path d="M8 56h48"/>'
  };
  const PROC_STAGES = [
    { name: '采购发起', value: 11092 }, { name: '采购响应', value: 661 },
    { name: '文件开启', value: 193 }, { name: '采购评审', value: 563 },
    { name: '采购成交', value: 17582 }, { name: '废标', value: 3229 }
  ];

  function procSection() {
    return section('招采分析',
      '<div class="ck-filter"><div class="ck-filter__row">' +
      '<div class="ck-filter__item"><span class="ck-filter__label">招标开始日期</span>' +
      '<span class="ck-grain" data-ck-grain="招标开始日期">' + esc(CS.inGrain) + CARET + '</span>' +
      '<span class="ck-field ck-field--date">2025-06-01 ~ 2026-05-31</span></div>' +
      field('采购类别', '') + field('采购方式', '') + field('采购模式', '') +
      '</div>' +
      '<div class="ck-filter__more"' + (CS.advanced ? '' : ' hidden') + '>' +
      field('二级单位', '') + field('三级单位', '') + field('项目名称', '') +
      '</div>' +
      advActions() + '</div>' +
      '<div class="ck-prockpis">' + PROC_KPIS.map(function (k) {
        return '<div class="ck-prockpi">' +
          '<span class="ck-prockpi__icon"><svg viewBox="0 0 64 64" width="52" height="52" fill="none" ' +
          'stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
          PROC_ICON[k.icon] + '</svg></span>' +
          '<span class="ck-prockpi__main"><span class="ck-prockpi__label">' + esc(k.label) + '</span>' +
          '<span class="ck-prockpi__value">' + esc(k.value) +
          '<i>' + esc(k.unit) + '</i></span></span></div>';
      }).join('') + '</div>' +
      '<div class="ck-stages">' + PROC_STAGES.map(function (s, i) {
        return '<div class="ck-stage">' +
          '<div class="ck-stage__head">' + esc(s.name) + '</div>' +
          '<div class="ck-stage__value">' + D.fmtInt(s.value) + '</div>' +
          '<div class="dsc-chart ck-stage__chart" id="ckStage' + i + '" style="height:96px"></div>' +
          '</div>';
      }).join('') + '</div>');
  }

  /* ============================================================
     页面
     ============================================================ */
  /* 页面级标题（与数据报表页同构件）：看板类页面原先没有标题，只能靠面包屑判断所在位置 */
  function pageHead(title, sub) {
    return '<div class="dsc-page__header"><div class="dsc-page__title">' + esc(title) + '</div>' +
      '<div class="dsc-page__sub">' + esc(sub) + '</div></div>';
  }

  /* 组织权限提示（两个页面共用） */
  function scopeNote() {
    return D.scope.level === 1 ? '' : '<div class="dsc-note dsc-note--warn u-mb-md">已按组织权限过滤（R1/R2/R3）：' +
      '仅统计权限范围内的单位与项目；排名与明细中其他单位数值已隐藏。</div>';
  }

  /* F2 局驾驶舱：局级驾驶舱（采购金额 / 采购物资 / 采购榜单） */
  D.pages.cockpit = function () {
    CS.view = 'overview';
    return '<div class="dsc-page cockpit-page">' +
      pageHead('局级驾驶舱', '局级采购全景：采购金额构成 → 采购物资 → 采购榜单') +
      scopeNote() + overviewView() + '</div>';
  };

  /* 采购管理 › 采购管理看板：指标总览-采购（截图 `采购管理看板.png`） */
  D.pages['purchase-board'] = function () {
    CS.view = 'metrics';
    return '<div class="dsc-page cockpit-page">' +
      pageHead('采购管理看板', '指标总览-采购：指标卡与页签联动，含二级单位明细与招采分析') +
      scopeNote() + metricsView() + '</div>';
  };

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
    more: false
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

  /* 废旧物资处理（截图实测：物质调拨金额 / 废旧物资处理金额，单位万元） */
  const MB_RECYCLE = [
    ['华中公司', 5784.88, 4138.65], ['上海公司', 4798.55, 2988.80], ['总承包公司', 4783.54, 2534.79],
    ['华南公司', 3631.60, 2217.14], ['北京公司', 3322.77, 2389.70], ['东北公司', 2513.78, 1218.65],
    ['西南公司', 2488.14, 1473.26], ['二公司', 2184.88, 1138.65], ['城发公司', 1898.55, 988.80],
    ['西北公司', 1883.54, 934.79], ['轨道公司', 1631.60, 617.14]
  ];

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
      metric.push({ key: 'saveRate', name: '降低额占比', width: 120, pct: true });
      /* 过程降本小计（验收 + 消耗 + 闲废）与占比：列头 ⓘ 说明构成 / 来源 / 分母 */
      metric.push({ key: 'procAmt', name: '过程降本小计(万元)', width: 170, num: true, info: true });
      metric.push({ key: 'procRate', name: '过程降本占比', width: 150, pct: true, info: true });
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
    metric.push({ key: 'saveRate', name: '降本占比率', width: 110, pct: true });
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
  /* 行粒度：默认按二级单位汇总；设置列里放开三级单位 / 项目名称即逐级下沉；下钻时至少展开下一级 */
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
  /* 明细清单的合计行：金额 / 项目数列加总；率值列按「分子 ÷ 分母」聚合，
     不是各行的平均（降低额占比 = 合计降本 ÷ 合计产值；过程议价降本占比 = 过程降本 ÷ 合计降本） */
  function mbTotalRow(cols, rows) {
    if (!cols.some(function (c) { return c.num; })) return null;
    const t = D.totalOf(cols, rows);
    const sumOf = function (k) {
      return D.round(rows.reduce(function (a, r) { return a + (typeof r[k] === 'number' ? r[k] : 0); }, 0), 2);
    };
    if (cols.some(function (c) { return c.key === 'saveRate'; })) {
      const ent = sumOf('entAmt');
      t.saveRate = ent ? D.round(sumOf('saveAmt') / ent * 100, 2) : null;
    }
    if (cols.some(function (c) { return c.key === 'procRate'; })) {
      const all = sumOf('saveAmt');
      t.procAmt = sumOf('procAmt');
      t.procRate = all ? D.round(t.procAmt / all * 100, 2) : null;
    }
    return t;
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

  /* 物资管理看板主体：指标卡带 → 主筛选 → 指标页签 + 红色趋势 → 二级单位排行 → 六项降本 → 废旧物资处理 */
  function materialBoardView() {
    const m = mbMetric(MS.metric);
    return '<div class="ck-view ck-view--metrics">' +
      /* 6 指标卡（与页签双向联动） */
      '<div class="ck-metrics ck-metrics--6">' + MB_METRICS.map(function (x) {
        return '<div class="ck-metriccard' + (MS.metric === x.key ? ' ck-metriccard--active' : '') +
          '" data-mb-metric="' + x.key + '">' +
          '<div class="ck-metriccard__value">' + D.fmtNum(x.value, x.dec) +
          '<span>' + esc(x.unit) + '</span></div>' +
          '<div class="ck-metriccard__label">' + esc(x.name) + '</div></div>';
      }).join('') + '</div>' +

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
      '<div class="ck-tabsrow">' + MB_METRICS.map(function (x) {
        return '<div class="ck-tab' + (MS.metric === x.key ? ' ck-tab--active' : '') +
          '" data-mb-tab="' + x.key + '">' + esc(x.name) + '</div>';
      }).join('') + '</div>' +
      subHead(m.name + '随时间变化的趋势') +
      '<div class="dsc-chart" id="mbTrend" style="height:280px"></div>' +

      /* 二级单位排行 */
      subHead('二级单位排行', '共 ' + MB_RANK.length + ' 个二级单位' +
        D.colGear('data-mb-rank-cols', '设置列：本指标的明细列表字段（基本信息 + 指标信息）')) +
      mbRankTable() +
      '<div data-mb-pager="rankPage">' + D.pager({ page: MS.rankPage, size: MS.size, total: MB_RANK.length }) + '</div>' +

      /* 六项降本（含降本明细清单：卡片 → 统一查询 → 趋势 → 清单） */
      saveSection() +

      /* 废旧物资处理 */
      '<section class="ck-sec"><div class="ck-sec__head"><h2 class="ck-sec__title">废旧物资处理</h2>' +
      '<button class="ck-sec__collapse" data-ck-collapse title="收起 / 展开">' + CARET + '</button></div>' +
      '<div class="ck-sec__body">' +
      subHead('物质调拨金额 / 废旧物资处理金额（按二级单位）') +
      '<div class="dsc-chart" id="mbRecycle" style="height:320px"></div>' +
      '<div class="ck-legend">' +
      '<span><i style="background:#2468F2"></i>物质调拨金额</span>' +
      '<span><i style="background:#7FC4F5"></i>废旧物资处理金额</span>' +
      '</div></div></section>' +
      '</div>';
  }

  /* 占项目确权产值的月度序列：末点收敛到卡片上的占比，保证卡片与趋势口径一致 */
  function mbSaveRateTrend(key) {
    const m = mbSave(key);
    const n = MB_SAVE_MONTHS.length;
    const out = MB_SAVE_MONTHS.map(function (_, i) {
      const k = i / (n - 1);
      const wob = (((i * 3 + key.length * 5) % 11) - 5) / 60;
      return D.round(m.rate * (0.84 + 0.16 * k) * (1 + wob), 2);
    });
    out[n - 1] = m.rate;
    return out;
  }

  /* 六项降本：卡片（降本金额 + 占项目确权产值）→ 统一查询条 → 趋势图（金额柱 + 占比线）→ 降本明细清单 */
  /* 卡片区：默认 7 张（合计降本 + 六项）；「降本明细项查询」选中某小项时收窄为该明细项 1 张。
     「金额 / 占比」切换：放大金额时副行给产值占比，放大占比时副行给降本金额、标题加「占比」 */
  function mbCards() {
    const rateMode = MS.kpiMode === 'rate';
    /* 卡片带始终是 7 张（合计 + 六项）：既是导航也是概览，数值按「降本明细项」勾选范围收窄 */
    const list = MB_SAVE.map(function (x) {
      return { key: x.key, name: x.name, value: D.fmtNum(mbScopeAmt(x.key), 2),
        rate: mbScopeRate(x.key), active: MS.save === x.key };
    });
    function card(o) {
      const name = (rateMode ? o.name.replace(/金额$/, '') + '占比' : o.name);
      const main = rateMode
        ? D.fmtNum(o.rate, 2) + '<span>%</span>'
        : esc(o.value) + '<span>万元</span>';
      const sub = rateMode
        ? '<span>降本金额</span><b>' + esc(o.value) + ' 万元</b>'
        : '<span>产值占比</span><b>' + D.fmtNum(o.rate, 2) + '%</b>';
      return '<div class="ck-metriccard ck-metriccard--stat' + (o.active ? ' ck-metriccard--active' : '') +
        '" data-mb-save="' + o.key + '">' +
        '<div class="ck-metriccard__label">' + esc(name) + '</div>' +
        '<div class="ck-metriccard__value">' + main + '</div>' +
        '<div class="ck-savecard__rate">' + sub + '</div></div>';
    }
    return '<div class="ck-kpihead"><div class="dsc-tabs dsc-tabs--pill" data-mb-kpimode>' +
      [['amt', '金额'], ['rate', '占比']].map(function (m) {
        return '<div class="dsc-tabs__item' + (MS.kpiMode === m[0] ? ' dsc-tabs__item--active' : '') +
          '" data-km="' + m[0] + '">' + m[1] + '</div>';
      }).join('') + '</div></div>' +
      '<div class="ck-metrics ck-metrics--7">' +
      list.map(card).join('') + '</div>';
  }
  /* 「降本明细项查询」：6 大项 + 18 小项两级复选下拉，默认全选 */
  function mbItemField() {
    const sel = mbItemSel();
    const value = MB_ALL_SUBS.filter(function (k) { return sel.indexOf(k) >= 0; });
    MB_SAVE_TYPES.forEach(function (k) {
      const subs = MB_SAVE_SUBS.filter(function (x) { return x[2] === k; });
      if (subs.length && subs.every(function (x) { return sel.indexOf(x[0]) >= 0; })) value.push(k);
    });
    const html = D.multiselect({
      name: '降本明细项查询', tree: true, options: mbItemOpts(), value: value,
      ph: MB_ALL_SUBS.length + ' 项全选', allText: '全部明细项',
      total: MB_ALL_SUBS.length
    });
    return '<div class="ck-filter__item"><span class="ck-filter__label">降本明细项查询</span>' +
      (MS.msOpen ? html.replace('class="dsc-multiselect"', 'class="dsc-multiselect dsc-multiselect--open"') : html) +
      '</div>';
  }
  function saveSection() {
    const s = mbSave(MS.save);
    const cols = mbSaveCols(MS.save);
    const def = mbSaveDef(MS.save);
    /* 行粒度由「设置列」决定（三级单位 / 项目名称默认隐藏），正负筛选按最终展示的行判断 */
    const shown0 = D.colsOf('mb-save-' + MS.save, cols, def);
    const rowLevel = mbRowLevel(shown0);
    const rows = mbSignRows(mbAggRows(mbDrillRows(mbRowsFor(MS.save)), rowLevel));
    const size = MS.size;
    const total = rows.length;
    if ((MS.detailPage - 1) * size >= total) MS.detailPage = 1;
    const paged = rows.slice((MS.detailPage - 1) * size, (MS.detailPage - 1) * size + size);
    const lvText = rowLevel === 'project' ? '按项目' : rowLevel === 'org3' ? '按三级单位' : '按二级单位';
    return section('六项降本',
      /* 卡片：金额（降本金额）+ 占比（占项目确权产值）。
         此前卡片底部还有一条渐变进度条，编码的是「该口径占比 ÷ 六项中最高占比」——
         满格没有标注基准、又与上一行的百分比重复，读者无法解读（容易被当成完成度），已去掉 */
      mbCards() +

      /* 统一查询条：本模块的卡片 / 趋势 / 明细清单共用（原「降本明细」那条重复的已并入此条） */
      '<div class="ck-filter"><div class="ck-filter__row">' +
      '<div class="ck-filter__item"><span class="ck-filter__label">日期选择</span>' +
      '<span class="ck-grain" data-ck-grain="日期选择">' + esc(CS.settleGrain) + CARET + '</span>' +
      '<span class="ck-field ck-field--date">2025-06-01 ~ 2026-05-31</span></div>' +
      field('实施单位', '中国建筑第八工程局有限公司') + field('项目名称', '') + field('项目业态', '') +
      field('降本金额正负', MS.sign) + mbItemField() +
      '</div>' +
      '<div class="ck-filter__more" hidden>' +
      field('项目类型', '') + field('二级单位', '') + field('三级单位', '') +
      field('统计月份', '') +
      '</div>' +
      advActions() + '</div>' +

      subHead((mbScopeKey() ? mbItemName(mbScopeKey()) : s.name) + ' · 降本金额与占项目确权产值趋势') +
      '<div class="dsc-chart" id="mbSave" style="height:280px"></div>' +
      '<div class="ck-legend">' +
      '<span data-mb-legend="0"' + (MS.hide[0] ? ' class="is-off"' : '') +
      ' title="点击点亮 / 熄灭该系列"><i style="background:#2468F2"></i>降本金额（万元，左轴）</span>' +
      '<span data-mb-legend="1"' + (MS.hide[1] ? ' class="is-off"' : '') +
      ' title="点击点亮 / 熄灭该系列"><i class="ck-legend__line ck-legend__line--red"></i>占项目确权产值（%，右轴）</span></div>' +

      subHead('降本明细清单', '共 ' + total + ' 条（每页 ' + size + ' 条）　·　' + lvText + '汇总' +
        (mbScopeKey() ? '　·　明细项：' + mbItemName(mbScopeKey())
          : mbItemSel().length < MB_ALL_SUBS.length
            ? '　·　明细项 ' + mbItemSel().length + '/' + MB_ALL_SUBS.length + '（已按勾选范围取数）' : '')) +
      mbDrillPath() +
      '<div class="ck-savehead">' +
      '<span class="ck-savehead__hint">' + (MS.save === 'total'
        ? '默认展示：产值 · 降本项目数 + 6 大项金额 + 降本额合计 + 项目确权产值金额 + 降低额占比 + 过程降本小计 / 占比；' +
          '三级单位 / 项目名称与其余 ' + MB_SAVE_SUBS.length + ' 个小项在「设置列」里 —— 行粒度随显示字段下沉，' +
          '项目数在单位行是计数、到项目行才是 0 / 1'
        : (mbScopeKey() ? '明细项：' + mbItemName(mbScopeKey()) + '　·　' : '') +
          '点击 二级单位 / 三级单位 / 项目名称 可在本页内逐级下钻（不影响数据报表）') + '</span>' +
      D.colGear('data-mb-columns', '设置列：' + s.name + '的明细字段（基本信息 + 指标信息）') +
      '</div>' +
      (function () {
        const shown = shown0;
        return D.table({
          cols: shown,
          rows: paged.map(function (r, i) {
            return Object.assign({ idx: (MS.detailPage - 1) * size + i + 1 }, r);
          }),
          /* 合计行按「全量结果集」算（与排行表一致），不是当前页；放在数据行之前便于第一眼看到 */
          totalRow: mbTotalRow(shown, rows),
          totalRowTop: true,
          maxHeight: 420
        });
      })() +
      '<div data-mb-pager="detailPage">' + D.pager({ page: MS.detailPage, size: size, total: total }) + '</div>');
  }

  D.pages['material-board'] = function () {
    return '<div class="dsc-page cockpit-page">' +
      pageHead('物资管理看板', '核心数据 · 物资：降本与结算指标，含六项降本、降本明细与废旧物资处理') +
      scopeNote() + materialBoardView() + '</div>';
  };

  /* ============================================================
     分供商管理 › 分供商管理看板
     内容基准：`分供商管理看板.png`（源页面「核心数据 · 资源」）
     版式：沿用已评审优化的 ck-* 语言（指标卡带 → 筛选 → 区块 + 图表）
     ============================================================ */
  /* go = 点击卡片跳到的区块序号（页内 .ck-sec 的下标）；desc/src 供口径气泡使用 */
  const SB_IND = [
    { name: '在库分供商数量', value: '61,854', unit: '家', trend: 12.5, good: true, last: '55,003', go: 0,
      desc: '截至统计时点在库状态的分供商数量', src: '采购管理系统分供商模块' },
    { name: '分供商履约额', value: '489.22', unit: '亿元', trend: 7.2, good: true, last: '456.31', go: 4,
      desc: '统计期内分供商承接合同的结算金额合计', src: '物资系统 + 采购管理系统' },
    { name: '履约分供商数量', value: '20,645', unit: '家', trend: 12.0, good: true, last: '18,436', go: 4,
      desc: '统计期内有实际履约记录的分供商数量', src: '物资系统' },
    { name: '不良行为分供商数量', value: '658', unit: '家', trend: -19.0, good: true, last: '812', extra: '占比 1.06%', go: 0,
      desc: '存在不良行为记录的分供商数量；占比 = 不良行为分供商数量 ÷ 在库分供商数量（658 ÷ 61,854）；不良行为的判定标准待确认（Q-09）', src: '采购管理系统分供商模块' },
    { name: '活跃分供商', value: '31,855', unit: '家', trend: -16.6, good: false, last: '38,912', go: 0,
      desc: '近 12 个月内有投标、报价或履约记录的分供商数量', src: '招采系统' },
    { name: '优质分供商履约额', value: '354.57', unit: '亿元', trend: 18.6, good: true, last: '265.32', extra: '占比 72.48%', go: 4,
      desc: '评价为优质的分供商所承接合同的结算金额，占比 = 优质履约额 ÷ 分供商履约额', src: '物资系统 + 采购管理系统' },
    { name: '优质分供商数量', value: '25,793', unit: '家', trend: -18.1, good: false, last: '31,493', extra: '占比 41.70%', go: 0,
      desc: '评价等级为优质的分供商数量，占比 = 优质数量 ÷ 在库分供商数量', src: '采购管理系统分供商模块' },
    { name: '清退分供商数量', value: '7,391', unit: '家', trend: 17.0, good: false, last: '6,315', extra: '占比 10.67%', go: 2,
      desc: '当前自然年内出库的分供商数量；占比 = 清退分供商数量 ÷（在库 + 清退）＝ 7,391 ÷ 69,245', src: '采购管理系统分供商模块' }
  ];

  const SB_BAR = { height: 240, dataLabels: true, labelColor: '#4A5568', xColor: '#666' };
  const SB_BLUE = '#2468F2';

  /* 分供商使用率分析（CSV：新增入库→活跃→中标→签约→履约，各级给「数量及转化率」；
     转化率 = 本级 ÷ 上一级。使用率 = 履约分供商数量 ÷ 在库分供商数量 = 20,645 ÷ 61,854） */
  const SB_RATE = {
    cats: ['新增入库', '活跃', '中标', '签约', '履约'],
    data: [9851, 8119, 7822, 7240, 5839],
    rates: [null, 82.42, 96.34, 92.56, 80.65], rate: '33.38'
  };
  const SB_EVAL = {                                        // 分供商评价分析（Axure：分供商评级）
    cats: ['优秀', '良好', '合格', '不合格'],
    data: [25793, 15464, 12866, 7731], pct: [41.70, 25.00, 20.80, 12.50]   // 四档之和 = 在库 61,854
  };
  /* 引进分供商转化与留存（CSV：新引进 = 新增入库；分片 = 中标 / 未中标且未出库 / 出库，三者之和 = 新引进） */
  const SB_CONVERT = [
    { name: '中标分供商', label: '中标 7,822 家（79.40%）', value: 7822, color: '#2468F2' },
    { name: '未中标且未出库', label: '未中标且未出库 1,642 家（16.67%）', value: 1642, color: '#F2B04A' },
    { name: '出库分供商', label: '出库 387 家（3.93%）', value: 387, color: '#EE7B8B' }
  ];
  /* 分供商流失情况分析（CSV：出库分供商中「合作满五年 / 未满五年」，两者之和 = 出库 7,391） */
  const SB_LOSS = [
    { name: '合作满五年', label: '合作满 5 年 1,999 家（27.05%）', value: 1999, color: '#17B98A' },
    { name: '合作未满五年', label: '合作未满 5 年 5,392 家（72.95%）', value: 5392, color: '#2468F2' }
  ];
  const SB_YEARS = {                                       // 合作年限分析
    cats: ['华中公司', '总承包公司', '发展建设分公司', '东北公司', '华北公司', '投资公司', '华南公司'],
    data: [1984, 1500, 1783, 631, 984, 798, 783]
  };
  /* 分供商履约情况分析（双轴）：各二级单位当前自然年内结算金额（万元）与存在履约的分供商数量。
     金额与数量的单位均值都对齐全局 236.97 万元/家（489.22 亿元 ÷ 20,645 家），
     7 个单位合计占全局 46.83%，与「二级单位数量之和 ≤ 履约分供商总数」自洽 */
  const SB_PERF = {
    cats: ['华中公司', '上海公司', '总承包公司', '华南公司', '北京公司', '东北公司', '土木公司'],
    amt: [467818, 379311, 372182, 300010, 295816, 244046, 231866],
    cnt: [1974, 1601, 1571, 1266, 1248, 1030, 978]
  };

  function sbChart(id, h) {
    return '<div class="dsc-chart" id="' + id + '" style="height:' + (h || 240) + 'px"></div>';
  }
  function sbKpiCards() {
    return '<div class="ck-metrics ck-metrics--4">' + SB_IND.map(function (k, ki) {
      k.key = 'k' + ki;
      const good = k.good;
      return '<div class="ck-metriccard ck-metriccard--kpi" data-sb-ind="' + k.key + '" ' +
        'data-sb-go="' + k.go + '" title="点击查看相关区块">' +
        '<div class="ck-kpi__head"><span class="ck-kpi__name">' + esc(k.name) + '</span>' +
        '<span class="ck-kpi__trend ck-kpi__trend--' + (good ? 'good' : 'bad') + '">' +
        (k.trend > 0 ? '↑' : '↓') + Math.abs(k.trend).toFixed(1) + '%</span></div>' +
        '<div class="ck-metriccard__value">' + esc(k.value) + '<span>' + esc(k.unit) + '</span></div>' +
        '<div class="ck-kpi__sub">上年度 ' + esc(k.last) + ' ' + esc(k.unit) +
        (k.extra ? '　·　' + esc(k.extra) : '') + '</div></div>';
    }).join('') + '</div>';
  }
  /* 看板顶部统一筛选条（源图：本级库 / 日期选择 / 物料分类） */
  function sbFilter(extra) {
    return '<div class="ck-filter"><div class="ck-filter__row">' +
      field('本级库', '') +
      '<div class="ck-filter__item"><span class="ck-filter__label">日期选择</span>' +
      '<span class="ck-field ck-field--date">2025-06-01 ~ 2026-05-31</span></div>' +
      (extra || '') + field('物料分类', '') +
      '</div>' + actions() + '</div>';
  }

  function supplierBoardView() {
    return '<div class="ck-view ck-view--metrics">' +
      sbKpiCards() +
      sbFilter() +

      /* 分供商使用情况分析（沿用顶部筛选条件，区块内不再重复同字段） */
      section('分供商使用情况分析',
        '<div class="dsc-split dsc-split--2">' +
        /* 使用率数值属于左图：与子标题同一行、靠右对齐（标题已说明含义，不再重复「分供商使用率」） */
        '<div>' +
        '<div class="ck-subhead"><span class="ck-subhead__title">分供商使用率分析</span>' +
        '<span class="ck-subhead__extra ck-subhead__extra--rate"><b>' + SB_RATE.rate + '%</b></span></div>' +
        sbChart('sbRate', 260) + '</div>' +
        '<div>' + subHead('分供商评价分析', '分供商评级') + sbChart('sbEval', 260) + '</div>' +
        '</div>') +

      /* 转化与流失 */
      '<div class="dsc-split dsc-split--2">' +
      section('新引进分供商转化与留存分析',
        subHead('新引进后淘汰分供商数量占比', '新增入库 9,851 家') +
        sbChart('sbConvert', 280) + sbLegend(SB_CONVERT)) +
      section('分供商流失情况分析',
        subHead('出库分供商中合作满 5 年分供商占比', '出库 7,391 家') +
        sbChart('sbLoss', 280) + sbLegend(SB_LOSS)) +
      '</div>' +

      /* 合作年限分析（7 个单位名较长，保持整行，避免半栏里横轴标签互相压字） */
      section('分供商合作年限分析',
        '<div class="ck-filter"><div class="ck-filter__row">' + field('合作年限', '') +
        '</div>' +
        '<div class="ck-filter__more" hidden>' + field('本级库', '') + field('物料分类', '') + '</div>' +
        /* P0-4：更多条件必须能展开（此前是 hidden 且没有「展开」入口，两个字段永远不可达） */
        actions({ attr: 'data-ck-adv', label: '展开' }) + '</div>' +
        sbChart('sbYears', 280)) +
      section('分供商履约情况分析',
        '<div class="ck-sbsplit">' +
        '<div class="ck-sbstat"><div class="ck-sbstat__label">履约额阈值（万元）</div>' +
        /* P0-3：原输入框只聚焦不生效（死控件），改为明确的口径展示 + 说明 */
        '<div class="ck-sbstat__fixed">≥ 500</div>' +
        '<div class="ck-sbstat__big"><span>履约额超出占比数量</span><b>3,146</b> 家</div>' +
        '<div class="ck-sbstat__note">统计期内履约额 ≥ 500 万元的分供商数量</div></div>' +
        '<div class="ck-sbmain">' + sbChart('sbPerf', 300) + sbLegend([
          { name: '分供商履约金额', color: '#2468F2' }, { name: '分供商履约数量', color: '#7FC4F5' }
        ]) + '</div></div>') +

      /* 相关报表：纯图表页需要一个下钻出口（提诉 / 反向评价的明细在分供商数据报表里） */
      '<div class="dsc-card"><div class="dsc-card__body dsc-relbar">' +
      '<span class="dsc-relbar__label">相关报表</span>' +
      '<button class="dsc-btn" data-sb-go2="report" data-sb-ds="supplier">分供商数据报表</button>' +
      '<button class="dsc-btn" data-sb-go2="compliance">供应商合规分析</button>' +
      '<span class="dsc-relbar__hint">本页为概览型看板；提诉与反向评价明细见「分供商数据报表」</span>' +
      '</div></div>' +
      '</div>';
  }
  function sbLegend(list) {
    return '<div class="ck-legend">' + list.map(function (x) {
      return '<span><i style="background:' + x.color + '"></i>' + esc(x.label || x.name) + '</span>';
    }).join('') + '</div>';
  }

  D.pages['supplier-board'] = function () {
    return '<div class="dsc-page cockpit-page">' +
      pageHead('分供商管理看板', '核心数据 · 资源：分供商规模 / 使用 / 履约（提诉与反向评价见数据报表）') +
      scopeNote() + supplierBoardView() + '</div>';
  };

  /* ============================================================
     资产管理 › 资产管理看板
     内容基准：`资产管理看板.png`（源页面「核心数据 · 资产」，截图左下角的缩略框为 Axure 面板，忽略）
     版式：沿用已评审优化的 ck-* 语言
     ============================================================ */
  const ASB = { metric: 'turnover', page: 1, size: 10 };

  const AB_IND = [
    { key: 'turnover', name: '资产周转率', value: 73.53, unit: '%', dec: 2,
      desc: '资产周转额 ÷ 资产平均原值 × 100%', src: '物管系统资产模块' },
    { key: 'idle', name: '资产闲置率', value: 5.85, unit: '%', dec: 2,
      desc: '闲置资产原值 ÷ 资产总原值 × 100%', src: '物管系统资产模块' },
    { key: 'doneTurnover', name: '竣工项目资产周转率', value: 73.53, unit: '%', dec: 2,
      desc: '竣工项目资产周转额 ÷ 竣工项目资产平均原值 × 100%（口径待确认 Q-08）', src: '物管系统资产模块' },
    { key: 'doneIdle', name: '竣工项目资产闲置率', value: 5.85, unit: '%', dec: 2,
      desc: '竣工项目闲置资产原值 ÷ 竣工项目资产总原值 × 100%（口径待确认 Q-08）', src: '物管系统资产模块' },
    { key: 'depRate', name: '资产折旧率', value: 5.85, unit: '%', dec: 2,
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

  /* 二级单位资产周转率（截图实测 10 行 + 合计） */
  /* 二级单位资产周转率：与物资看板的表分开编数（原先两表前 8 行金额完全相同），
     21 个二级单位 × 分页 = 真实数据 */
  const AB_RANK = [
    ['一公司', 24180.60, 26840.47, 8.35],
    ['二公司', 23092.47, 25632.65, 7.93],
    ['三公司', 22053.31, 24479.18, 7.51],
    ['四公司', 21060.91, 23377.61, 7.09],
    ['东北公司', 20113.17, 22325.62, 6.67],
    ['总承包公司', 19208.08, 21320.97, 6.25],
    ['南方公司', 18343.72, 20361.52, 5.83],
    ['西南公司', 17518.25, 19445.26, 5.41],
    ['华南公司', 16729.93, 18570.22, 4.99],
    ['华北公司', 15977.08, 17734.56, 4.57],
    ['土木公司', 14379.37, 15961.10, 4.02],
    ['安装公司', 12941.44, 14364.99, 3.47],
    ['华东公司', 11647.29, 12928.49, 2.92],
    ['西北公司', 10482.56, 11635.64, 2.37],
    ['西南建设', 9434.31, 10472.08, 1.82],
    ['八局建投', 8490.88, 9424.87, 1.27],
    ['发展建设分公司', 7641.79, 8482.38, 1.20],
    ['装饰公司', 6877.61, 7634.15, 1.20],
    ['轨道公司', 6189.85, 6870.73, 1.20],
    ['北京公司', 5570.86, 6183.66, 1.20],
    ['文旅博览公司', 5013.78, 5565.29, 1.20]
  ];
  /* 合计取全部 21 行之和；比率类指标不可累加 */
  const AB_RANK_TOTAL = ['296,947.26', '329,611.44'];
  const AB_RANK_N = AB_RANK.length;
  /* 二级单位资产周转率明细的动态列（Axure 局驾驶舱核心数据 · 资产「设置列」口径） */
  const AB_COLS = [
    { key: 'org2', name: '二级单位', width: 160 },
    { key: 'outAmt', name: '项目调出资产总金额（万元）', width: 220, num: true },
    { key: 'totalAmt', name: '项目资产总金额（万元）', width: 200, num: true },
    { key: 'rate', name: '资产周转率（%）', width: 150, num: true, danger: true },
    { key: 'share', name: '调出占资产额比（%）', width: 170, num: true, pct: true }
  ];
  const AB_COLS_DEF = ['idx', 'org2', 'outAmt', 'totalAmt', 'rate'];
  /* 资产类别构成：源图未标数值，按扇区比例估算（见 原型设计说明 §5.2e） */
  const AB_PIE = [
    { key: 'lift', name: '电梯', value: 42 }, { key: 'box', name: '临建设施-箱式房', value: 20 },
    { key: 'printer', name: '办公设施-打印机', value: 12 }, { key: 'demolish', name: '安装拆除费', value: 7 },
    { key: 'hammer', name: '电锤', value: 5 }, { key: 'ac', name: '办公设施-空调', value: 4 },
    { key: 'hydrant', name: '消火栓等', value: 3.5 }, { key: 'light', name: '投光灯', value: 3 },
    { key: 'powerbox', name: '临时配电箱', value: 2 }, { key: 'transformer', name: '变压器', value: 1.5 }
  ];
  /* 资产原值 / 调出金额 / 周转率（截图实测） */
  const AB_COMBO = {
    cats: ['土木公司总部', '第一分公司', '西北公司总部', '第四分公司', '山东公司', '华东分公司', '南方分公司', '第二分公司'],
    cost: [1.45, 1.20, 0.90, 0.70, 0.65, 0.62, 0.62, 0.58],
    out: [0.12, 0.12, 0.03, 0.02, 0.02, 0.02, 0.02, 0.05],
    rate: [0, 7.5, 0.5, 0.3, 0.5, 0.2, 0.4, 10.5]
  };

  /* 资产看板 5 个指标 → 指标字段模型（周转率 / 闲置率 / 折旧率三套口径） */
  const AB_METRIC_MAP = {
    turnover: 'assetTurnover', doneTurnover: 'assetTurnover',
    idle: 'assetIdle', doneIdle: 'assetIdle', depRate: 'assetDepRate'
  };
  function abRankTable() {
    /* R2：受限视角只返回本单位行 */
    const scope = D.scope.name;
    const all = AB_RANK.filter(function (r) {
      return D.scope.level === 1 || r[0].indexOf(scope.replace(/公司$/, '')) >= 0;
    });
    const pages = Math.max(1, Math.ceil(all.length / ASB.size));
    if (ASB.page > pages) ASB.page = pages;
    const rows = all.slice((ASB.page - 1) * ASB.size, (ASB.page - 1) * ASB.size + ASB.size);
    const metric = AB_METRIC_MAP[ASB.metric] || 'assetTurnover';
    const factor = ASB.metric === 'idle' || ASB.metric === 'doneIdle' ? 1
      : ASB.metric === 'depRate' ? 2 : 0;
    const data = rows.map(function (r) {
      const base = D.reportUnitMetrics(r[0]) || {};
      const total = D.round((base.sum || 1e9) / 1e4 * 1.4, 2);
      const rate = r[3];
      if (metric === 'assetIdle') return { name: r[0], idleAmt: D.round(total * rate / 100, 2), totalAmt: total, rate: rate };
      if (metric === 'assetDepRate') return { name: r[0], depAmt: D.round(total * rate / 100, 2), origAmt: D.round(total * 1.15, 2), rate: rate };
      return { name: r[0], outAmt: r[1], totalAmt: r[2], rate: rate };
    });
    return metricListTable({ metric: metric, rows: data, ds: 'asset',
      page: ASB.page, size: ASB.size, totalName: '全部 ' + AB_RANK_N + ' 个单位' });
  }

  function assetBoardView() {
    const m = abMetric(ASB.metric);
    return '<div class="ck-view ck-view--metrics">' +
      /* 5 指标卡（与页签双向联动） */
      '<div class="ck-metrics ck-metrics--5">' + AB_IND.map(function (x) {
        return '<div class="ck-metriccard' + (ASB.metric === x.key ? ' ck-metriccard--active' : '') +
          '" data-ab-metric="' + x.key + '">' +
          '<div class="ck-metriccard__value">' + D.fmtNum(x.value, x.dec) +
          '<span>' + esc(x.unit) + '</span></div>' +
          '<div class="ck-metriccard__label">' + esc(x.name) + '</div></div>';
      }).join('') + '</div>' +

      /* 筛选条 */
      '<div class="ck-filter ck-filter--panel">' +
      '<div class="ck-filter__row">' +
      field('项目类型', '') + field('项目业态', '') + field('项目状态', '') + field('承包模式', '') +
      '</div><div class="ck-filter__row">' +
      '<div class="ck-filter__item"><span class="ck-filter__label">日期选择</span>' +
      '<span class="ck-grain" data-ck-grain="日期选择">' + esc(CS.settleGrain) + CARET + '</span>' +
      '<span class="ck-field ck-field--date">2025-06-01 ~ 2026-05-31</span></div>' +
      field('地区', '') + field('组织', '') + field('物料分类', '') +
      '</div>' + actions() + '</div>' +

      /* 指标页签 + 红色趋势 */
      '<div class="ck-tabsrow">' + AB_IND.map(function (x) {
        return '<div class="ck-tab' + (ASB.metric === x.key ? ' ck-tab--active' : '') +
          '" data-ab-tab="' + x.key + '">' + esc(x.name) + '</div>';
      }).join('') + '</div>' +
      subHead(m.name + '随时间变化的趋势') +
      '<div class="dsc-chart" id="abTrend" style="height:280px"></div>' +

      /* 二级单位资产周转率 */
      section('二级单位资产周转率',
        '<div class="ck-filter">' +
        '<div class="ck-filter__row">' +
        '<div class="ck-filter__item"><span class="ck-filter__label">日期选择</span>' +
        '<span class="ck-grain" data-ck-grain="日期选择">' + esc(CS.settleGrain) + CARET + '</span>' +
        '<span class="ck-field ck-field--date">2025-06-01 ~ 2026-05-31</span></div>' +
        field('实施单位', '') + field('物料小类', '') +
        '</div><div class="ck-filter__row">' +
        field('项目类型', '') + field('项目状态', '') + field('项目业态', '') + field('承包模式', '') +
        '</div>' + actions() + '</div>' +
        '<div class="dsc-card u-mb-lg"><div class="dsc-card__header">' +
        '<div class="dsc-card__title">二级单位资产周转率明细</div>' +
        '<div class="dsc-card__extra">共 ' + AB_RANK_N + ' 个二级单位　' +
        D.colGear('data-ab-columns', '设置列：本指标的明细列表字段（基本信息 + 指标信息）') + '</div></div>' +
        abRankTable() +
        '<div data-ab-pager>' + D.pager({ page: ASB.page, size: ASB.size, total: AB_RANK_N }) + '</div>' +
        '</div>') +

      /* 项目资产类别资产周转率 */
      section('项目资产类别资产周转率',
        '<div class="dsc-split dsc-split--2 u-mt-lg">' +
        '<div>' + subHead('资产类别构成', '按资产原值占比估算') + '<div class="dsc-chart" id="abPie" style="height:320px"></div></div>' +
        '<div>' + subHead('资产原值 / 调出金额 / 周转率', '单位：亿元 / %') +
        '<div class="dsc-chart" id="abCombo" style="height:320px"></div>' +
        '<div class="ck-legend">' +
        '<span><i style="background:#2468F2"></i>资产原值金额</span>' +
        '<span><i style="background:#7FC4F5"></i>资产调出金额</span>' +
        '<span><i class="ck-legend__line ck-legend__line--green"></i>资产周转率</span>' +
        '</div></div></div>') +
      '</div>';
  }

  D.pages['asset-board'] = function () {
    return '<div class="dsc-page cockpit-page">' +
      pageHead('资产管理看板', '核心数据 · 资产：资产周转率 / 闲置率 / 折旧率与二级单位明细') +
      scopeNote() + assetBoardView() + '</div>';
  };

  /* ============================================================
     渲染后绑定
     ============================================================ */
  D.pages.cockpit.after = function (root) {
    overviewAfter(root);
    commonAfter(root);
  };
  D.pages['purchase-board'].after = function (root) {
    metricsAfter(root);
    commonAfter(root);
    /* 二级单位明细：设置列（齿轮）——真正改变表格字段，不只是弹提示 */
    D.delegate(root, [
      { sel: '[data-pb-cols]', fn: function () {
        metricColPicker(CS.metric, METRICS.filter(function (x) { return x.key === CS.metric; })[0].name +
          ' · 指标明细列表');
      } }
    ]);
  };
  D.pages['material-board'].after = function (root) {
    materialBoardAfter(root);
    commonAfter(root);
  };
  D.pages['supplier-board'].after = function (root) {
    supplierBoardAfter(root);
    commonAfter(root);
  };
  D.pages['asset-board'].after = function (root) {
    assetBoardAfter(root);
    commonAfter(root);
  };

  /* ---------- 资产管理看板 ---------- */
  function assetBoardAfter(root) {
    bindMetricTips(root, AB_IND, 'data-ab-metric');

    const trend = root.querySelector('#abTrend');
    if (trend) {
      const m = abMetric(ASB.metric);
      D.lineChart(trend, {
        categories: AB_MONTHS,
        series: [{ name: m.name, data: abMetricTrend(m), color: '#D0021B' }]
      }, { height: 280, area: false, lineWidth: 1.8, dotR: 3.5, unit: m.unit, tipDigits: 2,
        dataLabels: true, labelDigits: 2, padL: 64 });
    }

    const pie = root.querySelector('#abPie');
    if (pie) D.pieChart(pie, AB_PIE, { height: 320 });

    const combo = root.querySelector('#abCombo');
    if (combo) {
      D.barChart(combo, {
        categories: AB_COMBO.cats,
        series: [
          { name: '资产原值金额', data: AB_COMBO.cost, color: '#2468F2', unit: '亿' },
          { name: '资产调出金额', data: AB_COMBO.out, color: '#7FC4F5', unit: '亿' },
          { name: '资产周转率', data: AB_COMBO.rate, color: '#17B98A', type: 'line' }
        ]
      }, { height: 320, yDigits: 2, padR: 64, dataLabels: false });
    }

    D.delegate(root, [
      { sel: '[data-ab-metric]', fn: function (el) { ASB.metric = el.getAttribute('data-ab-metric'); D.render(); } },
      { sel: '[data-ab-tab]', fn: function (el) { ASB.metric = el.getAttribute('data-ab-tab'); D.render(); } },
      { sel: '[data-ab-columns]', fn: function () {
        const k = AB_METRIC_MAP[ASB.metric] || 'assetTurnover';
        metricColPicker(k, abMetric(ASB.metric).name + ' · 指标明细列表');
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

  /* ---------- 分供商管理看板 ---------- */
  function supplierBoardAfter(root) {
    bindMetricTips(root, SB_IND, 'data-sb-ind');
    function el(id) { return root.querySelector('#' + id); }
    function bar(id, cats, series, opt) {
      const box = el(id);
      if (box) D.barChart(box, { categories: cats, series: series }, Object.assign({}, SB_BAR, opt || {}));
    }
    function donut(id, rows, centerValue) {
      const box = el(id);
      if (box) D.donutChart(box, rows, {
        height: 280, hole: 0.6, centerText: '合计', centerValue: centerValue, digits: 0
      });
    }
    /* 分供商使用情况 */
    bar('sbRate', SB_RATE.cats, [{ name: '分供商数量', data: SB_RATE.data, color: SB_BLUE }],
      { unit: '家', yDigits: 0, yUnit: '家', dataLabels: false,
        categoryTopLabels: SB_RATE.data.map(function (v, i) {
          return D.fmtInt(v) + '家' + (SB_RATE.rates[i] ? '(' + SB_RATE.rates[i].toFixed(2) + '%)' : '');
        }) });
    bar('sbEval', SB_EVAL.cats, [{ name: '分供商数量', data: SB_EVAL.data, color: SB_BLUE }],
      { unit: '家', yDigits: 0, yUnit: '家', dataLabels: false,
        categoryTopLabels: SB_EVAL.data.map(function (v, i) { return D.fmtInt(v) + '家(' + SB_EVAL.pct[i].toFixed(2) + '%)'; }) });
    /* 转化与流失 */
    donut('sbConvert', SB_CONVERT, '9,851 家');
    donut('sbLoss', SB_LOSS, '7,391 家');
    /* 合作年限 / 履约情况 */
    bar('sbYears', SB_YEARS.cats, [{ name: '超合作年份供应商数量', data: SB_YEARS.data, color: SB_BLUE }],
      { unit: '家', yDigits: 0, yUnit: '家' });
    bar('sbPerf', SB_PERF.cats, [
      { name: '分供商履约金额', data: SB_PERF.amt, color: SB_BLUE, unit: '万元' },
      { name: '分供商履约数量', data: SB_PERF.cnt, color: '#7FC4F5', unit: '家', axis: 'right' }
    ], { height: 300, yDigits: 0, rDigits: 0, padL: 78, padR: 64, dataLabels: false, yUnit: '万元' });

    D.delegate(root, [
      { sel: '[data-sb-go2]', fn: function (el2) {
        const p2 = el2.getAttribute('data-sb-go2');
        const ds = el2.getAttribute('data-sb-ds');
        D.nav(p2, ds ? { ds: ds } : {});
      } },
      /* 指标卡点击 → 滚到对应区块（原先卡片有手型光标但点了没反应） */
      { sel: '[data-sb-go]', fn: function (el2) {
        const secs = root.querySelectorAll('.ck-sec');
        const t = secs[+el2.getAttribute('data-sb-go')];
        if (!t) return;
        t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        t.classList.add('ck-sec--flash');
        setTimeout(function () { t.classList.remove('ck-sec--flash'); }, 1200);
      } }
    ]);
  }

  /* ---------- 物资管理看板 ---------- */
  function materialBoardAfter(root) {
    bindMetricTips(root, MB_METRICS, 'data-mb-metric');
    bindMetricTips(root, MB_SAVE, 'data-mb-save');      // 六项降本卡片的金额/占比口径气泡
    const m = mbMetric(MS.metric);
    const trend = root.querySelector('#mbTrend');
    if (trend) {
      D.lineChart(trend, {
        categories: MB_MONTHS,
        series: [{ name: m.name, data: mbMetricTrend(m), color: '#D0021B' }]
      }, { height: 280, area: false, lineWidth: 1.8, dotR: 3.5, unit: m.unit, tipDigits: 2,
        dataLabels: true, labelDigits: 2, padL: 56 });
    }

    /* 降本明细项查询（复选项，默认全选）：勾选即生效，卡片 / 趋势 / 清单都按勾选范围取数 */
    const itemMs = root.querySelector('[data-ms][data-name="降本明细项查询"]');
    if (itemMs) {
      const q2 = function (v) { return itemMs.querySelector('input[value="' + v + '"]'); };
      /* 大项勾选 → 整组联动；小项 → 回写大项「整组勾上才亮」 */
      const syncMs = function (cb) {
        if (MB_SAVE_TYPES.indexOf(cb.value) >= 0) {
          MB_SAVE_SUBS.forEach(function (x) {
            if (x[2] !== cb.value) return;
            const c = q2(x[0]);
            if (c) c.checked = cb.checked;
          });
        } else if (MB_ITEM_PARENT[cb.value]) {
          const p = MB_ITEM_PARENT[cb.value];
          const all = MB_SAVE_SUBS.filter(function (x) { return x[2] === p; })
            .every(function (x) { const c = q2(x[0]); return c && c.checked; });
          const pc = q2(p);
          if (pc) pc.checked = all;
        }
      };
      const applyMs = function () {
        const box = root.querySelector('[data-ms][data-name="降本明细项查询"]');
        if (!box) return;
        const items = [];
        MB_ALL_SUBS.forEach(function (k) {
          const c = box.querySelector('input[value="' + k + '"]');
          if (c && c.checked) items.push(k);
        });
        MS.msOpen = box.classList.contains('dsc-multiselect--open');
        if (items.join(',') === mbItemSel().join(',')) return;
        MS.items = items;
        MS.detailPage = 1;
        D.render();
      };
      itemMs.addEventListener('change', function (e) {
        if (e.target.type !== 'checkbox') return;
        syncMs(e.target);
        applyMs();
      });
      itemMs.addEventListener('click', function (e) {
        const all = e.target.closest('[data-ms-all]');
        const none = e.target.closest('[data-ms-none]');
        if (all || none) {
          /* 全选 / 清空：D.bindMultiselect 的委托处理挂在容器上、晚于本监听器，这里自己先落勾选态 */
          itemMs.querySelectorAll('input[type=checkbox]').forEach(function (c) { c.checked = !!all; });
          MS.msOpen = true;
          MS.items = all ? MB_ALL_SUBS.slice() : [];
          MS.detailPage = 1;
          D.render();
          return;
        }
        /* 点 chip 上的 ✕ 删除：委托处理随后才取消勾选，延后一拍再取状态 */
        if (e.target.closest('[data-ms-del]')) setTimeout(function () {
          const box = root.querySelector('[data-ms][data-name="降本明细项查询"]');
          if (!box) return;
          const items = [];
          MB_ALL_SUBS.forEach(function (k) {
            const c = box.querySelector('input[value="' + k + '"]');
            if (c && c.checked) items.push(k);
          });
          MS.msOpen = true;
          MS.items = items;
          MS.detailPage = 1;
          D.render();
        }, 0);
      });
    }

    /* 降本金额正负：选完立即生效（列表就地过滤） */
    const signSel = root.querySelector('[data-ck-field="降本金额正负"]');
    if (signSel) {
      signSel.value = MS.sign;
      signSel.addEventListener('change', function () {
        MS.sign = signSel.value || '全部';
        MS.detailPage = 1;
        D.render();
        D.toast('降本金额筛选：' + MS.sign);
      });
    }

    const save = root.querySelector('#mbSave');
    if (save) {
      /* 趋势跟随「降本明细项」勾选范围收窄：月度金额与大项同形，按「勾选范围 ÷ 全量」缩放；
         占比同理（同一产值分母，缩放系数相同）。只勾一个小项时就是该明细项的口径 */
      const f = mbCardAmt(MS.save) ? mbScopeAmt(MS.save) / mbCardAmt(MS.save) : 1;
      const barName = mbScopeKey() ? mbItemName(mbScopeKey()) : mbSave(MS.save).name;
      /* 金额（柱，左轴）+ 占项目确权产值（线，右轴）：一张图同时读金额与占比两条趋势 */
      /* 与上方「核心指标随时间变化的趋势」同一套语言：金额用蓝柱，占比用红线；
         横轴月份带年度（2025.04 …），与上方图表一致 */
      D.comboChart(save, {
        categories: MB_MONTHS,
        series: [
          { name: barName, data: mbSaveTrend(MS.save).map(function (v) { return D.round(v * f, 2); }),
            type: 'bar', color: '#2468F2', color2: '#7FC4F5', unit: '万元' },
          { name: '占项目确权产值', data: mbSaveRateTrend(MS.save).map(function (v) { return D.round(v * f, 2); }),
            type: 'line', axis: 'right', color: '#D0021B' }
        ].filter(function (se, i) { return !MS.hide[i]; })
      }, { height: 280, dataLabels: true, yDigits: 0, yUnit: '万元', y2Unit: '%', padL: 64,
        rotateX: 0, rDigits: 2, lineLabelUnit: '%', barLabelRaw: true });
    }

    /* 列头 ⓘ：悬停 / 点击弹口径气泡（与指标卡同一套气泡） */
    Object.keys(MB_COL_TIPS).forEach(function (k) {
      const el = root.querySelector('[data-col-info="' + k + '"]');
      if (el) D.metricTip(el, MB_COL_TIPS[k]);
    });

    const rec = root.querySelector('#mbRecycle');
    if (rec) {
      D.barChart(rec, {
        categories: MB_RECYCLE.map(function (r) { return r[0]; }),
        series: [
          { name: '物质调拨金额', data: MB_RECYCLE.map(function (r) { return r[1]; }), color: '#2468F2' },
          { name: '废旧物资处理金额', data: MB_RECYCLE.map(function (r) { return r[2]; }), color: '#7FC4F5' }
        ]
      }, { height: 320, dataLabels: true, yDigits: 0 });
    }

    D.delegate(root, [
      /* 指标卡 ↔ 页签 双向联动 */
      { sel: '[data-mb-metric]', fn: function (el) { MS.metric = el.getAttribute('data-mb-metric'); D.render(); } },
      { sel: '[data-mb-tab]', fn: function (el) { MS.metric = el.getAttribute('data-mb-tab'); D.render(); } },
      /* 六项降本：切卡换曲线 */
      { sel: '[data-mb-save]', fn: function (el) {
        /* 点卡片 = 切换看哪个口径（合计 / 某大项）；「降本明细项」的勾选范围保持不变 */
        MS.save = el.getAttribute('data-mb-save');
        MS.detailPage = 1;
        D.render();
      } },
      /* 卡片区右上角：放大「降本金额」/「产值占比」 */
      { sel: '[data-mb-kpimode] .dsc-tabs__item', fn: function (el) {
        const m = el.getAttribute('data-km');
        if (MS.kpiMode === m) return;
        MS.kpiMode = m;
        D.render();
      } },
      /* 六项降本趋势图：点图例点亮 / 熄灭对应系列 */
      { sel: '[data-mb-legend]', fn: function (el) {
        const i = +el.getAttribute('data-mb-legend');
        MS.hide[i] = !MS.hide[i];
        D.render();
      } },
      /* 降本明细：设置列（齿轮）——真正改变表格字段 */
      { sel: '[data-mb-columns]', fn: function () {
        const key = MS.save;
        D.openColPicker({
          key: 'mb-save-' + key, title: mbSave(key).name + ' · 降本明细清单',
          /* 组织链（排名 / 二级单位 / 三级单位 / 项目名称）作为固定列，不进可选清单 */
          all: mbSaveCols(key).filter(function (c) { return MB_FIXED_COLS.indexOf(c.key) < 0; }),
          def: mbSaveDef(key), after: D.render
        });
      } },
      /* 降本明细：本页内下钻（点单位 / 项目名就地过滤，不跳报表） */
      { sel: '[data-mb-drill]', fn: function (el) {
        const pr = el.getAttribute('data-mb-drill').split('|');
        const lv = pr[0], v = pr[1] || '';
        if (lv === 'all') MS.drill = { org2: '', org3: '', project: '' };
        else if (lv === 'org2') MS.drill = { org2: v, org3: '', project: '' };
        else if (lv === 'org3') MS.drill = { org2: MS.drill.org2, org3: v, project: '' };
        else MS.drill = { org2: MS.drill.org2, org3: MS.drill.org3, project: v };
        MS.detailPage = 1;
        D.render();
        D.toast(lv === 'all' ? '已回到全部单位' : '已下钻到「' + v + '」');
      } },
      { sel: '[data-mb-drill-back]', fn: function () {
        if (MS.drill.project) MS.drill.project = '';
        else if (MS.drill.org3) MS.drill.org3 = '';
        else MS.drill = { org2: '', org3: '', project: '' };
        MS.detailPage = 1;
        D.render();
        D.toast('已返回上一级');
      } },
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

  /* 两个视图共用的交互绑定 */
  function commonAfter(root) {
    /* 字段口径提示（ⓘ） */
    root.querySelectorAll('[data-ck-info]').forEach(function (el) {
      const def = FIELD_TIP[el.getAttribute('data-ck-info')];
      if (def) D.metricTip(el, def);
    });

    /* 通用：区块收起 / 展开 */
    root.querySelectorAll('[data-ck-collapse]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const sec = btn.closest('.ck-sec');
        sec.classList.toggle('ck-sec--collapsed');
      });
    });
    /* 通用：查询 / 清空 / 重置 / 高级筛选 / 日期粒度 */
    D.delegate(root, [
      /* C1：看板 → 报表的入口。带 org 跳转即切到该单位的组织视角，
         报表随 R2 只显示本单位数据（与「组织视角」是同一套权限开关，符合系统语义） */
      { sel: '[data-goto-report]', fn: function (el) {
        const ds = el.getAttribute('data-goto-report');
        const org = el.getAttribute('data-goto-org');
        D.toast('打开' + ({ purchase: '采购', material: '物资', asset: '资产' }[ds] || '') +
          '数据报表，组织视角切换至 ' + org);
        D.nav('report', { ds: ds, org: org });
      } },
      { sel: '[data-ck-query]', fn: function (el) {
        const box = el.closest('.ck-filter');
        if (!box) return;
        const conds = readConds(box);
        showConds(el, conds);
        /* 提示里的日期取当前筛选条实际展示的范围，而不是全局默认值 */
        const dt = box.querySelector('.ck-field--date');
        D.toast('查询完成' + (dt ? '：' + dt.textContent.trim() : '') +
          '，已记录条件 ' + conds.length + ' 项');
      } },
      { sel: '[data-ck-clear]', fn: function (el) {
        const box = el.closest('.ck-filter');
        if (box) {
          box.querySelectorAll('[data-ck-field]').forEach(function (f) { f.value = ''; });
          box.querySelectorAll('.ck-field--date').forEach(function (d) { d.textContent = '　~　'; });
        }
        showConds(el, []);
      } },
      { sel: '[data-ck-reset]', fn: function () { D.toast('已重置查询条件'); D.render(); } },
      { sel: '[data-ck-adv]', fn: function (el) {
        /* 展开状态按「本筛选条」自己的 DOM 判定，不再用全局 CS.advanced：
           一页里有多条筛选（F3 项目驾驶舱最多 8 条）时，全局标志会让第二条的首次点击变成收起 */
        const more = el.closest('.ck-filter').querySelector('.ck-filter__more');
        const open = more ? more.hidden : false;
        if (more) more.hidden = !open;
        /* 只在本筛选条内生效：不再回写全局 CS.advanced（多条筛选 / 跨页重绘会串状态） */
        el.classList.toggle('ck-link--on', open);
        /* 文案跟着状态走：展开 ↔ 收起（与数据报表页筛选条一致） */
        if (el.firstChild && el.firstChild.nodeType === 3) {
          el.firstChild.nodeValue = open ? '收起' : '展开';
        }
      } },
      { sel: '[data-ck-grain]', fn: function (el) {
        const label = el.getAttribute('data-ck-grain');
        const next = { '日': '月', '月': '季', '季': '年', '年': '日' };
        const nv = next[el.textContent.trim()] || '日';
        if (label === '结算日期') CS.settleGrain = nv; else CS.inGrain = nv;
        el.innerHTML = nv + CARET;
        D.toast(label + ' 粒度切换为「' + nv + '」');
      } }
    ]);

  }

  D.ckCommonAfter = commonAfter;   // 合规看板等页面复用同一套筛选条交互

  /* ---------- 局级驾驶舱 ---------- */
  function overviewAfter(root) {
    const pie = root.querySelector('#ckPie');
    if (pie) D.pieChart(pie, SETTLE_MIX, { height: 330, unit: '亿', digits: 2, hole: 0 });

    /* 物资进场数据：金额/数量柱 + 均价线 */
    const cats = MAT_SMALLS.slice(0, 20);
    const rnd = D.seedRand(20261008);
    const amt = cats.map(function (c, i) { return D.round(i === 0 ? 16.19 : 2 + rnd() * 14, 2); });
    const qty = cats.map(function () { return D.round(200 + rnd() * 1400, 2); });
    const price = cats.map(function () { return D.round(180 + rnd() * 3200, 2); });
    const inData = root.querySelector('#ckInData');
    if (inData) {
      D.comboChart(inData, {
        categories: cats,
        series: [
          { name: '金额', data: amt, type: 'bar', color: '#2F80ED', color2: '#2F80ED', unit: '亿元' },
          { name: '数量', data: qty.map(function (v) { return v / 20; }), type: 'bar', axis: 'right',
            color: '#34A853', color2: '#7FC8F1', unit: '万个' },
          { name: '均价', data: price, type: 'line', color: '#D0021B' }
        ].filter(function (se, i) { return !(CS_LEGEND.in || {})[i]; })
      }, { height: 340, rotateX: 45, yDigits: 0, yUnit: '亿元', y2Unit: '万个', padB: 96 });
    }

    /* 物资小类四卡环图 */
    MAT_CARDS.forEach(function (c, i) {
      const el = root.querySelector('#ckRing' + i);
      if (el) D.ringChart(el, c.pct, { size: 100 });
    });
    D.delegate(root, [
      /* 多坐标柱状图（物资进场数据 + 三级物资分析）：点图例点亮 / 熄灭对应系列 */
      { sel: '[data-ck-legend]', fn: function (el) {
        const pr = el.getAttribute('data-ck-legend').split('|');
        const key = pr[0], i = +pr[1];
        if (!CS_LEGEND[key]) CS_LEGEND[key] = {};
        CS_LEGEND[key][i] = !CS_LEGEND[key][i];
        D.render();
      } },
      { sel: '[data-ck-matcard]', fn: function (el) {
      CS.matSmall = el.getAttribute('data-ck-matcard');
      D.render();
      D.toast('物料小类切换为「' + CS.matSmall + '」');
    } }]);

    /* 全局 / 二级 / 三级物资分析 */
    LEVELS.forEach(function (lv, i) {
      const el = root.querySelector('#ckLv' + i);
      if (!el) return;
      const labels = lv.key === 'all' ? MONTHS.slice(0, 9)
        : lv.key === 'l2' ? D.orgs.slice(0, 14).map(function (o) { return o.name.replace(/公司$/, ''); })
          : D.subOrgs.slice(0, 14).map(function (s) { return s.shortName; });
      const rnd2 = D.seedRand(3300 + i * 17);
      const a = labels.map(function (x, k) { return D.round(2 + rnd2() * 26, 2); });
      const q = labels.map(function () { return D.round(400 + rnd2() * 3000, 0); });
      const p = labels.map(function () { return D.round(300 + rnd2() * 2600, 2); });
      D.comboChart(el, {
        categories: labels,
        series: ckLegendOn('lv' + i, [
          { name: '金额', data: a, type: 'bar', color: '#2FBD8A', color2: '#7FE3B8', unit: '亿元' },
          { name: '数量', data: q.map(function (v) { return v / 10; }), type: 'bar', axis: 'right',
            color: '#7FC8F1', color2: '#CDE9FB', unit: '万吨' },
          { name: '均价', data: p, type: 'line', color: '#D0021B' }
        ])
      }, { height: 240, rotateX: lv.key === 'all' ? 0 : 40, yDigits: 0, yUnit: '亿元', y2Unit: '万吨',
        padB: lv.key === 'all' ? 44 : 72, padR: 42 });
    });
  }

  /* ---------- 指标总览-采购 ---------- */
  /* 给指标卡挂口径气泡（hover / 点击指标卡显示） */
  function bindMetricTips(root, list, attr) {
    root.querySelectorAll('[' + attr + ']').forEach(function (el) {
      const m = list.filter(function (x) { return x.key === el.getAttribute(attr); })[0];
      if (m && m.desc) D.metricTip(el, m);
    });
  }

  function metricsAfter(root) {
    bindMetricTips(root, METRICS, 'data-ck-metric');
    /* 指标卡点击 → 页签联动 */
    D.delegate(root, [
      { sel: '[data-ck-metric]', fn: function (el) { CS.metric = el.getAttribute('data-ck-metric'); D.render(); } },
      { sel: '[data-ck-tab]', fn: function (el) { CS.metric = el.getAttribute('data-ck-tab'); D.render(); } }
    ]);

    const m = metricDef(CS.metric);
    const el = root.querySelector('#ckTrend');
    if (el) {
      D.lineChart(el, {
        categories: MONTHS,
        series: [{ name: m.name, data: TREND[m.key] || TREND.costDown, color: '#D0021B' }]
      }, { height: 280, area: false, lineWidth: 1.8, dotR: 3.5, unit: m.unit, tipDigits: 2,
        dataLabels: true, labelDigits: 2, padL: 56 });
    }

    /* 招采分析 6 阶段迷你面积图 */
    PROC_STAGES.forEach(function (s, i) {
      const c = root.querySelector('#ckStage' + i);
      if (!c) return;
      const rnd = D.seedRand(5500 + i * 29);
      const base = s.value / 9;
      const vals = MONTHS.map(function (x, k) {
        const f = i === 5 && k === 6 ? 0.15 : 1;
        return D.round(base * (0.5 + rnd() * 1.4) * f, 0);
      });
      vals[vals.length - 1] = D.round(base * 1.2, 0);
      D.areaMini(c, vals, { height: 96, categories: ['2026年01月', '2026年05月', '2026年09月'] });
    });
  }
})(window.APP);
