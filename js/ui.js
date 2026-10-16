/* ============================================================
   智慧运营数据平台 · 组件库
   表格 / 筛选条 / 多选 / 组织联想 / 列设置 / 时间滑块 / 轮播 / 弹窗 / 指标气泡
   ============================================================ */
window.APP = window.APP || {};

(function (D) {
  'use strict';
  const esc = D.esc;

  /* ============================================================
     通用事件委托（绑定在每次渲染重建的根节点上，避免监听器累积）
     ============================================================ */
  D.delegate = function (root, handlers) {
    const box = typeof root === 'string' ? document.querySelector(root) : root;
    if (!box) return;
    /* 每次渲染由 D.beginRender() 重置 __dh，多次调用 delegate 只做追加；
       监听器只绑一次，避免反复 render 时同一节点上堆积历史监听器 */
    box.__dh = (box.__dh || []).concat(handlers);
    if (box.__dhBound) return;
    box.__dhBound = true;
    box.addEventListener('click', function (e) {
      const list = box.__dh || [];
      for (let i = 0; i < list.length; i++) {
        const h = list[i];
        const el = e.target.closest ? e.target.closest(h.sel) : null;
        if (el) { h.fn(el, e); return; }
      }
    });
  };
  /* 渲染开始前调用：清空上一轮的委托处理器（监听器本体复用） */
  D.beginRender = function (box) {
    if (!box) return;
    box.__dh = [];
  };

  /* ============================================================
     多选下拉
     ============================================================ */
  let msSeq = 0;
  D.multiselect = function (opt) {
    const id = 'ms' + (++msSeq);
    const opts = opt.options || [];
    const value = opt.value || [];
    let list = '';
    if (opt.tree) {
      opts.forEach(function (g) {
        /* 分组标题自身也可以是一个可勾选项（g.value 有值时）——用于「6 大项 + 18 小项」这类两层枚举 */
        if (g.value) list += msOpt(g.value, g.label, value.indexOf(g.value) >= 0, false, 'dsc-multiselect__opt--group');
        else list += '<div class="dsc-multiselect__group">' + esc(g.label) + '</div>';
        (g.children || []).forEach(function (c) { list += msOpt(c.value, c.label, value.indexOf(c.value) >= 0, true); });
      });
    } else {
      opts.forEach(function (o) {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        list += msOpt(v, l, value.indexOf(v) >= 0, false);
      });
    }
    return '<div class="dsc-multiselect" data-ms="' + id + '" data-name="' + esc(opt.name || '') +
      '" data-ms-total="' + (opt.total || '') + '" data-ms-alltext="' + esc(opt.allText || '') + '">' +
      '<div class="dsc-multiselect__box">' + msChips(value, opts, opt.ph || '请选择', opt.total, opt.allText) + '</div>' +
      '<div class="dsc-multiselect__panel dsc-scroll">' +
      '<div class="dsc-multiselect__tools"><span data-ms-all>全选</span><span data-ms-none>清空</span>' +
      '<span data-ms-close style="margin-left:auto;color:#999">收起</span></div>' + list + '</div></div>';
  };
  function msOpt(v, l, checked, child, extraCls) {
    return '<label class="dsc-multiselect__opt' + (child ? ' dsc-multiselect__opt--child' : '') +
      (extraCls ? ' ' + extraCls : '') + '">' +
      '<input type="checkbox" value="' + esc(v) + '"' + (checked ? ' checked' : '') + '/><span>' + esc(l) + '</span></label>';
  }
  function msChips(value, opts, ph, total, allText) {
    if (!value.length) return '<span class="dsc-multiselect__ph">' + esc(ph) + '</span>';
    /* 只对「叶子项」计数与展示 chip：分组标题（父子两级枚举的一级）不占位 */
    let leaves = value;
    if (opts && opts.some(function (o) { return o.children; })) {
      const leafOpts = [];
      opts.forEach(function (o) { if (o.children) leafOpts.push.apply(leafOpts, o.children); });
      leaves = value.filter(function (v) {
        return leafOpts.some(function (o) { return (o.value || o) === v; });
      });
    }
    /* 全部勾选时用一句话代替一长串 chip（长枚举的默认态） */
    if (allText && total && leaves.length >= total) return '<span class="dsc-multiselect__ph">' + esc(allText) + '</span>';
    value = leaves;
    if (!value.length) return '<span class="dsc-multiselect__ph">' + esc(ph) + '</span>';
    const flat = [];
    (opts || []).forEach(function (o) { if (o.children) flat.push.apply(flat, o.children); else flat.push(o); });
    const shown = value.slice(0, 2).map(function (v) {
      const f = flat.filter(function (o) { return (o.value || o) === v; })[0];
      return '<span class="dsc-multiselect__chip">' + esc(f ? (f.label || f) : v) + '<b data-ms-del="' + esc(v) + '">✕</b></span>';
    }).join('');
    return shown + (value.length > 2 ? '<span class="dsc-multiselect__chip">+' + (value.length - 2) + '</span>' : '');
  }
  D.bindMultiselect = function (root) {
    const box = typeof root === 'string' ? document.querySelector(root) : root;
    if (!box || box.__msBound) return;
    box.__msBound = true;
    box.addEventListener('click', function (e) {
      const ms = e.target.closest('[data-ms]');
      if (!ms) { box.querySelectorAll('.dsc-multiselect--open').forEach(function (x) { x.classList.remove('dsc-multiselect--open'); }); return; }
      if (e.target.closest('[data-ms-del]')) {
        const cb = ms.querySelector('input[value="' + e.target.getAttribute('data-ms-del').replace(/"/g, '\\"') + '"]');
        if (cb) { cb.checked = false; ms.dataset.dirty = '1'; msRefresh(ms); }
        e.stopPropagation(); return;
      }
      if (e.target.closest('.dsc-multiselect__box')) { ms.classList.toggle('dsc-multiselect--open'); e.stopPropagation(); return; }
      if (e.target.closest('[data-ms-close]')) { ms.classList.remove('dsc-multiselect--open'); e.stopPropagation(); return; }
      if (e.target.closest('[data-ms-all]')) {
        ms.querySelectorAll('input[type=checkbox]').forEach(function (c) { c.checked = true; });
        ms.dataset.dirty = '1'; msRefresh(ms); e.stopPropagation(); return;
      }
      if (e.target.closest('[data-ms-none]')) {
        ms.querySelectorAll('input[type=checkbox]').forEach(function (c) { c.checked = false; });
        ms.dataset.dirty = '1'; msRefresh(ms); e.stopPropagation(); return;
      }
      if (e.target.closest('.dsc-multiselect__panel')) e.stopPropagation();
    });
    box.addEventListener('change', function (e) {
      if (e.target.type !== 'checkbox') return;
      const ms = e.target.closest('[data-ms]');
      if (!ms) return;
      ms.dataset.dirty = '1'; msRefresh(ms);
    });
  };
  function msRefresh(ms) {
    const vals = [];
    ms.querySelectorAll('input[type=checkbox]').forEach(function (x) { if (x.checked) vals.push(x.value); });
    ms.dataset.value = vals.join(',');
    ms.querySelector('.dsc-multiselect__box').innerHTML =
      msChips(vals, null, '请选择', +ms.dataset.msTotal || 0, ms.dataset.msAlltext || '');
  }
  D.readMultiselect = function (root) {
    const out = {};
    const box = typeof root === 'string' ? document.querySelector(root) : root;
    if (!box) return out;
    box.querySelectorAll('[data-ms]').forEach(function (ms) {
      out[ms.getAttribute('data-name')] = (ms.dataset.value || '').split(',').filter(Boolean);
    });
    return out;
  };

  /* ============================================================
     组织联想选择（BR-1：文本长度为 0 显示全部，≠0 过滤联想）
     ============================================================ */
  D.orgSelect = function (opt) {
    opt = opt || {};
    return '<div class="org-select" data-orgselect data-name="' + esc(opt.name || 'org') + '">' +
      '<input class="dsc-field org-select__input" type="text" placeholder="' + esc(opt.ph || '输入单位名称联想选择') +
      '" value="' + esc(opt.value || '') + '" autocomplete="off"/>' +
      '<div class="org-select__panel dsc-scroll"></div></div>';
  };
  D.bindOrgSelect = function (root, options, onPick) {
    const box = typeof root === 'string' ? document.querySelector(root) : root;
    if (!box) return;
    const wrap = box.querySelector('[data-orgselect]');
    if (!wrap) return;
    const input = wrap.querySelector('input');
    const panel = wrap.querySelector('.org-select__panel');
    function render(kw) {
      const list = options.filter(function (o) { return !kw || o.name.indexOf(kw) >= 0 || (o.shortName || '').indexOf(kw) >= 0; });
      panel.innerHTML = list.length
        ? list.slice(0, 60).map(function (o) {
          return '<div class="org-select__opt" data-org="' + esc(o.name) + '">' + esc(o.name) +
            (o.level === 3 ? ' <small>三级单位</small>' : ' <small>二级单位</small>') + '</div>';
        }).join('')
        : '<div class="org-select__opt"><small>无匹配单位</small></div>';
    }
    render('');
    input.addEventListener('focus', function () { render(input.value); wrap.classList.add('org-select--open'); });
    input.addEventListener('input', function () { render(input.value); wrap.classList.add('org-select--open'); });
    panel.addEventListener('click', function (e) {
      const it = e.target.closest('[data-org]');
      if (!it) return;
      input.value = it.getAttribute('data-org');
      wrap.classList.remove('org-select--open');
      if (onPick) onPick(input.value);
    });
    input.addEventListener('blur', function () { setTimeout(function () { wrap.classList.remove('org-select--open'); }, 180); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && onPick) onPick(input.value); });
  };

  /* ============================================================
     筛选条
     ============================================================ */
  D.filterBar = function (opt) {
    const id = opt.id || 'filter';
    const fields = opt.fields || [];
    const visible = opt.visibleCount || 6;
    return '<div class="dsc-filter-bar dsc-filter-bar--collapsed' + (opt.cls ? ' ' + opt.cls : '') + '" id="' + id + '">' +
      '<div class="dsc-filter-bar__grid">' + fields.slice(0, visible).map(fieldHTML).join('') + '</div>' +
      (fields.length > visible ? '<div class="dsc-filter-bar__grid dsc-filter-bar__extra" style="margin-top:12px">' +
        fields.slice(visible).map(fieldHTML).join('') + '</div>' : '') +
      '<div class="dsc-filter-bar__foot">' +
      /* 展开在最左（对齐 Axure 筛选条），随后是就地条件反馈，按钮固定贴右下角 */
      (fields.length > visible ? '<span class="dsc-filter-bar__toggle" data-f-toggle>展开' +
        '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 6l4 4 4-4"/></svg></span>' : '') +
      '<span class="dsc-filter-bar__hint" data-f-hint' + (opt.conds ? '' : ' hidden') + '>' +
      esc(opt.conds || '') + '</span>' +
      '<div class="dsc-filter-bar__foot-right">' +
      '<button class="dsc-btn dsc-btn--primary" data-f-query>查询</button>' +
      '<button class="dsc-btn" data-f-clear>清空</button>' +
      '<button class="dsc-btn" data-f-reset>重置</button>' +
      '</div></div></div>';
  };
  function fieldHTML(f) {
    f = Object.assign({ ph: '请选择' }, f);
    let ctrl;
    if (f.type === 'multi' || f.type === 'tree') {
      ctrl = D.multiselect({ name: f.name, options: f.options, value: f.value || [], ph: f.ph, tree: f.type === 'tree' });
    } else if (f.type === 'org') {
      ctrl = D.orgSelect({ name: f.name, value: f.value || '', ph: f.ph });
    } else if (f.type === 'select') {
      ctrl = '<select class="dsc-field" data-f-name="' + esc(f.name) + '"><option value="">' + esc(f.ph) + '</option>' +
        (f.options || []).map(function (o) {
          const v = typeof o === 'string' ? o : o.value, l = typeof o === 'string' ? o : o.label;
          return '<option value="' + esc(v) + '"' + (f.value === v ? ' selected' : '') + '>' + esc(l) + '</option>';
        }).join('') + '</select>';
    } else if (f.type === 'daterange') {
      ctrl = '<div class="dsc-daterange">' +
        (f.grain ? '<select class="dsc-field dsc-daterange__grain" data-f-name="' + esc(f.name + 'Grain') + '" title="统计粒度">' +
          f.grain.map(function (g) {
            return '<option' + (f.grainValue === g ? ' selected' : '') + '>' + esc(g) + '</option>';
          }).join('') + '</select>' : '') +
        '<input class="dsc-field" type="date" data-f-name="' + esc(f.name) + '" value="' + esc(f.value ? f.value[0] : '') + '"/>' +
        '<span class="dsc-daterange__sep">~</span>' +
        '<input class="dsc-field" type="date" data-f-name="' + esc(f.name) + '2" value="' + esc(f.value ? f.value[1] : '') + '"/></div>';
    } else {
      ctrl = '<input class="dsc-field" type="text" placeholder="' + esc(f.ph) + '" data-f-name="' + esc(f.name) + '" value="' + esc(f.value || '') + '"/>';
    }
    return '<div class="dsc-filter-bar__item"><span class="dsc-filter-bar__label">' + esc(f.label) + '</span>' +
      '<span class="dsc-filter-bar__ctrl">' + ctrl + '</span></div>';
  }
  D.bindFilter = function (root, id, handlers) {
    const box = (typeof root === 'string' ? document.querySelector(root) : root).querySelector('#' + id);
    if (!box || box.__bound) return;
    box.__bound = true;
    box.addEventListener('click', function (e) {
      if (e.target.closest('[data-f-toggle]')) {
        const btn = e.target.closest('[data-f-toggle]');
        const collapsed = box.classList.toggle('dsc-filter-bar--collapsed');
        btn.classList.toggle('dsc-filter-bar__toggle--open', !collapsed);
        btn.childNodes[0].nodeValue = collapsed ? '展开' : '收起';
        return;
      }
      if (e.target.closest('[data-f-query]')) { handlers.query && handlers.query(D.readFilter(box)); return; }
      if (e.target.closest('[data-f-clear]')) {
        box.querySelectorAll('input[type=text],input[type=date]').forEach(function (i) { i.value = ''; });
        box.querySelectorAll('select').forEach(function (s) { s.value = ''; });
        box.querySelectorAll('input[type=checkbox]').forEach(function (c) { c.checked = false; });
        box.querySelectorAll('[data-ms]').forEach(function (m) { m.dataset.value = ''; m.querySelector('.dsc-multiselect__box').innerHTML = '<span class="dsc-multiselect__ph">请选择</span>'; });
        handlers.clear && handlers.clear();
        return;
      }
      if (e.target.closest('[data-f-reset]')) { handlers.reset && handlers.reset(); }
    });
  };
  D.readFilter = function (box) {
    const out = {};
    box.querySelectorAll('[data-f-name]').forEach(function (el) {
      const n = el.getAttribute('data-f-name');
      if (!el.value) return;
      if (out[n]) out[n] = [out[n], el.value]; else out[n] = el.value;
    });
    Object.keys(out).forEach(function (k) {
      if (k.slice(-1) === '2' && out[k.slice(0, -1)]) { out[k.slice(0, -1)] = [out[k.slice(0, -1)], out[k]]; delete out[k]; }
    });
    Object.assign(out, D.readMultiselect(box));
    return out;
  };

  /* ============================================================
     表格
     cols: [{key,name,width,num,link,sticky,sticky2,sortable,render,range}]
     ============================================================ */
  D.table = function (opt) {
    const cols = (opt.cols || []).filter(Boolean);
    const rows = opt.rows || [];
    if (!cols.length) return '<div class="dsc-empty">未配置列</div>';
    const sortKey = opt.sortKey, sortDir = opt.sortDir;
    function thOf(c, extra) {
      const cls = [c.num ? 'dsc-num' : '', c.sticky ? 'dsc-sticky-col' : (c.sticky2 ? 'dsc-sticky-col-2' : ''),
        c.sortable ? 'dsc-sortable' : '', sortKey === c.key ? ('dsc-sort-' + sortDir) : ''].filter(Boolean).join(' ');
      const inner = c.sortable ? '<span class="dsc-sort">' + esc(c.name) + '</span>' : esc(c.name);
      return '<th class="' + cls + '" style="min-width:' + (c.width || 120) + 'px"' + (extra || '') +
        (c.tip ? ' title="' + esc(c.tip) + '"' : '') +
        (c.sortable ? ' data-sort="' + esc(c.key) + '"' : '') + '>' + inner + '</th>';
    }
    /* 两级表头：带 group 的列合并出一行父表头，其余列 rowspan=2 占满两行 */
    let th;
    if (cols.some(function (c) { return c.group; })) {
      const top = [], sub = [];
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        if (!c.group) { top.push(thOf(c, ' rowspan="2"')); continue; }
        let j = i;
        while (j < cols.length && cols[j].group === c.group) j++;
        top.push('<th class="dsc-table__group" colspan="' + (j - i) + '">' + esc(c.group) + '</th>');
        for (let k = i; k < j; k++) sub.push(thOf(cols[k]));
        i = j - 1;
      }
      th = '<tr>' + top.join('') + '</tr><tr>' + sub.join('') + '</tr>';
    } else {
      th = '<tr>' + cols.map(function (c) { return thOf(c); }).join('') + '</tr>';
    }

    let body;
    if (!rows.length) {
      body = '<tr><td colspan="' + cols.length + '"><div class="dsc-empty">暂无符合条件的数据' +
        '<div class="dsc-empty__hint">可调整筛选条件后重新查询</div></div></td></tr>';
    } else {
      body = rows.map(function (r, ri) {
        return '<tr class="' + (opt.rowClass ? opt.rowClass(r, ri) : '') + '" data-row="' + ri + '">' + cols.map(function (c, i) {
          const cls = [c.num ? 'dsc-num' : '', c.sticky ? 'dsc-sticky-col' : (c.sticky2 ? 'dsc-sticky-col-2' : '')].filter(Boolean).join(' ');
          let v = r[c.key], html;
          if (c.key === 'idx') html = ri + 1;
          else if (typeof c.render === 'function') html = c.render(v, r, ri);
          else if (v == null || v === '') html = '—';
          else if (c.pct) {
            const bad = c.range && (v < c.range[0] || v > c.range[1]);
            html = '<span' + (bad ? ' style="color:#F5222D;font-weight:700" title="超出阈值 ' + c.range.join('~') + '"' : '') + '>' + D.fmtNum(v, 2) + '%</span>';
          } else if (c.num) html = c.fmt ? c.fmt(v) : D.fmtNum(v, typeof v === 'number' && v % 1 !== 0 ? 2 : 0);
          else html = esc(v);
          if (c.link && v && v !== '—') html = '<span class="dsc-table__link" data-link="' + esc(v) + '">' + esc(v) + '</span>';
          return '<td class="' + cls + '">' + html + '</td>';
        }).join('') + '</tr>';
      }).join('');
      if (opt.totalRow) {
        const t = opt.totalRow;
        const totalHtml = '<tr class="dsc-total-row">' + cols.map(function (c, i) {
          const cls = [c.num ? 'dsc-num' : '', c.sticky ? 'dsc-sticky-col' : (c.sticky2 ? 'dsc-sticky-col-2' : '')].filter(Boolean).join(' ');
          let v = t[c.key];
          if (c.key === 'idx') v = '合计';
          else if (v == null) v = '';
          else if (c.pct) v = D.fmtNum(v, 2) + '%';
          else if (c.num) v = c.fmt ? c.fmt(v) : D.fmtNum(v, typeof v === 'number' && v % 1 !== 0 ? 2 : 0);
          return '<td class="' + cls + '">' + esc(v) + '</td>';
        }).join('') + '</tr>';
        /* totalRowTop：合计行放在数据行之前（长清单滚动区里不至于"看不见合计"，与排行表一致） */
        body = opt.totalRowTop ? totalHtml + body : body + totalHtml;
      }
    }
    return '<div class="dsc-table-wrap"><div class="dsc-table-wrap__scroll dsc-scroll" style="max-height:' +
      (opt.maxHeight || 520) + 'px"><table class="dsc-table"><thead>' + th + '</thead><tbody>' + body +
      '</tbody></table></div>' + (opt.foot || '') + '</div>';
  };

  /* 合计行工具 */
  D.totalOf = function (cols, rows) {
    const t = {};
    cols.forEach(function (c) {
      if (!c.num) return;
      const s = rows.reduce(function (a, r) { return a + (typeof r[c.key] === 'number' ? r[c.key] : 0); }, 0);
      t[c.key] = c.pct ? +(s / (rows.length || 1)).toFixed(2) : +s.toFixed(2);
    });
    return t;
  };

  /* ============================================================
     动态列（表格右上角的齿轮「设置列」）
     store: key → 当前显示字段数组（会话内保持，与 Axure 各表独立的「列表字段选择」面板对应）
     ============================================================ */
  D.colStore = {};
  D.colsOf = function (key, all, def) {
    if (!D.colStore[key]) D.colStore[key] = (def || all.map(function (c) { return c.key; })).slice();
    const map = {};
    all.forEach(function (c) { map[c.key] = c; });
    return D.colStore[key].map(function (k) { return map[k]; }).filter(Boolean);
  };
  D.resetCols = function (key) { delete D.colStore[key]; };
  /* 齿轮按钮：所有明细表统一放在卡片右上角（Axure 各报表右上角同一位置） */
  D.colGear = function (attr, tip) {
    return '<button class="dsc-colgear"' + (attr ? ' ' + attr : '') +
      ' title="' + esc(tip || '设置列：勾选需要显示的字段，并拖拽调整顺序') + '" aria-label="设置列">' +
      '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="8" cy="8" r="2.1"/><path d="M12.9 9.6a1.1 1.1 0 0 0 .22 1.21l.04.04a1.33 1.33 0 1 1-1.88 1.88l-.04-.04a1.1 1.1 0 0 0-1.21-.22 1.1 1.1 0 0 0-.67 1v.11a1.33 1.33 0 1 1-2.66 0v-.06a1.1 1.1 0 0 0-.72-1 1.1 1.1 0 0 0-1.21.22l-.04.04a1.33 1.33 0 1 1-1.88-1.88l.04-.04a1.1 1.1 0 0 0 .22-1.21 1.1 1.1 0 0 0-1-.67h-.11a1.33 1.33 0 1 1 0-2.66h.06a1.1 1.1 0 0 0 1-.72 1.1 1.1 0 0 0-.22-1.21l-.04-.04A1.33 1.33 0 1 1 5.55 2.3l.04.04a1.1 1.1 0 0 0 1.21.22h.05a1.1 1.1 0 0 0 .67-1v-.11a1.33 1.33 0 1 1 2.66 0v.06a1.1 1.1 0 0 0 .67 1 1.1 1.1 0 0 0 1.21-.22l.04-.04a1.33 1.33 0 1 1 1.88 1.88l-.04.04a1.1 1.1 0 0 0-.22 1.21v.05a1.1 1.1 0 0 0 1 .67h.11a1.33 1.33 0 1 1 0 2.66h-.06a1.1 1.1 0 0 0-1 .67z"/></svg></button>';
  };
  /* 打开「设置列」弹窗：勾选 + 拖拽排序 → 立即作用到当前表（o.after 里重绘） */
  /* 分组版「设置列」（对齐 Axure 指标明细列表的设置列：基本信息 / 指标信息 两组 + 勾选网格） */
  D.groupedColumnDialog = function (groups, shown) {
    return '<div class="dsc-column-dialog dsc-column-dialog--grouped">' +
      groups.map(function (g) {
        return '<div class="cd-group"><div class="cd-group__title">' + esc(g.title) + '</div>' +
          '<div class="cd-group__grid">' + g.items.map(function (c) {
            return '<label class="cd-cell"><input type="checkbox" data-key="' + esc(c.key) + '"' +
              (shown.indexOf(c.key) >= 0 ? ' checked' : '') + '/><span>' + esc(c.name) + '</span></label>';
          }).join('') + '</div></div>';
      }).join('') + '</div>';
  };
  D.readGroupedDialog = function (box) {
    return Array.prototype.slice.call(box.querySelectorAll('.cd-cell input[type="checkbox"]'))
      .filter(function (b) { return b.checked; })
      .map(function (b) { return b.getAttribute('data-key'); });
  };

  D.openColPicker = function (o) {
    /* 固定列（序号 / 排名）：不在可选清单里，任何时候都保留在最前 */
    const fixed = (o.def || []).filter(function (k) {
      return !o.all.some(function (c) { return c.key === k; });
    });
    const shownKeys = (D.colStore[o.key] || o.def).filter(function (k) {
      return o.all.some(function (c) { return c.key === k; });
    });
    D.modal({
      title: '设置列 · ' + o.title, width: o.width || (o.groups ? 1080 : 900),
      body: o.groups
        ? D.groupedColumnDialog(o.groups, shownKeys)
        : D.columnDialog(o.all.map(function (c) { return { key: c.key, name: c.name }; }), shownKeys),
      buttons: [{ text: '恢复默认', cls: '', act: 'default' },
        { text: '取消', cls: '', act: 'cancel' },
        { text: '确定', cls: 'dsc-btn--primary', act: 'ok' }],
      onAction: function (act, root) {
        if (act === 'default') {
          D.resetCols(o.key);
          D.closeModal();
          if (o.after) o.after();
          D.toast('已恢复默认字段');
          return false;
        }
        const box = root.querySelector('.dsc-column-dialog');
        const keys = o.groups ? D.readGroupedDialog(box) : D.readColumnDialog(box);
        if (!keys.length) { D.toast('请至少选择一个字段', 'warn'); return false; }
        D.colStore[o.key] = fixed.concat(keys);
        if (o.after) o.after();
        D.toast('已应用 ' + keys.length + ' 个显示字段（会话内保持）');
      }
    });
    if (!o.groups) D.bindColumnDialog(document.getElementById('modalBody'));
  };

  /* ============================================================
     分页
     ============================================================ */
  D.pager = function (opt) {
    const page = opt.page || 1, size = opt.size || 10, total = opt.total || 0;
    const pages = Math.max(1, Math.ceil(total / size));
    let nums = [];
    const from = Math.max(1, Math.min(page - 2, pages - 4)), to = Math.min(pages, from + 4);
    for (let i = from; i <= to; i++) nums.push(i);
    return '<div class="dsc-table-foot"><span>共 ' + total + ' 条</span>' +
      '<div class="dsc-table-foot__right">' +
      '<select class="dsc-field" style="width:auto;height:28px" data-pg-size>' +
      [10, 15, 20, 50, 100].map(function (s) { return '<option value="' + s + '"' + (s === size ? ' selected' : '') + '>' + s + ' 条/页</option>'; }).join('') +
      '</select><div class="dsc-pager">' +
      '<button class="dsc-pager__btn" data-pg="1" ' + (page <= 1 ? 'disabled' : '') + '>«</button>' +
      '<button class="dsc-pager__btn" data-pg="' + (page - 1) + '" ' + (page <= 1 ? 'disabled' : '') + '>‹</button>' +
      nums.map(function (n) { return '<button class="dsc-pager__btn' + (n === page ? ' dsc-pager__btn--active' : '') + '" data-pg="' + n + '">' + n + '</button>'; }).join('') +
      '<button class="dsc-pager__btn" data-pg="' + (page + 1) + '" ' + (page >= pages ? 'disabled' : '') + '>›</button>' +
      '<button class="dsc-pager__btn" data-pg="' + pages + '" ' + (page >= pages ? 'disabled' : '') + '>»</button>' +
      '</div><span class="dsc-pager__jump">跳至<input type="text" data-pg-jump value="' + page + '"/>页</span>' +
      '</div></div>';
  };
  D.bindPager = function (root, cb) {
    const box = typeof root === 'string' ? document.querySelector(root) : root;
    if (!box || box.__pgBound) return;
    box.__pgBound = true;
    box.addEventListener('click', function (e) {
      const b = e.target.closest('[data-pg]');
      if (b && !b.disabled) cb({ page: +b.getAttribute('data-pg') });
      else if (e.target.closest('[data-pg-jump]')) { const v = +e.target.value; if (v > 0) cb({ page: v }); }
    });
    box.addEventListener('change', function (e) {
      if (e.target.matches && e.target.matches('[data-pg-size]')) cb({ size: +e.target.value, page: 1 });
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-pg-jump]')) { const v = +e.target.value; if (v > 0) cb({ page: v }); }
    });
  };

  /* 表头排序（toggle 升/降序） */
  D.bindSort = function (root, cb) {
    const box = typeof root === 'string' ? document.querySelector(root) : root;
    if (!box || box.__sortBound) return;
    box.__sortBound = true;
    box.addEventListener('click', function (e) {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      cb(th.getAttribute('data-sort'));
    });
  };

  /* ============================================================
     列设置弹窗
     ============================================================ */
  D.columnDialog = function (all, shown) {
    const items = shown.map(function (k, i) {
      const c = all.filter(function (x) { return x.key === k; })[0];
      return c ? cdItem(c, i, true) : '';
    }).join('') + all.filter(function (c) { return shown.indexOf(c.key) < 0; })
      .map(function (c, i) { return cdItem(c, shown.length + i, false); }).join('');
    return '<div class="dsc-column-dialog">' +
      '<div class="dsc-column-dialog__tools"><a data-cd-all>全选</a><a data-cd-none>清空</a><a data-cd-default>恢复默认</a>' +
      '<span class="u-tertiary" style="margin-left:auto">勾选显示字段，拖拽调整前后顺序（共 ' + all.length + ' 个字段）</span></div>' +
      '<div class="dsc-column-dialog__list dsc-scroll" id="cdList">' + items + '</div></div>';
  };
  function cdItem(c, i, checked) {
    return '<label class="dsc-column-dialog__item" draggable="true" data-key="' + esc(c.key) + '">' +
      '<input type="checkbox"' + (checked ? ' checked' : '') + '/><i>⠿</i><span>' + esc(c.name) + '</span>' +
      '<span class="dsc-column-dialog__order">' + (checked ? i + 1 : '—') + '</span></label>';
  }
  D.bindColumnDialog = function (box) {
    if (!box || box.__cdBound) return;
    box.__cdBound = true;
    let dragEl = null;
    box.addEventListener('click', function (e) {
      const list = box.querySelector('#cdList');
      if (e.target.closest('[data-cd-all]')) list.querySelectorAll('input').forEach(function (i) { i.checked = true; });
      else if (e.target.closest('[data-cd-none]')) list.querySelectorAll('input').forEach(function (i) { i.checked = false; });
      else if (e.target.closest('[data-cd-default]')) { box.dispatchEvent(new CustomEvent('cd-reset', { bubbles: true })); return; }
      cdRenumber(list);
    });
    box.addEventListener('change', function (e) { if (e.target.type === 'checkbox') cdRenumber(box.querySelector('#cdList')); });
    box.addEventListener('dragstart', function (e) {
      const it = e.target.closest('.dsc-column-dialog__item');
      if (!it) return;
      dragEl = it; it.classList.add('dsc-column-dialog__item--drag');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', it.dataset.key); } catch (err) { /* noop */ }
    });
    box.addEventListener('dragover', function (e) {
      const it = e.target.closest('.dsc-column-dialog__item');
      if (!it || it === dragEl) return;
      e.preventDefault();
      box.querySelectorAll('.dsc-column-dialog__item--over').forEach(function (x) { x.classList.remove('dsc-column-dialog__item--over'); });
      it.classList.add('dsc-column-dialog__item--over');
    });
    box.addEventListener('drop', function (e) {
      const it = e.target.closest('.dsc-column-dialog__item');
      if (!it || !dragEl || it === dragEl) return;
      e.preventDefault();
      const list = box.querySelector('#cdList');
      const items = Array.prototype.slice.call(list.children);
      if (items.indexOf(dragEl) < items.indexOf(it)) it.after(dragEl); else it.before(dragEl);
      it.classList.remove('dsc-column-dialog__item--over');
      cdRenumber(list);
    });
    box.addEventListener('dragend', function () {
      box.querySelectorAll('.dsc-column-dialog__item--drag,.dsc-column-dialog__item--over').forEach(function (x) {
        x.classList.remove('dsc-column-dialog__item--drag', 'dsc-column-dialog__item--over');
      });
      dragEl = null;
    });
  };
  function cdRenumber(list) {
    if (!list) return;
    let n = 0;
    list.querySelectorAll('.dsc-column-dialog__item').forEach(function (it) {
      it.querySelector('.dsc-column-dialog__order').textContent = it.querySelector('input').checked ? (++n) : '—';
    });
  }
  D.readColumnDialog = function (box) {
    const keys = [];
    box.querySelectorAll('#cdList .dsc-column-dialog__item').forEach(function (it) {
      if (it.querySelector('input').checked) keys.push(it.dataset.key);
    });
    return keys;
  };

  /* ============================================================
     模态框
     ============================================================ */
  D.modal = function (opt) {
    const ov = document.getElementById('modalOverlay');
    if (!ov) return;
    document.getElementById('modalTitle').textContent = opt.title || '';
    document.getElementById('modalBody').innerHTML = opt.body || '';
    document.getElementById('modalFooter').innerHTML = (opt.buttons || [
      { text: '取消', cls: '', act: 'cancel' }, { text: '确定', cls: 'dsc-btn--primary', act: 'ok' }
    ]).map(function (b) {
      return '<button class="dsc-btn ' + (b.cls || '') + '" data-modal-act="' + b.act + '">' + esc(b.text) + '</button>';
    }).join('');
    const mEl = ov.querySelector('.dsc-modal');
    mEl.style.width = (opt.width || 720) + 'px';
    if (opt.cls) mEl.classList.add(opt.cls);
    ov.classList.add('dsc-modal-overlay--visible');
    D.__modalHandler = opt.onAction || null;
  };
  D.closeModal = function () {
    const ov = document.getElementById('modalOverlay');
    if (ov) ov.classList.remove('dsc-modal-overlay--visible');
    D.__modalHandler = null;
  };
  D.bindModal = function () {
    const ov = document.getElementById('modalOverlay');
    if (!ov || ov.__bound) return;
    ov.__bound = true;
    ov.addEventListener('click', function (e) {
      const act = e.target.closest('[data-modal-act]');
      if (act) {
        const a = act.getAttribute('data-modal-act');
        if (a !== 'cancel' && D.__modalHandler && D.__modalHandler(a, ov) === false) return;
        D.closeModal();
        return;
      }
      if (e.target.closest('#modalClose') || e.target === ov) D.closeModal();
    });
  };

  D.toast = function (msg, type) {
    let box = document.getElementById('appToast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'appToast';
      box.style.cssText = 'position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:3000;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none';
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = 'dsc-note dsc-note--' + (type || 'info');
    el.style.cssText = 'box-shadow:0 4px 16px rgba(0,0,0,.14);background:#fff;min-width:220px;justify-content:center';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  };

  /* ============================================================
     空态页（内容待补充的看板）：一个说明 + 一条去往明细报表的入口
     ============================================================ */
  const EMPTY_GLYPH = '<svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="6.5" width="23" height="19" rx="2"/>' +
    '<path d="M4.5 12.5h23M10 6.5v6M22 6.5v6M9.5 18h6M9.5 21.5h11"/></svg>';

  D.emptyView = function (opt) {
    opt = opt || {};
    const lk = opt.link;
    return '<div class="dsc-page dsc-empty-page"><div class="dsc-empty-state">' +
      '<div class="dsc-empty-state__icon">' + EMPTY_GLYPH + '</div>' +
      '<div class="dsc-empty-state__title">' + esc(opt.title || '') + '</div>' +
      '<div class="dsc-empty-state__desc">' + esc(opt.desc || '内容待补充') + '</div>' +
      (lk ? '<div class="dsc-empty-state__actions"><button class="dsc-btn dsc-btn--sm" data-empty-go="' +
        esc(lk.page) + '" data-empty-params="' + esc(JSON.stringify(lk.params || {})) + '">' +
        esc(lk.label) + '</button></div>' : '') +
      '</div></div>';
  };
  /* 空态页的跳转按钮（各页 after 里调用） */
  D.bindEmptyView = function (root) {
    D.delegate(root, [{ sel: '[data-empty-go]', fn: function (el) {
      D.nav(el.getAttribute('data-empty-go'), JSON.parse(el.getAttribute('data-empty-params') || '{}'));
    } }]);
  };

  /* ============================================================
     指标口径气泡（AC9：定义 / 口径 / 数据来源；切换指标时旧气泡关闭）
     ============================================================ */
  D.metricTip = function (el, def) {
    el.addEventListener('mouseenter', function (e) { showTip(e.currentTarget, def); });
    el.addEventListener('mousemove', function (e) { moveTip(e); });
    el.addEventListener('mouseleave', hideTip);
    /* 不用 stopPropagation：卡片本身的点击（切页签 / 切指标）还要冒泡给 D.delegate */
    el.addEventListener('click', function (e) { showTip(e.currentTarget, def); });
  };
  function tipEl() {
    let t = document.getElementById('metricTip');
    if (!t) { t = document.createElement('div'); t.id = 'metricTip'; t.className = 'dsc-metric-tip'; document.body.appendChild(t); }
    return t;
  }
  function showTip(anchor, def) {
    const t = tipEl();
    t.innerHTML = '<div style="font-weight:700;margin-bottom:4px">' + esc(def.name) + '</div>' +
      '<div><b>指标定义：</b>' + esc(def.desc || '—') + '</div>' +
      '<div><b>统计口径：</b>' + esc(def.unit ? ('单位 ' + def.unit + '，率值保留 2 位小数') : '—') + '</div>' +
      '<div><b>数据来源：</b>' + esc(def.src || '—') + '</div>' +
      (def.ctrl ? '<div><b>阈值：</b>' + def.ctrl[0] + ' ~ ' + def.ctrl[1] + (def.unit || '') + '</div>' : '<div><b>阈值：</b>/-/（未设置）</div>');
    const r = anchor.getBoundingClientRect();
    t.style.display = 'block';
    t.style.left = Math.min(window.innerWidth - 400, Math.max(12, r.left)) + 'px';
    t.style.top = (r.bottom + 8) + 'px';
  }
  function moveTip(e) {
    const t = tipEl();
    if (t.style.display !== 'block') return;
    t.style.left = Math.min(window.innerWidth - 400, Math.max(12, e.clientX)) + 'px';
  }
  function hideTip() { tipEl().style.display = 'none'; }
  D.hideMetricTip = hideTip;

  /* ============================================================
     排名轮播（AC8：自动轮播，点击停止、离开恢复）
     ============================================================ */
  D.rankCarousel = function (id, pages, opt) {
    opt = opt || {};
    const per = opt.per || 10;
    const chunks = [];
    for (let i = 0; i < pages.length; i += per) chunks.push(pages.slice(i, i + per));
    if (!chunks.length) chunks.push([]);
    return '<div class="rank-carousel" data-carousel="' + id + '" data-interval="' + (opt.interval || 8000) + '">' +
      chunks.map(function (ch, ci) {
        return '<div class="rank-carousel__page' + (ci === 0 ? ' rank-carousel__page--active' : '') + '" data-page="' + ci + '">' +
          ch.map(function (o) { return o; }).join('') + '</div>';
      }).join('') +
      (chunks.length > 1 ? '<div class="rank-carousel__foot">' +
        chunks.map(function (_, ci) {
          return '<span class="rank-carousel__dot' + (ci === 0 ? ' rank-carousel__dot--active' : '') + '" data-dot="' + ci + '"></span>';
        }).join('') + '<span style="margin-left:8px">' + chunks.length + ' 页自动轮播</span></div>' : '') +
      '</div>';
  };
  D.startCarousels = function (root) {
    (root || document).querySelectorAll('[data-carousel]').forEach(function (box) {
      if (box.__timer) clearInterval(box.__timer);
      const pages = box.querySelectorAll('.rank-carousel__page');
      if (pages.length <= 1) return;
      const dots = box.querySelectorAll('.rank-carousel__dot');
      let cur = 0, paused = false;
      function goto(i) {
        pages[cur].classList.remove('rank-carousel__page--active');
        if (dots[cur]) dots[cur].classList.remove('rank-carousel__dot--active');
        cur = (i + pages.length) % pages.length;
        pages[cur].classList.add('rank-carousel__page--active');
        if (dots[cur]) dots[cur].classList.add('rank-carousel__dot--active');
      }
      const interval = +(box.getAttribute('data-interval') || 8000);
      box.__timer = setInterval(function () { if (!paused) goto(cur + 1); }, interval);
      box.addEventListener('mouseenter', function () { paused = true; });
      box.addEventListener('mouseleave', function () { paused = false; });
      box.addEventListener('click', function (e) {
        const dot = e.target.closest('[data-dot]');
        if (dot) { goto(+dot.getAttribute('data-dot')); return; }
        paused = true;                       /* AC8：点击列表区域后停止轮播 */
        setTimeout(function () { paused = false; }, 12000);
      });
    });
  };

  /* ============================================================
     大屏轮播（页签切换 + 自动轮播，点击后停止）
     ============================================================ */
  D.startScreenCarousel = function (box, onSwitch) {
    if (!box) return;
    const tabs = box.querySelectorAll('[data-viewtab]');
    const panes = box.querySelectorAll('[data-viewpane]');
    if (!tabs.length) return;
    let cur = 0, paused = false;
    function goto(i) {
      cur = (i + tabs.length) % tabs.length;
      tabs.forEach(function (t, ti) { t.classList.toggle('scr-viewtab--active', ti === cur); });
      panes.forEach(function (p, pi) { p.classList.toggle('u-hidden', pi !== cur); });
      if (onSwitch) onSwitch(cur);
    }
    goto(0);
    if (box.__timer) clearInterval(box.__timer);
    box.__timer = setInterval(function () { if (!paused) goto(cur + 1); }, 8000);
    tabs.forEach(function (t, ti) {
      t.addEventListener('click', function () {
        goto(ti);
        paused = true;                        /* 点击页签后停止重复 */
        setTimeout(function () { paused = false; }, 20000);
      });
    });
    box.addEventListener('mouseenter', function () { paused = true; });
    box.addEventListener('mouseleave', function () { paused = false; });
  };

  /* ============================================================
     时间滑块（双手柄）
     ============================================================ */
  D.timeSlider = function (id, cats, range) {
    return '<div class="dsc-timeslider" data-slider="' + id + '" data-cats="' + esc(cats.join(',')) + '">' +
      '<div class="dsc-timeslider__value">区间：<b data-sl-from>' + esc(cats[range[0]]) + '</b> ~ <b data-sl-to>' + esc(cats[range[1]]) + '</b></div>' +
      '<div class="dsc-timeslider__track">' +
      '<div class="dsc-timeslider__range" data-sl-range></div>' +
      '<div class="dsc-timeslider__handle" data-sl-handle="from"></div>' +
      '<div class="dsc-timeslider__handle" data-sl-handle="to"></div></div>' +
      '<div class="dsc-timeslider__ticks"><span>' + esc(cats[0]) + '</span><span>' + esc(cats[cats.length - 1]) + '</span></div>' +
      '</div>';
  };
  D.bindTimeSlider = function (root, id, init, onChange) {
    const box = (typeof root === 'string' ? document.querySelector(root) : root).querySelector('[data-slider="' + id + '"]');
    if (!box) return;
    const cats = box.getAttribute('data-cats').split(',');
    const track = box.querySelector('.dsc-timeslider__track');
    const rangeEl = box.querySelector('[data-sl-range]');
    const hFrom = box.querySelector('[data-sl-handle="from"]');
    const hTo = box.querySelector('[data-sl-handle="to"]');
    const valFrom = box.querySelector('[data-sl-from]');
    const valTo = box.querySelector('[data-sl-to]');
    let from = init[0], to = init[1];

    function paint() {
      const n = Math.max(1, cats.length - 1);
      const pf = from / n * 100, pt = to / n * 100;
      rangeEl.style.left = pf + '%';
      rangeEl.style.width = (pt - pf) + '%';
      hFrom.style.left = pf + '%';
      hTo.style.left = pt + '%';
      valFrom.textContent = cats[from];
      valTo.textContent = cats[to];
    }
    paint();
    function start(which) {
      function move(e) {
        const r = track.getBoundingClientRect();
        const x = (e.clientX != null ? e.clientX : e.touches[0].clientX) - r.left;
        const n = Math.max(1, cats.length - 1);
        let idx = Math.round(x / r.width * n);
        idx = Math.max(0, Math.min(cats.length - 1, idx));
        if (which === 'from') from = Math.min(idx, to); else to = Math.max(idx, from);
        paint();
        onChange(from, to);
      }
      function up() {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      }
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    }
    hFrom.addEventListener('mousedown', function (e) { e.preventDefault(); start('from'); });
    hTo.addEventListener('mousedown', function (e) { e.preventDefault(); start('to'); });
    track.addEventListener('click', function (e) {
      if (e.target.closest('[data-sl-handle]')) return;
      const r = track.getBoundingClientRect();
      const n = Math.max(1, cats.length - 1);
      const idx = Math.max(0, Math.min(cats.length - 1, Math.round((e.clientX - r.left) / r.width * n)));
      if (Math.abs(idx - from) <= Math.abs(idx - to)) from = Math.min(idx, to); else to = Math.max(idx, from);
      paint(); onChange(from, to);
    });
  };

  /* ============================================================
     地区树多选（全国 → 大区 → 省 → 市）
     ============================================================ */
  D.areaTree = function () {
    return D.areas.map(function (a) {
      return { label: a, children: (D.areaCities[a] || []).map(function (c) { return { value: c, label: c }; }) };
    });
  };
})(window.APP);
