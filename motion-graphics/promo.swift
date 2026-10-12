import AVFoundation
import CoreGraphics
import CoreText
import Foundation

// ============================================================
//  MoneyMngmt — animated UI promo renderer (CoreGraphics + AVFoundation)
//  Output: H.264 MP4, 1920x1080, 30 fps, ~20 s
// ============================================================

let W = 1920, H = 1080, FPS = 30, DUR_S = 20.0
let FRAMES = Int(Double(FPS) * DUR_S)

let outPath: String = CommandLine.arguments.count > 1
    ? CommandLine.arguments[1]
    : "/Users/najiyanasri/money mngmt 2/motion-graphics/MoneyMngmt_Promo.mp4"

// ---- palette (matches tailwind.config.ts) ----
func hx(_ v: UInt32, _ a: CGFloat = 1) -> CGColor {
    return CGColor(red: CGFloat((v >> 16) & 0xFF) / 255.0,
                   green: CGFloat((v >> 8) & 0xFF) / 255.0,
                   blue: CGFloat(v & 0xFF) / 255.0, alpha: a)
}
let navy950 = hx(0x11162b), navy900 = hx(0x1e2645), navy800 = hx(0x354170)
let navy700 = hx(0x3d4d87), navy600 = hx(0x4a60a6), navy500 = hx(0x5f79bb)
let navy300 = hx(0xaebce0), navy100 = hx(0xe9edf7), navy50 = hx(0xf4f6fb)
let slate50 = hx(0xf8fafc), slate100 = hx(0xf1f5f9), slate200 = hx(0xe2e8f0)
let slate300 = hx(0xcbd5e1), slate400 = hx(0x94a3b8), slate500 = hx(0x64748b)
let white = hx(0xffffff)
let green = hx(0x16a34a), greenLight = hx(0xdcfce7)
let red = hx(0xdc2626), redLight = hx(0xfee2e2)
let amber = hx(0xf59e0b), amberLight = hx(0xfef3c7)
let purple = hx(0x7c3aed), purpleLight = hx(0xede9fe)

// ---- math helpers ----
func clamp(_ x: Double, _ a: Double = 0, _ b: Double = 1) -> Double { min(max(x, a), b) }
func lerp(_ a: Double, _ b: Double, _ t: Double) -> Double { a + (b - a) * t }
func easeOutCubic(_ x: Double) -> Double { 1 - pow(1 - x, 3) }
func easeInOutCubic(_ x: Double) -> Double { x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2 }
func easeOutBack(_ x: Double) -> Double { let c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2) }
func seg(_ t: Double, _ s: Double, _ d: Double) -> Double { clamp((t - s) / d) }

func fmt(_ n: Int) -> String {   // Indian digit grouping: 428650 -> 4,28,650
    let neg = n < 0
    var s = String(abs(n))
    var res: String
    if s.count > 3 {
        let last3 = String(s.suffix(3))
        s = String(s.dropLast(3))
        var groups: [String] = []
        while s.count > 2 { groups.insert(String(s.suffix(2)), at: 0); s = String(s.dropLast(2)) }
        if !s.isEmpty { groups.insert(s, at: 0) }
        res = groups.joined(separator: ",") + "," + last3
    } else { res = s }
    return (neg ? "-" : "") + res
}

// ---- geometry (top-left origin -> CoreGraphics bottom-left) ----
func R(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> CGRect {
    return CGRect(x: x, y: CGFloat(H) - y - h, width: w, height: h)
}
func rrect(_ ctx: CGContext, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ r: CGFloat) {
    let cr = min(r, min(w, h) / 2)
    ctx.addPath(CGPath(roundedRect: R(x, y, w, h), cornerWidth: cr, cornerHeight: cr, transform: nil))
}
func fillRR(_ ctx: CGContext, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ r: CGFloat, _ c: CGColor) {
    ctx.saveGState(); ctx.setFillColor(c); rrect(ctx, x, y, w, h, r); ctx.fillPath(); ctx.restoreGState()
}
func ellipse(_ ctx: CGContext, _ cx: CGFloat, _ cy: CGFloat, _ rx: CGFloat, _ ry: CGFloat, _ c: CGColor) {
    ctx.saveGState(); ctx.setFillColor(c)
    ctx.fillEllipse(in: CGRect(x: cx - rx, y: CGFloat(H) - cy - ry, width: rx * 2, height: ry * 2))
    ctx.restoreGState()
}

// ---- text ----
enum Al { case left, center, right }
func fontFor(_ size: CGFloat, _ weight: Int) -> CTFont {
    let name: String
    switch weight {
    case 0: name = "HelveticaNeue"
    case 1: name = "HelveticaNeue-Medium"
    case 2: name = "HelveticaNeue-Bold"
    case 3: name = "HelveticaNeue-Bold"
    default: name = "HelveticaNeue-CondensedBlack"
    }
    return CTFontCreateWithName(name as CFString, size, nil)
}
func makeLine(_ s: String, _ font: CTFont, _ color: CGColor, _ tracking: CGFloat) -> (CTLine, CGFloat, CGFloat) {
    var attrs: [CFString: Any] = [kCTFontAttributeName: font, kCTForegroundColorAttributeName: color]
    if tracking != 0 { attrs[kCTKernAttributeName] = tracking }
    let a = CFAttributedStringCreate(nil, s as CFString, attrs as CFDictionary)!
    let line = CTLineCreateWithAttributedString(a)
    var asc: CGFloat = 0, desc: CGFloat = 0, lead: CGFloat = 0
    let w = CGFloat(CTLineGetTypographicBounds(line, &asc, &desc, &lead))
    return (line, w, asc)
}
@discardableResult
func text(_ ctx: CGContext, _ s: String, _ size: CGFloat, _ weight: Int, _ color: CGColor,
          x: CGFloat, top: CGFloat, align: Al = .left, tracking: CGFloat = 0, alpha: CGFloat = 1) -> CGFloat {
    if alpha <= 0.002 || s.isEmpty { return 0 }
    let font = fontFor(size, weight)
    let (line, w, asc) = makeLine(s, font, color, tracking)
    var dx = x
    switch align { case .left: break; case .center: dx = x - w / 2; case .right: dx = x - w }
    ctx.saveGState()
    if alpha < 1 { ctx.setAlpha(alpha) }
    ctx.textPosition = CGPoint(x: dx, y: CGFloat(H) - top - asc)
    CTLineDraw(line, ctx)
    ctx.restoreGState()
    return w
}
func textWidth(_ s: String, _ size: CGFloat, _ weight: Int, _ tracking: CGFloat = 0) -> CGFloat {
    let (_, w, _) = makeLine(s, fontFor(size, weight), white, tracking); return w
}

// ---- partial polyline stroke (for line-chart draw-on + logo arrow) ----
func strokePoly(_ ctx: CGContext, _ pts: [CGPoint], _ width: CGFloat, _ color: CGColor, _ progress: Double) {
    if progress <= 0 || pts.count < 2 { return }
    var lens: [CGFloat] = []
    var total: CGFloat = 0
    for i in 1..<pts.count {
        let d = hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y); lens.append(d); total += d
    }
    var target = CGFloat(progress) * total
    ctx.saveGState()
    ctx.setStrokeColor(color); ctx.setLineWidth(width)
    ctx.setLineCap(.round); ctx.setLineJoin(.round)
    ctx.beginPath()
    ctx.move(to: pts[0])
    for i in 1..<pts.count {
        let d = lens[i-1]
        if target >= d { ctx.addLine(to: pts[i]); target -= d }
        else {
            let f = d > 0 ? target / d : 0
            ctx.addLine(to: CGPoint(x: pts[i-1].x + (pts[i].x - pts[i-1].x) * f,
                                    y: pts[i-1].y + (pts[i].y - pts[i-1].y) * f))
            break
        }
    }
    ctx.strokePath()
    ctx.restoreGState()
}

// ---- shared brand mark ----
func logoMark(_ ctx: CGContext, _ cx: CGFloat, _ cy: CGFloat, _ s: CGFloat, _ appear: Double) {
    if appear <= 0.001 { return }
    let sc = CGFloat(lerp(0.6, 1.0, easeOutBack(appear)))
    let w = s * sc, h = s * sc, x = cx - w / 2, y = cy - h / 2
    ctx.saveGState()
    ctx.setShadow(offset: CGSize(width: 0, height: -10), blur: 30, color: hx(0x1e2645, 0.35))
    ctx.setFillColor(navy600); rrect(ctx, x, y, w, h, s * 0.28); ctx.fillPath()
    ctx.restoreGState()
    // subtle top sheen
    ctx.saveGState(); rrect(ctx, x, y, w, h, s * 0.28); ctx.clip()
    ctx.setFillColor(hx(0xffffff, 0.10)); ctx.fill(R(x, y, w, h * 0.45)); ctx.restoreGState()
    // rising arrow
    let p0 = CGPoint(x: cx - w * 0.24, y: CGFloat(H) - (cy + h * 0.16))
    let p1 = CGPoint(x: cx - w * 0.04, y: CGFloat(H) - (cy - h * 0.02))
    let p2 = CGPoint(x: cx + w * 0.24, y: CGFloat(H) - (cy - h * 0.20))
    let ap = clamp(appear / 0.7)
    strokePoly(ctx, [p0, p1, p2], s * 0.085, white, ap)
    if ap >= 1 {
        let tipY = CGFloat(H) - (cy - h * 0.20)
        ctx.saveGState(); ctx.setStrokeColor(white); ctx.setLineWidth(s * 0.085)
        ctx.setLineCap(.round); ctx.beginPath()
        ctx.move(to: CGPoint(x: p2.x - w * 0.17, y: tipY - h * 0.02))
        ctx.addLine(to: CGPoint(x: p2.x, y: tipY))
        ctx.addLine(to: CGPoint(x: p2.x - w * 0.01, y: tipY + h * 0.17))
        ctx.strokePath(); ctx.restoreGState()
    }
}

// ============================================================
//  SCENE RENDERERS
// ============================================================

func drawLightBG(_ ctx: CGContext, _ t: Double, _ a: Double) {
    if a <= 0.002 { return }
    ctx.saveGState(); ctx.setAlpha(CGFloat(a))
    ctx.setFillColor(slate100); ctx.fill(CGRect(x: 0, y: 0, width: CGFloat(W), height: CGFloat(H)))
    // soft drifting blobs
    let drift = t * 12
    ellipse(ctx, 300 + CGFloat(sin(t * 0.5) * 40), 200 + CGFloat(cos(t * 0.4) * 30), 320, 320, hx(0x4a60a6, 0.05))
    ellipse(ctx, 1650 - CGFloat(sin(t * 0.45) * 50), 900 + CGFloat(sin(t * 0.6) * 40), 360, 360, hx(0x16a34a, 0.045))
    ellipse(ctx, 1500 + CGFloat(cos(t * 0.5) * 40), 120 + drift * 0, 240, 240, hx(0x7c3aed, 0.035))
    ctx.restoreGState()
}

func drawIntro(_ ctx: CGContext, _ t: Double) {
    let bgA = t < 4.6 ? 1.0 : clamp(1.0 - (t - 4.6) / 0.45)
    if bgA <= 0.002 { return }
    ctx.saveGState(); ctx.setAlpha(CGFloat(bgA))
    // navy gradient
    let cs = CGColorSpaceCreateDeviceRGB()
    let grad = CGGradient(colorsSpace: cs, colors: [navy950, navy900] as CFArray, locations: [0, 1])!
    ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: CGFloat(H)), end: CGPoint(x: CGFloat(W), y: 0), options: [])
    // faint grid dots
    for gx in stride(from: 0, through: W, by: 64) {
        for gy in stride(from: 0, through: H, by: 64) {
            ctx.setFillColor(hx(0xffffff, 0.035))
            ctx.fill(CGRect(x: CGFloat(gx) - 1, y: CGFloat(H - gy) - 1, width: 2, height: 2))
        }
    }
    // rotating ring behind badge
    let ringR = CGFloat(lerp(120, 165, easeOutCubic(seg(t, 0.2, 1.6))))
    ctx.saveGState(); ctx.setAlpha(CGFloat(bgA) * 0.5)
    ctx.setStrokeColor(navy500); ctx.setLineWidth(1.5); ctx.setLineDash(phase: 0, lengths: [6, 10])
    ctx.addArc(center: CGPoint(x: 960, y: CGFloat(H) - 400), radius: ringR,
               startAngle: CGFloat(t * 0.6), endAngle: CGFloat(t * 0.6 + 2 * Double.pi * 0.82), clockwise: false)
    ctx.strokePath(); ctx.restoreGState()

    logoMark(ctx, 960, 400, 170, seg(t, 0.15, 0.9))

    // title with clip reveal
    let title = "MoneyMngmt"
    let tSize: CGFloat = 118
    let fullW = textWidth(title, tSize, 3, 1.5)
    let rev = easeOutCubic(seg(t, 1.0, 0.85))
    if rev > 0.002 {
        ctx.saveGState()
        ctx.clip(to: R(960 - fullW / 2 - 10, 520, (fullW + 20) * CGFloat(rev), 170))
        text(ctx, title, tSize, 3, white, x: 960, top: 545, align: .center, tracking: 1.5)
        ctx.restoreGState()
    }
    // tagline
    let tagA = seg(t, 1.9, 0.6)
    text(ctx, "P E R S O N A L   M O N E Y   M A N A G E M E N T", 26, 1, navy300,
         x: 960, top: 700, align: .center, tracking: 2, alpha: CGFloat(tagA))
    text(ctx, "Track • Budget • Save", 24, 0, hx(0x94a3b8), x: 960, top: 760, align: .center,
         alpha: CGFloat(seg(t, 2.4, 0.6)))
    ctx.restoreGState()
}

func card(_ ctx: CGContext, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat,
          _ r: CGFloat, _ a: Double, _ rise: CGFloat = 0) {
    if a <= 0.002 { return }
    ctx.saveGState()
    ctx.setAlpha(CGFloat(a))
    ctx.setShadow(offset: CGSize(width: 0, height: -8), blur: 26, color: hx(0x0f172a, 0.10))
    ctx.setFillColor(white); rrect(ctx, x, y + rise, w, h, r); ctx.fillPath()
    ctx.setShadow(offset: .zero, blur: 0, color: nil)
    ctx.setStrokeColor(hx(0xe2e8f0)); ctx.setLineWidth(1); rrect(ctx, x, y + rise, w, h, r); ctx.strokePath()
    ctx.restoreGState()
}

func drawTopBar(_ ctx: CGContext, _ t: Double, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ a: Double) {
    if a <= 0.002 { return }
    ctx.saveGState(); ctx.setAlpha(CGFloat(a))
    rrect(ctx, x, y, w, h, 0); ctx.clip()
    ctx.setFillColor(slate50); ctx.fill(R(x, y, w, h))
    ctx.setStrokeColor(slate200); ctx.setLineWidth(1)
    ctx.beginPath(); ctx.move(to: CGPoint(x: x, y: CGFloat(H) - (y + h)))
    ctx.addLine(to: CGPoint(x: x + w, y: CGFloat(H) - (y + h))); ctx.strokePath()
    let dots: [CGColor] = [hx(0xf87171), hx(0xfbbf24), hx(0x34d399)]
    for i in 0..<3 { ellipse(ctx, x + 34 + CGFloat(i) * 26, y + h / 2, 7, 7, dots[i]) }
    logoMark(ctx, x + 150, y + h / 2, 26, 1)
    text(ctx, "MoneyMngmt", 20, 2, navy900, x: x + 176, top: y + h / 2 - 10)
    text(ctx, "Overview", 20, 0, slate400, x: x + 300, top: y + h / 2 - 10)
    text(ctx, "₹ INR", 18, 1, slate400, x: x + w - 40, top: y + h / 2 - 9, align: .right)
    ctx.restoreGState()
}

func drawSummaryCards(_ ctx: CGContext, _ t: Double) {
    let labels = ["Total Balance", "Total Income", "Total Expenses", "Savings"]
    let values = [428650, 580000, 186350, 165000]
    let deltas = ["+12.4%", "+8.1%", "-3.2%", "+15.0%"]
    let dpos = [true, true, false, true]
    let accent = [navy600, green, red, purple]
    let cx0: CGFloat = 232, cw: CGFloat = 349, gap: CGFloat = 20
    for i in 0..<4 {
        let a = seg(t, 5.75 + Double(i) * 0.16, 0.55)
        guard a > 0.002 else { continue }
        let rise = CGFloat((1 - easeOutCubic(a)) * 26)
        let x = cx0 + CGFloat(i) * (cw + gap), y: CGFloat = 232
        card(ctx, x, y, cw, 140, 20, a, rise)
        ctx.saveGState(); ctx.setAlpha(CGFloat(a))
        // accent bar
        fillRR(ctx, x, y + rise, 6, 140, 3, accent[i])
        ellipse(ctx, x + 44, y + rise + 44, 15, 15, hx(0x000000, 0.0))
        text(ctx, labels[i], 21, 1, slate500, x: x + 30, top: y + rise + 26)
        let cv = Int(Double(values[i]) * easeOutCubic(seg(t, 6.0 + Double(i) * 0.16, 0.9)))
        text(ctx, "₹" + fmt(cv), 42, 3, navy950, x: x + 30, top: y + rise + 58)
        // delta pill
        let pw: CGFloat = 96
        let pc = dpos[i] ? green : red
        fillRR(ctx, x + cw - pw - 24, y + rise + 92, pw, 30, 15, dpos[i] ? greenLight : redLight)
        text(ctx, deltas[i], 18, 2, pc, x: x + cw - pw / 2 - 24, top: y + rise + 98, align: .center)
        ctx.restoreGState()
    }
}

func drawBarCard(_ ctx: CGContext, _ t: Double, _ a: Double) {
    guard a > 0.002 else { return }
    let x: CGFloat = 232, y: CGFloat = 392, w: CGFloat = 900, h: CGFloat = 320
    card(ctx, x, y, w, h, 20, a)
    ctx.saveGState(); ctx.setAlpha(CGFloat(a))
    text(ctx, "Income vs Expenses", 24, 2, navy900, x: x + 28, top: y + 24)
    text(ctx, "Last 6 months", 18, 0, slate400, x: x + w - 28, top: y + 30, align: .right)
    let incomes = [52, 61, 48, 72, 58, 80]
    let exp = [34, 41, 38, 45, 30, 42]
    let baseY = y + h - 48
    let chartH: CGFloat = 190
    let left = x + 56, right = x + w - 32
    let n = 6
    let slot = (right - left) / CGFloat(n)
    let barW: CGFloat = 30
    // gridlines
    for g in 0...4 {
        let gy = baseY - CGFloat(g) / 4 * chartH
        ctx.setStrokeColor(hx(0xe2e8f0)); ctx.setLineWidth(1)
        ctx.beginPath(); ctx.move(to: CGPoint(x: left - 20, y: CGFloat(H) - gy))
        ctx.addLine(to: CGPoint(x: right, y: CGFloat(H) - gy)); ctx.strokePath()
    }
    let months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"]
    for i in 0..<n {
        let cx = left + slot * (CGFloat(i) + 0.5)
        let p = easeOutCubic(seg(t, 6.7 + Double(i) * 0.07, 0.55))
        let ih = chartH * CGFloat(incomes[i]) / 100 * CGFloat(p)
        let eh = chartH * CGFloat(exp[i]) / 100 * CGFloat(p)
        fillRR(ctx, cx - barW - 3, baseY - ih, barW, ih, 6, green)
        fillRR(ctx, cx + 3, baseY - eh, barW, eh, 6, red)
        text(ctx, months[i], 17, 1, slate400, x: cx, top: baseY + 12, align: .center)
    }
    // legend
    ellipse(ctx, x + 40, y + h - 20, 6, 6, green)
    text(ctx, "Income", 18, 0, slate500, x: x + 52, top: y + h - 31)
    ellipse(ctx, x + 150, y + h - 20, 6, 6, red)
    text(ctx, "Expenses", 18, 0, slate500, x: x + 162, top: y + h - 31)
    ctx.restoreGState()
}

func drawDonutCard(_ ctx: CGContext, _ t: Double, _ a: Double) {
    guard a > 0.002 else { return }
    let x: CGFloat = 1152, y: CGFloat = 392, w: CGFloat = 536, h: CGFloat = 320
    card(ctx, x, y, w, h, 20, a)
    ctx.saveGState(); ctx.setAlpha(CGFloat(a))
    text(ctx, "Expenses by Category", 24, 2, navy900, x: x + 28, top: y + 24)
    let slices: [(String, Double, CGColor)] = [("Food", 0.34, navy600), ("Rent", 0.27, green),
                                               ("Transport", 0.21, red), ("Other", 0.18, amber)]
    let ccx = x + 150, ccy = y + 190, rad: CGFloat = 88
    let sweep = easeOutCubic(seg(t, 9.3, 1.3))
    var cum = 0.0
    for (_, frac, col) in slices {
        let start = cum, end = cum + frac
        let s0 = clamp((sweep - start) / frac)
        if s0 > 0 {
            let a0 = CGFloat(Double.pi / 2 - 2 * Double.pi * start)
            let a1 = CGFloat(Double.pi / 2 - 2 * Double.pi * (start + frac * s0))
            ctx.setFillColor(col)
            ctx.beginPath()
            ctx.move(to: CGPoint(x: ccx, y: CGFloat(H) - ccy))
            ctx.addArc(center: CGPoint(x: ccx, y: CGFloat(H) - ccy), radius: rad,
                       startAngle: a0, endAngle: a1, clockwise: true)
            ctx.closePath(); ctx.fillPath()
        }
        cum = end
    }
    ellipse(ctx, ccx, ccy, 46, 46, white)
    text(ctx, "₹1.86L", 22, 2, navy900, x: ccx, top: ccy - 16, align: .center)
    text(ctx, "spent", 14, 0, slate400, x: ccx, top: ccy + 12, align: .center)
    // legend
    for (i, (name, frac, col)) in slices.enumerated() {
        let la = seg(t, 10.0 + Double(i) * 0.1, 0.4)
        if la <= 0.002 { continue }
        let ly = y + 74 + CGFloat(i) * 52
        ctx.saveGState(); ctx.setAlpha(CGFloat(a * la))
        ellipse(ctx, x + 300, ly + 10, 7, 7, col)
        text(ctx, name, 19, 1, navy900, x: x + 320, top: ly - 2)
        text(ctx, "\(Int(frac * 100))%", 19, 2, slate500, x: x + w - 30, top: ly - 2, align: .right)
        ctx.restoreGState()
    }
    ctx.restoreGState()
}

func drawTrendCard(_ ctx: CGContext, _ t: Double, _ a: Double) {
    guard a > 0.002 else { return }
    let x: CGFloat = 232, y: CGFloat = 392, w: CGFloat = 900, h: CGFloat = 320
    card(ctx, x, y, w, h, 20, a)
    ctx.saveGState(); ctx.setAlpha(CGFloat(a))
    text(ctx, "Savings Trend", 24, 2, navy900, x: x + 28, top: y + 24)
    text(ctx, "Monthly, ₹", 18, 0, slate400, x: x + w - 28, top: y + 30, align: .right)
    let vals: [Double] = [18, 24, 21, 32, 29, 38, 35, 44, 41, 52]
    let baseY = y + h - 52, chartH: CGFloat = 180
    let left = x + 56, right = x + w - 40
    for g in 0...4 {
        let gy = baseY - CGFloat(g) / 4 * chartH
        ctx.setStrokeColor(hx(0xe2e8f0)); ctx.setLineWidth(1)
        ctx.beginPath(); ctx.move(to: CGPoint(x: left - 20, y: CGFloat(H) - gy))
        ctx.addLine(to: CGPoint(x: right, y: CGFloat(H) - gy)); ctx.strokePath()
    }
    var pts: [CGPoint] = []
    for (i, v) in vals.enumerated() {
        let px = left + (right - left) * CGFloat(i) / CGFloat(vals.count - 1)
        let py = baseY - chartH * CGFloat(v) / 60
        pts.append(CGPoint(x: px, y: CGFloat(H) - py))
    }
    let p = easeOutCubic(seg(t, 11.35, 1.5))
    // area
    if p > 0.01 {
        ctx.saveGState()
        ctx.beginPath(); ctx.move(to: CGPoint(x: pts[0].x, y: CGFloat(H) - baseY))
        var drawn = 0.0
        let totalSegs = Double(pts.count - 1)
        for idx in 0..<pts.count {
            if Double(idx) / totalSegs <= p { ctx.addLine(to: pts[idx]) }
            else { break }
            drawn = Double(idx)
        }
        let last = Int(drawn)
        if last < pts.count - 1 {
            let f = (p - Double(last) / totalSegs) / (1.0 / totalSegs)
            let ax = pts[last].x + (pts[last+1].x - pts[last].x) * CGFloat(f)
            let ay = pts[last].y + (pts[last+1].y - pts[last].y) * CGFloat(f)
            ctx.addLine(to: CGPoint(x: ax, y: ay))
            ctx.addLine(to: CGPoint(x: ax, y: CGFloat(H) - baseY))
        } else { ctx.addLine(to: CGPoint(x: pts.last!.x, y: CGFloat(H) - baseY)) }
        ctx.closePath()
        ctx.setFillColor(hx(0x4a60a6, 0.12)); ctx.fillPath()
        ctx.restoreGState()
    }
    strokePoly(ctx, pts, 4, navy600, p)
    // endpoint dot + value
    if p > 0.98 {
        let e = pts.last!
        ellipse(ctx, e.x, CGFloat(H) - e.y, 8, 8, navy600)
        ellipse(ctx, e.x, CGFloat(H) - e.y, 4, 4, white)
    }
    ctx.restoreGState()
}

func drawTransactionsCard(_ ctx: CGContext, _ t: Double, _ a: Double) {
    guard a > 0.002 else { return }
    let x: CGFloat = 232, y: CGFloat = 732, w: CGFloat = 900, h: CGFloat = 150
    card(ctx, x, y, w, h, 20, a)
    ctx.saveGState(); ctx.setAlpha(CGFloat(a))
    text(ctx, "Recent Transactions", 22, 2, navy900, x: x + 28, top: y + 18)
    let rows: [(String, String, String, Bool, CGColor)] = [
        ("Freelance project", "Income · bank", "+₹45,000", true, green),
        ("Big Bazaar", "Expense · Food", "-₹3,240", false, red),
        ("Monthly SIP", "Savings · invest", "-₹10,000", false, purple),
        ("Rent", "Expense · Rent", "-₹22,000", false, red),
    ]
    for (i, r) in rows.enumerated() {
        let ra = seg(t, 13.5 + Double(i) * 0.1, 0.5)
        if ra <= 0.002 { continue }
        let slide = CGFloat((1 - easeOutCubic(ra)) * 40)
        let ry = y + 54 + CGFloat(i) * 24
        ctx.saveGState(); ctx.setAlpha(CGFloat(a * ra))
        ellipse(ctx, x + 40 + slide, ry + 10, 9, 9, hx(0x000000, 0))
        ellipse(ctx, x + 40 + slide, ry + 10, 9, 9, i == 0 ? green : (i == 2 ? purple : red))
        text(ctx, r.0, 18, 1, navy900, x: x + 60 + slide, top: ry)
        text(ctx, r.1, 16, 0, slate400, x: x + 60 + slide, top: ry + 20)
        text(ctx, r.2, 18, 2, r.4, x: x + w - 28 + slide, top: ry, align: .right)
        ctx.restoreGState()
    }
    ctx.restoreGState()
}

func drawBudgetCard(_ ctx: CGContext, _ t: Double, _ a: Double) {
    guard a > 0.002 else { return }
    let x: CGFloat = 1152, y: CGFloat = 732, w: CGFloat = 536, h: CGFloat = 150
    card(ctx, x, y, w, h, 20, a)
    ctx.saveGState(); ctx.setAlpha(CGFloat(a))
    text(ctx, "Monthly Budget", 22, 2, navy900, x: x + 28, top: y + 18)
    let p = easeOutCubic(seg(t, 13.9, 1.2))
    let spent = 215000.0, budget = 250000.0
    let frac = 0.86 * p
    let over80 = frac >= 0.80
    let cx = over80 ? amber : navy600
    text(ctx, "₹" + fmt(Int(spent * p)) + " ", 20, 1, navy900, x: x + 28, top: y + 52)
    text(ctx, "/ ₹" + fmt(Int(budget)), 18, 0, slate400, x: x + 28 + textWidth("₹" + fmt(Int(spent * p)) + " ", 20, 1),
         top: y + 53)
    text(ctx, "\(Int(frac * 100))%", 20, 2, cx, x: x + w - 28, top: y + 52, align: .right)
    let trackX = x + 28, trackW = w - 56, trackY = y + 100
    fillRR(ctx, trackX, trackY, trackW, 14, 7, slate200)
    fillRR(ctx, trackX, trackY, trackW * CGFloat(frac), 14, 7, cx)
    if over80 {
        let badge = seg(t, 14.6, 0.4)
        if badge > 0.002 {
            ctx.saveGState(); ctx.setAlpha(CGFloat(a * badge))
            text(ctx, "⚠ 80% of budget used", 16, 1, amber, x: x + 28, top: y + 122)
            ctx.restoreGState()
        }
    }
    ctx.restoreGState()
}

func drawChip(_ ctx: CGContext, _ t: Double, _ label: String, _ s: Double, _ e: Double, _ a: Double) {
    let vis = min(seg(t, s, 0.35), seg(e - 0.3, s, 0) > 0 ? clamp((e - t) / 0.3) : 1)
    let alp = min(seg(t, s, 0.35), clamp((e - t) / 0.3))
    if alp <= 0.002 || a <= 0.002 { return }
    let w = textWidth(label, 20, 2, 3) + 56
    let x = 960 - w / 2
    ctx.saveGState(); ctx.setAlpha(CGFloat(a * alp * vis > 0 ? a * alp : a * alp))
    fillRR(ctx, x, 56, w, 44, 22, navy50)
    ctx.setStrokeColor(navy100); ctx.setLineWidth(1); rrect(ctx, x, 56, w, 44, 22); ctx.strokePath()
    ellipse(ctx, x + 24, 78, 5, 5, navy500)
    text(ctx, label, 20, 2, navy700, x: 960, top: 66, align: .center, tracking: 3)
    ctx.restoreGState()
}

func drawDashboard(_ ctx: CGContext, _ t: Double) {
    // window slide-up + scale
    let winA = seg(t, 5.0, 0.55)
    if winA <= 0.002 { return }
    let rise = CGFloat((1 - easeOutCubic(winA)) * 60)
    let wx: CGFloat = 200, wy: CGFloat = 120, ww: CGFloat = 1520, wh: CGFloat = 840
    ctx.saveGState(); ctx.setAlpha(CGFloat(winA))
    ctx.setShadow(offset: CGSize(width: 0, height: -22), blur: 60, color: hx(0x0f172a, 0.18))
    ctx.setFillColor(white); rrect(ctx, wx, wy + rise, ww, wh, 26); ctx.fillPath()
    ctx.restoreGState()
    ctx.saveGState(); rrect(ctx, wx, wy + rise, ww, wh, 26); ctx.clip(); ctx.translateBy(x: 0, y: -rise)
    drawTopBar(ctx, t, wx, wy, ww, 60, winA)
    ctx.restoreGState()
    ctx.saveGState(); ctx.translateBy(x: 0, y: -rise)
    drawChip(ctx, t, "OVERVIEW", 5.7, 9.3, winA)
    drawSummaryCards(ctx, t)
    let barA = seg(t, 6.3, 0.5) * clamp((11.15 - t) / 0.4)
    drawBarCard(ctx, t, min(winA, barA))
    let trendA = seg(t, 11.15, 0.5)
    drawTrendCard(ctx, t, min(winA, trendA))
    drawChip(ctx, t, "INCOME VS EXPENSES", 9.3, 13.0, winA)
    drawChip(ctx, t, "WHERE YOUR MONEY GOES", 11.15, 13.0, winA)
    drawDonutCard(ctx, t, min(winA, seg(t, 9.3, 0.5)))
    let r3 = seg(t, 13.1, 0.5)
    drawChip(ctx, t, "SMART BUDGETING", 13.1, 16.2, winA)
    drawTransactionsCard(ctx, t, min(winA, r3))
    drawBudgetCard(ctx, t, min(winA, r3))
    ctx.restoreGState()
}

func drawOutro(_ ctx: CGContext, _ t: Double) {
    if t < 15.8 { return }
    let dim = seg(t, 15.8, 0.6)
    ctx.saveGState(); ctx.setAlpha(CGFloat(dim * 0.95))
    ctx.setFillColor(navy950); ctx.fill(CGRect(x: 0, y: 0, width: CGFloat(W), height: CGFloat(H)))
    ctx.restoreGState()
    // end fade
    let endFade = t > 19.4 ? clamp((20.0 - t) / 0.6) : 1.0
    ctx.saveGState(); ctx.setAlpha(CGFloat(endFade))
    logoMark(ctx, 960, 430, 180, seg(t, 16.2, 0.9))
    let ta = seg(t, 16.6, 0.6)
    text(ctx, "MoneyMngmt", 104, 3, white, x: 960, top: 560, align: .center, tracking: 1.5, alpha: CGFloat(ta))
    text(ctx, "Money Mngmt, without the spreadsheet pain.", 30, 0, navy300, x: 960, top: 710,
         align: .center, alpha: CGFloat(seg(t, 17.0, 0.6)))
    // words pill
    let words = ["Track", "Budget", "Save"]
    var wx: CGFloat = 960 - 300
    for (i, wd) in words.enumerated() {
        let wa = seg(t, 17.4 + Double(i) * 0.16, 0.5)
        if wa <= 0.002 { continue }
        let wdW = textWidth(wd, 26, 2)
        ctx.saveGState(); ctx.setAlpha(CGFloat(wa))
        fillRR(ctx, wx, 780, wdW + 48, 52, 26, hx(0x4a60a6, 0.25))
        text(ctx, wd, 26, 2, hx(0xdcfce7), x: wx + (wdW + 48) / 2, top: 792, align: .center)
        ctx.restoreGState()
        wx += wdW + 48 + 18
    }
    text(ctx, "Next.js · Google Sheets · Recharts", 22, 0, hx(0x64748b), x: 960, top: 900,
         align: .center, alpha: CGFloat(seg(t, 18.2, 0.6)))
    ctx.restoreGState()
}

// ============================================================
//  RENDER
// ============================================================
let outURL = URL(fileURLWithPath: outPath)
try? FileManager.default.removeItem(at: outURL)
try? FileManager.default.createDirectory(at: outURL.deletingLastPathComponent(),
                                         withIntermediateDirectories: true)
let writer = try! AVAssetWriter(outputURL: outURL, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: W, AVVideoHeightKey: H,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 12_000_000,
                                      AVVideoMaxKeyFrameIntervalKey: 60]
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let attrs: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
    kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H
]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: attrs)
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)
let cs = CGColorSpaceCreateDeviceRGB()

for i in 0..<FRAMES {
    while !input.isReadyForMoreMediaData { usleep(500) }
    var px: CVPixelBuffer?
    CVPixelBufferCreate(kCFAllocatorDefault, W, H, kCVPixelFormatType_32ARGB, attrs as CFDictionary, &px)
    let buffer = px!
    CVPixelBufferLockBaseAddress(buffer, [])
    let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: W, height: H,
                        bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
                        space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue)!
    ctx.setShouldAntialias(true); ctx.setShouldSmoothFonts(true)
    let t = Double(i) / Double(FPS)
    ctx.setFillColor(navy950); ctx.fill(CGRect(x: 0, y: 0, width: CGFloat(W), height: CGFloat(H)))
    drawLightBG(ctx, t, clamp(seg(t, 4.2, 0.6)))
    drawIntro(ctx, t)
    drawDashboard(ctx, t)
    drawOutro(ctx, t)
    CVPixelBufferUnlockBaseAddress(buffer, [])
    adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: CMTimeScale(FPS)))
    if i % 60 == 0 { FileHandle.standardError.write("frame \(i)/\(FRAMES)\n".data(using: .utf8)!) }
}
input.markAsFinished()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }
sem.wait()
print("DONE status=\(writer.status.rawValue) error=\(String(describing: writer.error)) -> \(outPath)")
