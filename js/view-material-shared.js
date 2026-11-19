/* 物资管理看板共享状态：供 board / 六项降本 / 闲废物资模块共同使用。
   提前独立成文件，避免 save / idle 模块反向依赖 material-board 先执行。 */
(function (D) {
  'use strict';

  D.materialBoardState = {
    /* 降本明细的本页内下钻路径（二级单位 → 三级单位 → 项目）；与「跳数据报表」无关 */
    drill: { org2: '', org3: '', project: '' },
    metric: 'bargain',   // 顶部指标带 / 页签当前项
    save: 'total',       // 六项降本当前项
    rankPage: 1, detailPage: 1, size: 10,
    hide: {},              // 六项降本趋势图例的熄灭状态（下标 → true 表示已熄灭）
    sign: '全部',           // 降本金额正负：全部 / 正数 / 负数
    items: null,           // 降本明细项查询：勾选的小项集合（null = 全选）
    msOpen: false,         // 复选下拉面板是否展开（重绘后保持展开）
    kpiMode: 'amt',         // 卡片放大口径：amt = 放大降本金额；rate = 放大产值占比
    more: false,
    /* 闲废物资：已生效的查询条件 + 两份台账各自页码 */
    idle: { doc: 'transfer', org2: '', org3: '', matSmall: '', from: '', to: '',
      project: '', pageT: 1, pageR: 1 },
    idleHide: [false, false],   // 闲废物资柱图图例：物资调拨 / 废旧处理两系列的熄灭状态
    idleSize: 10
  };

  D.materialBoardMonths = ['2025.04', '2025.05', '2025.06', '2025.07', '2025.08', '2025.09',
    '2025.10', '2025.11', '2025.12', '2026.01', '2026.02', '2026.03'];
})(window.APP);