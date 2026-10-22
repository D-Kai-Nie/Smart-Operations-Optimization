/* ============================================================
   智慧运营数据平台 · 数据层
   组织 / 项目 / 物料 / 分供商 / 指标 / 明细行（确定性 mock）
   ============================================================ */
window.APP = window.APP || {};

(function (D) {
  'use strict';

  D.pages = D.pages || {};

  /* ---------- 确定性伪随机 ---------- */
  function seedRand(seed) {
    let s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function between(rnd, a, b, fix) { return +(a + rnd() * (b - a)).toFixed(fix === undefined ? 2 : fix); }
  function round(v, f) { return +(+v).toFixed(f === undefined ? 2 : f); }
  D.pick = pick;
  D.round = round;
  D.seedRand = seedRand;
  D.between = between;

  /* ============================================================
     组织（BR-1：局 → 二级单位 → 三级单位 → 项目）
     ============================================================ */
  const ORG_SEED = [
    ['一公司', 14.78, 115.06, 29.1], ['二公司', 15.21, 135.16, 28.6],
    ['三公司', 6.49, 61.65, 28.8], ['四公司', 2.44, 26.37, 23.6],
    ['土木公司', 3.79, 41.31, 31.6], ['安装公司', 2.05, 18.42, 26.8],
    ['西南公司', 4.66, 50.23, 25.3], ['华南公司', 2.59, 37.90, 26.5],
    ['总承包公司', 3.31, 46.75, 27.2], ['南方公司', 4.19, 41.59, 24.2],
    ['东北公司', 3.86, 35.10, 27.9], ['华北公司', 2.41, 20.05, 42.7],
    ['华东公司', 3.67, 23.35, 24.0], ['西北公司', 2.82, 19.51, 29.8],
    ['西南建设', 1.90, 42.52, 27.3], ['八局建投', 1.59, 22.06, 42.7],
    ['发展建设分公司', 3.41, 25.47, 27.9], ['装饰公司', 0.85, 22.95, 26.5],
    ['轨道公司', 3.16, 25.47, 24.0], ['北京公司', 1.06, 4.79, 27.3],
    ['文旅博览公司', 0.21, 7.25, 27.2]
  ];

  D.orgs = ORG_SEED.map(function (o, i) {
    const rnd = seedRand(1000 + i);
    return {
      code: 'ORG' + String(i + 1).padStart(2, '0'),
      name: o[0], level: 2,
      amount: o[1], cum: o[2], leadTime: o[3],
      kpi: {
        costDown: between(rnd, 3.2, 12.8), central: between(rnd, 55.2, 92.6),
        direct: between(rnd, 20.1, 66.3), benefit: between(rnd, 18.5, 52.4),
        plan: between(rnd, 62.4, 98.2), subCentral: between(rnd, 12.4, 48.9),
        selfProc: between(rnd, 5.6, 32.4), leadTime: o[3],
        supplyChainDown: between(rnd, 1.2, 6.8)
      },
      kpiMat: {
        secondBargain: between(rnd, 1.8, 9.4), orderRatio: between(rnd, 68.2, 97.5),
        payRatio: between(rnd, 72.4, 99.1), monthSettle: between(rnd, 48.2, 96.4),
        orderPlan: between(rnd, 55.3, 94.6), totalSettle: between(rnd, 35.6, 88.2)
      },
      kpiAsset: {
        turnover: between(rnd, 0.42, 2.86), idle: between(rnd, 2.1, 18.6),
        doneTurnover: between(rnd, 0.18, 1.42), doneIdle: between(rnd, 4.6, 32.4),
        depRate: between(rnd, 8.4, 26.7)
      },
      res: {
        onStock: between(rnd, 620, 3200, 0), newIn: between(rnd, 30, 420, 0),
        quality: between(rnd, 90, 640, 0), quit: between(rnd, 8, 160, 0),
        active: between(rnd, 180, 1400, 0), bad: between(rnd, 0, 42, 0),
        /* 中标 / 签约 / 履约 / 备选分供商数量：资源数据明细表所需（Axure 局级明细 14 个数量列） */
        win: between(rnd, 60, 520, 0), sign: between(rnd, 40, 460, 0),
        perfCnt: between(rnd, 30, 420, 0), alt: between(rnd, 10, 180, 0),
        perf: between(rnd, 8, 96, 1), perfQuality: between(rnd, 2, 34, 1),
        avgPerf: between(rnd, 120, 860, 1)
      }
    };
  });
  D.orgMap = {};
  D.orgs.forEach(function (o) { D.orgMap[o.name] = o; D.orgMap[o.code] = o; });

  const SUB_POOL = ['济南公司', '青岛公司', '上海分公司', '华中公司', '大连分公司', '第一分公司',
    '第二分公司', '第三分公司', '广西分公司', '四川分公司', '中原公司', '华东分公司', '华南分公司',
    '华北分公司', '北京分公司', '福建分公司', '苏南分公司', '安徽分公司', '安装分公司', '装饰分公司'];
  D.subOrgs = [];
  D.orgs.forEach(function (o, i) {
    const rnd = seedRand(2000 + i);
    const n = 2 + Math.floor(rnd() * 4);
    const used = {};
    for (let k = 0; k < n; k++) {
      let nm = pick(rnd, SUB_POOL);
      while (used[nm]) nm = pick(rnd, SUB_POOL);
      used[nm] = 1;
      D.subOrgs.push({ code: o.code + '-' + (k + 1), name: o.name + nm, shortName: nm, level: 3, parent: o.name });
    }
  });
  D.subOrgsByParent = {};
  D.subOrgs.forEach(function (s) { (D.subOrgsByParent[s.parent] = D.subOrgsByParent[s.parent] || []).push(s); });

  /* ============================================================
     报表口径：二级单位采购指标（数值对齐《采购报表总览》样例）
     ============================================================ */
  const REPORT_UNITS = {
    '一公司': ['中建八局第一建设有限公司', 76.63, 144.08, 121.87, 9.18, 6.33, 13.33, 91.15, 21.18, 61.65, 96.42, 25.5, 11.01],
    '二公司': ['中建八局第二建设有限公司', 88.61, 78.45, 113.41, 15.93, 7.75, 18.22, 91.29, 53.84, 59.01, 93.29, 26, 12.11],
    '三公司': ['中建八局第三建设有限公司', 39.87, 27.52, 103.37, 7.23, 8.53, 14.20, 79.91, 10.61, 51.15, 96.23, 25.3, 15.25],
    '四公司': ['中建八局第四建设有限公司', 17.08, 8.77, 26.58, 7.37, 4.93, 13.89, 75.18, 18.34, 43.69, 97.03, 23.7, 7.64],
    '土木公司': ['中国建筑土木建设有限公司', 17.22, 16.37, 13.46, 13.01, 2.07, 14.10, 66.27, 8.51, 37.08, 95.91, 24.2, 4.98],
    '安装公司': ['中建八局安装工程有限公司', 16.51, 8.42, 34.82, 8.23, 7.52, 15.36, 94.10, 58.60, 61.31, 96.27, 20.6, 9.82],
    '西南公司': ['中建八局西南分公司', 30.78, 12.75, 18.18, 6.74, 5.13, 13.55, 73.35, 20.18, 43.64, 97.00, 23.1, 3.84],
    '华南公司': ['中建八局华南分公司', 11.63, 14.36, 43.41, 10.72, 9.99, 20.14, 96.23, 28.48, 55.15, 97.70, 22, 11.45],
    '总承包公司': ['中建八局总承包公司', 15.76, 14.81, 59.15, 10.42, 8.29, 13.99, 83.07, 18.98, 55.88, 95.74, 22.1, 8.99],
    '南方公司': ['中建八局南方分公司', 25.16, 10.33, 27.88, 11.25, 14.21, 25.17, 91.47, 45.87, 48.80, 100.00, 24.1, 12.39],
    '东北公司': ['中建八局东北分公司', 14.28, 11.04, 30.35, 11.55, 8.48, 14.56, 94.95, 28.88, 82.80, 95.96, 21.5, 9.09],
    '华北公司': ['中建八局华北分公司', 9.67, 10.25, 25.82, 6.48, 8.58, 14.62, 83.35, 18.25, 47.31, 83.72, 29.4, 7.17],
    '华东公司': ['中建八局华东分公司', 13.78, 7.83, 60.46, 12.94, 6.89, 15.76, 80.14, 16.63, 50.89, 87.79, 26.7, 8.24],
    '西北公司': ['中建八局西北分公司', 9.30, 8.27, 18.50, 11.74, 7.12, 22.28, 81.86, 18.51, 70.86, 96.94, 25.7, 7.49],
    '西南建设': ['中建八局西南建设有限公司', 10.94, 3.31, 19.86, 11.26, 5.19, 14.44, 80.78, 10.45, 54.56, 94.65, 23.5, 13.83],
    '八局建投': ['中建八局（北京）建设投资有限公司', 6.95, 5.38, 9.03, 3.22, 7.88, 7.32, 84.13, 30.51, 54.28, 99.53, 20.7, 7.93],
    '发展建设分公司': ['中建八局发展建设分公司', 20.29, 15.07, 53.00, 6.40, 8.60, 11.77, 76.34, 29.30, 45.22, 87.30, 26.2, 6.40],
    '装饰公司': ['中建八局装饰工程有限公司', 3.53, 9.17, 4.70, 9.66, 5.21, 22.05, 65.98, 37.80, 53.63, 84.28, 19.4, 8.30],
    '轨道公司': ['中建八局轨道交通建设有限公司', 17.42, 8.22, 11.64, 5.54, 6.33, 12.26, 64.74, 16.45, 58.98, 94.29, 29.6, 7.41],
    '北京公司': ['中建八局北京分公司', 10.39, 2.68, 0.792229, 4.44, 5.66, 11.89, 72.76, 72.84, 94.25, 94.77, 24.2, 3.75],
    '文旅博览公司': ['中建八局文旅博览投资发展有限公司', 0.776217, 1.29, 18.68, 7.36, 7.71, 13.80, 64.11, 18.60, 46.75, 86.31, 25.8, 10.12]
  };
  /* 局口径比率（《采购报表总览》样例首行；金额列由各单位加总，比率列取局口径） */
  const BUREAU_KPI = { cdMat: 10.41, cdSpec: 7.54, cdSum: 8.20, benefit: 15.61, central: 84.46,
    subCentral: 27.44, direct: 56.68, plan: 93.18, lead: 24.8, downPct: 9.25 };
  const YI = 1e8;
  function reportUnitMetrics(name) {
    const a = REPORT_UNITS[name];
    if (!a) return null;
    const mat = a[1] * YI, lab = a[2] * YI, spec = a[3] * YI;
    return {
      full: a[0], mat: mat, lab: lab, spec: spec, sum: mat + lab + spec,
      cdMat: a[4], cdSpec: a[5], cdSum: D.round((mat * a[4] + (lab + spec) * a[5]) / (mat + lab + spec || 1), 2),
      benefit: a[6], central: a[7], subCentral: a[8], direct: a[9], plan: a[10], lead: a[11], downPct: a[12]
    };
  }
  /* 采购 / 物资报表的二级单位口径：看板与报表共用同一份，避免同名指标两处不一致 */
  D.REPORT_UNITS = REPORT_UNITS;
  D.REPORT_BUREAU = BUREAU_KPI;
  D.reportUnitMetrics = reportUnitMetrics;
  /* 法定全称 → 短名 反查（看板按全称列出单位）。
     样例里另有 4 家单位（上海分公司 / 浙江建设 / 华中建设 / 新型建造）不在本原型 21 家口径里，
     其指标数值在报表口径中借给了对应的 4 家单位，这里登记别名以便两页能对上 */
  D.reportAlias = {
    '中建八局上海分公司': '华东公司',
    '中建八局浙江建设有限公司': '安装公司',
    '中建八局华中建设有限公司': '西南建设',
    '中建八局新型建造工程公司': '北京公司'
  };
  D.reportShortOf = function (full) {
    if (REPORT_UNITS[full]) return full;                    // 传进来就是短名
    const hit = Object.keys(REPORT_UNITS).filter(function (k) { return REPORT_UNITS[k][0] === full; })[0];
    return hit || D.reportAlias[full] || full;
  };

  /* 组织树（供组织选择 / 权限过滤） */
  D.orgTree = [{ name: '局总部', level: 1, children: D.orgs.map(function (o) {
    return { name: o.name, level: 2, children: (D.subOrgsByParent[o.name] || []).map(function (s) {
      return { name: s.name, shortName: s.shortName, level: 3, children: [] };
    }) };
  }) }];

  /* ============================================================
     项目（BR-1；含五个项目维度）
     ============================================================ */
  const PROJECT_NAMES = [
    '山海境小区项目施工总承包', '中央商务区文博西市政道路项目', '智想城工业厂房更新改造项目',
    '双子星耀建设项目EPC工程总承包', '中德合作产业园二期项目', '汶上县高级职业技术学校扩建项目',
    '淄博柳泉中学崇德校区建设项目', '王舍人片区奥体中路项目', '济南起步区科技馆项目',
    '德州市德城区综合行政执法局项目', '山东省第二康复医院康复综合楼项目',
    '高性能光电科技产业园项目', '临港数据中心B楼土建装修工程', '滨江商务中心安装工程',
    '流芳体育中心工程总承包EPC', '榆林水上运动中心项目', '福州鲁能花园项目施工总承包',
    '南宁市轨道交通6号线一期工程', '洪钧顶净水厂工程安装工程', '日照科技文化中心安装工程',
    '安徽弃渣场土地复垦项目', '重庆生物城装饰装修项目', '莱西光伏项目',
    '内江棚户区改造还迁房项目', '三门峡改造项目', '福田中医院项目', '漳州公共交通枢纽项目',
    '三亚藤桥安置区一期项目', '青海藏区卫生应急物资储备库项目', '济南遥墙机场项目',
    '甘肃西宁大学项目', '哈密水厂项目', '合肥轨道地下空间项目', '得知运河博物馆项目',
    '生态智谷总部基地安装工程', '京东2023项目', '拾光屿项目', '平谷中医医院项目',
    '同济大学宿舍修缮工程项目', '人福医药项目', '华中科技大学同济医学院项目',
    '湖南大学无锡研究院机电安装工程', '惠山古镇文旅综合开发项目', '高比能项目', '榆林水上运动中心工程'
  ];
  const TYPES = ['房屋建筑工程', '基础设施', '工业厂房', '市政公用工程'];
  const FORMATS = ['住宅', '商业', '教育', '医疗卫生', '厂房', '场馆', '生态环保', '市政'];
  const STATUS = ['在建', '竣工', '停工'];
  const MODES = ['施工总承包', '工程总承包', 'EPC工程总承包', 'PPP'];
  const AREAS = ['华东地区', '华北地区', '华南地区', '华中地区', '西南地区', '东北地区', '西北地区'];
  /* 供筛选下拉使用 */
  D.TYPES = TYPES; D.FORMATS = FORMATS; D.STATUS = STATUS; D.MODES = MODES; D.AREAS = AREAS;
  D.settleTypes = ['月度结算', '总结算', '临时结算', '退料结算'];
  D.settleStatuses = ['待提交', '审批中', '已生效', '已作废'];
  D.detailTypes = ['正常结算', '退货结算', '领料结算', '调拨结算'];
  const CITY_BY_AREA = {
    '华东地区': ['杭州市', '宁波市', '温州市', '南京市', '苏州市', '济南市', '青岛市', '合肥市', '上海市'],
    '华北地区': ['北京市', '天津市', '石家庄市', '太原市', '呼和浩特市'],
    '华南地区': ['广州市', '深圳市', '南宁市', '海口市', '厦门市'],
    '华中地区': ['武汉市', '长沙市', '郑州市', '南昌市'],
    '西南地区': ['成都市', '重庆市', '昆明市', '贵阳市'],
    '东北地区': ['沈阳市', '大连市', '长春市', '哈尔滨市'],
    '西北地区': ['西安市', '兰州市', '西宁市', '银川市', '乌鲁木齐市']
  };
  D.areas = AREAS;
  D.areaCities = CITY_BY_AREA;

  D.projects = PROJECT_NAMES.map(function (nm, i) {
    const rnd = seedRand(3000 + i);
    /* 均匀落到各二级单位：LCG 连续种子的「首个随机数」高位几乎不变，
       若用 rnd() 取组织会让全部项目落到同一家单位，权限演示与下钻会失真 */
    const org = D.orgs[(i * 8 + 3) % D.orgs.length];
    const subs = D.subOrgsByParent[org.name] || [];
    const area = pick(rnd, AREAS);
    const amt = between(rnd, 860, 18600, 1);
    return {
      code: 'XM' + String(20260000 + i * 137), name: nm,
      org: org.name, orgCode: org.code,
      subOrg: subs.length ? pick(rnd, subs).name : '',
      type: pick(rnd, TYPES), format: pick(rnd, FORMATS),
      status: rnd() > 0.18 ? '在建' : pick(rnd, STATUS),
      mode: pick(rnd, MODES), area: area, city: pick(rnd, CITY_BY_AREA[area]),
      amount: amt, purchase: +(amt * between(rnd, 0.32, 0.68)).toFixed(1),
      doneRatio: between(rnd, 12, 100, 1)
    };
  });
  D.projectsByOrg = {};
  D.projects.forEach(function (p) { (D.projectsByOrg[p.org] = D.projectsByOrg[p.org] || []).push(p); });

  /* 城市 → 省级简称（项目驾驶舱定位图用；与 js/china-map.js 的 short 对齐） */
  D.CITY_PROVINCE = {
    '杭州市': '浙江', '宁波市': '浙江', '温州市': '浙江', '南京市': '江苏', '苏州市': '江苏',
    '济南市': '山东', '青岛市': '山东', '合肥市': '安徽', '上海市': '上海',
    '北京市': '北京', '天津市': '天津', '石家庄市': '河北', '太原市': '山西', '呼和浩特市': '内蒙古',
    '广州市': '广东', '深圳市': '广东', '南宁市': '广西', '海口市': '海南', '厦门市': '福建',
    '武汉市': '湖北', '长沙市': '湖南', '郑州市': '河南', '南昌市': '江西',
    '成都市': '四川', '重庆市': '重庆', '昆明市': '云南', '贵阳市': '贵州',
    '沈阳市': '辽宁', '大连市': '辽宁', '长春市': '吉林', '哈尔滨市': '黑龙江',
    '西安市': '陕西', '兰州市': '甘肃', '西宁市': '青海', '银川市': '宁夏', '乌鲁木齐市': '新疆'
  };
  D.provinceOf = function (city) {
    return D.CITY_PROVINCE[city] || (city || '').replace(/市$/, '');
  };

  /* ============================================================
     物料（大类 → 中类 → 小类）
     ============================================================ */
  const SMALL_STEEL = ['普通钢筋', '预应力钢筋', '圆钢', '角钢', '三角钢', '方钢', '扁钢', '普通钢板',
    '花纹钢板', '耐候钢板', '镀锌钢板', '压型钢板', '不锈钢板', '硅钢片', '钢绞线', '钢丝', '带钢',
    '钢丝绳', '钢丝束', '方矩管', '精制钢', '六角钢', '八角钢', '工字钢'];
  const SMALL_CONCRETE = ['普通混凝土', '透水混凝土', '泡沫混凝土', '水泥砂浆', '水泥', '预制构件', 'PC构件'];
  const SMALL_OTHER = ['防火门', '电力电缆', '电线电缆', '安装拆除费', '汽车起重机', '打桩机', '箱式房',
    '彩钢板房运输费', '建筑电梯', '消防器材', '连接器', '贝雷销', '原木', '瓷片', '实木地板', '纤维板',
    '拉条', '铜带材', '镀锌钢管', '拉手', '零星材料', '玻璃及玻璃制品', '成型构件', '电梯'];

  D.material = {
    big: ['黑色及有色金属', '非金属矿物制品', '机械设备', '电气材料', '装饰装修材料', '周转材料', '其他材料'],
    mid: ['钢材', '混凝土及制品', '木材及制品', '电缆电线', '五金制品', '化工材料'],
    small: SMALL_STEEL.concat(SMALL_CONCRETE, SMALL_OTHER),
    /* 主材分析三类（F2.8：钢材 / 混凝土 / 水泥） */
    main: [
      { name: '钢材', smalls: SMALL_STEEL, unit: '吨' },
      { name: '混凝土', smalls: SMALL_CONCRETE, unit: 'm³' },
      { name: '水泥', smalls: ['水泥', '水泥砂浆'], unit: '吨' }
    ],
    unitOf: function (sm) {
      if (SMALL_STEEL.indexOf(sm) >= 0 || sm === '水泥') return '吨';
      if (SMALL_CONCRETE.indexOf(sm) >= 0) return 'm³';
      if (/电缆|电线/.test(sm)) return '米';
      if (/门|板|电梯|瓷片|地板|玻璃/.test(sm)) return '㎡';
      if (/起重机|打桩机|电梯|连接器/.test(sm)) return '台';
      return '个';
    }
  };

  /* ============================================================
     分供商
     ============================================================ */
  const SUPPLIER_NAMES = [
    '中建八局（山东）供应链科技有限公司', '上海住总住博建筑科技有限公司', '上海豫天铄供应链有限公司',
    '上海奕钢物资有限公司', '五矿钢铁上海有限公司', '横店集团东磁股份有限公司',
    '中建八局新型建造工程有限公司', '重庆四方新材股份有限公司', '广西昌辰贸易有限公司',
    '北京德祥永信商贸有限公司', '广东美的暖通设备有限公司', '江苏沙钢集团贸易有限公司',
    '山东莱钢永锋钢铁有限公司', '安徽海螺水泥股份有限公司', '浙江中天新材料有限公司',
    '河北津西钢铁集团股份有限公司', '湖南华菱湘潭钢铁有限公司', '福建三钢闽光股份有限公司',
    '宝武集团鄂城钢铁有限公司', '中铁物资集团华东有限公司'
  ];
  D.supplierCats = ['物资供应类', '专业分包类', '劳务分包类', '设备供应类', '专业服务类',
    '租赁服务类', '运营服务类', '设计服务类', '运输服务类', '其他类'];
  D.supplierGrades = ['优秀', '良好', '合格', '不合格'];
  D.suppliers = SUPPLIER_NAMES.map(function (nm, i) {
    const rnd = seedRand(4000 + i);
    return {
      code: 'GF' + String(10001 + i * 7), name: nm,
      creditNo: '9131' + String(10000000 + i * 137).slice(0, 8) + 'X' + (i % 10) + 'Y',
      cat: pick(rnd, D.supplierCats), grade: pick(rnd, D.supplierGrades),
      region: pick(rnd, ['华东', '华北', '华南', '华中', '西南', '东北', '西北']),
      credit: between(rnd, 62, 99, 1),
      supplyCount: Math.floor(between(rnd, 6, 320, 0)),
      dealAmt: between(rnd, 1200, 86000, 1),
      settleAmt: between(rnd, 800, 62000, 1),
      payAmt: between(rnd, 600, 54000, 1),
      badCount: Math.floor(rnd() * 4), banCount: Math.floor(rnd() * 2),
      frozen: rnd() < 0.28
    };
  });
  D.supplierMap = {};
  D.suppliers.forEach(function (s) { D.supplierMap[s.name] = s; });

  /* ============================================================
     指标定义（附录 A）+ 合规阈值（BR-4）
     ============================================================ */
  D.tabs = [
    { key: 'purchase', name: '采购', count: 9 },
    { key: 'material', name: '物资', count: 6 },
    { key: 'resource', name: '资源', count: 0 },
    { key: 'asset', name: '资产', count: 5 }
  ];

  D.metrics = {
    purchase: [
      { key: 'costDown', name: '采购成本降低率', unit: '%', ctrl: [0, 50], desc: '（标准成本 - 总采购金额）/ 标准成本', src: '结算单 / 合同' },
      { key: 'central', name: '物资设备集中采购率', unit: '%', ctrl: [60, 100], desc: '集中采购金额 / 采购总金额', src: '采购管理系统' },
      { key: 'direct', name: '厂家直采总占比', unit: '%', ctrl: [20, 100], desc: '厂家直采金额 / 采购总金额', src: '采购管理系统' },
      { key: 'benefit', name: '物资设备采购效益率', unit: '%', ctrl: [20, 60], desc: '物资设备采购效益额 / 采购总额', src: '物资管理系统' },
      { key: 'plan', name: '采购计划执行率', unit: '%', ctrl: [70, 100], desc: '已执行计划金额 / 计划总金额', src: '采购管理系统' },
      { key: 'subCentral', name: '分包集中采购率', unit: '%', ctrl: [15, 100], desc: '分包集中采购金额 / 分包采购总金额', src: '采购管理系统' },
      { key: 'selfProc', name: '专业领域自主采购占比', unit: '%', ctrl: [0, 40], desc: '专业领域自主采购金额 / 专业领域采购总额', src: '采购管理系统' },
      { key: 'leadTime', name: '采购时效', unit: '天', ctrl: [0, 35], lowerBetter: true, desc: '招标开始到成交的平均天数', src: '招采系统' },
      { key: 'supplyChainDown', name: '供应链降本金额占比产值', unit: '%', ctrl: [1, 8], desc: '供应链降本金额 / 项目总包确权产值', src: '六项降本 + 成本降低额' }
    ],
    material: [
      { key: 'secondBargain', name: '二次议价采购成本降低率', unit: '%', ctrl: [0, 15], desc: '二次议价降低额 / 首次报价总额', src: '结算单 / 合同' },
      { key: 'orderRatio', name: '合同下单比例', unit: '%', ctrl: [70, 100], desc: '已下单金额 / 合同总额', src: '采购管理系统' },
      { key: 'payRatio', name: '按合同履约支付率', unit: '%', ctrl: [75, 100], desc: '已支付金额 / 应支付金额', src: '物资管理系统' },
      { key: 'monthSettle', name: '月度结算完成率', unit: '%', ctrl: [55, 100], desc: '本月完成月度结算数量 / 上月验收完成单据数量', src: '结算单' },
      { key: 'orderPlan', name: '订单计划使用率', unit: '%', ctrl: [60, 100], desc: '引用物资需用计划生成的订单数 / 订单总数', src: '数字建造物资需用计划' },
      { key: 'totalSettle', name: '总结算完成率', unit: '%', ctrl: [40, 100], desc: '项目总结算完成数量 / 项目物资分供商总数量（不含分包合同）', src: '结算单' }
    ],
    resource: [],
    asset: [
      { key: 'turnover', name: '资产周转率', unit: '次', ctrl: [0.5, 3], desc: '统计期资产周转额 / 平均资产余额', src: '物管系统资产模块' },
      { key: 'idle', name: '资产闲置率', unit: '%', ctrl: [0, 20], lowerBetter: true, desc: '闲置资产金额 / 资产总额', src: '物管系统资产模块' },
      { key: 'doneTurnover', name: '竣工项目资产周转率', unit: '次', ctrl: [0.2, 1.5], desc: '竣工项目资产周转额 / 平均资产余额', src: '物管系统资产模块' },
      { key: 'doneIdle', name: '竣工项目资产闲置率', unit: '%', ctrl: [0, 10], lowerBetter: true, desc: '竣工项目闲置资产 / 竣工项目资产总额', src: '物管系统资产模块' },
      { key: 'depRate', name: '资产折旧率', unit: '%', ctrl: [5, 30], desc: '当期折旧额 / 资产原值', src: '物管系统资产模块' }
    ]
  };

  /* 六项降本（F2.4） */
  D.sixSave = [
    { key: 'bargain', name: '结算降本', formula: '（集采单价 - 采购单价）× 结算数量', src: '系统自动抓取', amount: 8620.42, rate: 2.14 },
    { key: 'consume', name: '消耗降本', formula: '（图纸用量 - 实际用量）× 结算单价', src: '图纸用量数字商务填报', amount: 5842.36, rate: 1.45 },
    { key: 'asset', name: '资产降本', formula: '（购买单价 - 调拨单价）× 调拨数量', src: '手动填写', amount: 1746.28, rate: 0.43 },
    { key: 'verify', name: '验收降本', formula: '（到货数量 - 实收数量）× 结算单价', src: '系统自动抓取', amount: 3264.18, rate: 0.81 },
    { key: 'turnover', name: '周转降本', formula: '（购买单价 - 调拨单价）× 调拨数量', src: '手动填写', amount: 2183.94, rate: 0.54 },
    { key: 'idle', name: '闲废降本', formula: '（常规材料采购价 - 回收再利用采购价）', src: '手动填写', amount: 962.51, rate: 0.24 }
  ];

  /* 招采方式（F2.5） */
  D.procModes = ['直接采购', '询比价', '竞价', '竞争性谈判', '公开招标'];

  /* ============================================================
     日期与趋势
     ============================================================ */
  D.today = '2026-09-15';
  D.defaultRange = ['2026-01-01', '2026-09-15'];
  D.months12 = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03',
    '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];

  D.trend = function (base, swing, seed, n) {
    const rnd = seedRand(seed || 88);
    const out = [];
    let v = base;
    for (let i = 0; i < (n || 12); i++) {
      v = Math.max(0.2, v + (rnd() - 0.5) * swing);
      out.push(round(v));
    }
    return out;
  };

  /* ============================================================
     看板聚合
     ============================================================ */
  D.scopeOrgs = function (orgNames) {
    if (!orgNames || !orgNames.length) return D.orgs.slice();
    return D.orgs.filter(function (o) { return orgNames.indexOf(o.name) >= 0; });
  };

  const BUCKET = { purchase: 'kpi', material: 'kpiMat', asset: 'kpiAsset', resource: 'res' };

  D.summary = function (tab, orgNames) {
    const list = D.scopeOrgs(orgNames);
    const src = list.length ? list : D.orgs;
    const bucket = BUCKET[tab] || 'kpi';
    const out = {};
    (D.metrics[tab] || []).forEach(function (m) {
      const vals = src.map(function (o) { return (o[bucket] || {})[m.key] || 0; });
      out[m.key] = round(vals.reduce(function (a, b) { return a + b; }, 0) / (vals.length || 1));
    });
    if (tab === 'purchase' || !tab) {
      out.amount = round(src.reduce(function (a, o) { return a + o.amount; }, 0));
      out.cum = round(src.reduce(function (a, o) { return a + o.cum; }, 0));
    }
    if (tab === 'resource') {
      const keys = ['onStock', 'newIn', 'quality', 'quit', 'active', 'bad'];
      keys.forEach(function (k) {
        out[k] = Math.round(src.reduce(function (a, o) { return a + o.res[k]; }, 0));
      });
      out.perf = round(src.reduce(function (a, o) { return a + o.res.perf; }, 0), 1);
      out.perfQuality = round(src.reduce(function (a, o) { return a + o.res.perfQuality; }, 0), 1);
      out.avgPerf = round(src.reduce(function (a, o) { return a + o.res.avgPerf; }, 0) / (src.length || 1), 1);
      out.qualityRate = round(out.quality / (out.onStock || 1) * 100);
    }
    return out;
  };

  D.rank = function (tab, metricKey, orgNames) {
    const bucket = BUCKET[tab] || 'kpi';
    const rows = D.scopeOrgs(orgNames).map(function (o) {
      let v = (o[bucket] || {})[metricKey];
      if (v === undefined) v = 0;
      return { name: o.name, code: o.code, value: round(v), amount: o.amount };
    });
    rows.sort(function (a, b) { return b.value - a.value; });
    return rows;
  };

  D.matrix = function (tab, orgNames) {
    const bucket = BUCKET[tab] || 'kpi';
    const defs = D.metrics[tab] || [];
    return D.scopeOrgs(orgNames).map(function (o) {
      const row = { code: o.code, name: o.name, amount: o.amount };
      defs.forEach(function (m) { row[m.key] = (o[bucket] || {})[m.key]; });
      return row;
    });
  };

  D.monthTrend = function (tab, metricKey, orgNames) {
    const def = (D.metrics[tab] || []).filter(function (m) { return m.key === metricKey; })[0];
    const base = D.summary(tab, orgNames)[metricKey] || 10;
    return D.months12.map(function (m, i) {
      const rnd = seedRand(9000 + i * 31 + String(metricKey).length);
      return { month: m, value: round(Math.max(0.1, base + (rnd() - 0.5) * base * 0.22)) };
    });
  };

  /* 地图分布（项目按省计数） */
  D.provinceDist = function () {
    const alias = { '上海市': '上海', '南京市': '江苏', '苏州市': '江苏', '杭州市': '浙江', '宁波市': '浙江',
      '温州市': '浙江', '济南市': '山东', '青岛市': '山东', '合肥市': '安徽', '北京市': '北京', '天津市': '天津' };
    const m = {};
    D.projects.forEach(function (p) {
      const prov = alias[p.city] || p.city.replace(/市$/, '');
      m[prov] = (m[prov] || 0) + 1;
    });
    return Object.keys(m).map(function (k) { return { name: k, value: m[k] }; });
  };

  /* ============================================================
     明细行生成
     ============================================================ */
  function genRows(n, build, seed) {
    const rnd = seedRand(seed);
    const out = [];
    for (let i = 0; i < n; i++) out.push(build(i, rnd));
    return out;
  }

  /* --- 合同明细（附录 B） --- */
  const CONTRACT_NAME_SEED = ['塔吊租赁（二标段）', '钢筋采购', '商品混凝土采购', '模板及方木采购',
    '电线电缆采购', '幕墙工程专业分包', '消防工程', '临建精装修工程', '机电安装工程', '土方开挖工程',
    '桩基工程', '钢结构加工制作', '市政道路工程', '园区景观绿化', '智能化系统工程', '二次结构及粗装修'];
  D.genContractRows = function (n, filter) {
    return genRows(n || 60, function (i, rnd) {
      const p = pick(rnd, D.projects);
      const sm = pick(rnd, D.material.small);
      const qty = between(rnd, 12, 8600, 2);
      const price = between(rnd, 6.5, 4800, 2);
      const amt = round(qty * price);
      const taxRate = pick(rnd, [13, 9, 6, 3]);
      const amtNoTax = round(amt / (1 + taxRate / 100));
      const accepted = round(amt * between(rnd, 0.05, 0.98));
      const settled = round(accepted * between(rnd, 0.1, 0.95));
      const shouldPay = round(settled * between(rnd, 0.5, 1));
      const paid = round(shouldPay * between(rnd, 0.12, 1));
      return {
        name: pick(rnd, CONTRACT_NAME_SEED) + '合同',
        code: 'HT-' + (20250000 + i * 13),
        suppCode: rnd() > 0.7 ? 'BC-' + (1000 + i) : '—',
        treasuryCode: 'SK' + (202600000 + i * 31),
        status: rnd() > 0.12 ? '已生效' : pick(rnd, ['草稿', '审批中', '已终止']),
        type: pick(rnd, ['物资采购合同', '设备采购合同', '劳务分包合同', '专业分包合同', '专业服务合同',
          '物资租赁合同', '机械设备租赁合同', '运输类合同', '调拨采购合同', '废旧物资销售合同']),
        category: pick(rnd, ['物资类', '分包类', '服务类', '租赁类']),
        source: pick(rnd, ['招标', '询比价', '单一来源', '框架协议']),
        sourceCode: 'ZB-' + (20260000 + i * 29),
        tpl: pick(rnd, ['物资采购标准模板A', '分包合同标准模板', '设备采购模板B', '租赁合同模板']),
        owner: p.org + '项目部',
        priceType: pick(rnd, ['固定价', '浮动价', '暂估价']),
        isStandard: rnd() > 0.4 ? '是' : '否',
        partyA: '中国建筑第八工程局有限公司',
        partyB: pick(rnd, D.suppliers).name,
        belong: p.org,
        org2: p.org, org3: p.subOrg, project: p.name, projectCode: p.code,
        area: p.area, addr: p.city + '·' + p.name.slice(0, 10),
        dept: pick(rnd, ['物资管理部', '采购管理部', '商务管理部', '工程管理部']),
        signDate: '2026-0' + (1 + Math.floor(rnd() * 9)) + '-' + String(1 + Math.floor(rnd() * 27)).padStart(2, '0'),
        createDate: '2026-0' + (1 + Math.floor(rnd() * 9)) + '-' + String(1 + Math.floor(rnd() * 27)).padStart(2, '0'),
        reconDate: '2026-0' + (2 + Math.floor(rnd() * 8)) + '-' + String(1 + Math.floor(rnd() * 27)).padStart(2, '0'),
        settleCycle: pick(rnd, ['月结30天', '月结60天', '季度结算', '节点结算']),
        trade: pick(rnd, ['FOB', 'CIF', 'EXW', '—']),
        transport: pick(rnd, ['供方送货', '需方自提', '第三方物流']),
        fundFlow: pick(rnd, ['支出', '收入']),
        creator: pick(rnd, ['李彬', '孙倩', '周磊', '吴迪']),
        agent: pick(rnd, ['李彬', '王建国', '张伟', '陈晓', '刘洋', '赵敏']),
        rowType: pick(rnd, ['主材', '辅材', '设备', '周转材料']),
        brand: pick(rnd, ['宝武', '沙钢', '海螺', '鞍钢', '马钢', '—']),
        otherAttr: pick(rnd, ['—', '甲供', '甲控', '乙供']),
        floatType: pick(rnd, ['—', '随市场价', '随指数', '随汇率']),
        floatLink: pick(rnd, ['—', '到货月', '结算月', '下单月']),
        floatSys: pick(rnd, ['—', '我的钢铁网', '卓创资讯', 'wind']),
        floatArea: pick(rnd, ['—', p.city]),
        floatTime: pick(rnd, ['—', '当月均价', '上月均价', '当日价']),
        floatPct: between(rnd, -3, 3, 3), floatVal: between(rnd, -60, 60, 2), estPrice: round(price),
        matBig: D.material.big[Math.floor(rnd() * D.material.big.length)],
        matMid: D.material.mid[Math.floor(rnd() * D.material.mid.length)],
        matSmall: sm, matCode: 'WL' + (100000 + Math.floor(rnd() * 899999)),
        matDesc: sm + '（' + pick(rnd, ['国标', '行标', '企标']) + '）',
        qty: qty, unit: D.material.unitOf(sm),
        priceTax: round(price), amtTax: amt, taxRate: taxRate,
        priceNoTax: round(price / (1 + taxRate / 100)), amtNoTax: amtNoTax, taxAmt: round(amt - amtNoTax),
        inPriceTax: round(price * between(rnd, 1.02, 1.18)), inAmtTax: round(amt * between(rnd, 1.02, 1.18)), inTaxRate: taxRate,
        inPriceNoTax: round(price * between(rnd, 1.0, 1.15)), inAmtNoTax: round(amtNoTax * between(rnd, 1.0, 1.15)),
        costPriceTax: round(price * between(rnd, 0.88, 1.0)), costAmtTax: round(amt * between(rnd, 0.88, 1.0)), costTaxRate: taxRate,
        costPriceNoTax: round(price * between(rnd, 0.86, 0.99)), costAmtNoTax: round(amtNoTax * between(rnd, 0.86, 0.99)),
        costDown: between(rnd, 3.2, 12.8), bargainDown: between(rnd, 1.8, 9.4), benefit: between(rnd, 18.5, 52.4),
        hostPriceTax: round(price * between(rnd, 1.0, 1.06)),
        orderAmt: round(amt * between(rnd, 0.3, 1)), orderPct: between(rnd, 30, 100),
        acceptAmt: accepted, acceptPct: between(rnd, 20, 98),
        settleAmt: settled, settlePct: between(rnd, 10, 92), payPct: between(rnd, 12, 100),
        shouldPay: shouldPay, paidAmt: paid, unpaidAmt: round(shouldPay - paid)
      };
    }).filter(function (r) { return filter ? filter(r) : true; });
  };

  /* --- 物资结算明细（附录 D） --- */
  D.genSettleRows = function (n, filter) {
    return genRows(n || 60, function (i, rnd) {
      const p = pick(rnd, D.projects);
      const sm = pick(rnd, D.material.small);
      const qty = between(rnd, 5, 5600, 2);
      const price = between(rnd, 8, 4200, 2);
      const amt = round(qty * price);
      const taxRate = pick(rnd, [13, 9, 6, 3]);
      const amtNoTax = round(amt / (1 + taxRate / 100));
      const contractAmt = round(amt * between(rnd, 2, 12));
      const ordered = round(contractAmt * between(rnd, 0.2, 0.95));
      const settled = round(ordered * between(rnd, 0.2, 0.95) + amt);
      return {
        settleCode: 'JS' + (202600000 + i * 17),
        org2: p.org, org3: p.subOrg, project: p.name, supplier: pick(rnd, D.suppliers).name,
        settleType: pick(rnd, ['月度结算', '总结算', '临时结算', '退料结算']),
        settleStatus: pick(rnd, ['待提交', '审批中', '已生效', '已作废']),
        settleMonth: pick(rnd, D.months12), settleCycle: pick(rnd, ['月结30天', '月结60天', '季度结算']),
        detailType: pick(rnd, ['正常结算', '退货结算', '领料结算', '调拨结算']),
        docCode: 'DJ' + (20260000 + i * 23),
        acceptCode: 'YS' + (20260000 + i * 7), deliverCode: 'FH' + (20260000 + i * 11),
        date: '2026-0' + (1 + Math.floor(rnd() * 9)) + '-' + String(1 + Math.floor(rnd() * 27)).padStart(2, '0'),
        contractCode: 'HT-' + (20250000 + i * 13), orderCode: 'DD' + (20260000 + i * 19),
        receiveCode: 'SL' + (20260000 + i * 13), pickCode: 'LL' + (20260000 + i * 15),
        matBig: D.material.big[Math.floor(rnd() * D.material.big.length)],
        matMid: D.material.mid[Math.floor(rnd() * D.material.mid.length)],
        matSmall: sm, matCode: 'WL' + (100000 + Math.floor(rnd() * 899999)),
        matDesc: sm + '（' + pick(rnd, ['国标', '行标', '企标']) + '）',
        brand: pick(rnd, ['宝武', '沙钢', '海螺', '鞍钢', '马钢', '—']),
        unit: D.material.unitOf(sm), qty: qty,
        priceTax: round(price), amtTax: amt, taxRate: taxRate,
        priceNoTax: round(price / (1 + taxRate / 100)), amtNoTax: amtNoTax, taxAmt: round(amt - amtNoTax),
        contractAmt: contractAmt, orderedAmt: ordered,
        settledAmt: settled, unsettledAmt: round(contractAmt - settled),
        inPriceTax: round(price * between(rnd, 1.02, 1.18)), inAmtTax: round(amt * between(rnd, 1.02, 1.18)),
        inTaxRate: taxRate, inPriceNoTax: round(price * between(rnd, 1.0, 1.15)), inAmtNoTax: round(amtNoTax * between(rnd, 1.0, 1.15)),
        costPriceTax: round(price * between(rnd, 0.88, 1.0)), costAmtTax: round(amt * between(rnd, 0.88, 1.0)),
        costTaxRate: taxRate, costPriceNoTax: round(price * between(rnd, 0.86, 0.99)), costAmtNoTax: round(amtNoTax * between(rnd, 0.86, 0.99)),
        costDown: between(rnd, 3.2, 12.8), bargainDown: between(rnd, 1.8, 9.4), benefit: between(rnd, 18.5, 52.4)
      };
    }).filter(function (r) { return filter ? filter(r) : true; });
  };

  /* --- 资产明细（附录 E） --- */
  D.genAssetRows = function (n, filter) {
    return genRows(n || 40, function (i, rnd) {
      const p = pick(rnd, D.projects);
      const total = Math.floor(between(rnd, 20, 860, 0));
      const using = Math.floor(total * between(rnd, 0.4, 0.9));
      const idle = Math.floor((total - using) * between(rnd, 0.2, 0.8));
      const repair = Math.floor((total - using - idle) * between(rnd, 0.2, 0.9));
      const scrap = Math.max(0, total - using - idle - repair);
      return {
        org2: p.org, org3: p.subOrg, implOrg: p.org, project: p.name,
        assetCode: 'ZC' + (202600000 + i * 37), batchCode: 'PC' + (202600 + i * 7),
        origCode: rnd() > 0.6 ? 'ZC' + (202500000 + i * 41) : '—',
        category: pick(rnd, ['项目固定资产', '项目非固定资产']),
        subCategory: pick(rnd, ['临建设施', '办公设备', '生活设施', '施工机械', '测量仪器']),
        brand: pick(rnd, ['三一', '中联', '徐工', '柳工', '卡特', '—']),
        attr: pick(rnd, ['自有', '租赁', '调拨']),
        desc: pick(rnd, ['塔式起重机', '施工升降机', '配电箱', '活动板房', '全站仪', '挖掘机']),
        sourceType: pick(rnd, ['采购', '调拨', '租赁', '现场']),
        sourceOrg: pick(rnd, D.orgs).name,
        location: p.city + '·' + pick(rnd, ['一号库', '二号库', '现场料场', '设备堆场']),
        keeper: p.org + '物资部', user: pick(rnd, ['李彬', '王建国', '张伟', '陈晓']),
        buyAmt: between(rnd, 120, 3800, 1), assetAmt: between(rnd, 60, 4200, 1),
        depAmt: between(rnd, 30, 960, 1), disposeAmt: between(rnd, 6, 320, 1),
        assetCount: total, usingCount: using, idleCount: idle, repairCount: repair, scrapCount: scrap,
        acceptStatus: pick(rnd, ['已验收', '待验收', '验收不通过']),
        acceptCode: 'YS' + (20260000 + i * 7),
        acceptDate: '2026-0' + (1 + Math.floor(rnd() * 9)) + '-' + String(1 + Math.floor(rnd() * 27)).padStart(2, '0'),
        invStatus: pick(rnd, ['已盘点', '未盘点', '盘盈', '盘亏']),
        invPlanCode: 'PD' + (20260000 + i * 5),
        invDate: '2026-0' + (1 + Math.floor(rnd() * 9)) + '-' + String(1 + Math.floor(rnd() * 27)).padStart(2, '0'),
        transferCode: rnd() > 0.5 ? 'DB' + (20260000 + i * 9) : '—',
        transferType: pick(rnd, ['调入', '调出']),
        transferDate: '2026-0' + (1 + Math.floor(rnd() * 9)) + '-' + String(1 + Math.floor(rnd() * 27)).padStart(2, '0'),
        /* 报表筛选用的行字段：实施单位（二级|三级）、项目属性、统计日期。
           此前这些条件只在筛选条里，行上没有对应字段，查询被 applyConds 当作"不参与过滤"放行 */
        org: p.org + '|' + (p.subOrg || ''),
        pType: p.type, pFormat: p.format, pStatus: p.status, pMode: p.mode,
        pArea: p.area + '|' + p.city,
        date: '2026-0' + (1 + Math.floor(rnd() * 9)) + '-' + String(1 + Math.floor(rnd() * 15)).padStart(2, '0')
      };
    }).filter(function (r) { return filter ? filter(r) : true; });
  };

  /* --- 分供商资源明细 / 合作分析（附录 F） --- */
  D.genSupplierRows = function (n, filter) {
    return genRows(n || 60, function (i, rnd) {
      const p = pick(rnd, D.projects);
      const s = pick(rnd, D.suppliers);
      const winAmt = between(rnd, 120, 26000, 1);
      return {
        org2: p.org, org3: p.subOrg, project: p.name, format: p.format,
        name: s.name, code: s.code, cat: s.cat, grade: s.grade,
        bidCode: 'ZB-' + (20260000 + i * 11),
        winCount: Math.floor(between(rnd, 1, 28, 0)), winAmt: winAmt,
        contractCount: Math.floor(between(rnd, 1, 42, 0)), contractAmt: between(rnd, 120, 26000, 1),
        contractCode: 'HT-' + (20250000 + i * 13),
        settleCode: 'JS' + (20260000 + i * 19),
        banCount: Math.floor(between(rnd, 0, 2, 0)), badCount: Math.floor(between(rnd, 0, 5, 0)),
        perfAmt: round(winAmt * between(rnd, 0.3, 1.05), 1),
        matMid: D.material.mid[i % D.material.mid.length],
        credit: s.credit,
        /* Axure「资源+资产 › 分供商履约」的其余字段 */
        matBig: D.material.big[i % D.material.big.length],
        matSmall: D.material.small[(i * 3) % D.material.small.length],
        matCode: 'WL' + (100000 + i * 211),
        matDesc: s.cat + '供应（' + ['国标', '行标', '企标'][i % 3] + '）',
        claimCount: Math.floor(between(rnd, 0, 5, 0)),
        badReturnCount: Math.floor(between(rnd, 0, 4, 0))
      };
    }).filter(function (r) { return filter ? filter(r) : true; });
  };

  /* --- 分供商数据报表 · 资源数据明细（按项目汇总，列集对齐 Axure「资源数据明细」） --- */
  D.genResourceRows = function (n) {
    const list = D.projects.slice(0, n || 80);
    return list.map(function (p, i) {
      const o = D.orgMap[p.org];
      const res = (o && o.res) || D.orgs[i % D.orgs.length].res;
      const k = 0.35 + (i * 7 % 45) / 100;         // 项目占本单位资源量的比例
      const q = function (v) { return Math.max(0, Math.round(v * k)); };
      /* 金额列：res.perf / perfQuality 以亿元计（与分供商管理看板的履约额口径一致）→ 换算为万元 */
      const perfCnt = q(res.perfCnt);
      const perf = round(res.perf * k * 1e4, 1);
      return {
        org2: p.org, org3: p.subOrg, project: p.name,
        onStock: q(res.onStock), quality: q(res.quality), quit: q(res.quit),
        bad: q(res.bad), newIn: q(res.newIn), active: q(res.active),
        win: q(res.win), sign: q(res.sign), perfCnt: perfCnt, alt: q(res.alt),
        perf: perf, perfQuality: round(res.perfQuality * k * 1e4, 1),
        avgPerf: round(perf / (perfCnt || 1), 1)
      };
    });
  };

  /* --- 项目驾驶舱 · 物资全生命周期 --- */
  D.genPlanRows = function (kind) {
    return genRows(12, function (i, rnd) {
      const sm = D.material.small[i * 4 % D.material.small.length];
      return {
        planCode: (kind === 'month' ? 'YDJH' : 'RCJH') + (20260000 + i * 11),
        matBig: D.material.big[i % D.material.big.length],
        matMid: D.material.mid[i % D.material.mid.length],
        matSmall: sm,
        qty: +(60 + i * 18.6).toFixed(2), unit: D.material.unitOf(sm),
        needDate: '2026-0' + (1 + i % 9) + '-' + String(1 + i % 27).padStart(2, '0'),
        part: ['主体结构', '基础工程', '装饰装修', '机电安装', '室外工程'][i % 5],
        status: i % 4 === 0 ? '已完成' : (i % 4 === 1 ? '编制中' : (i % 4 === 2 ? '已下达' : '已关闭')),
        quoted: i % 3 === 0 ? '否' : '是',
        /* Axure「物资页签 › 需用计划列表」的其余字段 */
        planMonth: '2026-0' + (1 + i % 9),
        matCode: 'WL' + (100000 + i * 137), matDesc: sm + '（' + ['国标', '行标', '企标'][i % 3] + '）',
        checkQty: +(58 + i * 17.4).toFixed(2),
        autoPlan: i % 3 === 0 ? '是' : '否',
        pickUnit: ['一分公司', '二分公司', '安装分公司', '装饰分公司'][i % 4],
        madeDate: '2026-0' + (1 + i % 8) + '-' + String(2 + i % 25).padStart(2, '0'),
        maker: ['李彬', '孙倩', '周磊', '吴迪'][i % 4]
      };
    });
  };

  D.genAcceptRows = function () {
    return genRows(12, function (i, rnd) {
      const sm = D.material.small[i * 3 % D.material.small.length];
      return {
        acceptCode: 'YS' + (20260000 + i * 7), deliverCode: 'FH' + (20260000 + i * 11),
        receiveCode: 'SL' + (20260000 + i * 13), orderCode: 'DD' + (20260000 + i * 19),
        supplier: D.suppliers[i % D.suppliers.length].name,
        matSmall: sm, unit: D.material.unitOf(sm),
        qty: +(120 + i * 37.5).toFixed(2), acceptQty: +(118 + i * 36.2).toFixed(2),
        status: ['已验收', '待验收', '验收不通过'][i % 3],
        date: '2026-0' + (1 + i % 9) + '-' + String(1 + i % 27).padStart(2, '0'),
        /* Axure「物资页签 › 领料 / 结算明细」的其余字段 */
        pickCode: 'LL' + (20260000 + i * 17),
        matBig: D.material.big[i % D.material.big.length], matMid: D.material.mid[i % D.material.mid.length],
        matDesc: sm + '（' + ['国标', '行标', '企标'][i % 3] + '）',
        brand: ['宝武', '沙钢', '海螺', '鞍钢', '马钢'][i % 5],
        bizType: ['采购入库', '调拨入库', '退料入库'][i % 3],
        attr: ['甲供', '甲控', '乙供'][i % 3],
        part: ['主体结构', '基础工程', '装饰装修', '机电安装', '室外工程'][i % 5],
        pickQty: +(110 + i * 33.8).toFixed(2),
        level1: ['一公司本级库', '局本级库', '二公司本级库'][i % 3],
        owner: ['李彬', '王建国', '张伟', '陈晓'][i % 4],
        isRecon: i % 2 === 0 ? '已对账' : '未对账',
        settleCode: 'JS' + (20260000 + i * 23),
        settleMonth: '2026-0' + (1 + i % 9),
        settleCycle: ['月结30天', '月结60天', '季度结算'][i % 3],
        detailType: ['正常结算', '退货结算', '领料结算', '调拨结算'][i % 4]
      };
    });
  };

  D.genPickRows = function () {
    return genRows(12, function (i, rnd) {
      const sm = D.material.small[i * 5 % D.material.small.length];
      const qty = +(86 + i * 22.4).toFixed(2);
      const price = +(28 + i * 12.6).toFixed(2);
      return {
        pickCode: 'LL' + (20260000 + i * 15), receiveCode: 'SL' + (20260000 + i * 13),
        /* Axure「物资页签 › 领料」字段 */
        pickUnit: ['一分公司', '二分公司', '安装分公司', '装饰分公司'][i % 4],
        level1: ['局本级库', '一公司本级库', '二公司本级库'][i % 3],
        owner: ['李彬', '孙建国', '张伟', '陈晓'][i % 4],
        brand: ['宝武', '沙钢', '海螺', '鞍钢'][i % 4],
        bizType: ['采购入库', '调拨入库', '退料入库'][i % 3],
        otherAttr: ['甲供', '甲控', '乙供'][i % 3],
        acceptQty: +(qty * 0.99).toFixed(2), isRecon: i % 2 === 0 ? '已对账' : '未对账',
        matBig: D.material.big[i % D.material.big.length],
        matMid: D.material.mid[i % D.material.mid.length],
        deliverCode: 'FH' + (20260000 + i * 11), orderCode: 'DD' + (20260000 + i * 19),
        contractCode: 'HT-' + (20250000 + i * 13),
        matDesc: sm + '（国标）', matSmall: sm, qty: qty, unit: D.material.unitOf(sm),
        part: ['主体结构', '基础工程', '装饰装修', '机电安装', '室外工程'][i % 5],
        priceTax: price, amtTax: round(qty * price), taxRate: 13,
        priceNoTax: round(price / 1.13), amtNoTax: round(qty * price / 1.13),
        costPrice: round(price * 0.92), inPrice: round(price * 1.08),
        costDown: between(rnd, 3.2, 12.8), bargainDown: between(rnd, 1.8, 9.4), benefit: between(rnd, 18.5, 52.4),
        brand: ['宝武', '沙钢', '海螺', '鞍钢', '马钢'][i % 5],
        checkCode: 'DZ' + (20260000 + i * 9),
        date: '2026-0' + (1 + i % 9) + '-' + String(1 + i % 27).padStart(2, '0')
      };
    });
  };

  D.genReturnRows = function () {
    return genRows(10, function (i, rnd) {
      const sm = D.material.small[i * 7 % D.material.small.length];
      return {
        returnCode: 'TH' + (20260000 + i * 13), receiveCode: 'SL' + (20260000 + i * 13),
        supplier: D.suppliers[i % D.suppliers.length].name,
        matSmall: sm, qty: +(12 + i * 6.4).toFixed(2), unit: D.material.unitOf(sm),
        settleCode: 'JS' + (202600000 + i * 17),
        /* Axure「物资页签 › 退货」字段 */
        matBig: D.material.big[i % D.material.big.length],
        matMid: D.material.mid[i % D.material.mid.length],
        matDesc: sm + '（行标）',
        receiveQty: +(20 + i * 9.6).toFixed(2),
        returnPrice: +(26 + i * 11.2).toFixed(2),
        returnAmt: +(12 * 26 + i * 168.4).toFixed(2),
        isSettled: i % 3 === 0 ? '未结算' : '已结算',
        returnType: ['质量退货', '规格退货', '多发货退货', '项目变更退货'][i % 4],
        reason: ['规格不符', '质量不合格', '数量超发', '项目变更'][i % 4],
        date: '2026-0' + (1 + i % 9) + '-' + String(1 + i % 27).padStart(2, '0')
      };
    });
  };

  D.genInventoryRows = function () {
    return genRows(10, function (i, rnd) {
      const sm = D.material.small[i * 6 % D.material.small.length];
      return {
        invCode: 'PD' + (20260000 + i * 5),
        invType: ['全盘', '半明盘', '暗盘'][i % 3],
        scope: ['全部库房', '现场料场', '周转材料库'][i % 3],
        warehouse: ['一号库', '二号库', '现场料场'][i % 3],
        bookQty: +(1200 + i * 186).toFixed(2), unit: D.material.unitOf(sm),
        /* Axure「物资页签 › 盘点」字段 */
        matBig: D.material.big[i % D.material.big.length],
        matMid: D.material.mid[i % D.material.mid.length],
        matSmall: sm, matDesc: sm + '（国标）',
        implOrg: D.orgs[i % D.orgs.length].name,
        supplier: D.suppliers[i % D.suppliers.length].name,
        otherAttr: ['甲供', '甲控', '乙供'][i % 3], brand: ['宝武', '沙钢', '海螺'][i % 3],
        status: i < 7 ? '已完成' : '进行中',
        date: '2026-0' + (1 + i % 9) + '-' + String(1 + i % 27).padStart(2, '0')
      };
    });
  };

  D.genTransferRows = function () {
    return genRows(10, function (i, rnd) {
      const sm = D.material.small[i * 9 % D.material.small.length];
      const qty = +(60 + i * 24.6).toFixed(2);
      const price = +(1800 + i * 260).toFixed(2);
      return {
        contractCode: 'DBCG-' + (20260000 + i * 7),
        fromOrgType: ['二级单位', '三级单位', '项目部'][i % 3],
        transferType: i % 2 ? '调入' : '调出',
        outOrg: D.orgs[i % D.orgs.length].name, outImpl: D.orgs[i % D.orgs.length].name + '物资部',
        outProject: D.projects[i % D.projects.length].name,
        inOrg: D.orgs[(i + 3) % D.orgs.length].name, inImpl: D.orgs[(i + 3) % D.orgs.length].name + '物资部',
        inProject: D.projects[(i + 4) % D.projects.length].name,
        matBig: D.material.big[i % D.material.big.length], matMid: D.material.mid[i % D.material.mid.length],
        matSmall: sm, matDesc: sm + '（行标）',
        applyQty: qty, outQty: +(qty * 0.98).toFixed(2), inQty: +(qty * 0.96).toFixed(2),
        priceNoTax: price, amtNoTax: round(qty * price), taxRate: 13,
        amtTax: round(qty * price * 1.13),
        brand: ['宝武', '沙钢', '海螺'][i % 3], unit: D.material.unitOf(sm),
        transferCode: 'DB' + (20260000 + i * 9)
      };
    });
  };

  D.genScrapRows = function () {
    return genRows(10, function (i, rnd) {
      const qty = +(12 + i * 8.4).toFixed(2);
      const price = +(1200 + i * 180).toFixed(2);
      return {
        assetCode: 'ZC' + (202600000 + i * 37), batchCode: 'PC' + (202600 + i * 7),
        estQty: +(qty * 1.05).toFixed(2), qty: qty, unit: ['吨', 'm³', '个'][i % 3],
        scrapType: ['废钢筋', '废木材', '其他废料'][i % 3],
        matBig: D.material.big[i % D.material.big.length],
        matMid: D.material.mid[i % D.material.mid.length],
        matSmall: D.material.small[(i * 4) % D.material.small.length],
        matDesc: D.material.small[(i * 4) % D.material.small.length] + '（废旧）',
        applyCode: 'XF' + (20260000 + i * 11),
        way: ['销售', '销毁'][i % 2],
        price: price, amt: round(qty * price),
        buyer: ['废宝回收有限公司', '循环资源利用中心', '再生资源公司'][i % 3],
        date: '2026-0' + (1 + i % 9) + '-' + String(1 + i % 27).padStart(2, '0'),
        handler: ['李彬', '王建国', '张伟'][i % 3]
      };
    });
  };

  /* --- 资产调拨（Axure《项目驾驶舱 › 资产页签 › 资产调拨》列表字段选择-资源+资产 state1） --- */
  D.genAssetTransferRows = function (n) {
    return genRows(n || 12, function (i, rnd) {
      const p = pick(rnd, D.projects);
      const q = pick(rnd, [32, 58, 96, 140, 220]);
      const price = between(rnd, 800, 9800, 2);
      const taxRate = pick(rnd, [13, 9, 6]);
      const amt = round(q * price);
      return {
        transferCode: 'ZCDB-' + (202600000 + i * 53),
        assetCode: 'PC-' + (20240807 + i * 3) + '-' + String(204475 + i * 7).padStart(9, '0'),
        fromOrgType: pick(rnd, ['调出方', '调入方']),
        outOrg: D.orgs[Math.floor(rnd() * D.orgs.length)].name,
        outImpl: D.orgs[Math.floor(rnd() * D.orgs.length)].name + '分公司',
        outProject: p.name,
        inOrg: D.orgs[Math.floor(rnd() * D.orgs.length)].name,
        inImpl: D.orgs[Math.floor(rnd() * D.orgs.length)].name + '分公司',
        inProject: pick(rnd, D.projects).name,
        desc: pick(rnd, ['彩钢板房 双层彩钢活动板房（内走廊）', '塔式起重机 QTZ80', '施工升降机 SC200/200',
          '配电箱 XL-21', '全站仪 徕卡 TS16', '挖掘机 履带式 1.2m³']),
        brand: pick(rnd, ['三一', '中联', '徐工', '柳工', '卡特', '—']),
        otherAttr: pick(rnd, ['甲供', '甲控', '乙供']),
        assetStatus: pick(rnd, ['在用', '闲置', '报废', '维保']),
        attr: pick(rnd, ['自有', '租赁', '调拨']),
        category: pick(rnd, ['固定资产', '非固定资产']),
        location: p.city + '·' + pick(rnd, ['一号库', '二号库', '现场料场', '设备堆场']),
        applyQty: q, outQty: Math.max(0, q - Math.floor(rnd() * 3)),
        priceNoTax: round(price), amtNoTax: amt, taxRate: taxRate, amtTax: round(amt * (1 + taxRate / 100)),
        origPriceNoTax: round(price * between(rnd, 1.0, 1.18)), origAmt: round(amt * between(rnd, 1.02, 1.25)),
        transferDate: '2026-0' + (1 + Math.floor(rnd() * 9)) + '-' + String(1 + Math.floor(rnd() * 27)).padStart(2, '0'),
        applyDate: '2026-0' + (1 + Math.floor(rnd() * 9)) + '-' + String(1 + Math.floor(rnd() * 27)).padStart(2, '0'),
        status: pick(rnd, ['待调出', '调拨中', '已完成'])
      };
    });
  };

  /* --- 资产处置（Axure《项目驾驶舱 › 资产页签 › 资产处置》列表字段选择-资源+资产 state2） --- */
  D.genAssetDisposeRows = function (n) {
    return genRows(n || 12, function (i, rnd) {
      const p = pick(rnd, D.projects);
      const cnt = pick(rnd, [6, 12, 24, 48, 96]);
      const years = between(rnd, 1.5, 12.6, 1);
      const orig = between(rnd, 12, 480, 1);
      return {
        disposeCode: 'CZ-' + (202600000 + i * 47),
        assetCode: 'ZC' + (202600000 + i * 37),
        batchCode: 'PC-' + (20240807 + i * 3) + '-' + String(204475 + i * 7).padStart(9, '0'),
        brand: pick(rnd, ['三一', '中联', '徐工', '柳工', '—']),
        otherAttr: pick(rnd, ['甲供', '甲控', '乙供']),
        assetStatus: pick(rnd, ['在用', '闲置', '报废', '维保']),
        attr: pick(rnd, ['自有', '租赁', '调拨']),
        category: pick(rnd, ['固定资产', '非固定资产']),
        desc: pick(rnd, ['彩钢板房', '塔式起重机', '施工升降机', '活动板房', '全站仪', '挖掘机']),
        countType: pick(rnd, ['数量', '面积', '重量']),
        actualQty: cnt, disposeQty: Math.max(1, Math.round(cnt * between(rnd, 0.3, 1))), turnedTimes: Math.floor(between(rnd, 0, 9, 0)),
        condition: pick(rnd, ['已达到', '未达到']),
        origAmt: orig, usedYears: years, residual: round(orig * between(rnd, 0.02, 0.2)),
        netAmt: round(orig * Math.max(0, 1 - years / 15) * between(rnd, 0.85, 1.0)),
        keeper: p.org + '物资部', keeperUser: pick(rnd, ['李彬', '王建国', '张伟', '陈晓']),
        disposeDate: '2026-0' + (1 + Math.floor(rnd() * 9)) + '-' + String(1 + Math.floor(rnd() * 27)).padStart(2, '0'),
        status: pick(rnd, ['待审批', '已审批', '已处置'])
      };
    });
  };

  /* --- 提诉 / 反向评价 / 黑名单 --- */
  /* 提诉报表：两种口径，列集对齐 Axure「分供商提诉报表」的 4 个视角
     ① 单位 / 单位-项目经理：占比 + 平均时耗；② 提诉分供商 / 提诉人：状态分布 */
  D.genComplaintRows = function (view) {
    const orgView = view === 'targetOrg' || view === 'targetManager';
    const MANAGERS = ['李彬', '王建国', '张伟', '陈晓', '刘洋'];
    if (orgView) {
      return D.orgs.map(function (o, i) {
        const rnd = seedRand(4100 + i);
        const total = Math.round(between(rnd, 60, 620, 0));
        const overdue = Math.round(total * between(rnd, 0.08, 0.36));
        const open = Math.round(total * between(rnd, 0.12, 0.42));
        const done = total - open;
        return {
          name: view === 'targetManager' ? (o.name + '-' + MANAGERS[i % MANAGERS.length]) : o.name,
          total: total, overdue: overdue, overduePct: round(overdue / total * 100, 2),
          open: open, openPct: round(open / total * 100, 2),
          openHours: Math.round(between(rnd, 240, 1800, 0)),
          done: done, donePct: round(done / total * 100, 2),
          doneHours: Math.round(between(rnd, 120, 900, 0)),
          contractAmt: Math.round(between(rnd, 1.2e8, 9.6e8, 0)),
          disputeAmt: Math.round(between(rnd, 2e6, 6e7, 0))
        };
      });
    }
    const persons = ['赵敏', '孙倩', '周磊', '吴迪', '郑凯', '何静'];
    return D.suppliers.slice(0, 20).map(function (s, i) {
      const rnd = seedRand(4500 + i);
      const total = Math.round(between(rnd, 6, 88, 0));
      const open = Math.round(total * between(rnd, 0.2, 0.7));
      return {
        name: view === 'supplierPerson' ? (s.name + '-' + (13482600000 + i * 137)) : s.name,
        total: total, overdue: Math.round(total * between(rnd, 0.05, 0.4)),
        open: open,
        pending: Math.round(open * between(rnd, 0.2, 0.6)),
        handling: Math.round(open * between(rnd, 0.2, 0.5)),
        withdrawn: Math.round(open * between(rnd, 0.05, 0.25)),
        waitConfirm: Math.round(open * between(rnd, 0.05, 0.2)),
        done: total - open,
        appeal: Math.round(between(rnd, 0, 12, 0)), urge: Math.round(between(rnd, 0, 20, 0)),
        contractAmt: Math.round(between(rnd, 2e7, 6e8, 0)),
        disputeAmt: Math.round(between(rnd, 1e6, 4e7, 0))
      };
    });
  };

  /* 反向评价：按「项目 × 评价项」逐条列出（列集对齐 Axure「分供商反向评价」） */
  D.REVIEW_ITEMS = [
    ['项目采购过程中是否做到先签订合同后进场供应', '做到了先签合同后供货', '项目要求先供货后签合同'],
    ['是否按要求开展分供商考察评价', '已按要求开展考察评价', '未开展考察评价'],
    ['是否使用局合格分供商名录内单位', '全部使用名录内单位', '存在名录外单位'],
    ['是否按月开展分供商履约评价', '已按月开展履约评价', '未按月开展履约评价'],
    ['是否按规定收取履约保证金', '已按规定收取', '未按规定收取']
  ];
  D.genReviewRows = function (n) {
    const items = D.REVIEW_ITEMS;
    const list = D.projects.slice(0, n || 20);
    return list.map(function (p, i) {
      const it = items[i % items.length];
      const rnd = seedRand(5200 + i);
      const score = rnd() > 0.28 ? 10 : 0;
      return {
        org2: p.org, org3: p.subOrg, project: p.name,
        item: it[0], score: score, meaning: score === 10 ? it[1] : it[2],
        supCount: Math.round(between(rnd, 60, 420, 0))
      };
    });
  };

  D.genBlacklistRows = function () {
    return D.suppliers.filter(function (s) { return s.frozen; }).map(function (s, i) {
      return { name: s.name, creditNo: s.creditNo, status: '冻结', reason: ['供货不及时', '质量不合格', '虚假资料', '恶意报价'][i % 4], date: '2026-0' + (1 + i % 9) + '-' + String(1 + i % 27).padStart(2, '0') };
    });
  };

  /* --- 主材进场 / 结算平均价格 --- */
  D.genMaterialMarket = function (mainKey, level) {
    const conf = D.material.main.filter(function (m) { return m.name === mainKey; })[0] || D.material.main[0];
    const rnd = seedRand(500 + mainKey.length * 17 + level * 7);
    const rows = (level === 1 ? D.orgs : level === 2 ? D.subOrgs.slice(0, 12) : D.projects.slice(0, 12)).map(function (o, i) {
      const k = 0.5 + ((i * 37) % 70) / 100;
      return {
        name: o.name || o.shortName,
        qty: round(2860 * k, 2),
        amt: round(2860 * k * between(rnd, 3.2, 5.4), 2),
        price: round(between(rnd, 3800, 5200), 2)
      };
    });
    rows.sort(function (a, b) { return b.qty - a.qty; });
    return rows;
  };

  D.genSettlePriceRows = function () {
    return [
      { name: '普通钢筋', unit: '元/吨', value: 4722.89 }, { name: '普通混凝土', unit: '元/m³', value: 365.28 },
      { name: '水泥', unit: '元/吨', value: 428.60 }, { name: '防火门', unit: '元/㎡', value: 862.50 },
      { name: '电力电缆', unit: '元/米', value: 42.60 }, { name: '汽车起重机', unit: '元/台', value: 12800 },
      { name: '彩钢板房运输费', unit: '元/吨', value: 186.20 }, { name: '建筑电梯', unit: '元/台', value: 186000 }
    ];
  };

  /* --- 用户活跃度（F2.9） --- */
  D.genActiveRows = function () {
    return D.orgs.map(function (o, i) {
      const rnd = seedRand(6000 + i);
      const total = Math.floor(between(rnd, 180, 4200, 0));
      const active = Math.floor(total * between(rnd, 0.35, 0.92));
      return { org2: o.name, active: active, total: total, rate: round(active / total * 100, 1) };
    }).sort(function (a, b) { return b.active - a.active; });
  };

  D.ready = true;
})(window.APP);
