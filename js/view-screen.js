/* ============================================================
   F1 数据大屏（PRD F1.1–F1.4）
   版式对齐 Axure 导出稿：
   标题带（左副题 / 中主标 / 右时钟）
   + 左「采购榜单」+ 中「多维概览（核心数字 + 项目分布）」
   + 右「多维概览 / 主材采购 / 采购动态 / 本月概览 / 平均招采时效」
   + 下「分供商规模」
   ============================================================ */
(function (D) {
  'use strict';
  const esc = D.esc;

  const SS = { period: 'quarter', supTab: 'onStock', supTotal: 8562 };

  /* ---------- 顶部核心数字（Axure 实测文案） ---------- */
  function headline() {
    const s = D.summary('purchase', null);
    return {
      bidCount: 126635,                     // 总招标数
      contractCount: 273423,                // 总合同数
      totalAmt: 1932.62,                    // 累计总采购金额（亿元）
      building: 4887,                       // 在建项目总数
      suppliers: 62141,                     // 总分供商数量
      yearAmt: D.round(s.amount, 2),        // 年度总采购金额（亿元）
      lastYearAmt: D.round(s.cum, 2),       // 上年度总采购金额（亿元）
      quarterAmt: D.round(s.amount * 0.28, 2),
      monthBid: 2283,                       // 本月发起招标
      monthContract: 4019,                  // 本月签订合同
      leadTime: 29                          // 平均招采时效（天）
    };
  }

  function kv(label, value, unit, digits) {
    const d = digits === undefined ? 2 : digits;
    return '<div class="scr-kv"><div class="scr-kv__label">' + esc(label) + '</div>' +
      '<div class="scr-kv__value">' + (d === 0 ? D.fmtInt(value) : D.fmtNum(value, d)) +
      (unit ? '<span class="scr-kv__unit">' + esc(unit) + '</span>' : '') + '</div></div>';
  }

  /* ---------- 左：采购榜单 ---------- */
  function rankNo(i) {
    return '<span class="scr-rank__no' + (i < 3 ? ' scr-rank__no--top' : '') + '">' + (i + 1) + '</span>';
  }

  const RANK_TOP = 10;

  function rankTable() {
    /* 大屏左栏只列 TOP10：11 行会把面板撑出 1 行滚动条（等于每屏都露出一行被切） */
    const rows = D.orgs.slice().sort(function (a, b) { return b.amount - a.amount; }).slice(0, RANK_TOP);
    return '<table class="scr-table scr-table--screen"><thead><tr>' +
      '<th style="width:44px">序号</th><th>二级单位</th>' +
      '<th class="is-num">本年度总采购金额</th><th class="is-num">上年度总采购金额</th></tr></thead><tbody>' +
      rows.map(function (o, i) {
        return '<tr><td>' + rankNo(i) + '</td><td>' + esc(o.name) + '</td>' +
          '<td class="is-num is-gold">' + D.fmtNum(o.amount, 2) + '亿</td>' +
          '<td class="is-num">' + D.fmtNum(o.cum, 2) + '亿</td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- 右：平均招采时效排行 ---------- */
  const LEAD_RANK = [
    ['城市运营公司', 19.2], ['四公司', 23.6], ['浙江公司', 24.0], ['南方公司', 24.2],
    ['西南公司', 25.3], ['装饰公司', 26.5], ['总承包公司', 27.2], ['三公司', 27.3],
    ['发展建设公司', 27.9], ['土木公司', 28.1], ['北京公司', 28.2]
  ];

  /* 大屏右栏只列 TOP8：11 行以上在投屏距离读不清，且会把右栏撑出滚动条 */
  const LEAD_TOP = 8;

  function leadRank() {
    return '<table class="scr-table scr-table--screen"><thead><tr>' +
      '<th style="width:34px">序号</th><th>二级单位</th><th class="is-num">平均招采时效</th></tr></thead><tbody>' +
      LEAD_RANK.slice(0, LEAD_TOP).map(function (r, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(r[0]) + '</td>' +
          '<td class="is-num">' + D.fmtNum(r[1], 1) + '天</td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- 下：分供商规模（左侧类型切换 + 右侧柱状） ---------- */
  const SUP_CATS = ['物资供应类', '专业分包类', '劳务分包类', '设备供应类', '专业服务类',
    '租赁服务类', '设计服务类', '运营服务类', '运输服务类', '投资服务类'];

  const SUP_TABS = [
    { key: 'onStock', name: '在库分供商', data: [2837, 2470, 1201, 712, 459, 384, 239, 135, 92, 33] },
    { key: 'quality', name: '优秀分供商', data: [1204, 862, 461, 312, 189, 84, 39, 35, 22, 3] },
    { key: 'newIn', name: '新进分供商', data: [783, 642, 401, 268, 159, 84, 39, 35, 22, 3] },
    { key: 'perf', name: '履约分供商', data: [2103, 1680, 940, 566, 372, 118, 62, 41, 28, 7] }
  ];

  const NEWS = [
    '中建八局第二建设有限公司与广东美的暖通设备有限公司签订设备采购合同，合同金额 256.7 万元',
    '五矿钢铁上海有限公司完成 3,200 吨普通钢筋供货结算，结算金额 1,512.4 万元',
    '一公司济南公司新增入库分供商 12 家，其中优质分供商 3 家',
    '滨江商务中心安装工程完成本月度结算，成本降低率 7.39%',
    '二公司山海境小区项目完成总结算办理，结算金额 8,632.4 万元',
    '集团分供商黑名单更新，新增 2 家冻结单位'
  ];

  /* ============================================================
     页面
     ============================================================ */
  D.pages.screen = function () {
    const h = headline();
    return '' +
      '<div class="screen-page">' +
      /* 标题带 */
      '  <div class="screen-page__titlebar">' +
      '    <div class="screen-page__brand">' +
      '      <span class="screen-page__brand-mark">' +
      '        <svg viewBox="0 0 16 16" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round">' +
      '          <path d="M8 1.4l5.7 3.3v6.6L8 14.6 2.3 11.3V4.7z"/><path d="M8 5.2l2.6 1.5v3L8 11.2 5.4 9.7v-3z"/></svg>' +
      '      </span>' +
      '      <span class="screen-page__title-left">中建八局数字供应链</span>' +
      '    </div>' +
      '    <div class="screen-page__banner"><span class="screen-page__title-main">智慧运营数据大屏</span></div>' +
      '    <div class="screen-page__title-right"><span>' + esc(D.today) + '</span>' +
      '<span class="screen-page__clock" id="scrClock">12:00:00</span></div>' +
      '  </div>' +
      /* 主体栅格 */
      '  <div class="screen-page__grid">' +

      /* 左：采购榜单 */
      '    <section class="screen-panel screen-page__rank-panel">' +
      '      <div class="screen-panel__head"><span class="screen-panel__title">采购榜单</span>' +
      '        <span class="screen-panel__extra">二级单位 · TOP' + RANK_TOP + '</span></div>' +
      '      <div class="screen-panel__body scr-scroll">' + rankTable() + '</div>' +
      '    </section>' +

      /* 中：多维概览 */
      '    <section class="screen-panel screen-page__overview-panel">' +
      '      <div class="screen-panel__head"><span class="screen-panel__title">多维概览</span>' +
      '        <span class="screen-panel__extra"><span class="scr-seg" data-screen-period>' +
      [['quarter', '本季度'], ['month', '本月度'], ['year', '本年度']].map(function (k) {
        return '<i class="scr-seg__item' + (k[0] === SS.period ? ' scr-seg__item--active' : '') +
          '" data-v="' + k[0] + '">' + k[1] + '</i>';
      }).join('') + '</span></span></div>' +
      '      <div class="screen-panel__body">' +
      '        <div class="scr-kvrow scr-kvrow--3">' +
      kv('本季度采购金额', h.quarterAmt, '亿元') +
      kv('年度总采购金额', h.yearAmt, '亿元') +
      kv('上年度总采购金额', h.lastYearAmt, '亿元') + '</div>' +
      '        <div class="scr-mapbox"><div class="scr-chart" id="scrMap"></div>' +
      '          <div class="scr-mapbox__badge"><div class="scr-mapbox__tip">' +
      '            <span>总采购金额(万元)</span><b>' + D.fmtNum(h.quarterAmt * 150, 2) + '</b>' +
      '          </div><i class="scr-mapbox__bar"></i></div></div>' +
      '      </div>' +
      '    </section>' +

      /* 右：多维概览 / 主材采购 / 采购动态 / 本月概览 / 平均招采时效 */
      '    <aside class="screen-page__side">' +
      '      <section class="screen-panel">' +
      '        <div class="screen-panel__head"><span class="screen-panel__title">多维概览</span></div>' +
      '        <div class="screen-panel__body">' +
      '          <div class="scr-kvrow scr-kvrow--3">' +
      kv('总招标数', h.bidCount, '个', 0) + kv('总合同数', h.contractCount, '个', 0) +
      kv('累计总采购金额', h.totalAmt, '亿元') + '</div>' +
      '          <div class="scr-kvrow scr-kvrow--2">' +
      kv('在建项目总数', h.building, '', 0) + kv('总分供商数量', h.suppliers, '', 0) + '</div>' +
      '        </div>' +
      '      </section>' +
      '      <section class="screen-panel">' +
      '        <div class="screen-panel__head"><span class="screen-panel__title">主材采购</span></div>' +
      '        <div class="screen-panel__body"><div class="scr-kvrow scr-kvrow--2">' +
      kv('钢材采购数量', 273423, '吨', 0) + kv('混凝土采购金额', 126635, '万元', 0) + '</div></div>' +
      '      </section>' +
      '      <section class="screen-panel">' +
      '        <div class="screen-panel__head"><span class="screen-panel__title">采购动态</span>' +
      '          <span class="screen-panel__extra">实时轮播</span></div>' +
      '        <div class="screen-panel__body"><div class="scr-news" id="scrNews">' +
      NEWS.map(function (n) {
        return '<div class="scr-news__row">' + esc(n) + '</div>';
      }).join('') + '</div></div>' +
      '      </section>' +
      '      <section class="screen-panel">' +
      '        <div class="screen-panel__head"><span class="screen-panel__title">本月概览</span></div>' +
      '        <div class="screen-panel__body"><div class="scr-kvrow scr-kvrow--3">' +
      kv('本月发起招标', h.monthBid, '个', 0) + kv('本月签订合同', h.monthContract, '', 0) +
      kv('平均招采时效', h.leadTime, '天', 0) + '</div></div>' +
      '      </section>' +
      '      <section class="screen-panel screen-page__lead-panel">' +
      '        <div class="screen-panel__head"><span class="screen-panel__title">平均招采时效</span>' +
      '          <span class="screen-panel__extra">二级单位 · TOP' + LEAD_TOP + '</span></div>' +
      '        <div class="screen-panel__body scr-scroll">' + leadRank() + '</div>' +
      '      </section>' +
      '    </aside>' +

      /* 下：分供商规模 */
      '    <section class="screen-panel screen-page__supplier-panel">' +
      '      <div class="screen-panel__head"><span class="screen-panel__title">分供商规模</span>' +
      '        <span class="screen-panel__extra">供应商数：<b class="is-cyan" id="scrSupTotal">' +
      D.fmtInt(SS.supTotal) + '</b> 个</span></div>' +
      '      <div class="screen-panel__body">' +
      '        <div class="scr-supwrap">' +
      '          <div class="scr-suptabs">' + SUP_TABS.map(function (t) {
        return '<div class="scr-suptab' + (t.key === SS.supTab ? ' scr-suptab--active' : '') +
          '" data-suptab="' + t.key + '">' + esc(t.name) + '</div>';
      }).join('') + '</div>' +
      '          <div class="scr-supchart"><div class="scr-chart" id="scrSupChart" style="height:100%"></div></div>' +
      '        </div>' +
      '      </div>' +
      '    </section>' +

      '  </div>' +
      /* 底部播报 */
      '  <div class="screen-page__footer">' +
      '    <span class="screen-page__footer-tag">实时播报</span>' +
      '    <span class="screen-page__footer-track"><span>数据来源：智能采购系统、物资管理系统、采购管理分供商模块、物管系统资产模块、平台登录日志　|　刷新频率 T+1　|　活跃度按日汇总</span></span>' +
      '    <span class="screen-page__footer-status"><i class="screen-page__footer-dot"></i>运行中 · 无人值守</span>' +
      '  </div>' +
      '</div>';
  };

  /* ============================================================
     渲染后绑定
     ============================================================ */
  D.pages.screen.after = function (root) {
    const mapEl = root.querySelector('#scrMap');
    if (mapEl) D.mapChart(mapEl, D.provinceDist(), { height: mapEl.clientHeight || 320 });

    /* 时钟 */
    const clock = root.querySelector('#scrClock');
    if (clock) {
      const tick = function () {
        const d = new Date();
        clock.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
          .map(function (n) { return String(n).padStart(2, '0'); }).join(':');
      };
      tick();
      if (D.__clockTimer) clearInterval(D.__clockTimer);
      D.__clockTimer = setInterval(tick, 1000);
    }

    /* 采购动态轮播 */
    const news = root.querySelector('#scrNews');
    if (news) {
      const rows = news.querySelectorAll('.scr-news__row');
      let i = 0;
      rows.forEach(function (r, ri) { r.classList.toggle('scr-news__row--active', ri === 0); });
      if (D.__newsTimer) clearInterval(D.__newsTimer);
      D.__newsTimer = setInterval(function () {
        i = (i + 1) % rows.length;
        rows.forEach(function (r, ri) { r.classList.toggle('scr-news__row--active', ri === i); });
      }, 5000);
    }

    /* 分供商规模：类型切换 + 柱状图 */
    const supChart = root.querySelector('#scrSupChart');
    if (supChart) {
      const tab = SUP_TABS.filter(function (t) { return t.key === SS.supTab; })[0] || SUP_TABS[0];
      D.barChart(supChart, {
        categories: SUP_CATS,
        series: [{ name: tab.name, data: tab.data, color: '#1E7FD0', color2: '#7FD4FF' }]
      }, { height: 196, rotateX: 32, yDigits: 0, yUnit: '个',
        unit: '个', padL: 58, padR: 20, padB: 66, dataLabels: true });
    }
    D.delegate(root, [{ sel: '[data-suptab]', fn: function (el) {
      SS.supTab = el.getAttribute('data-suptab');
      const tab = SUP_TABS.filter(function (t) { return t.key === SS.supTab; })[0] || SUP_TABS[0];
      SS.supTotal = tab.data.reduce(function (a, b) { return a + b; }, 0);
      D.render();
    } }]);

    /* 时段切换 */
    root.querySelectorAll('[data-screen-period] [data-v]').forEach(function (el) {
      el.addEventListener('click', function () { SS.period = el.getAttribute('data-v'); D.render(); });
    });
  };
})(window.APP);
