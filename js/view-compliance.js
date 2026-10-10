/* ============================================================
   F8 合规分析看板（PRD F8.1–F8.5）
   5 页签 + 正常/异常环状图 + 异常数穿透 + 单位排行
   异常判定规则见 PRD BR-4（首版阈值，可配置）
   ============================================================ */
(function (D) {
  'use strict';
  const esc = D.esc;

  const CS = { tab: 'bid', rankLevel: 'l2', drillOrg: '', page: 1, size: 10 };
  D.complianceState = CS;

  const TABS = [
    ['bid', '招标合规分析'], ['purchase', '采购履约合规'],
    ['material', '物资验收合规'], ['resource', '供应商合规'], ['asset', '资产合规']
  ];

  /* ---------- 各页签指标与异常规则（BR-4） ---------- */
  const CFG = {
    bid: {
      name: '招标合规分析',
      metrics: [
        { key: 'openBid', name: '公开招标率', unit: '%', target: 93, rule: '低于局定目标值 93%', src: '招采系统' },
        { key: 'onlineBid', name: '在线评标率', unit: '%', target: 95, rule: '低于局定目标值 95%', src: '招采系统' },
        { key: 'failBid', name: '废标率', unit: '%', target: 0, invert: true, rule: '出现废标即为异常', src: '招采系统' },
        { key: 'bidLead', name: '平均招标时效', unit: '天', target: 45, invert: true, rule: '高于 45 天为异常', src: '招采系统' }
      ],
      extra: 'bidExtra'
    },
    purchase: {
      name: '采购履约合规',
      metrics: [
        { key: 'costDown', name: '采购成本降低率', unit: '%', target: 50, dual: true, rule: '> 50% 或 < -50% 判异常', src: '结算单 / 合同' },
        { key: 'central', name: '物资设备集中采购率', unit: '%', target: 60, rule: '低于目标值 60%', src: '采购管理系统' },
        { key: 'subCentral', name: '分包集中采购率', unit: '%', target: 15, rule: '低于目标值 15%', src: '采购管理系统' },
        { key: 'direct', name: '厂家直采总占比', unit: '%', target: 20, rule: '低于目标值 20%', src: '采购管理系统' },
        { key: 'plan', name: '采购计划执行率', unit: '%', target: 70, rule: '低于目标值 70%', src: '采购管理系统' },
        { key: 'benefit', name: '采购效益率', unit: '%', target: 20, rule: '低于目标值 20%', src: '物资管理系统' },
        { key: 'selfProc', name: '专业领域自主采购占比', unit: '%', target: 40, invert: true, rule: '高于 40% 为异常', src: '采购管理系统' }
      ]
    },
    material: {
      name: '物资验收合规',
      metrics: [
        { key: 'secondBargain', name: '二次议价采购成本降低率', unit: '%', target: 0, invert: true, rule: '低于目标值判异常', src: '结算单 / 合同' },
        { key: 'orderRatio', name: '合同下单比例', unit: '%', target: 70, rule: '低于目标值 70%', src: '采购管理系统' },
        { key: 'payRatio', name: '按合同履约支付率', unit: '%', target: 75, rule: '低于合同约定支付比例', src: '物资管理系统' }
      ]
    },
    resource: {
      name: '供应商合规',
      metrics: [
        { key: 'onStock', name: '在库分供商数量', unit: '家', target: 0, count: true, rule: '环比波动 > 阈值（Q-09 待定）', src: '采购管理分供商模块' },
        { key: 'newIn', name: '新增入库分供商数量', unit: '家', target: 0, count: true, rule: '环比波动 > 阈值', src: '采购管理分供商模块' },
        { key: 'quality', name: '优质分供商数量', unit: '家', target: 0, count: true, rule: '环比波动 > 阈值', src: '采购管理分供商模块' },
        { key: 'quit', name: '清退分供商数量', unit: '家', target: 0, count: true, rule: '环比波动 > 阈值', src: '采购管理分供商模块' },
        { key: 'active', name: '活跃分供商数量', unit: '家', target: 0, count: true, rule: '环比波动 > 阈值', src: '采购管理分供商模块' },
        { key: 'bad', name: '不良行为分供商数量', unit: '家', target: 0, invert: true, rule: '出现即为异常', src: '采购管理分供商模块' },
        { key: 'qualityRate', name: '优质数量占比', unit: '%', target: 0, rule: '低于目标值', src: '采购管理分供商模块' },
        { key: 'perf', name: '分供商履约额', unit: '万元', target: 0, count: true, rule: '—', src: '采购管理分供商模块' },
        { key: 'perfQuality', name: '优质分供商履约额', unit: '万元', target: 0, count: true, rule: '—', src: '采购管理分供商模块' },
        { key: 'avgPerf', name: '平均履约额', unit: '万元', target: 0, count: true, rule: '—', src: '采购管理分供商模块' },
        { key: 'badRate', name: '不良行为分供商占比', unit: '%', target: 0, invert: true, rule: '出现即为异常', src: '采购管理分供商模块' }
      ]
    },
    asset: {
      name: '资产合规',
      metrics: [
        { key: 'turnover', name: '资产周转率', unit: '次', target: 0.5, rule: '低于目标值 0.5 次', src: '物管系统资产模块' },
        { key: 'idle', name: '资产闲置率', unit: '%', target: 20, invert: true, rule: '高于 20% 判异常（Q-08 待确认）', src: '物管系统资产模块' }
      ]
    }
  };

  /* 指标取值 */
  function metricValue(tab, key) {
    const orgNames = D.scope.dataOrgs();
    const s = D.summary(tab === 'bid' ? 'purchase' : tab, orgNames);
    const special = {
      bid: { openBid: 92.4, onlineBid: 96.8, failBid: 3.4, bidLead: 28.6 },
      resource: { badRate: D.round(s.bad / (s.onStock || 1) * 100) },
      asset: { turnover: 1.24, idle: 18.6 }
    };
    if (special[tab] && special[tab][key] !== undefined) return special[tab][key];
    return s[key] != null ? s[key] : 0;
  }

  function isAbnormal(m, v) {
    if (m.count) return false;                       // 数量类不做异常判定
    if (m.dual) return v > 50 || v < -50;
    if (m.target === 0) return v > 0;
    return m.invert ? v > m.target : v < m.target;
  }

  /* ---------- 指标卡 + 正常/异常环状图 ---------- */
  function metricGrid(tab) {
    const cfg = CFG[tab];
    return '<div class="dsc-grid dsc-grid--4 compliance-page__metric-grid u-mb-lg">' + cfg.metrics.map(function (m, i) {
      const v = metricValue(tab, m.key);
      const bad = isAbnormal(m, v);
      const normalCount = bad ? 18 : 21;
      const abnormalCount = 21 - normalCount;
      return '<div class="dsc-kpi dsc-kpi--clickable compliance-page__metric-card" data-cmetric="' + m.key + '">' +
        '<div class="dsc-kpi__name" title="' + esc(m.rule) + '">' + esc(m.name) + '</div>' +
        '<div class="dsc-kpi__value' + (bad ? ' dsc-kpi__value--danger' : '') + '">' + D.fmtNum(v, 2) +
        '<span class="dsc-kpi__unit">' + esc(m.unit) + '</span></div>' +
        (m.count ? '<div class="dsc-kpi__foot">数量类指标，不做异常判定</div>'
          : '<div class="dsc-kpi__foot">' +
            '<span class="dsc-badge dsc-badge--' + (bad ? 'over' : 'ok') + '">' + (bad ? '存在异常' : '正常') + '</span>' +
            '<span>目标 ' + (m.target === 0 ? '/-/' : m.target + m.unit) + '</span></div>') +
        (!m.count ? '<div class="dsc-chart" id="cfDonut_' + i + '" style="height:120px;margin-top:8px"></div>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  /* ---------- 异常数统计条（点击联动清单） ---------- */
  function abnormalStrip(tab) {
    const orgCount = D.scopeOrgs(D.scope.dataOrgs()).length;
    const cells = [
      { key: 'org2', label: '异常二级单位数', value: Math.max(1, Math.round(orgCount * 0.43)) },
      { key: 'org3', label: '异常三级单位数', value: Math.round(orgCount * 1.24) },
      { key: 'project', label: '异常项目数', value: Math.round(orgCount * 3.4) },
      { key: 'contract', label: '异常合同数', value: Math.round(orgCount * 8.2) }
    ];
    return '<div class="dsc-card u-mb-lg compliance-page__abnormal-strip"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">' + esc(CFG[tab].name) + ' · 异常数统计</div>' +
      '<div class="dsc-card__extra">点击统计项联动过滤下方异常清单</div></div>' +
      '<div class="dsc-strip">' + cells.map(function (c) {
        return '<div class="dsc-strip__cell' + (CS.stat === c.key ? ' dsc-strip__cell--active' : '') + '" data-cstat="' + c.key + '">' +
          '<div class="dsc-strip__label">' + esc(c.label) + '</div>' +
          '<div class="dsc-strip__value dsc-strip__value--danger">' + c.value + '</div></div>';
      }).join('') + '</div></div>';
  }

  /* ---------- 异常清单 ---------- */
  function abnormalRows(tab) {
    const cfg = CFG[tab];
    const scope = D.scopeOrgs(D.scope.dataOrgs());
    const out = [];
    scope.forEach(function (o, oi) {
      const subs = D.subOrgsByParent[o.name] || [];
      const list = D.projectsByOrg[o.name] || [];
      for (let i = 0; i < 3; i++) {
        const m = cfg.metrics[(oi + i) % cfg.metrics.length];
        if (m.count) continue;
        const v = m.dual ? (i === 0 ? 62.4 : -8.6) : (m.invert ? m.target * 1.3 : m.target * 0.72);
        out.push({
          org2: o.name, org3: subs.length ? subs[i % subs.length].name : '—',
          project: list.length ? list[i % list.length].name : D.projects[(oi + i) % D.projects.length].name,
          metric: m.name, value: D.round(v), target: m.target === 0 ? '/-/' : m.target + m.unit,
          rule: m.rule, contractCode: 'HT-' + (20250000 + (oi * 7 + i) * 13),
          docCode: 'DJ' + (20260000 + (oi * 11 + i) * 23),
          creator: ['李彬', '王建国', '张伟', '陈晓', '刘洋'][i % 5], empNo: '8001' + String(20 + i * 3).padStart(3, '0'),
          level: ['严重', '较重', '一般'][i % 3],
          date: '2026-0' + (1 + i) + '-' + String(1 + (oi * 3 + i) % 27).padStart(2, '0')
        });
      }
    });
    if (CS.stat === 'org2') return out.filter(function (r, i) { return i % 3 === 0; });
    if (CS.stat === 'project') return out.filter(function (r, i) { return i % 2 === 0; });
    if (CS.stat === 'contract') return out.slice(0, Math.max(1, Math.round(out.length * 0.6)));
    return out;
  }

  function abnormalTable(tab) {
    const rows = abnormalRows(tab);
    const total = rows.length;
    const paged = rows.slice((CS.page - 1) * CS.size, (CS.page - 1) * CS.size + CS.size);
    return '<div class="dsc-card compliance-page__table-wrap"><div class="dsc-card__header">' +
      '<div class="dsc-card__title">异常数清单</div>' +
      '<div class="dsc-card__extra">' +
      '<button class="dsc-btn dsc-btn--sm" data-cf-push>推送八局通通知</button>' +
      '<button class="dsc-btn dsc-btn--sm" data-cf-export>导出</button></div></div>' +
      D.table({
        cols: [
          { key: 'idx', name: '序号', width: 56, sticky: true },
          { key: 'org2', name: '二级单位', width: 110, sticky2: true },
          { key: 'org3', name: '三级单位', width: 130 },
          { key: 'project', name: '项目', width: 190 },
          { key: 'metric', name: '异常指标', width: 170 },
          { key: 'value', name: '指标值', width: 100, num: true, render: function (v) {
            return '<span style="color:#F5222D;font-weight:700">' + D.fmtNum(v, 2) + '</span>';
          } },
          { key: 'target', name: '目标 / 阈值', width: 120 },
          { key: 'rule', name: '异常规则', width: 200 },
          { key: 'contractCode', name: '合同编号', width: 140, link: true },
          { key: 'docCode', name: '单据编号', width: 150, link: true },
          { key: 'creator', name: '创建人', width: 90 },
          { key: 'empNo', name: '员工编号', width: 110 },
          { key: 'level', name: '异常等级', width: 110, render: function (v) {
            const cls = v === '严重' ? 'over' : v === '较重' ? 'warn' : 'plain';
            return '<span class="dsc-badge dsc-badge--' + cls + '">' + esc(v) + '</span>';
          } },
          { key: 'date', name: '发生日期', width: 120 },
          { key: 'op', name: '操作', width: 100, render: function () {
            return '<span class="dsc-table__link" data-cf-drill>下钻</span>';
          } }
        ], rows: paged.map(function (r, i) { return Object.assign({ idx: (CS.page - 1) * CS.size + i + 1 }, r); }),
        maxHeight: 460, foot: D.pager({ page: CS.page, size: CS.size, total: total })
      }) + '</div>';
  }

  /* ---------- F8.1 招标合规专属：单位排行 + 时效分布 ---------- */
  function bidExtra() {
    const lv = CS.rankLevel;
    const rows = (lv === 'l2' ? D.orgs : D.subOrgs.slice(0, 16)).map(function (o, i) {
      const k = 0.4 + (i * 13 % 50) / 100;
      return { name: o.name || o.shortName, overCount: Math.round(2 + i % 7), overAmt: D.round(1860 * k, 1), failCount: Math.round(1 + i % 4) };
    }).sort(function (a, b) { return b.overCount - a.overCount; });

    return '<div class="dsc-grid dsc-grid--2 dsc-grid--gap-lg u-mb-lg">' +
      '<div class="dsc-card"><div class="dsc-card__header"><div class="dsc-card__title">招标时效分布</div>' +
      '<div class="dsc-card__extra">招标开始至定标天数</div></div>' +
      '<div class="dsc-card__body"><div class="dsc-chart" id="cfLeadDist" style="height:220px"></div></div></div>' +
      '<div class="dsc-card"><div class="dsc-card__header"><div class="dsc-card__title">超额招标单位排行</div>' +
      '<div class="dsc-card__extra">' +
      '<div class="dsc-tabs dsc-tabs--pill" style="margin:0" data-cf-rank>' +
      [['l2', '二级单位'], ['l3', '三级单位']].map(function (k) {
        return '<div class="dsc-tabs__item' + (lv === k[0] ? ' dsc-tabs__item--active' : '') +
          '" data-rl="' + k[0] + '">' + k[1] + '</div>';
      }).join('') + '</div></div></div>' +
      D.table({
        cols: [
          { key: 'idx', name: '排名', width: 60 },
          { key: 'name', name: lv === 'l2' ? '二级单位' : '三级单位', width: 170 },
          { key: 'overCount', name: '超额招标笔数', width: 130, num: true },
          { key: 'overAmt', name: '超额金额(万元)', width: 140, num: true },
          { key: 'failCount', name: '废标笔数', width: 110, num: true }
        ], rows: rows.slice(0, 10).map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }), maxHeight: 260
      }) + '</div></div>';
  }

  /* ============================================================
     页面
     ============================================================ */
  D.pages.compliance = function () {
    const tab = CS.tab;
    const cfg = CFG[tab];
    return '<div class="dsc-page compliance-page">' +
      '<div class="dsc-page__header">' +
      '  <div class="dsc-page__title">合规分析看板</div>' +
      '  <div class="dsc-page__sub">异常判定规则见 PRD BR-4（首版阈值，可配置）；' +
      '异常清单可下钻至单据 / 物料行，并可推送至八局通 · 数字供应链服务通知</div>' +
      '</div>' +
      (D.scope.level === 1 ? '' : '<div class="dsc-note dsc-note--warn u-mb-md">已按组织权限过滤（R2）：仅展示权限范围内的异常数据。</div>') +
      '<div class="dsc-tabs compliance-page__tab-bar" data-cf-tab>' +
      TABS.map(function (t) {
        return '<div class="dsc-tabs__item' + (t[0] === tab ? ' dsc-tabs__item--active' : '') +
          '" data-tab="' + t[0] + '">' + esc(t[1]) + '</div>';
      }).join('') + '</div>' +
      metricGrid(tab) +
      (tab === 'bid' ? bidExtra() : '') +
      abnormalStrip(tab) +
      abnormalTable(tab) +
      '</div>';
  };

  /* ============================================================
     渲染后绑定
     ============================================================ */
  D.pages.compliance.after = function (root) {
    const page = root.querySelector('.compliance-page');
    if (!page) return;
    const tab = CS.tab;
    const cfg = CFG[tab];

    /* 正常 / 异常环状图（AC29） */
    cfg.metrics.forEach(function (m, i) {
      const el = root.querySelector('#cfDonut_' + i);
      if (!el || m.count) return;
      const v = metricValue(tab, m.key);
      const bad = isAbnormal(m, v);
      const normalUnits = bad ? 15 : 21;
      const abnormalUnits = 21 - normalUnits;
      D.donutChart(el, [
        { key: 'normal', name: '正常单位', value: normalUnits, color: '#00B42A' },
        { key: 'abnormal', name: '异常单位', value: abnormalUnits, color: '#F5222D' }
      ], { height: 120, hole: 0.68, clickable: true, centerText: '正常/异常', centerValue: normalUnits + ' / ' + abnormalUnits });
    });

    const ld = root.querySelector('#cfLeadDist');
    if (ld) {
      D.barChart(ld, {
        categories: ['≤15 天', '16-30 天', '31-45 天', '46-60 天', '>60 天'],
        series: [{ name: '招标笔数', data: [420, 1120, 860, 320, 140], color: '#008EE0' }]
      }, { height: 220, yDigits: 0, unit: ' 笔' });
    }

    /* 环状图点击 → 异常数明细（AC29/AC30） */
    root.querySelectorAll('.compliance-page__metric-card').forEach(function (card) {
      card.addEventListener('click', function () {
        const key = card.getAttribute('data-cmetric');
        const m = cfg.metrics.filter(function (x) { return x.key === key; })[0];
        openAbnormal(m, tab);
      });
    });

    D.__pagerCb = function (o) {
      if (o.page) CS.page = o.page;
      if (o.size) { CS.size = o.size; CS.page = 1; }
      D.render();
    };

    page.addEventListener('click', function (e) {
      const t = e.target;

      /* 环状图扇区点击 */
      const dn = t.closest('[data-donut]');
      if (dn) {
        const key = dn.closest('.compliance-page__metric-card').getAttribute('data-cmetric');
        const m = cfg.metrics.filter(function (x) { return x.key === key; })[0];
        openAbnormal(m, tab);
        return;
      }

      const tabEl = t.closest('[data-tab]');
      if (tabEl) { CS.tab = tabEl.getAttribute('data-tab'); CS.stat = null; CS.page = 1; D.render(); return; }

      const rl = t.closest('[data-rl]');
      if (rl) { CS.rankLevel = rl.getAttribute('data-rl'); D.render(); return; }

      const st = t.closest('[data-cstat]');
      if (st) {
        const k = st.getAttribute('data-cstat');
        CS.stat = CS.stat === k ? null : k;
        CS.page = 1;
        D.render();
        return;
      }

      /* 异常数穿透弹窗（AC30） */
      const op = t.closest('.dsc-rowop') || t;
      const row = t.closest('tr[data-row]');
      const link = t.closest('.dsc-table__link');
      if (link && link.hasAttribute('data-cf-drill')) { openAbnormal(null, tab); return; }
      if (link) {
        const code = link.getAttribute('data-code') || link.getAttribute('data-link') || link.textContent;
        D.modal({
          cls: 'dsc-drill-dialog', title: '单据详情', width: 720,
          body: '<div class="dsc-note dsc-note--info u-mb-md">异常单据 <b>' + esc(code) + '</b> 明细（只读）。</div>' +
            '<table class="dsc-table"><tbody>' +
            [['单据编号', code], ['所属组织', D.scope.name], ['异常指标', '采购成本降低率'],
              ['指标值', '62.40%'], ['异常规则', '> 50% 或 < -50% 判异常'], ['创建人', '李彬 （800120）']].map(function (kv) {
              return '<tr><td class="u-muted" style="width:130px">' + kv[0] + '</td><td>' + esc(kv[1]) + '</td></tr>';
            }).join('') + '</tbody></table>',
          buttons: [{ text: '关闭', cls: '', act: 'cancel' },
            { text: '推送八局通通知', cls: 'dsc-btn--primary', act: 'push' }],
          onAction: function (act) { if (act === 'push') D.toast('已推送至八局通 · 数字供应链服务通知'); }
        });
        return;
      }

      if (t.closest('[data-cf-push]')) {
        D.modal({
          title: '推送至八局通 · 数字供应链服务通知', width: 720,
          body: '<div class="dsc-note dsc-note--info u-mb-md">针对异常指标数据，以单据层级向该单据创建人（姓名与员工编号）推送通知。</div>' +
            '<table class="dsc-table"><thead><tr><th>单据编号</th><th>异常指标</th><th>推送对象</th><th>员工编号</th></tr></thead><tbody>' +
            [0, 1, 2].map(function (i) {
              const m = cfg.metrics[i % cfg.metrics.length];
              return '<tr><td>DJ' + (20260000 + i * 23) + '</td><td>' + esc(m.name) + '</td>' +
                '<td>' + ['李彬', '王建国', '张伟'][i] + '</td><td>8001' + (20 + i * 3) + '</td></tr>';
            }).join('') + '</tbody></table>' +
            '<div class="u-mt-md"><label class="dsc-metric__label">通知内容模板</label>' +
            '<textarea class="dsc-field" rows="3" style="height:auto;padding:8px">【数字供应链服务通知】您创建的{单据编号}所属{项目名称}的{指标名称}为{指标值}，已触发异常规则「{异常规则}」，请及时核实处理。</textarea></div>',
          buttons: [{ text: '取消', cls: '', act: 'cancel' }, { text: '确认推送', cls: 'dsc-btn--primary', act: 'ok' }],
          onAction: function () { D.toast('已推送 3 条通知至八局通'); }
        });
        return;
      }
      if (t.closest('[data-cf-export]')) D.toast('导出任务已提交（后端异步生成）');
    });
  };

  /* 异常数明细弹窗 */
  function openAbnormal(m, tab) {
    const rows = abnormalRows(tab).slice(0, 20);
    const list = m ? rows.filter(function (r) { return r.metric === m.name; }) : rows;
    const use = list.length ? list : rows;
    D.modal({
      cls: 'dsc-drill-dialog',
      title: (m ? m.name + ' 异常数明细' : '异常数明细'),
      width: 960,
      body: (m ? '<div class="dsc-note dsc-note--warn u-mb-md">异常规则：' + esc(m.rule) +
        '　·　数据来源：' + esc(m.src) + '</div>' : '') +
        D.table({
          cols: [
            { key: 'idx', name: '序号', width: 56, sticky: true },
            { key: 'org2', name: '二级单位', width: 110 },
            { key: 'org3', name: '三级单位', width: 130 },
            { key: 'project', name: '项目', width: 190 },
            { key: 'metric', name: '异常指标', width: 160 },
            { key: 'value', name: '指标值', width: 100, num: true },
            { key: 'docCode', name: '单据编号', width: 150, link: true },
            { key: 'creator', name: '创建人', width: 90 },
            { key: 'level', name: '异常等级', width: 100 }
          ], rows: use.map(function (r, i) { return Object.assign({ idx: i + 1 }, r); }), maxHeight: 380
        }),
      buttons: [{ text: '关闭', cls: '', act: 'cancel' }, { text: '导出清单', cls: 'dsc-btn--primary', act: 'ok' }],
      onAction: function (act) { if (act === 'ok') D.toast('异常数清单导出任务已提交'); }
    });
  }
})(window.APP);
