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
      case '本级库': return ['局本级库', '二级单位本级库', '三级单位本级库'];
      case '合作年限': return ['1年以内', '1-3年', '3-5年', '5年以上'];
      case '降本类型': return ['议价降本', '消耗降本', '资产降本', '验收降本', '周转降本', '闲废降本'];
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
  /* adv：只有确实存在 .ck-filter__more 的筛选条才给「高级筛选」，否则是个点了没反应的按钮 */
  function actions(adv) {
    return '<div class="ck-filter__actions">' +
      '<span class="ck-filter__hint" hidden></span>' +
      '<button class="ck-btn ck-btn--primary" data-ck-query>查询</button>' +
      '<button class="ck-link" data-ck-clear>清空</button>' +
      '<button class="ck-link" data-ck-reset>重置</button>' +
      (adv ? '<button class="ck-link ck-link--adv" data-ck-adv>高级筛选</button>' : '') +
      '</div>';
  }
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
    hint.textContent = conds.length ? '已按 ' + conds.length + ' 个条件查询' : '未设置筛选条件，显示全部';
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
      '<div class="ck-filter__item ck-filter__item--blank"></div>' +
      actions(true) +
      '</div>' +
      '<div class="ck-filter__more" ' + (CS.advanced ? '' : 'hidden') + '>' +
      field('承包模式', '') + field('地区', '') + field('实施单位', '') +
      '</div>' +
      '</div>' +
      '<div class="dsc-chart" id="ckInData" style="height:340px"></div>' +
      '<div class="ck-legend">' +
      '<span><i style="background:#2F80ED"></i>金额</span>' +
      '<span><i style="background:#34A853"></i>数量</span>' +
      '<span><i class="ck-legend__line"></i>均价</span>' +
      '</div>' +

      subHead('物资小类分析') +
      '<div class="ck-filter">' +
      '<div class="ck-filter__row">' +
      '<div class="ck-filter__item"><span class="ck-filter__label">日期</span>' +
      '<span class="ck-field ck-field--date">' + esc(D.defaultRange[0]) + ' ~ ' + esc(D.defaultRange[1]) + '</span></div>' +
      field('省', '') + field('市', '') +
      '<div class="ck-filter__item"><span class="ck-filter__label">物料小类<b class="ck-req">*</b></span>' +
      '<span class="ck-field ck-field--ro">' + esc(CS.matSmall) + '</span></div>' +
      actions() + '</div>' +
      '</div>' +
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
          '<span><i style="background:#2FBD8A"></i>金额</span>' +
          '<span><i style="background:#7FC8F1"></i>数量</span>' +
          '<span><i class="ck-legend__line ck-legend__line--red"></i>均价</span></div>';
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
      '<div class="ck-filter__actions">' +
      '<button class="ck-btn ck-btn--primary" data-ck-query>查询</button>' +
      '<button class="ck-link" data-ck-clear>清空</button>' +
      '<button class="ck-link" data-ck-reset>重置</button>' +
      '</div></div></div>' +
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
      '<div class="ck-filter__item ck-filter__item--blank"></div>' +
      actions(true) + '</div>' +
      '<div class="ck-filter__more" ' + (CS.advanced ? '' : 'hidden') + '>' +
      field('项目状态', '') + field('承包模式', '') + field('地区', '') +
      field('组织', '') + field('物料分类', '') +
      '</div></div>' +

      '<div class="ck-tabsrow">' + METRICS.map(function (x) {
        return '<div class="ck-tab' + (CS.metric === x.key ? ' ck-tab--active' : '') + '" data-ck-tab="' + x.key + '">' +
          esc(x.name) + '</div>';
      }).join('') + '</div>' +
      '<div class="dsc-chart" id="ckTrend" style="height:280px"></div>') +

      section('二级单位明细', unitTable()) +
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

  function unitTable() {
    /* R2：受限视角下只返回本单位行（超权限行不返回） */
    const scope = D.scope.name;
    const visible = UNIT_ROWS.filter(function (r) {
      return D.scope.level === 1 || r[0].indexOf(scope.replace(/公司$/, '')) >= 0;
    });
    return '<table class="ck-table ck-table--metrics">' +
      '<thead><tr><th style="width:80px">序号</th><th>二级单位名称</th>' +
      '<th class="is-num">不含税标准成本金额（元）</th><th class="is-num">不含税采购金额（元）</th>' +
      '<th class="is-num ck-table__danger">采购成本降低率</th></tr></thead><tbody>' +
      '<tr class="ck-table__total"><td class="is-center">合计</td><td class="is-center">-</td>' +
      '<td class="is-num">1,563.19亿</td><td class="is-num">1,434.35亿</td>' +
      '<td class="is-num ck-table__danger">8.24%</td></tr>' +
      visible.map(function (r, i) {
        return '<tr><td class="is-center">' + (i + 1) + '</td><td class="is-center">' + esc(r[0]) + '</td>' +
          '<td class="is-num">' + D.fmtNum(r[1], 2) + '亿</td>' +
          '<td class="is-num">' + D.fmtNum(r[2], 2) + '亿</td>' +
          '<td class="is-num ck-table__danger">' + D.fmtNum(r[3], 2) + '%</td></tr>';
      }).join('') + '</tbody></table>';
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
      actions(true) + '</div>' +
      '<div class="ck-filter__more"' + (CS.advanced ? '' : ' hidden') + '>' +
      field('二级单位', '') + field('三级单位', '') + field('项目名称', '') +
      '</div></div>' +
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
    metric: 'bargain',   // 顶部指标带 / 页签当前项
    save: 'total',       // 六项降本当前项
    rankPage: 1, detailPage: 1, size: 10,
    more: false
  };

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
  /* 合计取全部 21 行之和；比率类指标不可累加，合计行显示「—」 */
  const MB_RANK_TOTAL = ['41,970.07', '48,542.70'];
  const MB_TOTAL_N = MB_RANK.length;

  /* 六项降本（截图实测） */
  const MB_SAVE = [
    { key: 'total', name: '合计降本', value: '19,131.73', rate: 8.31 },
    { key: 'bargain', name: '议价降本', value: '1,317', rate: 6.88 },
    { key: 'consume', name: '消耗降本', value: '2,586', rate: 10.50 },
    { key: 'asset', name: '资产降本', value: '3,528.17', rate: 6.68 },
    { key: 'accept', name: '验收降本', value: '4,136.68', rate: 9.94 },
    { key: 'turnover', name: '周转降本', value: '2,379.51', rate: 13.47 },
    { key: 'idle', name: '闲废降本', value: '5,184.37', rate: 7.19 }
  ];
  const MB_SAVE_MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'];
  /* 截图实测：议价降本一—十二月（万元） */
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

  /* 降本明细（截图实测前 10 行） */
  const MB_DETAIL = [
    ['装饰公司', '第一分公司', '高比能项目', '滨江商务中心安装工程'],
    ['一公司', '第一分公司', '滨江商务中心安装工程', '滨江商务中心安装工程'],
    ['四公司', '第一分公司', '高比能项目', '滨江商务中心安装工程'],
    ['三公司', '第一分公司', '滨江商务中心安装工程', '滨江商务中心安装工程'],
    ['二公司', '第一分公司', '高比能项目', '滨江商务中心安装工程'],
    ['土木公司', '第一分公司', '滨江商务中心安装工程', '滨江商务中心安装工程'],
    ['新型建造公司', '第一分公司', '高比能项目', '滨江商务中心安装工程'],
    ['发展建设分公司', '第一分公司', '滨江商务中心安装工程', '滨江商务中心安装工程'],
    ['北京公司', '第一分公司', '高比能项目', '滨江商务中心安装工程'],
    ['上海公司', '第一分公司', '滨江商务中心安装工程', '滨江商务中心安装工程']
  ];
  const MB_DETAIL_COLS = [
    { key: 'idx', name: '排名', width: 70, num: true },
    { key: 'org2', name: '二级单位', width: 130 },
    { key: 'org3', name: '三级单位', width: 130 },
    { key: 'project', name: '项目', width: 200 },
    { key: 'unit', name: '实施单位', width: 230 },
    { key: 'month', name: '统计月份', width: 110 },
    { key: 'code', name: '单号', width: 190 },
    { key: 'saveAmt', name: '降本额（万元）', width: 140, num: true },
    { key: 'saveRate', name: '降本率', width: 100, pct: true }
  ];
  function mbDetailRows() {
    return MB_DETAIL.map(function (r, i) {
      return {
        org2: r[0], org3: r[1], project: r[2], unit: '中建八局二公司第一分公司',
        month: '2026-04', code: 'LXJB-20260310-000001',
        saveAmt: D.round(2874.19 - i * 173.42, 2), saveRate: D.round(4.5 + i * 0.62, 2)
      };
    });
  }

  function mbRankTable() {
    /* R2：受限视角只返回本单位行 */
    const scope = D.scope.name;
    const all = MB_RANK.filter(function (r) {
      return D.scope.level === 1 || r[0].indexOf(scope.replace(/公司$/, '')) >= 0;
    });
    const pages = Math.max(1, Math.ceil(all.length / MS.size));
    if (MS.rankPage > pages) MS.rankPage = pages;
    const visible = all.slice((MS.rankPage - 1) * MS.size, (MS.rankPage - 1) * MS.size + MS.size);
    return '<table class="ck-table ck-table--metrics"><thead><tr>' +
      '<th style="width:80px">排名</th><th>二级单位</th>' +
      '<th class="is-num">二次议价成本降低额（万元）</th><th class="is-num">总采购金额（万元）</th>' +
      '<th class="is-num ck-table__danger">二次议价成本降低率</th></tr></thead><tbody>' +
      visible.map(function (r, i) {
        return '<tr><td class="is-center">' + ((MS.rankPage - 1) * MS.size + i + 1) + '</td><td class="is-center">' + esc(r[0]) + '</td>' +
          '<td class="is-num">' + D.fmtNum(r[1], 2) + '</td>' +
          '<td class="is-num">' + D.fmtNum(r[2], 2) + '</td>' +
          '<td class="is-num ck-table__danger">' + D.fmtNum(r[3], 2) + '%</td></tr>';
      }).join('') +
      '<tr class="ck-table__total"><td class="is-center">合计</td><td class="is-center">全部 ' + MB_TOTAL_N + ' 个单位</td>' +
      '<td class="is-num">' + MB_RANK_TOTAL[0] + '</td><td class="is-num">' + MB_RANK_TOTAL[1] + '</td>' +
      '<td class="is-num ck-table__danger" title="比率类指标不可累加">—</td></tr>' +
      '</tbody></table>';
  }

  function materialBoardView() {
    const m = mbMetric(MS.metric);
    return '<div class="ck-view ck-view--metrics">' +
      /* 指标卡带（6 张，与页签双向联动） */
      '<div class="ck-metrics ck-metrics--6">' + MB_METRICS.map(function (x) {
        return '<div class="ck-metriccard' + (MS.metric === x.key ? ' ck-metriccard--active' : '') +
          '" data-mb-metric="' + x.key + '">' +
          '<div class="ck-metriccard__value">' + D.fmtNum(x.value, x.dec) +
          '<span>' + esc(x.unit) + '</span></div>' +
          '<div class="ck-metriccard__label">' + esc(x.name) + '</div></div>';
      }).join('') + '</div>' +

      /* 筛选条 */
      '<div class="ck-filter ck-filter--panel">' +
      '<div class="ck-filter__row">' +
      field('项目类型', '') + field('项目状态', '') + field('承包模式', '') +
      '</div><div class="ck-filter__row">' +
      '<div class="ck-filter__item"><span class="ck-filter__label">日期选择</span>' +
      '<span class="ck-grain" data-ck-grain="日期选择">' + esc(CS.settleGrain) + CARET + '</span>' +
      '<span class="ck-field ck-field--date">2025-06-01 ~ 2026-05-31</span></div>' +
      field('二级单位', '') + field('三级单位', '') +
      actions(true) + '</div>' +
      '<div class="ck-filter__more" ' + (CS.advanced ? '' : 'hidden') + '>' +
      field('项目业态', '') + field('地区', '') + field('组织', '') +
      field('物料分类', '') + field('项目名称', '') +
      '</div></div>' +

      /* 指标页签 + 红色趋势 */
      '<div class="ck-tabsrow">' + MB_METRICS.map(function (x) {
        return '<div class="ck-tab' + (MS.metric === x.key ? ' ck-tab--active' : '') +
          '" data-mb-tab="' + x.key + '">' + esc(x.name) + '</div>';
      }).join('') + '</div>' +
      subHead(m.name + '随时间变化的趋势') +
      '<div class="dsc-chart" id="mbTrend" style="height:280px"></div>' +

      /* 二级单位排行 */
      subHead('二级单位排行', '共 ' + MB_RANK.length + ' 个二级单位') +
      mbRankTable() +
      '<div data-mb-pager="rankPage">' + D.pager({ page: MS.rankPage, size: MS.size, total: 60 }) + '</div>' +

      /* 六项降本 */
      saveSection() +

      /* 降本明细 */
      detailSection() +

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

  function saveSection() {
    const s = mbSave(MS.save);
    return section('六项降本',
      '<div class="ck-metrics ck-metrics--7">' + MB_SAVE.map(function (x) {
        return '<div class="ck-metriccard ck-metriccard--stat' +
          (MS.save === x.key ? ' ck-metriccard--active' : '') + '" data-mb-save="' + x.key + '">' +
          '<div class="ck-metriccard__label">' + esc(x.name) + '</div>' +
          '<div class="ck-metriccard__value">' + esc(x.value) + '<span>万元</span></div>' +
          '<div class="ck-metriccard__sub">' + D.fmtNum(x.rate, 2) + '%</div></div>';
      }).join('') + '</div>' +
      '<div class="ck-filter"><div class="ck-filter__row">' +
      '<div class="ck-filter__item"><span class="ck-filter__label">日期选择</span>' +
      '<span class="ck-field ck-field--date">2025-06-01 ~ 2026-05-31</span></div>' +
      field('项目名称', '') + field('实施单位', '中国建筑第八工程局有限公司') +
      actions() + '</div></div>' +
      subHead(s.name + '（万元）') +
      '<div class="dsc-chart" id="mbSave" style="height:260px"></div>');
  }

  function detailSection() {
    const rows = mbDetailRows().map(function (r, i) { return Object.assign({ idx: i + 1 }, r); });
    return section('降本明细',
      '<div class="ck-filter"><div class="ck-filter__row">' +
      field('实施单位', '中国建筑第八工程局有限公司') + field('项目名称', '') + field('项目业态', '') +
      '</div><div class="ck-filter__row">' +
      field('项目类型', '') +
      '<div class="ck-filter__item"><span class="ck-filter__label">项目竣工日期</span>' +
      '<span class="ck-grain" data-ck-grain="项目竣工日期">' + esc(CS.inGrain) + CARET + '</span>' +
      '<span class="ck-field ck-field--date">开始时间 ~ 结束时间</span></div>' +
      field('结算单/产值单', '') +
      '<button class="ck-link" data-mb-more>' + (MS.more ? '收起' : '展开') + '</button>' +
      actions() + '</div>' +
      '<div class="ck-filter__more"' + (MS.more ? '' : ' hidden') + '>' +
      field('二级单位', '') + field('三级单位', '') + field('统计月份', '') + field('降本类型', '') +
      '</div></div>' +
      '<div class="dsc-card u-mb-lg"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">降本明细清单</div>' +
      '<div class="dsc-card__extra">共 ' + MB_RANK.length + ' 个二级单位 · 60 条明细　<button class="dsc-btn dsc-btn--sm" data-mb-columns>列设置</button></div>' +
      '</div>' +
      D.table({ cols: MB_DETAIL_COLS, rows: rows, maxHeight: 420,
        foot: D.pager({ page: MS.detailPage, size: MS.size, total: 60 }) }) + '</div>');
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
    { name: '不良行为分供商数量', value: '658', unit: '家', trend: -19.0, good: true, last: '812', extra: '占比 4.9%', go: 5,
      desc: '统计期内被记录不良行为的分供商数量；不良行为的判定标准待确认（Q-09）', src: '采购管理系统分供商模块' },
    { name: '活跃分供商', value: '31,855', unit: '家', trend: -16.6, good: false, last: '38,912', go: 0,
      desc: '近 12 个月内有投标、报价或履约记录的分供商数量', src: '招采系统' },
    { name: '优质分供商履约额', value: '354.57', unit: '亿元', trend: 18.6, good: true, last: '265.32', extra: '占比 72.50%', go: 4,
      desc: '评价为优质的分供商所承接合同的结算金额，占比 = 优质履约额 ÷ 分供商履约额', src: '物资系统 + 采购管理系统' },
    { name: '优质分供商数量', value: '25,793', unit: '家', trend: -18.1, good: false, last: '31,493', extra: '占比 41.7%', go: 0,
      desc: '评价等级为优质的分供商数量，占比 = 优质数量 ÷ 在库分供商数量', src: '采购管理系统分供商模块' },
    { name: '清退分供商数量', value: '7,391', unit: '家', trend: 17.0, good: false, last: '6,315', extra: '占比 10.4%', go: 2,
      desc: '统计期内被清退出库的分供商数量', src: '采购管理系统分供商模块' }
  ];

  const SB_BAR = { height: 240, dataLabels: true, labelColor: '#4A5568', xColor: '#666' };
  const SB_BLUE = '#2468F2';

  const SB_RATE = {                                        // 分供商使用率分析
    cats: ['在库分供商', '活跃分供商', '履约分供商', '优质分供商', '清退分供商'],
    data: [9851, 8119, 7822, 7240, 5839], rate: '30.7'
  };
  const SB_EVAL = {                                        // 分供商评价分析
    cats: ['优质分供商', '良好分供商', '合格分供商', '待改进分供商'],
    data: [25793, 15464, 12866, 7732], pct: [41.7, 25.0, 20.8, 12.5]
  };
  const SB_CONVERT = [                                     // 引进分供商转化与留存分析
    { name: '中标分供商', label: '中标分供商 1,822 家（26.6%）', value: 1822, color: '#2468F2' },
    { name: '活跃未中标分供商', label: '活跃未中标分供商 4,642 家（67.9%）', value: 4642, color: '#F2B04A' },
    { name: '淘汰分供商', label: '淘汰分供商 387 家（5.65%）', value: 387, color: '#EE7B8B' }
  ];
  const SB_LOSS = [                                        // 分供商流失情况分析
    { name: '出库且合作超5年', label: '出库且合作超 5 年 280 家（27.05%）', value: 280, color: '#17B98A' },
    { name: '出库且合作未满5年', label: '出库且合作未满 5 年 755 家（72.95%）', value: 755, color: '#2468F2' }
  ];
  const SB_YEARS = {                                       // 合作年限分析
    cats: ['华中公司', '总承包公司', '发展建设分公司', '东北公司', '华北公司', '投资公司', '华南公司'],
    data: [1984, 1500, 1783, 631, 984, 798, 783]
  };
  const SB_PERF = {                                        // 分供商履约情况分析（双轴）
    cats: ['华中公司', '上海公司', '总承包公司', '华南公司', '北京公司', '东北公司', '土木公司'],
    amt: [984.88, 798.55, 783.54, 631.60, 622.77, 513.78, 488.14],
    cnt: [5063, 3984, 3529, 3117, 3084, 2215, 2136]
  };
  const SB_DONE = { v: [929, 1589], pct: [36.97, 63.03] };   // 诉未完结占比分析
  const SB_DUE = { v: [1454, 1064], pct: [57.74, 42.26] };   // 逾期占比情况分析
  const SB_SAT = {                                          // 反向评价现阶段满意度
    cats: ['非常满意', '较满意', '基本满意', '不满意'],
    v: [929, 650, 534, 400], pct: [36.97, 25.87, 21.25, 15.91]
  };
  const SB_CNT = {                                         // 投诉数量及未完结占比
    cats: ['一公司', '二公司', '三公司', '四公司'],
    v: [984, 798, 783, 631], pct: [17.2, 9.89, 9.77, 8.98]
  };
  const SB_MIX = {                                         // 投诉金额及金额分布占比情况
    cats: ['一公司', '二公司', '三公司', '四公司'],
    total: [984.88, 798.55, 783.54, 631.60],
    segs: [
      { name: '5万元以下', color: '#2468F2', pct: [4.9, 3.2, 2.4, 7.2] },
      { name: '5万元-30万元', color: '#F2B04A', pct: [10.8, 6.9, 5.7, 6.9] },
      { name: '30万元-100万元', color: '#8CC63F', pct: [24.6, 15.0, 8.1, 4.0] },
      { name: '100万元-500万元', color: '#C08FE8', pct: [38.8, 30.5, 30.8, 21.0] },
      { name: '500万元及以上', color: '#EE7B8B', pct: [20.9, 44.4, 53.0, 60.9] }
    ]
  };
  const SB_UNFIN = [                                       // 未完结处理进展情况
    { name: '已撤回', label: '已撤回 1,418 条（56.03%）', value: 1418, color: '#2468F2' },
    { name: '待受理', label: '待受理 165 条（15.12%）', value: 165, color: '#17B98A' },
    { name: '处理中', label: '处理中 165 条（15.12%）', value: 165, color: '#F2B04A' },
    { name: '待供应商确认', label: '待供应商确认 165 条（15.12%）', value: 165, color: '#B6E07A' }
  ];
  const SB_CATS4 = ['华中公司', '总承包公司', '发展建设分公司', '东北公司'];
  const SB_AGE = [237, 192, 189, 156];                     // 处理时耗分布
  const SB_NEW = [237, 192, 189, 156];                     // 各单位新增投诉
  const SB_OVER = { v: [237, 192, 189, 156], pct: [8.6, 6.7, 6.6, 5.9] };
  const SB_SCORE = {                                       // 单位反向评价均分
    cats: ['华中公司', '总承包公司', '发展建设分公司', '东北公司', '一公司',
      '上海公司', '华北公司', '华东公司', '西北公司'],
    data: [9.8, 9.6, 9.3, 8.8, 7.5, 6.9, 5.8, 5.6, 5.4]
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
      (extra || '') + field('物料分类', '') + actions() +
      '</div></div>';
  }

  function supplierBoardView() {
    return '<div class="ck-view ck-view--metrics">' +
      sbKpiCards() +
      sbFilter() +

      /* 分供商使用情况分析（沿用顶部筛选条件，区块内不再重复同字段） */
      section('分供商使用情况分析',
        '<div class="dsc-split dsc-split--2">' +
        '<div>' + '<div class="ck-statline">分供商使用率：<b>' + SB_RATE.rate + '%</b></div>' + sbChart('sbRate', 260) + '</div>' +
        '<div>' + subHead('分供商评价分析', '分供商评级') + sbChart('sbEval', 260) + '</div>' +
        '</div>') +

      /* 转化与流失 */
      '<div class="dsc-split dsc-split--2">' +
      section('引进分供商转化与留存分析',
        subHead('新引进后淘汰分供商数量占比', '新增 10,816 家，其中 6,851 家已评估') +
        sbChart('sbConvert', 280) + sbLegend(SB_CONVERT)) +
      section('分供商流失情况分析',
        subHead('出库分供商中合作 5 年分供商占比', '出库 7,391 家，其中 1,035 家已核实年限') +
        sbChart('sbLoss', 280) + sbLegend(SB_LOSS)) +
      '</div>' +

      /* 合作年限分析 */
      section('合作年限分析',
        '<div class="ck-filter"><div class="ck-filter__row">' + field('合作年限', '') +
        actions() + '</div>' +
        '<div class="ck-filter__more" hidden>' + field('本级库', '') + field('物料分类', '') + '</div></div>' +
        sbChart('sbYears', 280)) +

      /* 分供商履约情况分析（双轴：金额 / 数量） */
      section('分供商履约情况分析',
        '<div class="ck-sbsplit">' +
        '<div class="ck-sbstat"><div class="ck-sbstat__label">履约额（万元）</div>' +
        '<input class="ck-field ck-field--input" type="text" inputmode="numeric" placeholder="输入阈值" data-sb-field="履约额"/>' +
        '<div class="ck-sbstat__big"><span>履约额超出占比数量</span><b>146</b> 家</div></div>' +
        '<div class="ck-sbmain">' + sbChart('sbPerf', 300) + sbLegend([
          { name: '分供商履约金额', color: '#2468F2' }, { name: '分供商履约数量', color: '#7FC4F5' }
        ]) + '</div></div>') +

      /* 投诉三小图 */
      section('投诉与满意度',
        '<div class="dsc-split dsc-split--3">' +
        '<div>' + subHead('诉未完结占比分析') + sbChart('sbDone', 230) + '</div>' +
        '<div>' + subHead('逾期占比情况分析') + sbChart('sbDue', 230) + '</div>' +
        '<div>' + subHead('分供商反向评价现阶段满意度分析') + sbChart('sbSat', 230) + '</div>' +
        '</div>' +
        '<div class="dsc-split dsc-split--2 u-mt-xl">' +
        '<div>' + subHead('投诉数量及未完结占比') + sbChart('sbCnt', 250) + '</div>' +
        '<div>' + subHead('投诉金额及金额分布占比情况') + sbChart('sbMix', 250) +
        sbLegend(SB_MIX.segs) + '</div>' +
        '</div>' +
        '<div class="dsc-split dsc-split--2 u-mt-xl">' +
        '<div>' + subHead('未完结处理进展情况', '共 1,589 条') + sbChart('sbUnfin', 260) + sbLegend(SB_UNFIN) + '</div>' +
        '<div>' + subHead('处理时耗分布情况', '未结平均时耗') + sbChart('sbAge', 260) + '</div>' +
        '</div>' +
        '<div class="dsc-split dsc-split--2 u-mt-xl">' +
        '<div>' + subHead('各单位新增投诉情况', '新增投诉数量') + sbChart('sbNew', 250) + '</div>' +
        '<div>' + subHead('逾期分布情况', '逾期占比') + sbChart('sbOver', 250) + '</div>' +
        '</div>') +

      /* 评价均分 */
      section('评价均分',
        '<div class="ck-filter"><div class="ck-filter__row">' +
        '<span class="ck-filter__hint">沿用顶部筛选条件（本级库 / 日期 / 物料分类）</span>' +
        actions() + '</div></div>' +
        subHead('单位反向评价均分', '满分 10 分') + sbChart('sbScore', 280)) +

      /* 相关报表：纯图表页需要一个下钻出口 */
      '<div class="dsc-card"><div class="dsc-card__body dsc-relbar">' +
      '<span class="dsc-relbar__label">相关报表</span>' +
      '<button class="dsc-btn" data-sb-go2="report" data-sb-ds="supplier">分供商数据报表</button>' +
      '<button class="dsc-btn" data-sb-go2="compliance">供应商合规分析</button>' +
      '<span class="dsc-relbar__hint">本页为概览型看板，明细项目与合同级数据请前往数据报表</span>' +
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
      pageHead('分供商管理看板', '核心数据 · 资源：分供商规模 / 使用 / 履约 / 投诉与评价') +
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
  const AB_COLS = [
    { key: 'idx', name: '排名', width: 80 },
    { key: 'org2', name: '二级单位', width: 160 },
    { key: 'outAmt', name: '项目调出资产总金额（万元）', width: 220 },
    { key: 'totalAmt', name: '项目资产总金额（万元）', width: 200 },
    { key: 'rate', name: '资产周转率（%）', width: 150 }
  ];
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

  function abRankTable() {
    /* R2：受限视角只返回本单位行 */
    const scope = D.scope.name;
    const all = AB_RANK.filter(function (r) {
      return D.scope.level === 1 || r[0].indexOf(scope.replace(/公司$/, '')) >= 0;
    });
    const pages = Math.max(1, Math.ceil(all.length / ASB.size));
    if (ASB.page > pages) ASB.page = pages;
    const rows = all.slice((ASB.page - 1) * ASB.size, (ASB.page - 1) * ASB.size + ASB.size);
    return '<table class="ck-table ck-table--metrics"><thead><tr>' +
      '<th style="width:80px">排名</th><th>二级单位</th>' +
      '<th class="is-num">项目调出资产总金额（万元）</th><th class="is-num">项目资产总金额（万元）</th>' +
      '<th class="is-num ck-table__danger">资产周转率（%）</th></tr></thead><tbody>' +
      rows.map(function (r, i) {
        return '<tr><td class="is-center">' + ((ASB.page - 1) * ASB.size + i + 1) + '</td><td class="is-center">' + esc(r[0]) + '</td>' +
          '<td class="is-num">' + D.fmtNum(r[1], 2) + '</td>' +
          '<td class="is-num">' + D.fmtNum(r[2], 2) + '</td>' +
          '<td class="is-num ck-table__danger">' + D.fmtNum(r[3], 2) + '</td></tr>';
      }).join('') +
      '<tr class="ck-table__total"><td class="is-center">合计</td><td class="is-center">全部 ' + AB_RANK_N + ' 个单位</td>' +
      '<td class="is-num">' + AB_RANK_TOTAL[0] + '</td><td class="is-num">' + AB_RANK_TOTAL[1] + '</td>' +
      '<td class="is-num ck-table__danger" title="比率类指标不可累加">—</td></tr>' +
      '</tbody></table>';
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
      actions() + '</div></div>' +

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
        actions() + '</div></div>' +
        '<div class="dsc-card u-mb-lg"><div class="dsc-card__header">' +
        '<div class="dsc-card__title">二级单位资产周转率明细</div>' +
        '<div class="dsc-card__extra">共 ' + AB_RANK_N + ' 个二级单位　' +
        '<button class="dsc-btn dsc-btn--sm" data-ab-columns>列设置</button></div></div>' +
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
      /* 趋势图数据只有一套（源图仅给资产周转率），其余指标按同口径做小幅偏移便于演示 */
      const shift = (AB_IND.indexOf(m)) * 0.6;
      D.lineChart(trend, {
        categories: AB_MONTHS,
        series: [{ name: m.name, data: AB_TREND.map(function (v) { return D.round(v + shift, 2); }), color: '#D0021B' }]
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
        const all = AB_COLS.filter(function (c) { return c.key !== 'idx'; })
          .map(function (c) { return { key: c.key, name: c.name }; });
        D.modal({
          title: '列设置 · 二级单位资产周转率明细', width: 900,
          body: D.columnDialog(all, ['org2', 'outAmt', 'totalAmt', 'rate']),
          buttons: [{ text: '取消', cls: '', act: 'cancel' }, { text: '应用', cls: 'dsc-btn--primary', act: 'ok' }],
          onAction: function (act, ov) {
            const keys = D.readColumnDialog(ov.querySelector('.dsc-column-dialog'));
            if (!keys.length) { D.toast('请至少选择一个字段', 'warn'); return false; }
            D.toast('列设置已应用（' + keys.length + ' 个字段）');
          }
        });
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
      { unit: '家', yDigits: 0, yUnit: '家' });
    bar('sbEval', SB_EVAL.cats, [{ name: '分供商数量', data: SB_EVAL.data, color: SB_BLUE }],
      { unit: '家', yDigits: 0, yUnit: '家', dataLabels: false,
        categoryTopLabels: SB_EVAL.data.map(function (v, i) { return D.fmtInt(v) + '家(' + SB_EVAL.pct[i] + '%)'; }) });
    /* 转化与流失 */
    donut('sbConvert', SB_CONVERT, '6,851 家');
    donut('sbLoss', SB_LOSS, '1,035 家');
    /* 合作年限 / 履约情况 */
    bar('sbYears', SB_YEARS.cats, [{ name: '超合作年份供应商数量', data: SB_YEARS.data, color: SB_BLUE }],
      { unit: '家', yDigits: 0, yUnit: '家' });
    bar('sbPerf', SB_PERF.cats, [
      { name: '分供商履约金额', data: SB_PERF.amt, color: SB_BLUE, unit: '万元' },
      { name: '分供商履约数量', data: SB_PERF.cnt, color: '#7FC4F5', unit: '家', axis: 'right' }
    ], { height: 300, yDigits: 0, padR: 64, dataLabels: false });
    /* 投诉三小图 */
    bar('sbDone', ['完结', '未完结'], [{ name: '投诉数量', data: SB_DONE.v, color: SB_BLUE }],
      { height: 230, yDigits: 0, dataLabels: false,
        categoryTopLabels: SB_DONE.v.map(function (v, i) { return v + '(' + SB_DONE.pct[i] + '%)'; }) });
    bar('sbDue', ['逾期', '未逾期'], [{ name: '投诉数量', data: SB_DUE.v, color: SB_BLUE }],
      { height: 230, yDigits: 0, dataLabels: false,
        categoryTopLabels: SB_DUE.v.map(function (v, i) { return v + '(' + SB_DUE.pct[i] + '%)'; }) });
    bar('sbSat', SB_SAT.cats, [{ name: '投诉数量', data: SB_SAT.v, color: SB_BLUE }],
      { height: 230, yDigits: 0, dataLabels: false,
        categoryTopLabels: SB_SAT.v.map(function (v, i) { return D.fmtInt(v) + '家(' + SB_SAT.pct[i] + '%)'; }) });
    bar('sbCnt', SB_CNT.cats, [{ name: '投诉总数', data: SB_CNT.v, color: SB_BLUE }],
      { height: 250, yDigits: 0, yUnit: '个', dataLabels: false,
        categoryTopLabels: SB_CNT.v.map(function (v, i) { return v + '个(' + SB_CNT.pct[i] + '%)'; }) });
    /* 投诉金额分布：按金额段 100% 堆叠 */
    bar('sbMix', SB_MIX.cats, SB_MIX.segs.map(function (g) {
      return { name: g.name, data: g.pct, color: g.color, stack: true };
    }), { height: 250, yDigits: 0, yUnit: '%', padT: 34, dataLabels: false,
      categoryTopLabels: SB_MIX.total.map(function (v) { return v + '万元'; }) });
    /* 未完结处理 / 处理时耗 */
    donut('sbUnfin', SB_UNFIN, '1,589 条');
    bar('sbAge', SB_CATS4, [{ name: '未结平均时耗', data: SB_AGE, color: SB_BLUE }],
      { height: 260, yDigits: 0, dataLabels: false });
    /* 新增投诉 / 逾期分布 */
    bar('sbNew', SB_CATS4, [{ name: '新增投诉数量', data: SB_NEW, color: SB_BLUE }],
      { height: 250, yDigits: 0, dataLabels: false });
    bar('sbOver', SB_CATS4, [{ name: '逾期分布投诉占比', data: SB_OVER.v, color: SB_BLUE }],
      { height: 250, yDigits: 0, dataLabels: false,
        categoryTopLabels: SB_OVER.v.map(function (v, i) { return v + '(' + SB_OVER.pct[i] + '%)'; }) });
    /* 评价均分 */
    bar('sbScore', SB_SCORE.cats, [{ name: '单位反向评价均分', data: SB_SCORE.data, color: SB_BLUE }],
      { height: 280, yDigits: 0, yUnit: '分', unit: '分' });

    D.delegate(root, [
      { sel: '[data-sb-field]', fn: function (el2) { el2.focus(); } },
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
    const m = mbMetric(MS.metric);
    const trend = root.querySelector('#mbTrend');
    if (trend) {
      D.lineChart(trend, {
        categories: MB_MONTHS,
        series: [{ name: m.name, data: mbMetricTrend(m), color: '#D0021B' }]
      }, { height: 280, area: false, lineWidth: 1.8, dotR: 3.5, unit: m.unit, tipDigits: 2,
        dataLabels: true, labelDigits: 2, padL: 56 });
    }

    const save = root.querySelector('#mbSave');
    if (save) {
      D.lineChart(save, {
        categories: MB_SAVE_MONTHS,
        series: [{ name: mbSave(MS.save).name, data: mbSaveTrend(MS.save), color: '#D0021B' }]
      }, { height: 260, area: false, lineWidth: 1.8, dotR: 3.5, unit: '万元', tipDigits: 2,
        dataLabels: true, labelDigits: 0, padL: 64 });
    }

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
      { sel: '[data-mb-save]', fn: function (el) { MS.save = el.getAttribute('data-mb-save'); D.render(); } },
      /* 降本明细：展开更多筛选 */
      { sel: '[data-mb-more]', fn: function () {
        MS.more = !MS.more;
        const more = root.querySelector('.ck-filter__more');
        if (more) more.hidden = !MS.more;
        D.toast(MS.more ? '已展开更多筛选条件' : '已收起筛选条件');
      } },
      /* 降本明细：列设置 */
      { sel: '[data-mb-columns]', fn: function () {
        const all = MB_DETAIL_COLS.filter(function (c) { return c.key !== 'idx'; })
          .map(function (c) { return { key: c.key, name: c.name }; });
        const shown = ['org2', 'org3', 'project', 'unit', 'month', 'code', 'saveAmt'];
        D.modal({
          title: '列设置 · 降本明细清单', width: 900,
          body: D.columnDialog(all, shown),
          buttons: [{ text: '取消', cls: '', act: 'cancel' }, { text: '应用', cls: 'dsc-btn--primary', act: 'ok' }],
          onAction: function (act, ov) {
            const keys = D.readColumnDialog(ov.querySelector('.dsc-column-dialog'));
            if (!keys.length) { D.toast('请至少选择一个字段', 'warn'); return false; }
            D.toast('列设置已应用（' + keys.length + ' 个字段）');
          }
        });
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
      { sel: '[data-ck-query]', fn: function (el) {
        const box = el.closest('.ck-filter');
        if (!box) return;
        const conds = readConds(box);
        showConds(el, conds);
        /* 提示里的日期取当前筛选条实际展示的范围，而不是全局默认值 */
        const dt = box.querySelector('.ck-field--date');
        D.toast('查询完成' + (dt ? '：' + dt.textContent.trim() : '') +
          '，生效条件 ' + conds.length + ' 项');
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
        CS.advanced = !CS.advanced;
        const more = el.closest('.ck-filter').querySelector('.ck-filter__more');
        if (more) more.hidden = !CS.advanced;
        el.classList.toggle('ck-link--on', CS.advanced);
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
        ]
      }, { height: 340, rotateX: 45, yDigits: 0, yUnit: '亿元', y2Unit: '万个', padB: 96 });
    }

    /* 物资小类四卡环图 */
    MAT_CARDS.forEach(function (c, i) {
      const el = root.querySelector('#ckRing' + i);
      if (el) D.ringChart(el, c.pct, { size: 100 });
    });
    D.delegate(root, [{ sel: '[data-ck-matcard]', fn: function (el) {
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
        series: [
          { name: '金额', data: a, type: 'bar', color: '#2FBD8A', color2: '#7FE3B8', unit: '亿元' },
          { name: '数量', data: q.map(function (v) { return v / 10; }), type: 'bar', axis: 'right',
            color: '#7FC8F1', color2: '#CDE9FB', unit: '万吨' },
          { name: '均价', data: p, type: 'line', color: '#D0021B' }
        ]
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
