/* ============================================================
   智慧运营数据平台 · 应用壳层
   模块导航（F1–F8）/ 路由（URL 深链接）/ 组织权限（R1–R3）
   ============================================================ */
(function (D) {
  'use strict';
  const esc = D.esc;

  /* ============================================================
     模块导航（PRD §5 信息架构 F1–F8）
     ============================================================ */
  const MENU = [
    { key: 'screen', name: '数据大屏', page: 'screen', desc: '对外展示 / 门户' },
    { key: 'cockpit', name: '局驾驶舱', page: 'cockpit', desc: '局级全景分析' },
    { key: 'project', name: '项目驾驶舱', page: 'project', desc: '项目级业务全过程' },
    /* 采购 / 物资 / 分供商：一级父级菜单，下挂各自的「管理看板」与原数据报表 */
    { key: 'purchase', name: '采购管理', desc: '采购管理看板 / 采购数据报表', children: [
      { key: 'purchase-board', name: '采购管理看板', page: 'purchase-board', desc: '指标总览-采购 / 二级单位明细' },
      { key: 'report-purchase', name: '采购数据报表', page: 'report', params: { ds: 'purchase' }, desc: '局级总览 + 合同明细 70+ 字段' }
    ] },
    { key: 'material', name: '物资管理', desc: '物资管理看板 / 物资数据报表', children: [
      { key: 'material-board', name: '物资管理看板', page: 'material-board', desc: '看板内容待补充' },
      { key: 'report-material', name: '物资数据报表', page: 'report', params: { ds: 'material' }, desc: '物资结算明细 45+ 字段' }
    ] },
    { key: 'supplier', name: '分供商管理', desc: '分供商管理看板 / 分供商数据报表', children: [
      { key: 'supplier-board', name: '分供商管理看板', page: 'supplier-board', desc: '看板内容待补充' },
      { key: 'report-supplier', name: '分供商数据报表', page: 'report', params: { ds: 'supplier' }, desc: '资源 / 提诉 / 评价 / 黑名单' }
    ] },
    { key: 'asset', name: '资产管理', desc: '资产管理看板 / 资产数据报表', children: [
      { key: 'asset-board', name: '资产管理看板', page: 'asset-board', desc: '核心数据·资产 / 周转率与闲置率' },
      { key: 'report-asset', name: '资产数据报表', page: 'report', params: { ds: 'asset' }, desc: '资产明细 30+ 字段' }
    ] },
    { key: 'compliance', name: '合规分析看板', page: 'compliance', desc: '5 页签 + 异常数穿透' }
  ];
  D.MENU = MENU;

  /* ============================================================
     组织权限（PRD §6 R1–R3）
     ============================================================ */
  D.scope = {
    name: '局总部', level: 1,
    /* R1：组织树选项按权限过滤 */
    orgOptions: function () {
      if (D.scope.level === 1) return D.orgs.concat(D.subOrgs);
      if (D.scope.level === 2) return D.subOrgs.filter(function (s) { return s.parent === D.scope.name; });
      return [];
    },
    /* 数据范围：null 表示全局 */
    dataOrgs: function () {
      if (D.scope.level === 1) return null;
      if (D.scope.level === 2) return [D.scope.name];
      const sub = D.subOrgs.filter(function (s) { return s.name === D.scope.name; })[0];
      return sub ? [sub.parent] : null;
    },
    /* R2：明细行是否可见（超权限不返回数据） */
    canSeeRow: function (row) {
      if (D.scope.level === 1) return true;
      if (D.scope.level === 2) return row.org2 === D.scope.name;
      const sub = D.subOrgs.filter(function (s) { return s.name === D.scope.name; })[0];
      return sub ? (row.org3 === D.scope.name || (row.org2 === sub.parent && row.org3 === D.scope.name)) : true;
    },
    /* R3：驾驶舱排名是否隐藏其他单位具体数值（仅显示名次） */
    maskRank: function () { return D.scope.level !== 1; },
    isSelf: function (name) {
      if (D.scope.level === 1) return false;
      if (D.scope.level === 2) return name === D.scope.name;
      const sub = D.subOrgs.filter(function (s) { return s.name === D.scope.name; })[0];
      return sub ? (name === D.scope.name || name === sub.parent) : false;
    }
  };

  function setScope(name) {
    D.scope.name = name || '局总部';
    if (D.scope.name === '局总部') D.scope.level = 1;
    else if (D.orgMap[D.scope.name] && D.orgMap[D.scope.name].level === 2) D.scope.level = 2;
    else D.scope.level = 3;
    const el = document.getElementById('orgCurrent');
    if (el) el.textContent = D.scope.name;
    const u = document.getElementById('userName');
    if (u) {
      u.textContent = D.scope.level === 1 ? '李彬 · 局供应链管理部'
        : D.scope.level === 2 ? '王建国 · ' + D.scope.name + '供应链管理部'
          : '张伟 · ' + D.scope.name + '物资管理部';
    }
    markScopeMenu();
  }
  function markScopeMenu() {
    const menu = document.getElementById('orgMenu');
    if (!menu) return;
    menu.querySelectorAll('[data-org]').forEach(function (el) {
      el.classList.toggle('layout-org-switch__item--active', el.getAttribute('data-org') === D.scope.name);
    });
  }
  function renderScopeMenu() {
    const menu = document.getElementById('orgMenu');
    const list = [{ name: '局总部', level: 1 }].concat(D.orgs, D.subOrgs);
    menu.innerHTML = list.map(function (o) {
      return '<div class="layout-org-switch__item" data-org="' + esc(o.name) + '">' +
        (o.level === 3 ? '　' + o.parent + ' · ' + o.shortName : o.name) +
        (o.level === 1 ? '（全局）' : '') + '</div>';
    }).join('');
    markScopeMenu();
  }

  /* ============================================================
     路由
     ============================================================ */
  D.route = { page: 'cockpit', params: {} };
  function parseQuery() {
    const q = {};
    (location.search || '').replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      const i = kv.indexOf('=');
      const k = i < 0 ? kv : kv.slice(0, i);
      const v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1));
      if (k) q[k] = v;
    });
    return q;
  }
  D.nav = function (page, params) {
    const merged = Object.assign({ page: page }, params || {});
    const qs = Object.keys(merged).filter(function (k) { return merged[k] != null && merged[k] !== ''; })
      .map(function (k) { return k + '=' + encodeURIComponent(merged[k]); }).join('&');
    location.search = '?' + qs;
  };

  /* ============================================================
     侧边栏渲染
     ============================================================ */
  const CARET = '<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" ' +
    'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>';

  let activeKey = '';
  function leafItem(m) {
    return '<li class="layout-sidebar__item' + (m.key === activeKey ? ' layout-sidebar__item--active' : '') +
      '" data-node="' + m.key + '" data-page="' + esc(m.page) + '"' +
      ' data-params="' + esc(JSON.stringify(m.params || {})) + '" title="' + esc(m.desc) + '">' +
      '<span class="layout-sidebar__item__text">' + esc(m.name) + '</span></li>';
  }
  function groupItem(m) {
    /* 父级：点击只做展开/收起，不导航；含当前页时自动展开并高亮文字 */
    const open = m.children.some(function (c) { return c.key === activeKey; });
    return '<li class="layout-sidebar__group' + (open ? ' layout-sidebar__group--open' : '') + '">' +
      '<div class="layout-sidebar__item layout-sidebar__item--group' +
      (open ? ' layout-sidebar__item--active' : '') + '" data-node="' + m.key + '" data-group="1" ' +
      'title="' + esc(m.desc) + '">' +
      '<span class="layout-sidebar__item__text">' + esc(m.name) + '</span>' +
      '<span class="layout-sidebar__item__caret' + (open ? ' layout-sidebar__item__caret--open' : '') + '">' +
      CARET + '</span></div>' +
      '<ul class="layout-sidebar__submenu' + (open ? ' layout-sidebar__submenu--open' : '') + '">' +
      m.children.map(function (c) {
        return '<li class="layout-sidebar__subitem' + (c.key === activeKey ? ' layout-sidebar__subitem--active' : '') +
          '" data-node="' + c.key + '" data-page="' + esc(c.page) + '"' +
          ' data-params="' + esc(JSON.stringify(c.params || {})) + '" title="' + esc(c.desc) + '">' +
          esc(c.name) + '</li>';
      }).join('') + '</ul></li>';
  }
  function renderSidebar() {
    const box = document.getElementById('sidebarMenu');
    box.innerHTML = MENU.map(function (m) {
      return (m.children && m.children.length) ? groupItem(m) : leafItem(m);
    }).join('');
  }
  /* 顶部菜单搜索：输入即过滤左侧菜单，回车进入第一个命中项 */
  function filterMenu(kwRaw) {
    const box = document.getElementById('sidebarMenu');
    if (!box) return;
    const kw = String(kwRaw || '').trim().toLowerCase();
    if (kw && !box.__preSearch) {
      /* 记住搜索前的展开状态，清空搜索时原样还原 */
      box.__preSearch = Array.prototype.slice.call(box.querySelectorAll('.layout-sidebar__group'))
        .filter(function (g) { return g.classList.contains('layout-sidebar__group--open'); })
        .map(function (g) { return g.querySelector('[data-group]').getAttribute('data-node'); });
    }
    if (!kw && box.__preSearch) {
      box.querySelectorAll('.layout-sidebar__group').forEach(function (g) {
        const key = g.querySelector('[data-group]').getAttribute('data-node');
        const on = box.__preSearch.indexOf(key) >= 0;
        g.classList.toggle('layout-sidebar__group--open', on);
        g.querySelector('.layout-sidebar__submenu').classList.toggle('layout-sidebar__submenu--open', on);
        g.querySelector('[data-group]').classList.toggle('layout-sidebar__item--open', on);
      });
      box.__preSearch = null;
    }
    MENU.forEach(function (m) {
      const li = box.querySelector('[data-node="' + m.key + '"]');
      if (!li) return;
      if (m.children && m.children.length) {
        const wrap = li.closest('.layout-sidebar__group');
        const selfHit = m.name.toLowerCase().indexOf(kw) >= 0;
        let childHit = 0;
        m.children.forEach(function (c) {
          const ci = box.querySelector('.layout-sidebar__subitem[data-node="' + c.key + '"]');
          if (!ci) return;
          const on = !kw || selfHit || c.name.toLowerCase().indexOf(kw) >= 0;
          ci.hidden = !on;
          if (on) childHit++;
        });
        wrap.hidden = !!kw && !selfHit && !childHit;
        if (kw && !wrap.hidden) {
          wrap.querySelector('.layout-sidebar__submenu').classList.add('layout-sidebar__submenu--open');
          li.classList.add('layout-sidebar__item--open');
        }
      } else {
        li.hidden = !!kw && m.name.toLowerCase().indexOf(kw) < 0;
      }
    });
  }
  function firstMenuHit() {
    const box = document.getElementById('sidebarMenu');
    if (!box) return null;
    const subs = Array.prototype.slice.call(box.querySelectorAll('.layout-sidebar__subitem')).filter(function (x) { return !x.hidden && x.offsetParent; });
    if (subs.length) return subs[0];
    const li = Array.prototype.slice.call(box.querySelectorAll('.layout-sidebar__item:not([data-group])')).filter(function (x) { return !x.hidden && x.offsetParent; });
    return li[0] || null;
  }

  function bindSidebar() {
    document.getElementById('sidebarMenu').addEventListener('click', function (e) {
      const grp = e.target.closest('[data-group]');
      if (grp) {
        const wrap = grp.closest('.layout-sidebar__group');
        const sub = wrap.querySelector('.layout-sidebar__submenu');
        const open = !sub.classList.contains('layout-sidebar__submenu--open');
        sub.classList.toggle('layout-sidebar__submenu--open', open);
        wrap.classList.toggle('layout-sidebar__group--open', open);
        grp.classList.toggle('layout-sidebar__item--open', open);
        const caret = grp.querySelector('.layout-sidebar__item__caret');
        if (caret) caret.classList.toggle('layout-sidebar__item__caret--open', open);
        return;
      }
      const li = e.target.closest('[data-node]');
      if (!li) return;
      activeKey = li.getAttribute('data-node');
      D.nav(li.getAttribute('data-page'), JSON.parse(li.getAttribute('data-params') || '{}'));
    });
  }

  /* ============================================================
     面包屑
     ============================================================ */
  D.crumb = function (parts) {
    const el = document.getElementById('breadcrumb');
    const all = ['首页', '智慧运营'].concat(parts || []);
    el.innerHTML = all.map(function (p, i) {
      return i === all.length - 1 ? '<span>' + esc(p) + '</span>' : esc(p) + ' &gt; ';
    }).join('');
  };

  /* ============================================================
     页面注册与渲染
     ============================================================ */
  D.pages = D.pages || {};

  D.render = function () {
    /* 视图入参 = 查询参数 + 当前页（视图内直接读 q.ds / q.project / q.view） */
    const q = Object.assign({}, D.route.params, { page: D.route.page });
    const fn = D.pages[q.page] || D.pages.cockpit;
    const container = document.getElementById('pageContainer');
    if (D.beginRender) D.beginRender(container);
    container.innerHTML = '';
    const isScreen = q.page === 'screen';
    container.classList.toggle('dsc-content--screen', isScreen);
    const html = fn(q);
    container.innerHTML = typeof html === 'string' ? html : '';
    /* 通用绑定 */
    D.bindMultiselect(container);
    D.bindPager(container, function (o) { if (D.__pagerCb) D.__pagerCb(o); });
    D.bindSort(container, function (k) { if (D.__sortCb) D.__sortCb(k); });
    if (fn.after) fn.after(container, q);
    window.scrollTo(0, 0);
  };

  /* ============================================================
     启动
     ============================================================ */
  function boot() {
    const q = parseQuery();
    D.route.params = q;
    D.route.page = q.page || 'cockpit';
    setScope(q.org || '局总部');
    renderScopeMenu();
    renderSidebar();
    bindSidebar();
    D.bindModal();

    document.getElementById('orgSwitch').addEventListener('click', function (e) {
      const it = e.target.closest('[data-org]');
      if (it) { setScope(it.getAttribute('data-org')); D.nav(D.route.page, Object.assign({}, D.route.params, { org: D.scope.name === '局总部' ? '' : D.scope.name })); return; }
      this.classList.toggle('layout-org-switch--open');
    });
    document.addEventListener('click', function (e) {
      const sw = document.getElementById('orgSwitch');
      if (sw && !sw.contains(e.target)) sw.classList.remove('layout-org-switch--open');
    });

    /* 顶部菜单搜索 */
    const search = document.getElementById('menuSearch');
    if (search) {
      search.addEventListener('input', function () { filterMenu(search.value); });
      search.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { search.value = ''; filterMenu(''); search.blur(); return; }
        if (e.key !== 'Enter') return;
        const hit = firstMenuHit();
        if (!hit) { D.toast('没有匹配的菜单', 'warn'); return; }
        activeKey = hit.getAttribute('data-node');
        D.nav(hit.getAttribute('data-page'), JSON.parse(hit.getAttribute('data-params') || '{}'));
      });
    }

    /* 大屏模式：隐藏侧栏与面包屑，内容铺满（对外展示/投屏场景） */
    const smBtn = document.getElementById('screenMode');
    function setScreenMode(on) {
      document.body.classList.toggle('is-screen-mode', on);
      if (smBtn) smBtn.classList.toggle('layout-topbar__icon-btn--on', on);
    }
    if (smBtn) smBtn.addEventListener('click', function () {
      const on = !document.body.classList.contains('is-screen-mode');
      setScreenMode(on);
      D.toast(on ? '已进入大屏模式（再次点击或按 Esc 退出）' : '已退出大屏模式');
    });
    /* 回到顶部：滚动超过 1.5 屏才出现 */
    const bt = document.getElementById('backTop');
    if (bt) {
      bt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
      window.addEventListener('scroll', function () {
        bt.hidden = window.scrollY < window.innerHeight * 1.5;
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('is-screen-mode')) {
        setScreenMode(false);
        D.toast('已退出大屏模式');
      }
    });

    /* 依据当前页推导高亮菜单 */
    const pk = D.route.page, ds = q.ds;
    activeKey = pk === 'report' ? ('report-' + (ds || 'purchase'))
      : { screen: 'screen', cockpit: 'cockpit', project: 'project', 'material-board': 'material-board',
        'purchase-board': 'purchase-board', 'supplier-board': 'supplier-board',
        'asset-board': 'asset-board', compliance: 'compliance' }[pk] || 'cockpit';
    renderSidebar();

    const crumbMap = {
      screen: ['数据大屏'], cockpit: ['局级驾驶舱'], project: ['项目驾驶舱'],
      'material-board': ['物资管理', '物资管理看板'],
      'purchase-board': ['采购管理', '采购管理看板'],
      'supplier-board': ['分供商管理', '分供商管理看板'],
      'asset-board': ['资产管理', '资产管理看板'],
      report: ['数据报表', { purchase: '采购数据报表', material: '物资数据报表', supplier: '分供商数据报表', asset: '资产数据报表' }[ds] || '采购数据报表'],
      compliance: ['合规分析看板']
    };
    D.crumb(crumbMap[pk] || ['局级驾驶舱']);
    D.render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.APP);
