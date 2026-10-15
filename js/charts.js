/* ============================================================
   智慧运营数据平台 · 纯 SVG 图表库（零依赖）
   ============================================================ */
window.APP = window.APP || {};

(function (D) {
  'use strict';

  const PALETTE = ['#008EE0', '#13C2C2', '#F59A23', '#722ED1', '#52C41A', '#EB2F96',
    '#2F54EB', '#FA8C16', '#8DA0A0', '#8C8C8C'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  D.esc = esc;

  function fmt(v, d) {
    if (v == null || isNaN(v)) return '—';
    const n = d == null ? 2 : d;
    return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: n, maximumFractionDigits: n });
  }
  D.fmtNum = fmt;
  D.fmtInt = function (v) { return fmt(v, 0); };

  function niceNum(v) {
    if (v === 0) return 1;
    const exp = Math.floor(Math.log10(Math.abs(v)));
    const base = Math.pow(10, exp);
    const n = Math.abs(v) / base;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * base;
  }
  function axisTicks(min, max, count) {
    count = count || 5;
    if (max === min) max = min + 1;
    const span = niceNum((max - min) / count);
    const lo = Math.floor(min / span) * span;
    const hi = Math.ceil(max / span) * span;
    const out = [];
    for (let v = lo; v <= hi + span / 2; v += span) out.push(+v.toFixed(6));
    return out;
  }

  /* 粗略文本宽度（px）：ASCII ≈ 6.4 / 全角 ≈ 11（以字号 11 为基准，fs 可指定）。
     图表里用来给刻度、数值标签预留边距——留少了文字会落到 viewBox 之外 */
  function textW(str, fs) {
    const k = (fs || 11) / 11;
    let px = 0;
    for (let i = 0; i < String(str).length; i++) px += String(str).charCodeAt(i) > 255 ? 11 : 6.4;
    return Math.round(px * k);
  }

  function svgOpen(w, h) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h +
      '" preserveAspectRatio="xMidYMid meet" style="width:100%;height:' + h + 'px">';
  }
  function tip(a) { return ' data-tip="' + esc(a) + '" class="dsc-hit"'; }

  /* 统一悬停提示 */
  D.bindChartTips = function (root) {
    if (root.__tipsBound) return;
    root.__tipsBound = true;
    const box = document.createElement('div');
    box.className = 'dsc-chart__tip';
    root.appendChild(box);
    root.addEventListener('mousemove', function (e) {
      const hit = e.target.closest ? e.target.closest('.dsc-hit') : null;
      if (!hit) { box.style.display = 'none'; return; }
      const r = root.getBoundingClientRect();
      const svg = hit.closest('svg');
      const sr = svg ? svg.getBoundingClientRect() : r;
      let x, y;
      if (hit.__cx != null && svg && svg.viewBox.baseVal.width) {
        x = sr.left - r.left + hit.__cx * (sr.width / svg.viewBox.baseVal.width);
        y = sr.top - r.top + hit.__cy * (sr.height / svg.viewBox.baseVal.height);
      } else {
        const r2 = hit.getBoundingClientRect();
        x = r2.left - r.left + r2.width / 2;
        y = r2.top - r.top;
      }
      box.innerHTML = hit.getAttribute('data-tip');
      box.style.display = 'block';
      box.style.left = Math.max(70, Math.min(r.width - 70, x)) + 'px';
      box.style.top = Math.max(30, y - 8) + 'px';
    });
    root.addEventListener('mouseleave', function () { box.style.display = 'none'; });
  };

  function autoRedraw(el, draw) {
    draw();
    if (el.__ro) el.__ro.disconnect();
    if (typeof ResizeObserver === 'undefined') return;
    let w0 = el.clientWidth;
    el.__ro = new ResizeObserver(function () {
      if (Math.abs(el.clientWidth - w0) < 8) return;
      w0 = el.clientWidth;
      clearTimeout(el.__rt);
      el.__rt = setTimeout(draw, 120);
    });
    el.__ro.observe(el);
  }

  function render(el, html) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    el.classList.add('dsc-chart');
    el.innerHTML = html;
    D.bindChartTips(el);
  }

  /* ============================================================
     折线图
     ============================================================ */
  D.lineChart = function (el, data, opt) {
    opt = opt || {};
    autoRedraw(el, function () {
      const w = Math.max(320, el.clientWidth || 600);
      const h = opt.height || 250;
      const pad = { t: 18, r: opt.padR || 18, b: 30, l: opt.padL || 52 };
      const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
      const all = data.series.reduce(function (a, s) { return a.concat(s.data); }, []);
      const ticks = axisTicks(Math.min.apply(null, all), Math.max.apply(null, all), opt.yTicks || 5);
      const vmin = ticks[0], vmax = ticks[ticks.length - 1];
      const X = function (i) { return pad.l + (data.categories.length <= 1 ? iw / 2 : i * iw / (data.categories.length - 1)); };
      const Y = function (v) { return pad.t + ih - (v - vmin) / (vmax - vmin || 1) * ih; };
      let s = svgOpen(w, h);
      ticks.forEach(function (t) {
        s += '<line x1="' + pad.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + Y(t).toFixed(1) + '" stroke="#EEEEEE"/>';
        s += '<text x="' + (pad.l - 8) + '" y="' + (Y(t) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#999">' +
          esc(fmt(t, opt.yDigits == null ? (vmax < 10 ? 1 : 0) : opt.yDigits)) + '</text>';
      });
      const step = Math.ceil(data.categories.length / (opt.maxX || 12));
      /* 首尾标签居中会被挤出画布 → 贴边时把锚点收到画布内（svg{overflow:visible} 会画到整页上） */
      const clampX = function (x, txt) {
        const half = textW(txt) / 2;
        return Math.max(1 + half, Math.min(x, w - 1 - half));
      };
      data.categories.forEach(function (c, i) {
        if (i % step) return;
        s += '<text x="' + clampX(X(i), String(c)).toFixed(1) + '" y="' + (h - 10) +
          '" text-anchor="middle" font-size="11" fill="#999">' + esc(c) + '</text>';
      });
      data.series.forEach(function (se, si) {
        const color = se.color || PALETTE[si % PALETTE.length];
        const pts = se.data.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ');
        if (opt.area !== false) {
          s += '<polygon points="' + pad.l + ',' + (pad.t + ih) + ' ' + pts + ' ' + (w - pad.r) + ',' + (pad.t + ih) + '" fill="' + color + '" opacity="0.10"/>';
        }
        s += '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="' + (opt.lineWidth || 2) +
          '" stroke-linejoin="round"/>';
        se.data.forEach(function (v, i) {
          s += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="' + (opt.dotR == null ? 3.5 : opt.dotR) +
            '" fill="#fff" stroke="' + color + '" stroke-width="2"' +
            tip('<b>' + esc(data.categories[i]) + '</b><br/>' + esc(se.name || '') + '：' + fmt(v, opt.tipDigits) + (opt.unit || '')) + '/>';
          if (opt.dataLabels) {
            const lt = fmt(v, opt.labelDigits == null ? 2 : opt.labelDigits) + (opt.unit || '%');
            s += '<text x="' + clampX(X(i), lt).toFixed(1) + '" y="' + (Y(v) - 9).toFixed(1) +
              '" text-anchor="middle" font-size="11" fill="' + color + '">' + esc(lt) + '</text>';
          }
        });
      });
      s += '</svg>';
      render(el, s);
    });
  };

  /* ============================================================
     柱状图（可分组 / 可叠加折线双轴）
     ============================================================ */
  D.barChart = function (el, data, opt) {
    opt = opt || {};
    autoRedraw(el, function () {
      const w = Math.max(320, el.clientWidth || 600);
      const h = opt.height || 280;
      const pad = { t: opt.padT || 22, r: opt.padR || 48, b: 38, l: opt.padL || 56 };
      const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
      const bars = data.series.filter(function (s) { return s.type !== 'line'; });
      const lines = data.series.filter(function (s) { return s.type === 'line'; });
      /* se.axis==='right'：该柱用右轴刻度（双轴分组柱，如「金额(万元) + 数量(家)」） */
      const barsL = bars.filter(function (s) { return s.axis !== 'right'; });
      const barsR = bars.filter(function (s) { return s.axis === 'right'; });
      const stack = bars.some(function (s) { return s.stack; });
      function ext(list) {
        const v = list.reduce(function (a, s) { return a.concat(s.data); }, []);
        return v.length ? [Math.min.apply(null, v), Math.max.apply(null, v)] : [0, 1];
      }
      /* 柱状图基线从 0 起：若按 min..max 取刻度，柱子会被截断，差异被视觉放大 */
      /* 堆叠柱的量程必须按「每类各系列之和」取：按单系列最大值取量程时，
         堆叠总和（如 100% 堆叠）会冲出量程顶部被画到画布之外 */
      const stackExt = function () {
        let hi = 0;
        data.categories.forEach(function (c, i) {
          hi = Math.max(hi, barsL.reduce(function (a, s) { return a + (s.data[i] || 0); }, 0));
        });
        return [0, hi || 1];
      };
      const exL = stack ? stackExt() : ext(barsL), exR = ext(lines.concat(barsR));
      const tL = axisTicks.call(null, Math.min(0, exL[0]), Math.max(0, exL[1]), 5);
      const tR = (lines.length || barsR.length)
        ? axisTicks.call(null, Math.min(0, exR[0]), Math.max(0, exR[1]), 5) : null;
      const lmin = tL[0], lmax = tL[tL.length - 1];
      const rmin = tR ? tR[0] : 0, rmax = tR ? tR[tR.length - 1] : 1;
      const YL = function (v) { return pad.t + ih - (v - lmin) / (lmax - lmin || 1) * ih; };
      const YR = function (v) { return pad.t + ih - (v - rmin) / (rmax - rmin || 1) * ih; };
      const band = iw / data.categories.length;
      const gw = stack ? Math.min(band * 0.5, 46) : Math.min(band * 0.62, 46 * bars.length);
      const bw = bars.length ? gw / bars.length : 0;
      let s = svgOpen(w, h);
      tL.forEach(function (t) {
        s += '<line x1="' + pad.l + '" y1="' + YL(t).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + YL(t).toFixed(1) + '" stroke="#EEEEEE"/>';
        s += '<text x="' + (pad.l - 8) + '" y="' + (YL(t) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#999">' + esc(fmt(t, opt.yDigits == null ? 0 : opt.yDigits)) + esc(opt.yUnit || '') + '</text>';
      });
      if (tR) {
        tR.forEach(function (t) {
          s += '<text x="' + (w - pad.r + 8) + '" y="' + (YR(t) + 4).toFixed(1) + '" font-size="11" fill="#F59A23">' +
            esc(fmt(t, opt.rDigits == null ? 1 : opt.rDigits)) + '</text>';
        });
      }
      data.categories.forEach(function (c, i) {
        const cx = pad.l + band * i + band / 2;
        let acc = stack ? lmin : 0;
        bars.forEach(function (se, si) {
          const v = se.data[i] || 0;
          const right = se.axis === 'right';
          let x, y, bwid, hgt;
          if (stack) {
            x = cx - gw / 2;
            bwid = Math.max(1, gw - 3);
            const y0 = YL(acc);
            acc += v;
            const y1 = YL(acc);
            y = Math.min(y0, y1);
            hgt = Math.abs(y0 - y1);
          } else {
            x = cx - gw / 2 + bw * si;
            y = (right ? YR : YL)(Math.max(v, right ? rmin : lmin));
            bwid = Math.max(1, bw - 3);
            hgt = pad.t + ih - y;
          }
          let fill = se.color || PALETTE[si % PALETTE.length];
          if (se.color2) {
            const gid = 'bg' + i + '_' + si;
            s += '<defs><linearGradient id="' + gid + '" x1="0" y1="1" x2="0" y2="0">' +
              '<stop offset="0%" stop-color="' + fill + '"/><stop offset="100%" stop-color="' + se.color2 + '"/></linearGradient></defs>';
            fill = 'url(#' + gid + ')';
          }
          s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bwid.toFixed(1) +
            '" height="' + Math.max(1, hgt).toFixed(1) + '" rx="2" fill="' + fill + '" opacity="' + (opt.barOpacity || 0.88) + '"' +
            tip('<b>' + esc(c) + '</b><br/>' + esc(se.name) + '：' + fmt(v, opt.yDigits) + (se.unit != null ? se.unit : (opt.unit || ''))) + '/>';
          if (opt.dataLabels && !stack) {
            s += '<text x="' + (x + bwid / 2).toFixed(1) + '" y="' + (y - 5).toFixed(1) +
              '" text-anchor="middle" font-size="11" fill="' + (opt.labelColor || '#7FE7FF') + '">' +
              esc(fmt(v, opt.yDigits == null ? 0 : opt.yDigits)) + esc(se.unit != null ? se.unit : (opt.unit || '')) + '</text>';
          }
        });
        /* 柱顶合计标签（如堆叠柱的「984.88万元」） */
        if (opt.categoryTopLabels && opt.categoryTopLabels[i] != null) {
          const topV = stack ? acc : barsL.reduce(function (m, se) { return Math.max(m, se.data[i] || 0); }, lmin);
          s += '<text x="' + cx.toFixed(1) + '" y="' + (YL(topV) - 6).toFixed(1) +
            '" text-anchor="middle" font-size="11" fill="' + (opt.labelColor || '#7FE7FF') + '">' +
            esc(opt.categoryTopLabels[i]) + '</text>';
        }
        s += '<text x="' + cx.toFixed(1) + '" y="' + (h - 12) + '" text-anchor="middle" font-size="11" fill="' +
          (opt.xColor || '#666') + '">' + esc(String(c).slice(0, 7)) + '</text>';
      });
      lines.forEach(function (se) {
        const color = se.color || '#F59A23';
        const pts = se.data.map(function (v, i) { return (pad.l + band * i + band / 2).toFixed(1) + ',' + YR(v).toFixed(1); }).join(' ');
        s += '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2"/>';
        se.data.forEach(function (v, i) {
          s += '<circle cx="' + (pad.l + band * i + band / 2).toFixed(1) + '" cy="' + YR(v).toFixed(1) + '" r="3.5" fill="#fff" stroke="' + color + '" stroke-width="2"' +
            tip('<b>' + esc(data.categories[i]) + '</b><br/>' + esc(se.name) + '：' + fmt(v, 2)) + '/>';
        });
      });
      s += '</svg>';
      render(el, s);
    });
  };

  /* ============================================================
     横向条形
     ============================================================ */
  D.hbarChart = function (el, rows, opt) {
    opt = opt || {};
    autoRedraw(el, function () {
      const w = Math.max(300, el.clientWidth || 500);
      const rowH = opt.rowH || 28;
      const h = Math.max(rowH, rows.length * rowH + 10);
      /* 左侧名称是右对齐画在 padL-8 处的，名字比 padL 宽就会画到画布外（x 变负） */
      const nmOf = function (r) {
        const nm = String(r.name);
        return nm.length > (opt.nameMax || 11) ? nm.slice(0, opt.nameMax || 11) + '…' : nm;
      };
      const maxNameW = rows.reduce(function (a, r) { return Math.max(a, textW(nmOf(r), 12)); }, 0);
      const padL = Math.max(opt.padL || 130, maxNameW + 12);
      /* padR 要真正容下右侧数值标签：标签从 padL+iw+8 起画，
         固定 padR（如 58）小于标签宽度时文字会画到 viewBox 之外（svg{overflow:visible} 会画到整页） */
      const maxValW = rows.reduce(function (a, r) {
        return Math.max(a, textW(fmt(r.value, opt.digits) + (opt.unit || ''), 12));
      }, 0);
      const padR = Math.max(opt.padR || 70, 16 + maxValW);
      const iw = w - padL - padR;
      const max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
      let s = svgOpen(w, h);
      rows.forEach(function (r, i) {
        const y = 6 + i * rowH;
        const bw = Math.max(2, r.value / max * iw);
        const color = opt.colorOf ? opt.colorOf(r) : PALETTE[i % PALETTE.length];
        const nm = String(r.name);
        s += '<text x="' + (padL - 8) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="end" font-size="12" fill="#666">' +
          esc(nmOf(r)) + '</text>';
        s += '<rect x="' + padL + '" y="' + (y + 4) + '" width="' + iw + '" height="' + (rowH - 12) + '" rx="3" fill="#F5F5F5"/>';
        s += '<rect x="' + padL + '" y="' + (y + 4) + '" width="' + bw.toFixed(1) + '" height="' + (rowH - 12) + '" rx="3" fill="' + color +
          '" opacity="0.86"' + tip('<b>' + esc(nm) + '</b><br/>' + (opt.valueLabel || '数值') + '：' + fmt(r.value, opt.digits) + (opt.unit || '')) + '/>';
        s += '<text x="' + (padL + iw + 8) + '" y="' + (y + rowH / 2 + 4) + '" font-size="12" fill="#333" font-weight="700">' +
          esc(fmt(r.value, opt.digits)) + esc(opt.unit || '') + '</text>';
      });
      s += '</svg>';
      render(el, s);
    });
  };

  /* ============================================================
     环状图（支持扇区点击）
     ============================================================ */
  D.donutChart = function (el, rows, opt) {
    opt = opt || {};
    autoRedraw(el, function () {
      const w = Math.max(220, el.clientWidth || 320);
      const h = opt.height || 220;
      const cx = opt.center === 'right' ? w * 0.72 : w / 2, cy = h / 2;
      const R = Math.min(cx - 10, h / 2 - 10);
      const r = R * (opt.hole || 0.62);
      const total = rows.reduce(function (a, x) { return a + x.value; }, 0) || 1;
      let a0 = -Math.PI / 2;
      let s = svgOpen(w, h);
      rows.forEach(function (row, i) {
        const sweep = row.value / total * Math.PI * 2;
        const a1 = a0 + sweep;
        const color = row.color || PALETTE[i % PALETTE.length];
        const attrs = ' fill="' + color + '" opacity="0.9"' +
          (opt.clickable ? ' data-donut="' + esc(row.key || row.name) + '" style="cursor:pointer"' : '') +
          tip('<b>' + esc(row.name) + '</b><br/>' + fmt(row.value, opt.digits) + (opt.unit || '') +
            '（' + (row.value / total * 100).toFixed(1) + '%）');
        /* 值为 0 的扇区不画（起止点重合会画出零面积路径） */
        if (sweep > 0.0001) {
          if (sweep >= Math.PI * 2 - 0.0001) {
            /* 单段占满整圆：SVG 的 A 命令在起止点重合时不绘制，必须用圆环描边 */
            s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2).toFixed(1) + '" fill="none" stroke="' +
              color + '" stroke-width="' + (R - r).toFixed(1) + '" opacity="0.9"' +
              (opt.clickable ? ' data-donut="' + esc(row.key || row.name) + '" style="cursor:pointer"' : '') +
              tip('<b>' + esc(row.name) + '</b><br/>' + fmt(row.value, opt.digits) + (opt.unit || '') + '（100.0%）') + '/>';
          } else {
            const large = sweep > Math.PI ? 1 : 0;
            const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
            const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
            const x2 = cx + r * Math.cos(a1), y2 = cy + r * Math.sin(a1);
            const x3 = cx + r * Math.cos(a0), y3 = cy + r * Math.sin(a0);
            s += '<path d="M' + x0.toFixed(1) + ',' + y0.toFixed(1) + ' A' + R + ',' + R + ' 0 ' + large + ' 1 ' +
              x1.toFixed(1) + ',' + y1.toFixed(1) + ' L' + x2.toFixed(1) + ',' + y2.toFixed(1) + ' A' + r + ',' + r +
              ' 0 ' + large + ' 0 ' + x3.toFixed(1) + ',' + y3.toFixed(1) + ' Z"' + attrs + '/>';
          }
        }
        a0 = a1;
      });
      if (opt.centerText) {
        s += '<text x="' + cx + '" y="' + (cy - 3) + '" text-anchor="middle" font-size="12" fill="#999">' + esc(opt.centerText) + '</text>';
        s += '<text x="' + cx + '" y="' + (cy + 19) + '" text-anchor="middle" font-size="18" font-weight="700" fill="#333">' + esc(opt.centerValue || '') + '</text>';
      }
      s += '</svg>';
      render(el, s);
    });
  };

  /* ============================================================
     漏斗
     ============================================================ */
  D.funnelChart = function (el, rows, opt) {
    opt = opt || {};
    autoRedraw(el, function () {
      const w = Math.max(300, el.clientWidth || 600);
      const h = opt.height || 150;
      const n = rows.length || 1;
      const gap = 8, bw = (w - gap * (n - 1)) / n;
      const max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
      let s = svgOpen(w, h);
      rows.forEach(function (r, i) {
        const x = i * (bw + gap);
        const bh = Math.max(6, r.value / max * (h - 46));
        const y = 28 + (h - 46 - bh);
        s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) +
          '" rx="3" fill="url(#funnelGrad)" opacity="0.9"' +
          tip('<b>' + esc(r.name) + '</b><br/>笔数：' + fmt(r.value, 0) + '<br/>转化：' + fmt(r.rate, 1) + '%') + '/>';
        s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="18" text-anchor="middle" font-size="12" fill="#666">' + esc(r.name) + '</text>';
        s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#008EE0">' + esc(fmt(r.value, 0)) + '</text>';
        s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="11" fill="#999">' + esc(fmt(r.rate, 1)) + '%</text>';
      });
      s = s.replace('<svg ', '<svg ><defs><linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#69C0FF"/><stop offset="100%" stop-color="#008EE0"/></linearGradient></defs>');
      s += '</svg>';
      render(el, s);
    });
  };

  /* ============================================================
     伸缩柱状（物料小类，默认前 N 可展开全量）
     ============================================================ */
  D.zoomBarChart = function (el, rows, opt) {
    opt = opt || {};
    autoRedraw(el, function () {
      const w = Math.max(320, el.clientWidth || 800);
      const h = opt.height || 240;
      const pad = { t: 20, r: 16, b: 60, l: 60 };
      const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
      const ticks = axisTicks(0, Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1])), 4);
      const vmax = ticks[ticks.length - 1];
      const Y = function (v) { return pad.t + ih - v / vmax * ih; };
      const band = iw / (rows.length || 1);
      let s = svgOpen(w, h);
      ticks.forEach(function (t) {
        s += '<line x1="' + pad.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + Y(t).toFixed(1) + '" stroke="#EEEEEE"/>';
        s += '<text x="' + (pad.l - 8) + '" y="' + (Y(t) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#999">' + esc(fmt(t, 0)) + '</text>';
      });
      rows.forEach(function (r, i) {
        const x = pad.l + band * i + band * 0.16;
        const bw = Math.max(3, band * 0.68);
        s += '<rect x="' + x.toFixed(1) + '" y="' + Y(r.value).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' +
          Math.max(1, pad.t + ih - Y(r.value)).toFixed(1) + '" rx="2" fill="#008EE0" opacity="0.85"' +
          tip('<b>' + esc(r.name) + '</b><br/>结算金额：' + fmt(r.value, 0) + ' 万元') + '/>';
        const lb = String(r.name).length > 5 ? String(r.name).slice(0, 5) + '…' : r.name;
        s += '<text transform="translate(' + (x + bw / 2).toFixed(1) + ',' + (h - 44) + ') rotate(-42)" text-anchor="end" font-size="11" fill="#666">' + esc(lb) + '</text>';
      });
      s += '</svg>';
      render(el, s);
    });
  };

  /* ============================================================
     简化地图热力（省份网格近似示意）
     ============================================================ */
  D.mapChart = function (el, rows, opt) {
    opt = opt || {};
    const CM = D.chinaMap;
    if (!CM) { render(el, ''); return; }
    const VB = CM.viewBox.split(' ');
    const VW = +VB[2], VH = +VB[3];

    autoRedraw(el, function () {
      const w = Math.max(320, el.clientWidth || 520);
      const h = opt.height || Math.round(w * VH / VW);
      /* 地图原始坐标（VW×VH）等比缩放到容器内，居中 */
      const k = Math.min(w / VW, h / VH) * (opt.zoom || 1);
      const tx = (w - VW * k) / 2, ty = (h - VH * k) / 2;
      const map = {};
      (rows || []).forEach(function (r) {
        map[r.name] = (map[r.name] || 0) + r.value;
      });
      const vals = Object.keys(map).map(function (m) { return map[m]; });
      const max = Math.max.apply(null, vals.concat([1]));
      const min = Math.min.apply(null, vals.concat([0]));

      let s = svgOpen(w, h);
      s += '<defs>' +
        '<filter id="scrMapGlow" x="-25%" y="-25%" width="150%" height="150%">' +
        '<feGaussianBlur stdDeviation="6" result="b"/>' +
        '<feMerge><feMergeNode in="b"/><feMergeNode in="b"/></feMerge></filter>' +
        '<linearGradient id="scrMapFill" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#2A4674"/><stop offset="100%" stop-color="#16294A"/></linearGradient>' +
        '</defs>';
      s += '<g transform="translate(' + tx.toFixed(1) + ',' + ty.toFixed(1) + ') scale(' + k.toFixed(4) + ')">';

      /* 底层：发光轮廓 */
      s += '<g filter="url(#scrMapGlow)" opacity="0.5">';
      CM.provinces.forEach(function (p) {
        s += '<path d="' + p.d + '" fill="#2E6FA8" stroke="none"/>';
      });
      s += '</g>';

      /* 省面（focus 指定时，其余省份压暗） */
      const focus = opt.focus || '';
      CM.provinces.forEach(function (p) {
        const v = map[p.short];
        let fill = 'url(#scrMapFill)';
        if (v) {
          const t = max === min ? 1 : (v - min) / (max - min);
          fill = 'rgba(46,140,220,' + (0.45 + t * 0.5).toFixed(2) + ')';
        }
        if (focus && p.short === focus) fill = 'rgba(46,160,240,0.95)';
        s += '<path d="' + p.d + '" fill="' + fill + '" stroke="' +
          (focus ? (p.short === focus ? '#BFEBFF' : '#3C6E9C') : '#7FD4FF') + '" stroke-width="' +
          (1 / k).toFixed(2) + '" stroke-linejoin="round" opacity="' + (focus && p.short !== focus ? 0.7 : 0.95) + '"' +
          tip('<b>' + esc(p.name) + '</b><br/>项目数：' + (v || 0) + ' 个') + '/>';
      });
      s += '</g>';

      /* 省名（画在缩放组外，字号固定为屏幕像素） */
      if (opt.labels !== false) {
        CM.provinces.forEach(function (p) {
          if (focus && p.short !== focus && opt.focusLabelsOnly) return;
          s += '<text x="' + (tx + p.cx * k).toFixed(1) + '" y="' + (ty + p.cy * k).toFixed(1) +
            '" text-anchor="middle" font-size="10" fill="rgba(190,220,245,0.85)" pointer-events="none">' +
            esc(p.short) + '</text>';
        });
      }

      /* 项目定位标签 */
      if (focus && opt.marker) {
        const f = CM.provinces.filter(function (p) { return p.short === focus; })[0];
        if (f) {
          const mx = tx + f.cx * k, my = ty + f.cy * k;
          const tw = Math.max(96, String(opt.marker).length * 11 + 16);
          s += '<rect x="' + (mx - tw / 2).toFixed(1) + '" y="' + (my - 9).toFixed(1) + '" width="' + tw +
            '" height="18" rx="2" fill="#2F80ED" stroke="#BFEBFF" stroke-width="1"/>' +
            '<text x="' + mx.toFixed(1) + '" y="' + (my + 4).toFixed(1) + '" text-anchor="middle" font-size="11" ' +
            'fill="#FFFFFF" pointer-events="none">' + esc(String(opt.marker).slice(0, 14)) + '</text>';
        }
      }
      s += '</svg>';
      render(el, s);
    });
  };

  /* ============================================================
     中国地图（浅色版，用于页面内的项目定位图）
     ============================================================ */
  /* 项目定位小地图：放大到项目所在省，并在图上标注项目名 */
  D.mapMini = function (el, opt) {
    opt = opt || {};
    const CM = D.chinaMap;
    if (!CM) { render(el, ''); return; }
    const VB = CM.viewBox.split(' ');
    const VW = +VB[2], VH = +VB[3];
    const focus = opt.focus || '';
    const fp = CM.provinces.filter(function (p) { return p.short === focus; })[0];

    autoRedraw(el, function () {
      const w = Math.max(180, el.clientWidth || 260);
      const h = Math.max(120, el.clientHeight || 200);

      /* 视窗：默认全国；命中项目所在省时放大到该省，省份约占视窗长边的 55% */
      let vx = 0, vy = 0, vw = VW, vh = VH;
      if (fp) {
        render(el, svgOpen(w, h) + '<g opacity="0"><path id="pjMiniBox" d="' + fp.d + '"/></g></svg>');
        const box = el.querySelector('#pjMiniBox');
        if (box && box.getBBox) {
          const bb = box.getBBox();
          const asp = w / h;
          vh = Math.max(bb.height / 0.55, 90);
          vw = vh * asp;
          if (bb.width / vw > 0.55) { vw = bb.width / 0.55; vh = vw / asp; }
          vx = bb.x + bb.width / 2 - vw / 2;
          vy = bb.y + bb.height / 2 - vh / 2;
        }
      }
      const k = Math.min(w / vw, h / vh);
      const tx = (w - vw * k) / 2 - vx * k, ty = (h - vh * k) / 2 - vy * k;
      const X = function (x) { return tx + x * k; };
      const Y = function (y) { return ty + y * k; };

      let s = svgOpen(w, h);
      s += '<g transform="translate(' + tx.toFixed(1) + ',' + ty.toFixed(1) + ') scale(' + k.toFixed(4) + ')">';
      CM.provinces.forEach(function (p) {
        const on = p.short === focus;
        s += '<path d="' + p.d + '" fill="' + (on ? '#DCEBFB' : '#F2F5F9') + '" stroke="' +
          (on ? '#7FB4E8' : '#C9D6E4') + '" stroke-width="' + (1.1 / k).toFixed(2) +
          '" stroke-linejoin="round"' + tip('<b>' + esc(p.name) + '</b>') + '/>';
      });
      s += '</g>';

      /* 邻省名：只画落在视窗内的，字号固定为屏幕像素 */
      CM.provinces.forEach(function (p) {
        if (p.short === focus) return;
        const px = X(p.cx), py = Y(p.cy);
        if (px < 8 || px > w - 8 || py < 12 || py > h - 8) return;
        s += '<text x="' + px.toFixed(1) + '" y="' + py.toFixed(1) + '" text-anchor="middle" font-size="10" ' +
          'fill="#9AA8B8" pointer-events="none">' + esc(p.short) + '</text>';
      });

      if (fp && opt.marker) {
        const mx = X(fp.cx), my = Y(fp.cy);
        const txt = String(opt.marker);
        const bw = Math.min(w - 8, txt.length * 10.6 + 14);
        let bx = mx + 8;
        if (bx + bw > w - 4) bx = Math.max(4, Math.min(mx - 8 - bw, w - 4 - bw));
        if (bx < 4) bx = 4;
        const cap = Math.max(1, Math.floor((bw - 14) / 10.6));
        const label = txt.length > cap ? txt.slice(0, cap - 1) + '…' : txt;
        s += '<line x1="' + mx.toFixed(1) + '" y1="' + my.toFixed(1) + '" x2="' + (bx > mx ? bx : bx + bw).toFixed(1) +
          '" y2="' + my.toFixed(1) + '" stroke="#2F80ED" stroke-width="1"/>';
        s += '<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="4" fill="#FFFFFF" stroke="#2F80ED" stroke-width="2"/>';
        s += '<rect x="' + bx.toFixed(1) + '" y="' + (my - 10).toFixed(1) + '" width="' + bw.toFixed(1) +
          '" height="20" rx="2" fill="#2F80ED"' + tip('<b>' + esc(txt) + '</b>') + '/>';
        s += '<text x="' + (bx + 7).toFixed(1) + '" y="' + (my + 4).toFixed(1) + '" font-size="11" fill="#FFFFFF" ' +
          'pointer-events="none">' + esc(label) + '</text>';
      }
      s += '</svg>';
      render(el, s);
    });
  };

  /* ============================================================
     大屏图表（深色主题）
     ============================================================ */
  D.screenLine = function (el, data, opt) {
    opt = opt || {};
    autoRedraw(el, function () {
      const w = Math.max(280, el.clientWidth || 480);
      const h = opt.height || 180;
      const pad = { t: 16, r: 12, b: 26, l: 44 };
      const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
      const all = data.series.reduce(function (a, s) { return a.concat(s.data); }, []);
      const ticks = axisTicks(Math.min.apply(null, all), Math.max.apply(null, all), 4);
      const vmin = ticks[0], vmax = ticks[ticks.length - 1];
      const X = function (i) { return pad.l + i * iw / Math.max(1, data.categories.length - 1); };
      const Y = function (v) { return pad.t + ih - (v - vmin) / (vmax - vmin || 1) * ih; };
      let s = svgOpen(w, h);
      ticks.forEach(function (t) {
        s += '<line x1="' + pad.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + Y(t).toFixed(1) + '" stroke="rgba(129,211,248,0.14)"/>';
        s += '<text x="' + (pad.l - 6) + '" y="' + (Y(t) + 4).toFixed(1) + '" text-anchor="end" font-size="10" fill="rgba(178,225,240,0.6)">' + esc(fmt(t, 0)) + '</text>';
      });
      const step = Math.ceil(data.categories.length / 8);
      data.categories.forEach(function (c, i) {
        if (i % step) return;
        s += '<text x="' + X(i).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="10" fill="rgba(178,225,240,0.6)">' + esc(c) + '</text>';
      });
      data.series.forEach(function (se, si) {
        const color = se.color || (si ? '#F59A23' : '#00E5FF');
        const pts = se.data.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ');
        s += '<polygon points="' + pad.l + ',' + (pad.t + ih) + ' ' + pts + ' ' + (w - pad.r) + ',' + (pad.t + ih) + '" fill="' + color + '" opacity="0.12"/>';
        s += '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2"/>';
        se.data.forEach(function (v, i) {
          s += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3" fill="#010A13" stroke="' + color + '" stroke-width="2"' +
            tip('<b>' + esc(data.categories[i]) + '</b><br/>' + esc(se.name) + '：' + fmt(v, opt.digits) + (opt.unit || '')) + '/>';
        });
      });
      s += '</svg>';
      render(el, s);
    });
  };

  D.barHTML = function (pct, variant) {
    const p = Math.max(0, Math.min(100, pct));
    return '<div class="dsc-progress"><div class="dsc-progress__bar' + (variant ? ' dsc-progress__bar--' + variant : '') +
      '" style="width:' + p.toFixed(1) + '%"></div></div>';
  };

  /* ============================================================
     截图基准配色（局驾驶舱）
     ============================================================ */
  D.C = {
    blue: '#2F80ED', green: '#34A853', orange: '#FB923C', red: '#EA4335',
    navy: '#1F4E79', line: '#D0021B', area: '#7FC8F1', areaLine: '#0093E5',
    series: ['#4285F4', '#34A853', '#1F4E79', '#FB923C', '#EA4335', '#9B51E0', '#2D9CDB']
  };

  /* ============================================================
     饼图（带引线与彩色标签）
     ============================================================ */
  D.pieChart = function (el, rows, opt) {
    opt = opt || {};
    autoRedraw(el, function () {
      const w = Math.max(300, el.clientWidth || 420);
      const h = opt.height || 300;
      const total = rows.reduce(function (a, r) { return a + (r.value || 0); }, 0) || 1;
      const cx = w * (opt.cx || 0.46), cy = h / 2;
      /* 两侧各留 110px 放标签 */
      const R = Math.max(50, Math.min(cx - 110, w - cx - 110, h / 2 - 14, opt.r || 999));
      const inner = opt.hole ? R * opt.hole : 0;
      const P = function (a, rr) { return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; };
      let a0 = -Math.PI / 2;
      let s = svgOpen(w, h);
      const labels = { left: [], right: [] };
      rows.forEach(function (r, i) {
        const frac = (r.value || 0) / total;
        const a1 = a0 + frac * Math.PI * 2;
        const color = r.color || D.C.series[i % D.C.series.length];
        const large = (a1 - a0) > Math.PI ? 1 : 0;
        const p0 = P(a0, R), p1 = P(a1, R);
        const tipTxt = tip('<b>' + esc(r.name) + '</b><br/>' + fmt(r.value, opt.digits) + (opt.unit || '') +
          '（' + (frac * 100).toFixed(2) + '%）');
        if (inner) {
          const q0 = P(a1, inner), q1 = P(a0, inner);
          s += '<path d="M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) +
            ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) +
            ' L' + q0[0].toFixed(1) + ' ' + q0[1].toFixed(1) + ' A' + inner + ' ' + inner + ' 0 ' + large + ' 0 ' +
            q1[0].toFixed(1) + ' ' + q1[1].toFixed(1) + ' Z" fill="' + color + '" stroke="#FFF" stroke-width="1.5"' + tipTxt + '/>';
        } else {
          s += '<path d="M' + cx + ' ' + cy + ' L' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) +
            ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) +
            ' Z" fill="' + color + '" stroke="#FFF" stroke-width="1.5"' + tipTxt + '/>';
        }
        /* 引线 + 标签（先收集，最后统一做纵向去重叠） */
        const am = (a0 + a1) / 2;
        const e0 = P(am, R + 2), e1 = P(am, R + 16);
        labels[Math.cos(am) >= 0 ? 'right' : 'left'].push({
          color: color, name: r.name, frac: frac, value: r.value,
          ax: e0[0], ay: e0[1], ly: e1[1], side: Math.cos(am) >= 0 ? 'right' : 'left'
        });
        a0 = a1;
      });
      /* 两侧标签各自按 y 排序后强制最小间距，再画引线与文字 */
      ['left', 'right'].forEach(function (side) {
        const list = labels[side].sort(function (a, b) { return a.ly - b.ly; });
        const gap = 30, top = 16, bottom = h - 16;
        let prev = -1e9;
        list.forEach(function (L) {
          L.ly = Math.max(L.ly, prev + gap, top);
          prev = L.ly;
        });
        /* 底部越界则整体上推 */
        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i].ly > bottom) list[i].ly = bottom - (list.length - 1 - i) * gap;
          else break;
        }
        list.forEach(function (L) {
          /* 文字紧贴饼图两侧排布：左列右对齐、右列左对齐，避免浪费画布宽度 */
          const tx = side === 'right' ? cx + R + 8 : cx - R - 8;
          const anchor = side === 'right' ? 'start' : 'end';
          const elbow = side === 'right' ? tx - 6 : tx + 6;
          s += '<polyline points="' + L.ax.toFixed(1) + ',' + L.ay.toFixed(1) + ' ' + elbow + ',' + L.ly.toFixed(1) +
            ' ' + tx + ',' + L.ly.toFixed(1) + '" fill="none" stroke="' + L.color + '" stroke-width="1"/>';
          s += '<text x="' + tx + '" y="' + (L.ly - 3).toFixed(1) + '" text-anchor="' + anchor + '" font-size="11" fill="' +
            L.color + '">' + esc(L.name) + '</text>';
          s += '<text x="' + tx + '" y="' + (L.ly + 11).toFixed(1) + '" text-anchor="' + anchor + '" font-size="11" fill="' +
            L.color + '">' + (L.frac * 100).toFixed(2) + '% (' + fmt(L.value, opt.digits) + (opt.unit || '') + ')</text>';
        });
      });
      s += '</svg>';
      render(el, s);
    });
  };

  /* ============================================================
     分组柱 + 折线（双轴，带数据标签）
     series: [{name, data, type:'bar'|'line', color, color2, axis:'left'|'right', unit}]
     ============================================================ */
  D.comboChart = function (el, data, opt) {
    opt = opt || {};
    autoRedraw(el, function () {
      const w = Math.max(360, el.clientWidth || 900);
      const rotate = opt.rotateX || 0;
      const h = opt.height || 300;
      const bars = data.series.filter(function (s) { return s.type !== 'line'; });
      const lines = data.series.filter(function (s) { return s.type === 'line'; });
      const left = bars.filter(function (s) { return s.axis !== 'right'; });
      const right = bars.filter(function (s) { return s.axis === 'right'; });
      /* 右轴量程要同时看「右轴柱」和「右轴折线」：此前只看右轴柱，
         若折线单独用右轴（如 资产周转情况的周转次数线）→ rmax 回落为 1，
         所有 >1 的点 Y 坐标为负 → 越出 viewBox，再叠加 .dsc-chart svg{overflow:visible}
         就被原样画到整页上（斜穿页签条与区块标题） */
      const rightLines = lines.filter(function (s) { return s.axis === 'right'; });
      function ext(list) {
        const v = list.reduce(function (a, s) {
          return a.concat(s.data.filter(function (x) { return x != null; }));
        }, []);
        return v.length ? Math.max.apply(null, v) : 1;
      }
      const tL = axisTicks(0, ext(left.length ? left : bars), 5);
      const rightPool = right.length ? right : rightLines;
      const tR = rightPool.length ? axisTicks(0, ext(rightPool), 5) : null;
      /* 刻度文字的预留宽度按「实际最长的一条」算：右轴刻度从 w-pad.r+8 起画、左轴刻度在 pad.l-8 处右对齐，
         pad 小于文字宽度时文字会落到 viewBox 之外（svg{overflow:visible} 会把它画到整页上） */
      const chars = function (list, digits, unit) {
        return list.reduce(function (a, t) {
          return Math.max(a, textW(fmt(t, digits) + (unit || '')));
        }, 0);
      };
      const y1w = chars(tL, opt.yDigits == null ? 0 : opt.yDigits, opt.yUnit);
      const y2w = tR ? chars(tR, 0, opt.y2Unit) : 0;
      const pad = { t: opt.padT == null ? 26 : opt.padT,
        r: Math.max(opt.padR || 46, y2w ? 12 + y2w : 0),
        b: opt.padB || (rotate ? 74 : 40),
        l: Math.max(opt.padL || 52, 14 + y1w) };
      const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
      const lmax = tL[tL.length - 1] || 1, rmax = tR ? tR[tR.length - 1] || 1 : 1;
      const YL = function (v) { return pad.t + ih - (v / lmax) * ih; };
      const YR = function (v) { return pad.t + ih - (v / rmax) * ih; };
      const n = data.categories.length;
      const band = iw / n;
      const gw = Math.min(band * 0.6, 26 * bars.length);
      const bw = bars.length ? gw / bars.length : 0;
      const showLabel = opt.dataLabels !== false;
      let s = svgOpen(w, h);
      tL.forEach(function (t) {
        s += '<line x1="' + pad.l + '" y1="' + YL(t).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + YL(t).toFixed(1) +
          '" stroke="#EEF1F5"/>';
        s += '<text x="' + (pad.l - 8) + '" y="' + (YL(t) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#999">' +
          esc(fmt(t, opt.yDigits == null ? 0 : opt.yDigits)) + esc(opt.yUnit || '') + '</text>';
      });
      if (tR) {
        /* 右轴刻度小数位可指定：右轴挂的是比率（如 1.32 次 / 8.31%）时固定 0 位会全被四舍五入成 0、1、2 */
        const rDig = opt.rDigits == null ? (rmax < 10 ? 1 : 0) : opt.rDigits;
        tR.forEach(function (t) {
          s += '<text x="' + (w - pad.r + 8) + '" y="' + (YR(t) + 4).toFixed(1) + '" font-size="11" fill="#999">' +
            esc(fmt(t, rDig)) + esc(opt.y2Unit || '') + '</text>';
        });
      }
      data.categories.forEach(function (c, i) {
        const cx2 = pad.l + band * i + band / 2;
        bars.forEach(function (se, si) {
          const v = se.data[i];
          if (v == null) return;
          const Y = se.axis === 'right' ? YR : YL;
          const x = cx2 - gw / 2 + bw * si;
          const y = Y(v);
          const gid = 'cgb' + i + '_' + si;
          s += '<defs><linearGradient id="' + gid + '" x1="0" y1="1" x2="0" y2="0">' +
            '<stop offset="0%" stop-color="' + (se.color || D.C.blue) + '"/>' +
            '<stop offset="100%" stop-color="' + (se.color2 || se.color || D.C.blue) + '"/></linearGradient></defs>';
          s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(3, bw - 4).toFixed(1) +
            '" height="' + Math.max(1, pad.t + ih - y).toFixed(1) + '" rx="1.5" fill="url(#' + gid + ')"' +
            tip('<b>' + esc(c) + '</b><br/>' + esc(se.name) + '：' + fmt(v, opt.yDigits) + esc(se.unit || '')) + '/>';
          if (showLabel && v > 0) {
            /* 默认对 ≥10000 的数值自动折成「万」；但若轴本身就是「万元」，
               再折一次会出现「1.89万」（= 18,900 万元）这种反直觉读数 → barLabelRaw 关掉换算 */
            const lbl = opt.barLabelRaw ? fmt(v, opt.yDigits == null ? (v >= 100 ? 0 : 2) : opt.yDigits)
              : (v >= 10000 ? fmt(v / 10000, 2) + '万' : fmt(v, v >= 100 ? 0 : 2));
            s += '<text x="' + (x + Math.max(3, bw - 4) / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) +
              '" text-anchor="middle" font-size="10" fill="#333">' + esc(lbl) + '</text>';
          }
        });
        if (rotate) {
          s += '<text x="' + cx2.toFixed(1) + '" y="' + (pad.t + ih + 12).toFixed(1) + '" text-anchor="end" font-size="11" fill="#666" ' +
            'transform="rotate(-' + rotate + ' ' + cx2.toFixed(1) + ' ' + (pad.t + ih + 12) + ')">' +
            esc(String(c).slice(0, 14)) + '</text>';
        } else {
          s += '<text x="' + cx2.toFixed(1) + '" y="' + (h - 14) + '" text-anchor="middle" font-size="11" fill="#666">' +
            esc(String(c)) + '</text>';
        }
      });
      lines.forEach(function (se) {
        const color = se.color || D.C.line;
        const vals = se.data.filter(function (v) { return v != null; });
        const lmin = Math.min.apply(null, vals), lmax = Math.max.apply(null, vals);
        /* 均价线默认用独立标尺，映射到绘图区下沿窄带（对齐截图观感），
           避免与左侧金额柱共轴时数值量级差异过大而溢出画布 */
        const YL2 = function (v) {
          let yy;
          if (se.axis === 'right') yy = YR(v);
          else {
            const t = (v - lmin) / ((lmax - lmin) || 1);
            yy = pad.t + ih * (0.94 - t * 0.20);
          }
          /* 兜底夹取：任何折线点都不允许落到绘图区外（越界会被画到整页上） */
          return Math.max(pad.t - 1, Math.min(pad.t + ih + 1, yy));
        };
        const pts = se.data.map(function (v, i) {
          return (pad.l + band * i + band / 2).toFixed(1) + ',' + YL2(v).toFixed(1);
        }).join(' ');
        s += '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.6"/>';
        se.data.forEach(function (v, i) {
          const x = pad.l + band * i + band / 2, y = YL2(v);
          s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3" fill="' + color + '"' +
            tip('<b>' + esc(data.categories[i]) + '</b><br/>' + esc(se.name) + '：' + fmt(v, 2)) + '/>';
          if (showLabel && i % (opt.lineLabelEvery || 1) === 0) {
            s += '<text x="' + x.toFixed(1) + '" y="' + (y + 15).toFixed(1) + '" text-anchor="middle" font-size="10" fill="' +
              color + '">' + esc(fmt(v, v >= 100 ? 0 : 2)) + esc(opt.lineLabelUnit || '') + '</text>';
          }
        });
      });
      s += '</svg>';
      render(el, s);
    });
  };

  /* ============================================================
     迷你面积图（招采分析阶段卡）
     ============================================================ */
  D.areaMini = function (el, values, opt) {
    opt = opt || {};
    autoRedraw(el, function () {
      const w = Math.max(120, el.clientWidth || 220);
      const h = opt.height || 96;
      const pad = { t: 8, r: 8, b: 20, l: 32 };
      const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
      const max = Math.max.apply(null, values.concat([1])) * 1.08;
      const n = values.length;
      const X = function (i) { return pad.l + (n <= 1 ? iw / 2 : i * iw / (n - 1)); };
      const Y = function (v) { return pad.t + ih - v / max * ih; };
      const pts = values.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ');
      let s = svgOpen(w, h);
      [0, max / 2, max].forEach(function (t) {
        s += '<line x1="' + pad.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + Y(t).toFixed(1) +
          '" stroke="#EEF1F5"/>';
        s += '<text x="' + (pad.l - 5) + '" y="' + (Y(t) + 3.5).toFixed(1) + '" text-anchor="end" font-size="9" fill="#999">' +
          esc(fmt(t, max < 10 ? 1 : 0)) + '</text>';
      });
      s += '<polygon points="' + pad.l + ',' + (pad.t + ih) + ' ' + pts + ' ' + (w - pad.r) + ',' + (pad.t + ih) +
        '" fill="' + (opt.fill || D.C.area) + '" opacity="0.9"/>';
      s += '<polyline points="' + pts + '" fill="none" stroke="' + (opt.color || D.C.areaLine) + '" stroke-width="1.2"/>';
      /* 分类标签只有 3 个（首/中/末），按分类位数摊开画，不能复用 X(i)——
         X 按数据点个数等分，两者个数不同会把标签挤在一起并溢出右边界 */
      const cats = opt.categories || [];
      if (cats.length) {
        const ANCHOR = ['start', 'middle', 'end'];
        [0, Math.floor((cats.length - 1) / 2), cats.length - 1].forEach(function (k, j) {
          if (cats[k] == null) return;
          const x = pad.l + (cats.length <= 1 ? iw / 2 : k * iw / (cats.length - 1));
          s += '<text x="' + x.toFixed(1) + '" y="' + (h - 5) + '" text-anchor="' + ANCHOR[j] +
            '" font-size="9" fill="#999">' + esc(cats[k]) + '</text>';
        });
      }
      s += '</svg>';
      render(el, s);
    });
  };

  /* ============================================================
     小环图（物资小类卡：灰色轨道 + 蓝色弧 + 中心百分比）
     ============================================================ */
  D.ringChart = function (el, pct, opt) {
    opt = opt || {};
    autoRedraw(el, function () {
      const size = opt.size || 100;
      const cx = size / 2, cy = size / 2, R = size / 2 - 8, r = R - 9;
      const a1 = -Math.PI / 2 + Math.max(0, Math.min(100, pct)) / 100 * Math.PI * 2;
      const P = function (a, rr) { return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; };
      const p0 = P(-Math.PI / 2, R), p1 = P(a1, R), p2 = P(a1, r), p3 = P(-Math.PI / 2, r);
      const large = pct > 50 ? 1 : 0;
      const col = opt.color || D.C.areaLine;
      let s = svgOpen(size, size);
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2) + '" fill="none" stroke="#E4EAF2" stroke-width="' +
        (R - r) + '"/>';
      s += '<path d="M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' +
        p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' L' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) +
        ' A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + p3[0].toFixed(1) + ' ' + p3[1].toFixed(1) + ' Z" fill="' + col + '"/>';
      s += '<text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" font-size="15" font-weight="700" fill="' + col +
        '">' + pct.toFixed(2) + '%</text>';
      s += '</svg>';
      render(el, s);
    });
  };

  D.PALETTE = PALETTE;
})(window.APP);
