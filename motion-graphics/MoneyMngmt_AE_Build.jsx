/*
 * MoneyMngmt — After Effects auto-build script
 * ------------------------------------------------------------------
 * Rebuilds the "MoneyMngmt" animated UI promo as an editable 20 s
 * composition (1920x1080, 30 fps) inside After Effects.
 *
 * HOW TO RUN
 *   1. Open After Effects.
 *   2. File > Scripts > Run Script File...  and pick this file.
 *      (or drop it in <user>/ScriptUI Panels)
 *   3. It creates the comp + assets, saves "MoneyMngmt_Promo.aep"
 *      next to this script, and queues an H.264 render.
 *
 * NOTE: authored to mirror motion-graphics/promo.swift (the renderer
 * used to produce MoneyMngmt_Promo.mp4). It runs only where AE's
 * ExtendScript file access works correctly.
 */

#target aftereffects

(function moneyMngmt() {
  var COMP_NAME = "MoneyMngmt_Promo";
  var W = 1920, H = 1080, FPS = 30, DUR = 20.0;

  // ---- palette (0..1 RGB, matches the website) ----
  function c(hex) {
    return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
  }
  var NAVY950 = c(0x11162b), NAVY900 = c(0x1e2645), NAVY700 = c(0x3d4d87),
      NAVY600 = c(0x4a60a6), NAVY300 = c(0xaebce0), NAVY100 = c(0xe9edf7),
      SLATE100 = c(0xf1f5f9), SLATE200 = c(0xe2e8f0), SLATE400 = c(0x94a3b8),
      SLATE500 = c(0x64748b), WHITE = c(0xffffff),
      GREEN = c(0x16a34a), GREENL = c(0xdcfce7), RED = c(0xdc2626),
      REDL = c(0xfee2e2), AMBER = c(0xf59e0b), PURPLE = c(0x7c3aed);

  var FONT = "HelveticaNeue-Bold";

  function pos(t) { return new KeyframeEase(0, 66); }

  function easeAll(prop) {
    try {
      for (var i = 1; i <= prop.numKeys; i++)
        prop.setInterpolationTypeAtKey(i, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    } catch (e) {}
  }

  function kv(prop, time, value) { prop.setValueAtTime(time, value); }

  // ---- shape helpers ----
  function shapeLayer(comp, name) {
    var l = comp.layers.addShape();
    l.name = name;
    l.property("Transform").property("Anchor Point").setValue([0, 0]);
    return l;
  }
  function addFill(contents, col, opacity) {
    var f = contents.addProperty("ADBE Vector Graphic - Fill");
    f.property("Color").setValue(col);
    f.property("Opacity").setValue(opacity === undefined ? 100 : opacity);
    return f;
  }
  function rect(comp, name, x, y, w, h, round, col, op) {
    var l = shapeLayer(comp, name);
    var g = l.property("Contents").addProperty("ADBE Vector Group");
    var gc = g.property("Contents");
    var r = gc.addProperty("ADBE Vector Shape - Rect");
    r.property("Size").setValue([w, h]);
    r.property("Position").setValue([0, 0]);
    if (round > 0) r.property("Roundness").setValue(round);
    addFill(gc, col, op);
    l.property("Transform").property("Position").setValue([x, y]);
    return l;
  }
  function ell(comp, name, x, y, rx, ry, col, op) {
    var l = shapeLayer(comp, name);
    var g = l.property("Contents").addProperty("ADBE Vector Group");
    var gc = g.property("Contents");
    var e = gc.addProperty("ADBE Vector Shape - Ellipse");
    e.property("Size").setValue([rx * 2, ry * 2]);
    e.property("Position").setValue([0, 0]);
    addFill(gc, col, op);
    l.property("Transform").property("Position").setValue([x, y]);
    return l;
  }
  function poly(comp, name, pts, col, width, closed) {
    var s = new Shape();
    s.vertices = pts;
    s.closed = !!closed;
    var l = shapeLayer(comp, name);
    var g = l.property("Contents").addProperty("ADBE Vector Group");
    var gc = g.property("Contents");
    var pg = gc.addProperty("ADBE Vector Shape - Group");
    pg.property("Path").setValue(s);
    if (width > 0) {
      var st = gc.addProperty("ADBE Vector Graphic - Stroke");
      st.property("Color").setValue(col);
      st.property("Stroke Width").setValue(width);
      st.property("Line Cap").setValue(2);
      st.property("Line Join").setValue(2);
    } else { addFill(gc, col); }
    return l;
  }
  function wedgePath(cx, cy, r, a0, a1, n) {
    var v = [[cx, cy]];
    for (var i = 0; i <= n; i++) {
      var a = a0 + (a1 - a0) * (i / n);
      v.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return v;
  }
  function wedge(comp, name, cx, cy, r, a0, a1, n, col) {
    var s = new Shape();
    s.vertices = wedgePath(cx, cy, r, a0, a1, n);
    s.closed = true;
    var l = shapeLayer(comp, name);
    var g = l.property("Contents").addProperty("ADBE Vector Group");
    var gc = g.property("Contents");
    var pg = gc.addProperty("ADBE Vector Shape - Group");
    pg.property("Path").setValue(s);
    addFill(gc, col);
    l.property("Transform").property("Position").setValue([0, 0]);
    return pg.property("Path");
  }
  function txt(comp, s, size, col, x, y, justify, font) {
    var l = comp.layers.addText(s);
    var src = l.property("Source Text");
    var d = src.value;
    d.fontSize = size;
    d.fillColor = col;
    d.applyFill = true;
    d.justification = justify || ParagraphJustification.LEFT_JUSTIFY;
    try { if (font) d.font = font; } catch (e) {}
    src.setValue(d);
    l.property("Transform").property("Position").setValue([x, y]);
    return l;
  }
  function fadeIn(l, t0, dur) {
    var o = l.property("Transform").property("Opacity");
    kv(o, t0, 0); kv(o, t0 + dur, 100); easeAll(o);
  }
  function fadeOut(l, t0, dur) {
    var o = l.property("Transform").property("Opacity");
    kv(o, t0, 100); kv(o, t0 + dur, 0); easeAll(o);
  }
  function riseIn(l, t0, dur, dx, dy) {
    var p = l.property("Transform").property("Position");
    var end = p.value;
    kv(p, t0, [end[0] + dx, end[1] + dy]);
    kv(p, t0 + dur, end);
    easeAll(p);
    fadeIn(l, t0, dur);
  }
  function counter(l, prefix, value, t0, dur) {
    var eff = l.property("Effects").addProperty("ADBE Slider Control");
    var sl = eff.property("Slider");
    kv(sl, t0, 0); kv(sl, t0 + dur, value); easeAll(sl);
    var src = l.property("Source Text");
    src.expression =
      'var n=Math.round(effect("Slider Control")("Slider"));var s=""+n;var o="";var k=0;' +
      'for(var i=s.length-1;i>=0;i--){o=s.charAt(i)+o;k++;if(k%3===0&&i>0)o=","+o;}' +
      '"' + prefix + '"+o;';
    return l;
  }

  // ================= build =================
  app.beginUndoGroup("Build MoneyMngmt Promo");
  var proj = app.newProject();
  var comp = proj.items.addComp(COMP_NAME, W, H, 1, DUR, FPS);
  comp.openInViewer();

  // ---- background ----
  var bgLight = comp.layers.addSolid(SLATE100, "BG Light", W, H, 1);
  var bgNavy = comp.layers.addSolid(NAVY950, "BG Navy (intro)", W, H, 1);
  fadeOut(bgNavy, 4.6, 0.5);            // intro navy fades away

  // ================= INTRO =================
  var intro = [];
  var logo = rect(comp, "Logo Badge", 960, 400, 170, 170, 48, NAVY600);
  var arrow = poly(comp, "Logo Arrow", [[-40, 26], [-6, -4], [40, -34]], WHITE, 14, false);
  arrow.parent = logo; arrow.property("Transform").property("Position").setValue([960, 400]);
  var ring = ell(comp, "Ring", 960, 400, 165, 165, NAVY600, 0);
  var ringStroke = ring.property("Contents").property(1);
  // dashed ring stroke
  (function () {
    var g = ring.property("Contents").property(1);
    var st = g.addProperty("ADBE Vector Graphic - Stroke");
    st.property("Color").setValue(NAVY600);
    st.property("Stroke Width").setValue(2);
    st.property("Dashes").setValue(2);
    try { st.property("Dash").setValue(1); st.property("Gap").setValue(14); } catch (e) {}
  })();
  intro.push(logo, arrow, ring);
  var s = logo.property("Transform").property("Scale");
  kv(s, 0.15, [40, 40]); kv(s, 0.9, [100, 100]); easeAll(s);
  fadeIn(logo, 0.15, 0.6);
  fadeIn(arrow, 0.4, 0.6);
  fadeIn(ring, 0.2, 0.8);

  var title = txt(comp, "MoneyMngmt", 118, WHITE, 960, 545, ParagraphJustification.CENTER_JUSTIFY, FONT);
  txt(comp, "P E R S O N A L   M O N E Y   M A N A G E M E N T", 26, NAVY300, 960, 700, ParagraphJustification.CENTER_JUSTIFY);
  var tag = txt(comp, "Track • Budget • Save", 24, SLATE400, 960, 760, ParagraphJustification.CENTER_JUSTIFY);
  riseIn(title, 1.0, 0.9, 0, 40);
  var tagline = comp.layer("P E R S O N A L   M O N E Y   M A N A G E M E N T");
  riseIn(tagline, 1.9, 0.7, 0, 24);
  riseIn(tag, 2.4, 0.7, 0, 20);
  fadeOut(title, 4.4, 0.4); fadeOut(tagline, 4.4, 0.4); fadeOut(tag, 4.4, 0.4);
  fadeOut(logo, 4.4, 0.4); fadeOut(arrow, 4.4, 0.4); fadeOut(ring, 4.4, 0.4);

  // ================= DASHBOARD WINDOW =================
  var WIN_X = 200, WIN_Y = 120, WIN_W = 1520, WIN_H = 840;
  var win = rect(comp, "Window", WIN_X + WIN_W / 2, WIN_Y + WIN_H / 2, WIN_W, WIN_H, 26, WHITE);
  var ws = win.property("Transform").property("Scale");
  kv(ws, 5.0, [95, 95]); kv(ws, 5.55, [100, 100]); easeAll(ws);
  fadeIn(win, 5.0, 0.5);
  var topbar = rect(comp, "Top Bar", WIN_X + WIN_W / 2, WIN_Y + 30, WIN_W, 60, 0, SLATE100, 100);
  fadeIn(topbar, 5.0, 0.5);
  for (var di = 0; di < 3; di++) {
    var dc = [c(0xf87171), c(0xfbbf24), c(0x34d399)][di];
    fadeIn(ell(comp, "dot" + di, WIN_X + 34 + di * 26, WIN_Y + 30, 7, 7, dc), 5.1, 0.4);
  }
  fadeIn(txt(comp, "MoneyMngmt", 20, NAVY900, WIN_X + 120, WIN_Y + 30, ParagraphJustification.LEFT_JUSTIFY, FONT), 5.15, 0.4);
  fadeIn(txt(comp, "Overview", 20, SLATE400, WIN_X + 290, WIN_Y + 30, ParagraphJustification.LEFT_JUSTIFY), 5.2, 0.4);

  // ---- summary cards ----
  var labels = ["Total Balance", "Total Income", "Total Expenses", "Savings"];
  var values = [428650, 580000, 186350, 165000];
  var deltas = ["+12.4%", "+8.1%", "-3.2%", "+15.0%"];
  var accents = [NAVY600, GREEN, RED, PURPLE];
  var cw = 349, gap = 20, cx0 = 232, cy0 = 232;
  for (var i = 0; i < 4; i++) {
    var x = cx0 + i * (cw + gap), y = cy0;
    var card = rect(comp, "Card " + labels[i], x + cw / 2, y + 70, cw, 140, 20, WHITE);
    var accent = rect(comp, "Accent " + i, x + 3, y + 70, 6, 140, 3, accents[i]);
    var lab = txt(comp, labels[i], 21, SLATE500, x + 30, y + 36, ParagraphJustification.LEFT_JUSTIFY);
    var val = txt(comp, "₹0", 42, NAVY950, x + 30, y + 88, ParagraphJustification.LEFT_JUSTIFY, FONT);
    counter(val, "₹", values[i], 6.0 + i * 0.16, 0.9);
    var pill = rect(comp, "Pill " + i, x + cw - 72, y + 107, 96, 30, 15, values[i] > 0 && i !== 2 ? GREENL : REDL);
    var dl = txt(comp, deltas[i], 18, i === 2 ? RED : GREEN, x + cw - 72, y + 113, ParagraphJustification.CENTER_JUSTIFY, FONT);
    var grp = [card, accent, lab, val, pill, dl];
    for (var gi = 0; gi < grp.length; gi++) riseIn(grp[gi], 5.75 + i * 0.16, 0.55, 0, 26);
  }

  // ---- bar chart ----
  var BX = 232, BY = 392, BW = 900, BH = 320;
  var barCard = rect(comp, "Bar Chart", BX + BW / 2, BY + BH / 2, BW, BH, 20, WHITE);
  var barTitle = txt(comp, "Income vs Expenses", 24, NAVY900, BX + 28, BY + 40, ParagraphJustification.LEFT_JUSTIFY, FONT);
  var income = [52, 61, 48, 72, 58, 80], expense = [34, 41, 38, 45, 30, 42];
  var baseY = BY + BH - 48, chartH = 190, leftX = BX + 56, rightX = BX + BW - 32;
  var slot = (rightX - leftX) / 6, barW = 30;
  var barLayers = [barCard, barTitle];
  for (var m = 0; m < 6; m++) {
    var ccx = leftX + slot * (m + 0.5);
    var ih = chartH * income[m] / 100, eh = chartH * expense[m] / 100;
    var gb = rect(comp, "inc" + m, ccx - barW - 3, baseY - ih / 2, barW, ih, 6, GREEN);
    gb.property("Transform").property("Anchor Point").setValue([ccx - barW - 3, baseY]);
    gb.property("Transform").property("Position").setValue([ccx - barW - 3, baseY]);
    var rb = rect(comp, "exp" + m, ccx + 3, baseY - eh / 2, barW, eh, 6, RED);
    rb.property("Transform").property("Anchor Point").setValue([ccx + 3, baseY]);
    rb.property("Transform").property("Position").setValue([ccx + 3, baseY]);
    var gsc = gb.property("Transform").property("Scale");
    kv(gsc, 6.7 + m * 0.07, [100, 0]); kv(gsc, 7.25 + m * 0.07, [100, 100]); easeAll(gsc);
    var rsc = rb.property("Transform").property("Scale");
    kv(rsc, 6.7 + m * 0.07, [100, 0]); kv(rsc, 7.25 + m * 0.07, [100, 100]); easeAll(rsc);
    barLayers.push(gb, rb);
  }
  for (var b = 0; b < barLayers.length; b++) riseIn(barLayers[b], 6.3, 0.5, 0, 20);

  // ---- donut chart ----
  var DX = 1152, DY = 392, DW = 536, DH = 320;
  var donutCard = rect(comp, "Donut Card", DX + DW / 2, DY + DH / 2, DW, DH, 20, WHITE);
  var donutTitle = txt(comp, "Expenses by Category", 24, NAVY900, DX + 28, DY + 40, ParagraphJustification.LEFT_JUSTIFY, FONT);
  var slices = [["Food", 0.34, NAVY600], ["Rent", 0.27, GREEN], ["Transport", 0.21, RED], ["Other", 0.18, AMBER]];
  var dcx = DX + 150, dcy = DY + 190, drad = 88, N = 40;
  var cumA = -Math.PI / 2;
  var donutBits = [donutCard, donutTitle];
  for (var si = 0; si < slices.length; si++) {
    var frac = slices[si][1], a0 = cumA, a1 = cumA + frac * Math.PI * 2;
    var pathProp = wedge(comp, "Slice " + slices[si][0], dcx, dcy, drad, a0, a0, N, slices[si][2]);
    kv(pathProp, 9.3, wedgePath(dcx, dcy, drad, a0, a0, N));
    kv(pathProp, 10.6, wedgePath(dcx, dcy, drad, a0, a1, N));
    easeAll(pathProp);
    donutBits.push(comp.layer("Slice " + slices[si][0]));
    // legend
    donutBits.push(ell(comp, "lg" + si, DX + 300, DY + 84 + si * 52, 7, 7, slices[si][2]));
    donutBits.push(txt(comp, slices[si][0], 19, NAVY900, DX + 320, DY + 84 + si * 52, ParagraphJustification.LEFT_JUSTIFY));
    donutBits.push(txt(comp, Math.round(frac * 100) + "%", 19, SLATE500, DX + DW - 30, DY + 84 + si * 52, ParagraphJustification.RIGHT_JUSTIFY));
    cumA = a1;
  }
  donutBits.push(ell(comp, "Donut Hole", dcx, dcy, 46, 46, WHITE, 100));
  for (var db = 0; db < donutBits.length; db++) riseIn(donutBits[db], 9.3 + (db % 5) * 0.05, 0.5, 0, 18);

  // ---- transactions + budget ----
  var TX = 232, TY = 732, TW = 900, TH = 150;
  var txCard = rect(comp, "Transactions", TX + TW / 2, TY + TH / 2, TW, TH, 20, WHITE);
  var txTitle = txt(comp, "Recent Transactions", 22, NAVY900, TX + 28, TY + 34, ParagraphJustification.LEFT_JUSTIFY, FONT);
  var txRows = [["Freelance project", "+₹45,000", GREEN], ["Big Bazaar", "-₹3,240", RED],
                ["Monthly SIP", "-₹10,000", PURPLE], ["Rent", "-₹22,000", RED]];
  for (var r2 = 0; r2 < txRows.length; r2++) {
    riseIn(ell(comp, "tr" + r2, TX + 40, TY + 64 + r2 * 24, 9, 9, txRows[r2][2]), 13.5 + r2 * 0.1, 0.5, 40, 0);
    riseIn(txt(comp, txRows[r2][0], 18, NAVY900, TX + 60, TY + 64 + r2 * 24, ParagraphJustification.LEFT_JUSTIFY, FONT), 13.5 + r2 * 0.1, 0.5, 40, 0);
    riseIn(txt(comp, txRows[r2][1], 18, txRows[r2][2], TX + TW - 28, TY + 64 + r2 * 24, ParagraphJustification.RIGHT_JUSTIFY, FONT), 13.5 + r2 * 0.1, 0.5, 40, 0);
  }
  riseIn(txCard, 13.1, 0.5, 0, 20); riseIn(txTitle, 13.15, 0.5, 0, 20);

  var UX = 1152, UY = 732, UW = 536, UH = 150;
  var budCard = rect(comp, "Budget", UX + UW / 2, UY + UH / 2, UW, UH, 20, WHITE);
  var budTitle = txt(comp, "Monthly Budget", 22, NAVY900, UX + 28, UY + 34, ParagraphJustification.LEFT_JUSTIFY, FONT);
  var budVal = txt(comp, "₹2,15,000 / ₹2,50,000", 20, NAVY900, UX + 28, UY + 68, ParagraphJustification.LEFT_JUSTIFY, FONT);
  var track = rect(comp, "Budget Track", UX + 28, UY + 107, UW - 56, 14, 7, SLATE200);
  var fillb = rect(comp, "Budget Fill", UX + 28, UY + 107, UW - 56, 14, 7, NAVY600);
  fillb.property("Transform").property("Anchor Point").setValue([UX + 28, UY + 107]);
  fillb.property("Transform").property("Position").setValue([UX + 28, UY + 107]);
  fillb.property("Transform").property("Scale").setValue([86, 100]);
  var fillScale = fillb.property("Transform").property("Scale");
  kv(fillScale, 13.9, [0, 100]); kv(fillScale, 15.1, [86, 100]); easeAll(fillScale);
  // turn amber near the end
  try {
    var fc = fillb.property("Contents").property(1).property("Color");
    kv(fc, 14.6, NAVY600); kv(fc, 14.75, AMBER);
  } catch (e) {}
  var budBits = [budCard, budTitle, budVal, track, fillb];
  for (var ub = 0; ub < budBits.length; ub++) riseIn(budBits[ub], 13.1, 0.5, 0, 20);

  // ================= OUTRO =================
  var outroBg = comp.layers.addSolid(NAVY950, "Outro BG", W, H, 1);
  kv(outroBg.property("Transform").property("Opacity"), 15.8, 0); kv(outroBg.property("Transform").property("Opacity"), 16.4, 95);
  var oLogo = rect(comp, "Outro Logo", 960, 430, 180, 180, 50, NAVY600);
  riseIn(oLogo, 16.2, 0.8, 0, 30);
  var oTitle = txt(comp, "MoneyMngmt", 104, WHITE, 960, 600, ParagraphJustification.CENTER_JUSTIFY, FONT);
  riseIn(oTitle, 16.6, 0.7, 0, 30);
  riseIn(txt(comp, "Money Mngmt, without the spreadsheet pain.", 30, NAVY300, 960, 710, ParagraphJustification.CENTER_JUSTIFY), 17.0, 0.6, 0, 20);
  var words = ["Track", "Budget", "Save"];
  var wx = 660;
  for (var wi = 0; wi < words.length; wi++) {
    var pw = 150;
    riseIn(rect(comp, "w" + wi, wx + pw / 2, 806, pw, 52, 26, NAVY600, 30), 17.4 + wi * 0.16, 0.5, 0, 16);
    riseIn(txt(comp, words[wi], 26, GREENL, wx + pw / 2, 806, ParagraphJustification.CENTER_JUSTIFY, FONT), 17.4 + wi * 0.16, 0.5, 0, 16);
    wx += pw + 18;
  }
  riseIn(txt(comp, "Next.js · Google Sheets · Recharts", 22, SLATE500, 960, 900, ParagraphJustification.CENTER_JUSTIFY), 18.2, 0.6, 0, 16);

  // ================= SAVE + QUEUE =================
  var here = new File($.fileName).parent;
  var aep = new File(here.fsName + "/MoneyMngmt_Promo.aep");
  proj.save(aep);

  try {
    var rq = proj.renderQueue;
    var item = rq.items.add(comp);
    item.outputModule(1).file = new File(here.fsName + "/MoneyMngmt_Promo.mp4");
    rq.render();
  } catch (e) {}

  app.endUndoGroup();
  alert("MoneyMngmt promo built.\nSaved to:\n" + aep.fsName);
})();
