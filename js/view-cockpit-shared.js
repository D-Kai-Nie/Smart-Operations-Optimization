/* ============================================================
   局驾驶舱 / 四个看板共享基础片段
   区块、副标题、指标卡、指标页签、指标明细表标题、筛选底栏
   ============================================================ */
window.APP = window.APP || {};
(function (D) {
  'use strict';
  const esc = D.esc;
  const CARET = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 6.5l4 4 4-4"/></svg>';

  function section(title, body, extra) {
    return '<section class="ck-sec">' +
      '<div class="ck-sec__head"><h2 class="ck-sec__title">' + esc(title) + '</h2>' +
      (extra || '') +
      '<button class="ck-sec__collapse" data-ck-collapse title="收起 / 展开">' + CARET + '</button>' +
      '</div>' +
      '<div class="ck-sec__body">' + body + '</div></section>';
  }
  function subHead(title, extra, unit) {
    return '<div class="ck-subhead"><span class="ck-subhead__title">' + esc(title) + '</span>' +
      (unit ? '<span class="ck-subhead__unit">' + esc(unit) + '</span>' : '') +
      (extra ? '<span class="ck-subhead__extra">' + extra + '</span>' : '') + '</div>';
  }
  /* 标准指标卡：数值 + 单位在上、名称在下；采购 / 物资 / 资产看板共用 */
  function metricCard(o) {
    return '<div class="ck-metriccard' + (o.active ? ' ck-metriccard--active' : '') + '" ' +
      o.attr + '="' + esc(o.key) + '">' +
      '<div class="ck-metriccard__value">' + (o.disp || D.fmtNum(o.value, o.dec)) +
      '<span>' + esc(o.unit) + '</span></div>' +
      '<div class="ck-metriccard__label">' + esc(o.name) + '</div></div>';
  }
  /* 指标卡带：list + 数据属性 + 当前选中 key + 列数修饰类 */
  function metricCards(list, attr, activeKey, cls) {
    return '<div class="ck-metrics' + (cls ? ' ' + cls : '') + '">' +
      list.map(function (x) {
        return metricCard({
          attr: attr, key: x.key, active: activeKey === x.key,
          disp: x.disp, value: x.value, dec: x.dec, unit: x.unit, name: x.name
        });
      }).join('') + '</div>';
  }
  /* 指标页签：与指标卡联动，采购 / 物资 / 资产看板共用 */
  function metricTabs(list, attr, activeKey) {
    return '<div class="ck-tabsrow">' + list.map(function (x) {
      return '<div class="ck-tab' + (activeKey === x.key ? ' ck-tab--active' : '') +
        '" ' + attr + '="' + esc(x.key) + '">' + esc(x.name) + '</div>';
    }).join('') + '</div>';
  }
  /* 指标明细表标题 + 单位数 + 设置列齿轮（三看板共用） */
  function detailListHead(o) {
    o = o || {};
    const count = o.count == null ? '' : '共 ' + o.count + ' 个二级单位' + (o.gap ? '　' : '');
    return subHead('指标明细表', count + D.colGear(o.gear,
      o.tip || '设置列：本指标的明细列表字段（基本信息 + 指标信息）'));
  }
  /* 筛选条底栏：展开（左）+ 条件反馈 + 查询/清空/重置（右下角）。
     默认属性为 data-ck-*；资产看板等使用 data-ab-* 时传入自定义属性名即可复用同一套样式。 */
  function filterFoot(o) {
    o = o || {};
    const adv = o.advAttr
      ? '<span class="ck-link ck-link--adv' + (o.advOn ? ' ck-link--on' : '') + '" ' + o.advAttr + '>' +
        (o.advLabel || '展开') + CARET + '</span>'
      : '';
    return '<div class="ck-filter__foot">' + adv +
      '<span class="ck-filter__hint"' + (o.hint ? '' : ' hidden') + '>' + esc(o.hint || '') + '</span>' +
      '<span class="ck-filter__foot-right">' +
      '<button class="ck-btn ck-btn--primary" ' + (o.queryAttr || 'data-ck-query') + '>查询</button>' +
      '<button class="ck-link" ' + (o.clearAttr || 'data-ck-clear') + '>清空</button>' +
      '<button class="ck-link" ' + (o.resetAttr || 'data-ck-reset') + '>重置</button>' +
      '</span></div>';
  }
  /* 展开 / 收起按钮：DOM 显隐、状态类与文案一起切换，避免各页面各写一套 */
  function setFilterMore(el, open) {
    const more = el.closest('.ck-filter').querySelector('.ck-filter__more');
    if (more) more.hidden = !open;
    el.classList.toggle('ck-link--on', open);
    if (el.firstChild && el.firstChild.nodeType === 3) {
      el.firstChild.nodeValue = open ? '收起' : '展开';
    }
  }

  D.ckUI = {
    CARET: CARET,
    section: section,
    subHead: subHead,
    metricCard: metricCard,
    metricCards: metricCards,
    metricTabs: metricTabs,
    detailListHead: detailListHead,
    filterFoot: filterFoot,
    setFilterMore: setFilterMore
  };
})(window.APP);
