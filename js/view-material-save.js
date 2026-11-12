/* material-save：物资管理看板「六项降本」模块（由 view-material-board.js 拆分）
   卡片 / 查询 / 双轴趋势 / 降本明细清单；复用 D.materialBoardState 中的 save 相关状态。 */
(function (D) {
  'use strict';
  const esc = D.esc;
  const CS = D.cockpitState;
  const UI = D.ckUI;
  const CARET = UI.CARET;
  const section = UI.section, subHead = UI.subHead, field = UI.field, advActions = UI.advActions;
  const bindMetricTips = UI.bindMetricTips;
  const MS = D.materialBoardState;
  const MB_MONTHS = D.materialBoardMonths;

  /* 六项降本数据模型（view-material-save-model.js） */
  const SM = D.materialSaveModel;
  const MB_SAVE = SM.MB_SAVE, MB_SAVE_MONTHS = SM.MB_SAVE_MONTHS,
        MB_SAVE_TYPES = SM.MB_SAVE_TYPES, MB_SAVE_SUBS = SM.MB_SAVE_SUBS,
        MB_ALL_SUBS = SM.MB_ALL_SUBS, MB_ITEM_PARENT = SM.MB_ITEM_PARENT,
        MB_FIXED_COLS = SM.MB_FIXED_COLS, MB_COL_TIPS = SM.MB_COL_TIPS;
  const mbSave = SM.mbSave, mbSaveTrend = SM.mbSaveTrend, mbItemOpts = SM.mbItemOpts,
        mbItemName = SM.mbItemName, mbItemSel = SM.mbItemSel, mbCardAmt = SM.mbCardAmt,
        mbScopeAmt = SM.mbScopeAmt, mbScopeRate = SM.mbScopeRate, mbScopeKey = SM.mbScopeKey,
        mbSaveCols = SM.mbSaveCols, mbSaveDef = SM.mbSaveDef, mbRowsFor = SM.mbRowsFor,
        mbRowLevel = SM.mbRowLevel, mbAggRows = SM.mbAggRows, mbTotalRow = SM.mbTotalRow,
        mbDrillRows = SM.mbDrillRows, mbSignRows = SM.mbSignRows, mbDrillPath = SM.mbDrillPath;

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
          '" data-km="' + m[0] + '" role="tab" aria-selected="' + (MS.kpiMode === m[0]) + '">' +
          m[1] + '</div>';
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

  function saveAfter(root) {
    bindMetricTips(root, MB_SAVE, 'data-mb-save');

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

    D.delegate(root, [
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
      } }
    ]);
  }

  D.materialSaveUI = { section: saveSection, after: saveAfter };
})(window.APP);
