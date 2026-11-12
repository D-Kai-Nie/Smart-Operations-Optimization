/* cockpit-overview：F2 局级驾驶舱（由 view-cockpit.js 拆分）
   采购金额 / 采购物资 / 采购榜单；复用 D.ckUI 的共享区块与筛选 helper。 */
(function (D) {
  'use strict';
  const esc = D.esc;
  const CS = D.cockpitState;
  const UI = D.ckUI;
  const section = UI.section, subHead = UI.subHead;
  const field = UI.field, dateRange = UI.dateRange, actions = UI.actions, advActions = UI.advActions;
  const pageHead = UI.pageHead, scopeNote = UI.scopeNote, commonAfter = UI.commonAfter;
  const MONTHS = UI.MONTHS;

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

  /* F2 局驾驶舱：局级驾驶舱（采购金额 / 采购物资 / 采购榜单） */
  D.pages.cockpit = function () {
    CS.view = 'overview';
    return '<div class="dsc-page cockpit-page">' +
      pageHead('局级驾驶舱', '局级采购全景：采购金额构成 → 采购物资 → 采购榜单') +
      scopeNote() + overviewView() + '</div>';
  };

  D.pages.cockpit.after = function (root) {
    overviewAfter(root);
    commonAfter(root);
  };

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

})(window.APP);
