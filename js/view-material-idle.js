/* material-idle：物资管理看板「闲废物资」模块（由 view-material-board.js 拆分）
   查询条 → 调拨 / 废宝柱状图 → 两份台账；复用 D.materialBoardState 中的 idle 状态。 */
(function (D) {
  'use strict';
  const esc = D.esc;
  const UI = D.ckUI;
  const CARET = UI.CARET;
  const subHead = UI.subHead;
  const MS = D.materialBoardState;

  /* 闲废物资（截图实测：物资调拨金额 / 废旧物资处理金额，单位万元）。
     单位总额作为两份台账的拆分基准：每单位 6 行，权重之和 = 1，
     因此未筛选时柱状图与列表首行合计 = 这里的总额。 */
  const MB_RECYCLE = [
    ['华中公司', 5784.88, 4138.65], ['上海公司', 4798.55, 2988.80], ['总承包公司', 4783.54, 2534.79],
    ['华南公司', 3631.60, 2217.14], ['北京公司', 3322.77, 2389.70], ['东北公司', 2513.78, 1218.65],
    ['西南公司', 2488.14, 1473.26], ['二公司', 2184.88, 1138.65], ['城发公司', 1898.55, 988.80],
    ['西北公司', 1883.54, 934.79], ['轨道公司', 1631.60, 617.14]
  ];

  /* ---------- 闲废物资：调拨 / 废宝两份台账 ----------
     字段取自工作目录《调拨台账列表导出.xlsx》《废宝台账列表导出.xlsx》；
     原「实施单位」统一改为「三级单位」，并按单位名称补出「二级单位」。
     金额保留 Excel 的元，图表再折算为万元。 */
  const MB_IDLE_UNITS = {
    '华中公司': ['华中公司', ['江西分公司', '中南分公司', '安徽分公司']],
    '上海公司': ['上海公司', ['第五分公司', '第二分公司', '安装分公司']],
    '总承包公司': ['总承包公司', ['第二分公司', '第一分公司', '安装分公司']],
    '华南公司': ['华南公司', ['广州分公司', '深圳分公司', '基础设施分公司']],
    '北京公司': ['北京公司', ['第一分公司', '第二分公司', '基础设施分公司']],
    '东北公司': ['东北公司', ['辽宁分公司', '吉林分公司', '黑龙江分公司']],
    '西南公司': ['西南公司', ['四川分公司', '重庆分公司', '云南分公司']],
    '二公司': ['二公司', ['济南分公司', '青岛分公司', '基础设施分公司']],
    '城发公司': ['城发公司', ['第一分公司', '第二分公司', '城市更新分公司']],
    '西北公司': ['西北公司', ['第一分公司', '第二分公司', '甘青分公司']],
    '轨道公司': ['轨道公司', ['南方分公司', '华东分公司', '第一分公司']]
  };
  const MB_IDLE_PROJECTS = [
    '上海外国语大学松江校区学生公寓综合体', '挪亚集团产业化基地项目',
    '同济大学四平路校区南区新建宿舍楼项目', '杭州未来国际演艺中心项目',
    '良渚博物院二期项目设计采购施工（EPC）工程总承包项目', '深圳职业技术大学深汕校区项目施工总承包VI标',
    '深汕特别合作区气象灾害监测预警工程项目施工总承包', '济南遥墙机场二期改扩建工程',
    '合肥轨道地下空间开发项目', '重庆生物城装饰装修项目', '福州鲁能花园项目施工总承包',
    '榆林水上运动中心项目'
  ];
  const MB_IDLE_TIMES = ['2026-10-21 09:33', '2026-10-18 14:20', '2026-10-12 11:05',
    '2026-09-28 16:40', '2026-08-19 10:15', '2026-07-26 15:08'];
  const MB_IDLE_PEOPLE = ['严立朋', '李本伟', '王晓晖', '孙祥钧', '汪婷婷', '张伟', '李彬', '陈晓', '王建国', '刘洋'];
  const MB_IDLE_BUYERS = ['河北中翱拍卖有限公司', '河北中废通拍卖有限公司', '南京东渡废旧物资回收有限公司',
    '徐州锦御龙驰商贸有限公司', '无锡华荣再生资源利用有限公司', '河南万达再生资源回收有限公司'];
  const MB_IDLE_COMPANIES = ['中国建筑第八工程局有限公司', '中建八局第三建设有限公司',
    '中建八局科技建设有限公司', '中建八局浙江建设有限公司'];
  /* [描述, 品牌, 单位, 物料小类]，小类是把 Excel 描述归一到可筛选的粒度 */
  const MB_IDLE_MATS = {
    transfer: [
      ['普通钢筋,HRB400,公称直径10mm,盘螺,过磅', '桂鑫', '吨', '钢筋'],
      ['普通钢筋,HRB400E,Φ12,螺纹钢', '沙钢', '吨', '钢筋'],
      ['临时配电箱,LD3X-32/32*1', '正泰', '台', '配电箱'],
      ['木模板,1830×915×15', '鲁丽', '平方米', '模板'],
      ['电缆,YJV-4×25', '远东', '米', '电缆'],
      ['钢管,Φ48×3.0', '友发', '吨', '钢管'],
      ['普通混凝土,C30', '海螺', '立方米', '混凝土']
    ],
    /* [废宝类型, 物料分类, 描述, 单位, 物料小类] */
    recycle: [
      ['废钢筋', '废旧钢筋', '废旧钢筋,30cm以下', '吨', '钢筋'],
      ['废木材', '废旧模板', '废旧模板,宽度≤20cm', '吨', '模板'],
      ['废木材', '废旧木方', '废旧木方,/', '吨', '木方'],
      ['其他废料', '拍卖服务', '拍卖服务,废旧物资设备委托处置', '套', '其他'],
      ['废临建板房', '箱式房', '箱式房,双层', '间', '箱式房'],
      ['废电线电缆', '废旧电缆', '废旧电缆,YJV-4×25', '吨', '电缆']
    ]
  };
  /* 两种台账共用的小类筛选值：调拨按物料描述归一，废宝按物料分类归一 */
  const MB_IDLE_SMALLS = ['钢筋', '混凝土', '模板', '木方', '电缆', '配电箱', '钢管', '箱式房', '其他'];
  function mbIdleBuild() {
    const out = { transfer: [], recycle: [] };
    const W = [0.22, 0.19, 0.17, 0.15, 0.14, 0.13];
    MB_RECYCLE.forEach(function (u, ui) {
      const conf = MB_IDLE_UNITS[u[0]];
      for (let k = 0; k < 6; k++) {
        const org3 = conf[0] + conf[1][k % conf[1].length];
        const t = MB_IDLE_TIMES[k];
        const day = t.slice(0, 10).replace(/-/g, '');
        /* 调拨：调出方是本二级单位（承担柱状图的调拨金额），调入方取下一家单位 */
        const mt = MB_IDLE_MATS.transfer[(ui + k) % MB_IDLE_MATS.transfer.length];
        const tAmt = D.round(u[1] * 1e4 * W[k], 2);
        const tPrice = 1800 + ((ui * 7 + k * 13) % 23) * 100;
        const tQty = D.round(tAmt / tPrice, 2);
        const ni = (ui + 1 + (k % 3)) % MB_RECYCLE.length;
        const nconf = MB_IDLE_UNITS[MB_RECYCLE[ni][0]];
        out.transfer.push({
          code: 'SY-' + day + '-' + String(1 + ui * 6 + k).padStart(5, '0'),
          outProject: MB_IDLE_PROJECTS[(ui * 2 + k) % MB_IDLE_PROJECTS.length],
          outCompany: MB_IDLE_COMPANIES[(ui + k) % MB_IDLE_COMPANIES.length],
          outOrg2: u[0], outOrg3: org3,
          inProject: MB_IDLE_PROJECTS[(ui * 2 + k + 3) % MB_IDLE_PROJECTS.length],
          inCompany: MB_IDLE_COMPANIES[(ui + k + 1) % MB_IDLE_COMPANIES.length],
          inOrg2: MB_RECYCLE[ni][0],
          inOrg3: nconf[0] + nconf[1][k % nconf[1].length],
          matDesc: mt[0], matSmall: mt[3], brand: mt[1], unit: mt[2],
          unitCode: '000' + (1 + (ui + k) % 9),
          applyQty: tQty, outQty: D.round(tQty * 0.98, 2), inQty: D.round(tQty * 0.96, 2),
          priceNoTax: tPrice, amtNoTax: tAmt, taxRate: '0%', contractCode: '—',
          fromOrgType: (ui + k) % 9 === 0 ? '调入方' : '调出方',
          applicant: MB_IDLE_PEOPLE[(ui + k) % MB_IDLE_PEOPLE.length],
          applyTime: t, acceptTime: t.slice(0, 10) + ' 16:20', date: t.slice(0, 10)
        });
        /* 废宝：销售金额按二级单位废弃物资处理总额拆分 */
        const mr = MB_IDLE_MATS.recycle[(ui + k) % MB_IDLE_MATS.recycle.length];
        const rAmt = D.round(u[2] * 1e4 * W[k], 2);
        const rPrice = 260 + ((ui * 11 + k * 17) % 26) * 110;
        const rQty = D.round(rAmt / rPrice, 2);
        const isAsset = (ui + k) % 7 === 0;
        out.recycle.push({
          project: MB_IDLE_PROJECTS[(ui * 3 + k + 1) % MB_IDLE_PROJECTS.length],
          scrapType: mr[0], matClass: mr[1], matDesc: mr[2], unit: mr[3], matSmall: mr[4],
          estQty: D.round(rQty * 1.05, 2), qty: rQty,
          isAsset: isAsset ? '是' : '否',
          assetCode: isAsset ? 'PC-2024' + String(808 + ui).slice(-2) + String(k + 1).padStart(2, '0') + '-' + String(204475 + ui * 6 + k).padStart(9, '0') : '—',
          applyCode: 'FJSQ-' + day + '-' + String(11 + ui * 6 + k).padStart(5, '0'),
          way: '销售', price: rPrice, amt: rAmt,
          buyer: MB_IDLE_BUYERS[(ui + k) % MB_IDLE_BUYERS.length],
          recordCode: 'FJCL-' + day + '-' + String(4588 + ui * 6 + k).padStart(5, '0'),
          time: t, handler: MB_IDLE_PEOPLE[(ui + k + 2) % MB_IDLE_PEOPLE.length],
          company: MB_IDLE_COMPANIES[(ui + k) % MB_IDLE_COMPANIES.length],
          org3Code: '206' + String(1200 + ui * 6 + k).padStart(4, '0'),
          org3: org3, org2: u[0], date: t.slice(0, 10)
        });
      }
    });
    return out;
  }
  const MB_IDLE = mbIdleBuild();

  function mbIdleMatch(r, f) {
    /* 二级 / 三级单位按「调出方 / 实施单位」过滤，与柱状图的分组口径一致；
       调入方是对方单位，不参与本单位的条件判断 */
    if (f.org2 && (r.org2 || r.outOrg2) !== f.org2) return false;
    if (f.org3 && (r.org3 || r.outOrg3) !== f.org3) return false;
    if (f.matSmall && r.matSmall !== f.matSmall) return false;
    if (f.project) {
      const ps = [r.project, r.outProject, r.inProject].filter(Boolean).join(' ');
      if (ps.indexOf(f.project.trim()) < 0) return false;
    }
    /* 自定义起止日期：留空即不限；只填一端则按开区间处理 */
    const d = (r.date || '').slice(0, 10);
    if (f.from && d < f.from) return false;
    if (f.to && d > f.to) return false;
    return true;
  }
  function mbIdleRows(kind) {
    return MB_IDLE[kind].filter(function (r) { return mbIdleMatch(r, MS.idle); });
  }
  function mbIdleChartRows() {
    const m = {};
    MB_RECYCLE.forEach(function (u) { m[u[0]] = { t: 0, r: 0 }; });
    MB_IDLE.transfer.forEach(function (r) {
      if (!mbIdleMatch(r, MS.idle)) return;
      if (m[r.outOrg2]) m[r.outOrg2].t += r.amtNoTax / 1e4;
    });
    MB_IDLE.recycle.forEach(function (r) {
      if (!mbIdleMatch(r, MS.idle)) return;
      if (m[r.org2]) m[r.org2].r += r.amt / 1e4;
    });
    return MB_RECYCLE.map(function (u) {
      return [u[0], D.round(m[u[0]].t, 2), D.round(m[u[0]].r, 2)];
    }).filter(function (x) { return x[1] > 0 || x[2] > 0; });
  }
  const MB_IDLE_TCOLS = [
    { key: 'idx', name: '序号', width: 56, sticky: true },
    { key: 'code', name: '调拨单号', width: 160, sticky2: true },
    /* 二级单位靠前；三级单位 / 项目默认收进设置列。150px 保证首行「全局合计 · 11 个二级单位」在 1360 宽下不截断 */
    { key: 'outOrg2', name: '调出二级单位', width: 150 },
    { key: 'inOrg2', name: '调入二级单位', width: 115 },
    { key: 'outProject', name: '调出项目', width: 190 },
    { key: 'outOrg3', name: '调出三级单位', width: 190 },
    { key: 'inProject', name: '调入项目', width: 190 },
    { key: 'inOrg3', name: '调入三级单位', width: 190 },
    { key: 'matDesc', name: '物料描述', width: 200 },
    { key: 'matSmall', name: '物料小类', width: 110 },
    { key: 'brand', name: '品牌', width: 80 },
    { key: 'unit', name: '单位', width: 70 },
    { key: 'unitCode', name: '单位编码', width: 90 },
    { key: 'applyQty', name: '申请数量', width: 90, num: true },
    { key: 'outQty', name: '调出发货数量', width: 120, num: true },
    { key: 'inQty', name: '调入验收数量', width: 120, num: true },
    { key: 'priceNoTax', name: '不含税单价(元)', width: 130, num: true },
    { key: 'amtNoTax', name: '不含税金额(元)', width: 120, num: true },
    { key: 'taxRate', name: '税率', width: 70 },
    { key: 'contractCode', name: '调拨合同号', width: 140 },
    { key: 'fromOrgType', name: '发起单位类型', width: 120 },
    { key: 'applicant', name: '申请人', width: 90 },
    { key: 'applyTime', name: '申请时间', width: 140 },
    { key: 'acceptTime', name: '验收时间', width: 150 },
    { key: 'outCompany', name: '调出公司', width: 210 },
    { key: 'inCompany', name: '调入公司', width: 210 }
  ];
  /* 单号 / 物料描述 / 单位属于单据行信息，默认收起；首屏只留单位、数量、金额、时间 */
  const MB_IDLE_TDEF = ['idx', 'outOrg2', 'inOrg2', 'applyQty', 'amtNoTax', 'applyTime'];
  const MB_IDLE_RCOLS = [
    { key: 'idx', name: '序号', width: 56, sticky: true },
    { key: 'org2', name: '二级单位', width: 150 },
    /* 项目 / 三级单位默认收进设置列 */
    { key: 'project', name: '项目名称', width: 220 },
    { key: 'org3', name: '三级单位', width: 180 },
    { key: 'org3Code', name: '三级单位编码', width: 130 },
    { key: 'scrapType', name: '废宝物资类型', width: 120 },
    { key: 'matClass', name: '物料分类', width: 110 },
    { key: 'matDesc', name: '物料描述', width: 220 },
    { key: 'unit', name: '物料单位', width: 90 },
    { key: 'estQty', name: '暂估数量', width: 100, num: true },
    { key: 'qty', name: '处理数量', width: 95, num: true },
    { key: 'way', name: '处理方式', width: 85 },
    { key: 'price', name: '销售单价(元)', width: 120, num: true },
    { key: 'amt', name: '销售金额(元)', width: 125, num: true },
    { key: 'buyer', name: '收购方', width: 180 },
    { key: 'time', name: '处理时间', width: 140 },
    { key: 'isAsset', name: '是否资产', width: 90 },
    { key: 'assetCode', name: '资产编号/批次编号', width: 190 },
    { key: 'applyCode', name: '处理申请编号', width: 170 },
    { key: 'recordCode', name: '处理记录编号', width: 170 },
    { key: 'handler', name: '处理人', width: 90 },
    { key: 'company', name: '公司名称', width: 210 }
  ];
  const MB_IDLE_RDEF = ['idx', 'org2', 'scrapType', 'matClass', 'qty', 'way', 'amt',
    'buyer', 'time'];

  /* 列表首行全局合计：只汇总金额列（数量列含吨 / 台 / 平方米 / 米等不同单位，
     跨物料相加没有业务意义），其余列显示「—」；合计口径为全部二级单位，不随筛选变化 */
  const MB_IDLE_SUM_KEYS = {
    transfer: ['amtNoTax'],
    recycle: ['amt']
  };
  function mbIdleTotal(kind, cols) {
    const rows = MB_IDLE[kind];
    const sum = function (k) {
      return D.round(rows.reduce(function (a, r) {
        return a + (typeof r[k] === 'number' ? r[k] : 0);
      }, 0), 2);
    };
    const t = {};
    cols.forEach(function (c) {
      if (c.key === 'idx') return;
      if (MB_IDLE_SUM_KEYS[kind].indexOf(c.key) >= 0) t[c.key] = sum(c.key);
      else t[c.key] = '—';
    });
    /* 主维度列标注全局口径，避免筛选后把首行误读为当前结果合计。
       列宽有限（1360 宽下废宝表约 150px），用「11 家」而不是「11 个二级单位」防截断 */
    if (kind === 'transfer') t.outOrg2 = '全局合计 · ' + MB_RECYCLE.length + ' 家';
    else t.org2 = '全局合计 · ' + MB_RECYCLE.length + ' 家';
    return t;
  }
  function mbIdleField(label, key, opts, value, ph) {
    return '<div class="ck-filter__item"><span class="ck-filter__label">' + esc(label) + '</span>' +
      '<select class="ck-field ck-field--select" data-mb-idle="' + key + '">' +
      '<option value="">' + esc(ph || '请选择') + '</option>' +
      opts.map(function (o) {
        return '<option value="' + esc(o) + '"' + (o === value ? ' selected' : '') + '>' +
          esc(o) + '</option>';
      }).join('') + '</select></div>';
  }
  /* 查询条：两份台账 + 柱状图共用；查询后由 MS.idle 驱动重绘 */
  function mbIdleFilter() {
    const f = MS.idle;
    const org3s = [];
    Object.keys(MB_IDLE_UNITS).forEach(function (k) {
      MB_IDLE_UNITS[k][1].forEach(function (s) {
        org3s.push(MB_IDLE_UNITS[k][0] + s);
      });
    });
    const n = [f.org2, f.org3, f.matSmall, f.project, (f.from || f.to ? '1' : '')]
      .filter(Boolean).length;
    const tn = mbIdleRows('transfer').length, rn = mbIdleRows('recycle').length;
    return '<div class="ck-filter" data-mb-idle-filter>' +
      '<div class="ck-filter__row">' +
      mbIdleField('二级单位', 'org2', Object.keys(MB_IDLE_UNITS), f.org2) +
      mbIdleField('三级单位', 'org3', org3s, f.org3) +
      '<div class="ck-filter__item"><span class="ck-filter__label">日期范围</span>' +
      '<input class="ck-field" style="width:125px" type="date" data-mb-idle="from" value="' +
      esc(f.from) + '"/>' +
      '<span style="color:#999">~</span>' +
      '<input class="ck-field" style="width:125px" type="date" data-mb-idle="to" value="' +
      esc(f.to) + '"/></div>' +
      mbIdleField('物料小类', 'matSmall', MB_IDLE_SMALLS, f.matSmall) +
      '<div class="ck-filter__item"><span class="ck-filter__label">项目名称</span>' +
      '<input class="ck-field ck-field--input" data-mb-idle="project" placeholder="请输入项目名称" value="' +
      esc(f.project) + '"/></div>' +
      '</div>' +
      '<div class="ck-filter__foot">' +
      '<span class="ck-filter__hint">' + (n
        ? '已按 ' + n + ' 个条件筛选 · 调拨 ' + tn + ' 条 / 处理 ' + rn + ' 条'
        : '未设置筛选条件，显示全部（调拨 ' + tn + ' 条 / 处理 ' + rn + ' 条）') + '</span>' +
      '<span class="ck-filter__foot-right">' +
      '<button class="ck-btn ck-btn--primary" data-mb-idle-query>查询</button>' +
      '<button class="ck-link" data-mb-idle-clear>清空</button>' +
      '</span></div></div>';
  }
  /* 一份列表位 + 「物资调拨 / 废旧物资处理」按钮切换，默认只显示当前单据类型 */
  function mbIdleList() {
    const kind = MS.idle.doc === 'recycle' ? 'recycle' : 'transfer';
    const isT = kind === 'transfer';
    const title = isT ? '物资调拨列表' : '废旧物资处理列表';
    const rows = mbIdleRows(kind);
    const size = MS.idleSize;
    const pgKey = isT ? 'pageT' : 'pageR';
    const pages = Math.max(1, Math.ceil(rows.length / size));
    let page = MS.idle[pgKey];
    if (page > pages) page = pages;
    if (page < 1) page = 1;
    MS.idle[pgKey] = page;
    const paged = rows.slice((page - 1) * size, (page - 1) * size + size);
    const all = isT ? MB_IDLE_TCOLS : MB_IDLE_RCOLS;
    const def = isT ? MB_IDLE_TDEF : MB_IDLE_RDEF;
    const cols = D.colsOf('mb-idle-' + kind, all, def);
    const total = mbIdleTotal(kind, cols);
    const tabs = '<span class="dsc-tabs dsc-tabs--pill" style="margin:0" data-mb-idle-doc>' +
      [['transfer', '物资调拨'], ['recycle', '废旧物资处理']].map(function (d) {
        return '<div class="dsc-tabs__item' + (kind === d[0] ? ' dsc-tabs__item--active' : '') +
          '" data-idle-doc="' + d[0] + '" role="tab" aria-selected="' + (kind === d[0]) + '">' +
          d[1] + '</div>';
      }).join('') + '</span>';
    return '<div class="u-mb-xl">' +
      '<div class="ck-savehead"><span class="ck-savehead__hint">' + title +
      ' · 共 ' + rows.length + ' 条（每页 ' + size + ' 条）</span>' +
      '<span style="display:inline-flex;align-items:center;gap:12px">' + tabs +
      D.colGear('data-mb-idle-cols="' + kind + '"', '设置列：' + title + '字段') +
      '</span></div>' +
      '<div class="mb-idle-table">' + D.table({
        cols: cols,
        rows: paged.map(function (r, i) {
          return Object.assign({ idx: (page - 1) * size + i + 1 }, r);
        }),
        totalRow: total, totalRowTop: true,
        maxHeight: 420, fixed: true
      }) + '</div>' +
      (rows.length ? '' : '<div class="dsc-table__footnote">没有符合筛选条件的记录，请调整条件后重新查询</div>') +
      '<div data-mb-idle-pager="' + kind + '">' +
      D.pager({ page: page, size: size, total: rows.length }) + '</div></div>';
  }

  function idleSection() {
    /* 闲废物资：查询 → 柱状图 → 调拨 / 废宝两份台账（全局合计固定在列表首行） */
    return '<section class="ck-sec"><div class="ck-sec__head"><h2 class="ck-sec__title">闲废物资</h2>' +
      '<button class="ck-sec__collapse" data-ck-collapse title="收起 / 展开">' + CARET + '</button></div>' +
      '<div class="ck-sec__body">' +
      mbIdleFilter() +
      subHead('物资调拨金额/废旧物资处理金额', '按二级单位 · 单位：万元') +
      '<div class="dsc-chart" id="mbRecycle" style="height:320px"></div>' +
      '<div class="ck-legend">' +
      '<span data-mb-idle-legend="0"' + (MS.idleHide[0] ? ' class="is-off"' : '') +
      ' title="点击点亮 / 熄灭该系列"><i style="background:#2468F2"></i>物资调拨金额</span>' +
      '<span data-mb-idle-legend="1"' + (MS.idleHide[1] ? ' class="is-off"' : '') +
      ' title="点击点亮 / 熄灭该系列"><i style="background:#7FC4F5"></i>废旧物资处理金额</span>' +
      '</div>' +
      mbIdleList() +
      '</div></section>';
  }

  function idleAfter(root) {
    const rec = root.querySelector('#mbRecycle');
    if (rec) {
      const rrows = mbIdleChartRows();
      if (!rrows.length) {
        rec.innerHTML = '<div class="dsc-table__footnote" style="padding:130px 0;text-align:center">' +
          '没有符合筛选条件的调拨 / 处理记录</div>';
      } else {
        D.barChart(rec, {
          categories: rrows.map(function (r) { return r[0]; }),
          series: [
            { name: '物资调拨金额', data: rrows.map(function (r) { return r[1]; }), color: '#2468F2' },
            { name: '废旧物资处理金额', data: rrows.map(function (r) { return r[2]; }), color: '#7FC4F5' }
          ].filter(function (se, i) { return !MS.idleHide[i]; })
        }, { height: 320, dataLabels: true, yDigits: 0, yUnit: '万元', padL: 72 });
      }
    }

    D.delegate(root, [
      /* 闲废物资：查询 / 清空（两份台账与柱状图共用同一份条件） */
      { sel: '[data-mb-idle-query]', fn: function (el) {
        const box = el.closest('[data-mb-idle-filter]');
        if (!box) return;
        const f = { org2: '', org3: '', matSmall: '', from: '', to: '', project: '' };
        box.querySelectorAll('[data-mb-idle]').forEach(function (x) {
          f[x.getAttribute('data-mb-idle')] = (x.value || '').trim();
        });
        MS.idle.org2 = f.org2; MS.idle.org3 = f.org3; MS.idle.matSmall = f.matSmall;
        MS.idle.from = f.from; MS.idle.to = f.to; MS.idle.project = f.project;
        MS.idle.pageT = 1; MS.idle.pageR = 1;
        D.render();
        const n = [f.org2, f.org3, f.matSmall, f.project, (f.from || f.to ? '1' : '')]
          .filter(Boolean).length;
        D.toast(n ? '已按 ' + n + ' 个条件筛选闲废物资' : '已显示全部闲废物资');
      } },
      { sel: '[data-mb-idle-clear]', fn: function () {
        MS.idle = { doc: MS.idle.doc, org2: '', org3: '', matSmall: '', from: '', to: '',
          project: '', pageT: 1, pageR: 1 };
        D.render();
        D.toast('已清空闲废物资筛选条件');
      } },
      /* 闲废物资柱图：点图例点亮 / 熄灭对应系列 */
      { sel: '[data-mb-idle-legend]', fn: function (el) {
        const i = +el.getAttribute('data-mb-idle-legend');
        MS.idleHide[i] = !MS.idleHide[i];
        D.render();
      } },
      /* 闲废物资：同一列表位切换「物资调拨 / 废旧物资处理」 */
      { sel: '[data-mb-idle-doc] [data-idle-doc]', fn: function (el) {
        const kind = el.getAttribute('data-idle-doc');
        if (MS.idle.doc === kind) return;
        MS.idle.doc = kind;
        D.render();
      } },
      /* 闲废物资：两份台账各自的设置列 */
      { sel: '[data-mb-idle-cols]', fn: function (el) {
        const kind = el.getAttribute('data-mb-idle-cols');
        const isT = kind === 'transfer';
        D.openColPicker({
          key: 'mb-idle-' + kind,
          title: isT ? '物资调拨列表' : '废旧物资处理列表',
          all: isT ? MB_IDLE_TCOLS : MB_IDLE_RCOLS,
          def: isT ? MB_IDLE_TDEF : MB_IDLE_RDEF,
          after: D.render
        });
      } }
    ]);

    /* 闲废物资：两份台账各自分页（拦截冒泡，避免走全局 __pagerCb） */
    root.querySelectorAll('[data-mb-idle-pager]').forEach(function (box) {
      const kind = box.getAttribute('data-mb-idle-pager');
      const key = kind === 'transfer' ? 'pageT' : 'pageR';
      box.addEventListener('click', function (e) {
        const b = e.target.closest('[data-pg]');
        if (!b || b.disabled) return;
        e.stopPropagation();
        MS.idle[key] = +b.getAttribute('data-pg');
        D.render();
      });
      box.addEventListener('change', function (e) {
        if (!e.target.matches || !e.target.matches('[data-pg-size]')) return;
        e.stopPropagation();
        MS.idleSize = +e.target.value;
        MS.idle.pageT = 1; MS.idle.pageR = 1;
        D.render();
      });
    });
  }

  D.materialIdleUI = { section: idleSection, after: idleAfter };
})(window.APP);
