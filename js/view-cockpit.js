/* ============================================================
   F2 局驾驶舱
   版式基准：工作目录内两张页面截图（1912px 设计稿）
     view=overview 「局级驾驶舱」  采购金额 → 采购物资 → 采购榜单
     view=metrics  「核心指标」 8 指标卡 → 筛选 → 页签+趋势 → 二级单位表 → 招采分析
   交互基准：Axure 导出稿（页签互斥、四视图联动、下钻、列设置、轮播）
   ============================================================ */
(function (D) {
  'use strict';
  const esc = D.esc;
  const R = D.round;
  /* 基础片段由 view-cockpit-shared.js 提供 */
  const CK = D.ckUI;
  const CARET = CK.CARET;
  const section = CK.section;
  const subHead = CK.subHead;
  const metricCard = CK.metricCard;
  const metricCards = CK.metricCards;
  const metricTabs = CK.metricTabs;
  const detailListHead = CK.detailListHead;
  const filterFoot = CK.filterFoot;
  const setFilterMore = CK.setFilterMore;

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
  const MONTHS = ['2026年01月', '2026年02月', '2026年03月', '2026年04月', '2026年05月',
    '2026年06月', '2026年07月', '2026年08月', '2026年09月'];

  /* ============================================================
     通用片段
     ============================================================ */
  /* section / subHead / metricCard / metricCards / metricTabs / detailListHead
     由 view-cockpit-shared.js 提供（见文件顶部 aliases） */

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
      case '局评价等级': return D.supplierGrades;
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
  function field(label, value, options) {
    /* options：调用方显式指定候选项时优先（同一字段名在不同页面可能有不同字典，
       例如资产的「资产类别」是 11 个项目资产分类，项目驾驶舱则是固定资产/非固定资产） */
    const list = options || optList(label);
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
  /* filterFoot / setFilterMore 由 view-cockpit-shared.js 提供 */
  /* adv：true → 展开/收起开关（data-ck-adv）；{ attr, label } → 自定义属性与文案 */
  function actions(adv) {
    const a = adv === true ? { attr: 'data-ck-adv', label: '展开' } : (adv || null);
    return filterFoot({
      advAttr: a && a.attr ? a.attr : '',
      advLabel: a && a.label,
      advOn: !!(a && a.on)
    });
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
     视图二：核心指标（采购看板）
     ============================================================ */
  /* 与其余三个看板同构：用 section() 分区，而不是把指标/筛选/页签/趋势/表平铺 */

  /* 二级单位明细（截图实测：单位名称 / 不含税标准成本 / 不含税采购金额 / 降低率） */
  /* 看板单位名：短名为主，法定全称进 tooltip；点击切到该单位视角并打开对应报表 */
  function unitLink(shortName, ds) {
    const full = (D.REPORT_UNITS[shortName] || [])[0] || '';
    return '<span class="ck-table__unit dsc-table__link" data-goto-report="' + ds +
      '" data-goto-org="' + esc(shortName) + '" title="' +
      esc((full ? full + '　·　' : '') + '在数据报表中查看该单位') + '">' + esc(shortName) + '</span>';
  }
  /* 指标明细列表：列 = 排名 + 基本信息 + 指标信息，随指标页签切换 */
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
  function metricColumnDef(metric) {
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
  /* 合计行：金额/数量求和；比率默认取均值。
     传了 weightKey 时比率按权重列加权（Σ率×权重 ÷ Σ权重），即「分子 ÷ 分母」口径——
     资产看板的率值以资产金额为分母，合计必须加权，不能用单位均值 */
  function metricTotal(rows, cols, weightKey) {
    const t = {};
    cols.forEach(function (c) {
      const vals = rows.map(function (r) { return r[c.key]; }).filter(function (v) { return typeof v === 'number'; });
      if (!vals.length) return;
      if (c.type === 'pct' && weightKey) {
        let num = 0, den = 0;
        rows.forEach(function (r) {
          const v = r[c.key], w = r[weightKey];
          if (typeof v === 'number' && typeof w === 'number' && w > 0) { num += v * w; den += w; }
        });
        if (den) { t[c.key] = D.round(num / den, 2); return; }
      }
      const s = vals.reduce(function (a, b) { return a + b; }, 0);
      t[c.key] = c.type === 'pct' ? D.round(s / vals.length, 2) : D.round(s, 2);
    });
    return t;
  }
  /* 指标明细表：rows 为当前页；totalRows 为全量结果集（合计必须按全量算，不能只算当前页） */
  function metricListTable(o) {
    const fl = metricFieldList(o.metric);
    const all = [{ key: 'name', name: o.unitHead || '二级单位', type: 'text' }].concat(fl.basic, fl.info);
    const cols = D.colsOf('metric-' + o.metric, all, o.def || metricColumnDef(o.metric));
    const tot = metricTotal(o.totalRows || o.rows, cols, o.weightKey);
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
      key: 'metric-' + metric, title: title, all: all, def: metricColumnDef(metric),
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
        setFilterMore(el, more ? more.hidden : false);
      } },
      { sel: '[data-ck-grain]', fn: function (el) {
        const label = el.getAttribute('data-ck-grain');
        const next = { '日': '月', '月': '季', '季': '年', '年': '日' };
        const nv = next[el.textContent.trim()] || '日';
        if (label === '结算日期' || label === '日期选择') CS.settleGrain = nv; else CS.inGrain = nv;
        el.innerHTML = nv + CARET;
        D.toast(label + ' 粒度切换为「' + nv + '」');
      } }
    ]);

  }

  D.ckCommonAfter = commonAfter;   // 合规看板等页面复用同一套筛选条交互


  /* ---------- 指标总览-采购 ---------- */
  /* 给指标卡挂口径气泡（hover / 点击指标卡显示） */
  function bindMetricTips(root, list, attr) {
    root.querySelectorAll('[' + attr + ']').forEach(function (el) {
      const m = list.filter(function (x) { return x.key === el.getAttribute(attr); })[0];
      if (m && m.desc) D.metricTip(el, m);
    });
  }


  /* 供独立的驾驶舱 / 看板模块复用的共享 helper */
  Object.assign(D.ckUI, {
    pageHead: pageHead,
    scopeNote: scopeNote,
    field: field,
    dateRange: dateRange,
    actions: actions,
    advActions: advActions,
    MONTHS: MONTHS,
    bindMetricTips: bindMetricTips,
    metricColPicker: metricColPicker,
    metricListTable: metricListTable,
    commonAfter: commonAfter
  });
})(window.APP);
