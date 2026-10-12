import AVFoundation
import CoreGraphics
import CoreText
import Foundation
import ImageIO

// ============================================================
//  advanced.swift — MoneyMngmt "explainer" video (video only).
//  Ken-Burns pans, camera push-ins (area zoom), lower-thirds,
//  feature list, wipes. Audio is built by audio.swift and muxed later.
// ============================================================

let W = 1920, H = 1080, FPS = 30
let TOTAL = 70.5
let FRAMES = Int(TOTAL * Double(FPS))
let SHOT_DIR = "/private/var/folders/s6/j5qr3j_57wg_02y5hf7927_00000gn/T/opencode/ae/shots/"
let outPath = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "video_only.mp4"

// ---------- palette ----------
func hx(_ v: UInt32, _ a: CGFloat = 1) -> CGColor {
    CGColor(red: CGFloat((v >> 16) & 0xFF) / 255, green: CGFloat((v >> 8) & 0xFF) / 255,
            blue: CGFloat(v & 0xFF) / 255, alpha: a)
}
let navy950 = hx(0x11162b), navy900 = hx(0x1e2645), navy800 = hx(0x354170)
let navy700 = hx(0x3d4d87), navy600 = hx(0x4a60a6), navy500 = hx(0x5f79bb)
let navy300 = hx(0xaebce0), navy100 = hx(0xe9edf7), navy50 = hx(0xf4f6fb)
let slate50 = hx(0xf8fafc), slate100 = hx(0xf1f5f9), slate200 = hx(0xe2e8f0)
let slate300 = hx(0xcbd5e1), slate400 = hx(0x94a3b8), slate500 = hx(0x64748b)
let white = hx(0xffffff)
let green = hx(0x16a34a), greenLight = hx(0xdcfce7)
let red = hx(0xdc2626), amber = hx(0xf59e0b)

// ---------- math ----------
func clamp(_ x: Double, _ a: Double = 0, _ b: Double = 1) -> Double { min(max(x, a), b) }
func lerp(_ a: Double, _ b: Double, _ t: Double) -> Double { a + (b - a) * t }
func easeOutCubic(_ x: Double) -> Double { 1 - pow(1 - x, 3) }
func easeInOutCubic(_ x: Double) -> Double { x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2 }
func easeOutBack(_ x: Double) -> Double { let c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2) }
func seg(_ t: Double, _ s: Double, _ d: Double) -> Double { clamp((t - s) / d) }

// ---------- geometry ----------
func R(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> CGRect {
    CGRect(x: x, y: CGFloat(H) - y - h, width: w, height: h)
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

// ---------- text ----------
enum Al { case left, center, right }
func fontFor(_ size: CGFloat, _ w: Int) -> CTFont {
    let n: String
    switch w { case 0: n = "HelveticaNeue"; case 1: n = "HelveticaNeue-Medium"
    case 2: n = "HelveticaNeue-Bold"; case 3: n = "HelveticaNeue-Bold"
    default: n = "HelveticaNeue-CondensedBlack" }
    return CTFontCreateWithName(n as CFString, size, nil)
}
func makeLine(_ s: String, _ font: CTFont, _ color: CGColor, _ tr: CGFloat) -> (CTLine, CGFloat, CGFloat) {
    var a: [CFString: Any] = [kCTFontAttributeName: font, kCTForegroundColorAttributeName: color]
    if tr != 0 { a[kCTKernAttributeName] = tr }
    let at = CFAttributedStringCreate(nil, s as CFString, a as CFDictionary)!
    let line = CTLineCreateWithAttributedString(at)
    var asc: CGFloat = 0, desc: CGFloat = 0, lead: CGFloat = 0
    let w = CGFloat(CTLineGetTypographicBounds(line, &asc, &desc, &lead))
    return (line, w, asc)
}
@discardableResult
func text(_ ctx: CGContext, _ s: String, _ size: CGFloat, _ w: Int, _ color: CGColor,
          x: CGFloat, top: CGFloat, align: Al = .left, tracking: CGFloat = 0, alpha: CGFloat = 1) -> CGFloat {
    if alpha <= 0.002 || s.isEmpty { return 0 }
    let (line, tw, asc) = makeLine(s, fontFor(size, w), color, tracking)
    var dx = x
    switch align { case .left: break; case .center: dx = x - tw / 2; case .right: dx = x - tw }
    ctx.saveGState()
    if alpha < 1 { ctx.setAlpha(alpha) }
    ctx.textPosition = CGPoint(x: dx, y: CGFloat(H) - top - asc)
    CTLineDraw(line, ctx); ctx.restoreGState()
    return tw
}
func textWidth(_ s: String, _ size: CGFloat, _ w: Int, _ tr: CGFloat = 0) -> CGFloat {
    let (_, x, _) = makeLine(s, fontFor(size, w), white, tr); return x
}

// ---------- images ----------
func drawImg(_ ctx: CGContext, _ img: CGImage, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) {
    ctx.draw(img, in: R(x, y, w, h))
}
func loadImg(_ p: String) -> CGImage? {
    guard let s = CGImageSourceCreateWithURL(URL(fileURLWithPath: p) as CFURL, nil),
          let i = CGImageSourceCreateImageAtIndex(s, 0, nil) else { return nil }
    return i
}

// ---------- brand mark ----------
func logoMark(_ ctx: CGContext, _ cx: CGFloat, _ cy: CGFloat, _ s: CGFloat, _ appear: Double) {
    if appear <= 0.001 { return }
    let sc = CGFloat(lerp(0.6, 1.0, easeOutBack(appear)))
    let w = s * sc, h = s * sc, x = cx - w / 2, y = cy - h / 2
    ctx.saveGState()
    ctx.setShadow(offset: CGSize(width: 0, height: -10), blur: 30, color: hx(0x1e2645, 0.35))
    ctx.setFillColor(navy600); rrect(ctx, x, y, w, h, s * 0.28); ctx.fillPath(); ctx.restoreGState()
    ctx.saveGState(); rrect(ctx, x, y, w, h, s * 0.28); ctx.clip()
    ctx.setFillColor(hx(0xffffff, 0.10)); ctx.fill(R(x, y, w, h * 0.45)); ctx.restoreGState()
    let p0 = CGPoint(x: cx - w * 0.24, y: CGFloat(H) - (cy + h * 0.16))
    let p1 = CGPoint(x: cx - w * 0.04, y: CGFloat(H) - (cy - h * 0.02))
    let p2 = CGPoint(x: cx + w * 0.24, y: CGFloat(H) - (cy - h * 0.20))
    if appear > 0.4 {
        ctx.saveGState(); ctx.setStrokeColor(white); ctx.setLineWidth(s * 0.085)
        ctx.setLineCap(.round); ctx.setLineJoin(.round); ctx.beginPath()
        ctx.move(to: p0); ctx.addLine(to: p1); ctx.addLine(to: p2); ctx.strokePath()
        let tipY = CGFloat(H) - (cy - h * 0.20)
        ctx.beginPath(); ctx.move(to: CGPoint(x: p2.x - w * 0.17, y: tipY - h * 0.02))
        ctx.addLine(to: CGPoint(x: p2.x, y: tipY))
        ctx.addLine(to: CGPoint(x: p2.x - w * 0.01, y: tipY + h * 0.17)); ctx.strokePath(); ctx.restoreGState()
    }
}
func checkGlyph(_ ctx: CGContext, _ cx: CGFloat, _ cy: CGFloat, _ r: CGFloat, _ c: CGColor) {
    ctx.saveGState(); ctx.setStrokeColor(c); ctx.setLineWidth(r * 0.36)
    ctx.setLineCap(.round); ctx.setLineJoin(.round); ctx.beginPath()
    ctx.move(to: CGPoint(x: cx - r * 0.45, y: CGFloat(H) - cy))
    ctx.addLine(to: CGPoint(x: cx - r * 0.1, y: CGFloat(H) - (cy + r * 0.4)))
    ctx.addLine(to: CGPoint(x: cx + r * 0.5, y: CGFloat(H) - (cy - r * 0.45)))
    ctx.strokePath(); ctx.restoreGState()
}

// ============================================================
//  PAGES
// ============================================================
struct Page { var img: CGImage; var sidebar: CGImage?; var topbar: CGImage?; var fullH: CGFloat }
let pageDefs = ["overview", "transactions", "reports", "budgets", "settings"]
var pages: [Page] = []
for n in pageDefs {
    guard let img = loadImg(SHOT_DIR + n + "-full.png") else { continue }
    pages.append(Page(img: img,
                      sidebar: img.cropping(to: CGRect(x: 0, y: 0, width: 256, height: min(1080, img.height))),
                      topbar: img.cropping(to: CGRect(x: 256, y: 0, width: 1664, height: min(64, img.height))),
                      fullH: CGFloat(img.height)))
}
if pages.count < 5 { print("ERROR loading pages"); exit(1) }

// ---------- layout ----------
let frameX: CGFloat = 80, frameY: CGFloat = 130, frameW: CGFloat = 1760, frameH: CGFloat = 918
let barH: CGFloat = 46
let contentX: CGFloat = frameX, contentY: CGFloat = frameY + barH
let contentW: CGFloat = frameW, contentH: CGFloat = frameH - barH
let s = contentW / 1920.0
let contentCX = contentX + contentW / 2, contentCY = contentY + contentH / 2

// ---------- scenes ----------
enum Kind { case brand, page, features, outro }
struct ZoomSeg { var a: Double; var b: Double; var z0: Double; var z1: Double; var rect: CGRect }
struct Scene {
    var name: String; var start: Double; var dur: Double; var kind: Kind
    var page: Int = 0
    var pan0: Double = 0; var pan1: Double = 0
    var zooms: [ZoomSeg] = []
    var ltTitle = ""; var ltSub = ""
}
let S: [Scene] = [
    Scene(name: "intro", start: 0.3, dur: 8.4, kind: .brand),
    Scene(name: "overview", start: 8.7, dur: 8.6, kind: .page, page: 0, pan0: 0, pan1: 430,
          zooms: [ZoomSeg(a: 9.6, b: 16.6, z0: 1.0, z1: 1.30, rect: CGRect(x: 470, y: 140, width: 1240, height: 300))],
          ltTitle: "Overview", ltSub: "Everything at a glance"),
    Scene(name: "charts", start: 17.3, dur: 8.1, kind: .page, page: 0, pan0: 470, pan1: 470,
          zooms: [ZoomSeg(a: 18.2, b: 20.9, z0: 1.0, z1: 1.42, rect: CGRect(x: 470, y: 520, width: 820, height: 470)),
                  ZoomSeg(a: 21.0, b: 23.8, z0: 1.0, z1: 1.42, rect: CGRect(x: 1290, y: 520, width: 620, height: 470))],
          ltTitle: "Live charts", ltSub: "Where your money goes"),
    Scene(name: "transactions", start: 25.4, dur: 8.7, kind: .page, page: 1, pan0: 0, pan1: 420,
          zooms: [ZoomSeg(a: 26.4, b: 33.2, z0: 1.0, z1: 1.26, rect: CGRect(x: 470, y: 300, width: 1240, height: 560))],
          ltTitle: "Transactions", ltSub: "Search · Filter · Export"),
    Scene(name: "reports", start: 34.1, dur: 7.5, kind: .page, page: 2, pan0: 0, pan1: 300,
          zooms: [ZoomSeg(a: 35.0, b: 40.8, z0: 1.0, z1: 1.30, rect: CGRect(x: 470, y: 170, width: 1240, height: 360))],
          ltTitle: "Reports", ltSub: "Averages & trends by month"),
    Scene(name: "budgets", start: 41.6, dur: 6.2, kind: .page, page: 3, pan0: 0, pan1: 200,
          zooms: [ZoomSeg(a: 42.5, b: 46.7, z0: 1.0, z1: 1.32, rect: CGRect(x: 470, y: 150, width: 900, height: 420))],
          ltTitle: "Budgets", ltSub: "Set limits, stay on track"),
    Scene(name: "settings", start: 47.8, dur: 8.1, kind: .page, page: 4, pan0: 0, pan1: 300,
          zooms: [ZoomSeg(a: 48.8, b: 55.0, z0: 1.0, z1: 1.30, rect: CGRect(x: 470, y: 150, width: 760, height: 380))],
          ltTitle: "Settings", ltSub: "Synced with Google Sheets"),
    Scene(name: "features", start: 55.9, dur: 8.2, kind: .features),
    Scene(name: "outro", start: 64.1, dur: 6.4, kind: .outro),
]

func sceneIndex(_ t: Double) -> Int {
    var k = 0
    for i in S.indices where t >= S[i].start { k = i }
    return k
}

// ---------- camera ----------
func panFor(_ sc: Scene, _ t: Double) -> Double {
    lerp(sc.pan0, sc.pan1, easeInOutCubic(seg(t, sc.start + 0.5, max(0.5, sc.dur - 1.0))))
}
func zoomFor(_ sc: Scene, _ t: Double) -> (Double, CGRect?) {
    for z in sc.zooms {
        if t < z.a || t >= z.b { continue }
        let hold = z.b - z.a
        let inD = 1.3, outD = 1.1
        var p: Double
        if t < z.a + inD { p = easeInOutCubic(seg(t, z.a, inD)) }
        else if t > z.b - outD { p = 1 - easeInOutCubic(seg(t, z.b - outD, outD)) }
        else { p = 1 }
        _ = hold
        return (lerp(z.z0, z.z1, p), z.rect)
    }
    return (1.0, nil)
}
func focusPoint(_ rect: CGRect, _ pan: Double) -> CGPoint {
    CGPoint(x: contentX + rect.midX * s, y: contentY - CGFloat(pan) * s + rect.midY * s)
}
func withCamera(_ ctx: CGContext, _ zoom: Double, _ f: CGPoint) {
    ctx.translateBy(x: f.x, y: CGFloat(H) - f.y)
    ctx.scaleBy(x: CGFloat(zoom), y: CGFloat(zoom))
    ctx.translateBy(x: -f.x, y: -(CGFloat(H) - f.y))
}

// ---------- draw the framed site ----------
func drawFrameChrome(_ ctx: CGContext, _ url: String, _ idx: String) {
    ctx.setShadow(offset: CGSize(width: 0, height: -24), blur: 60, color: hx(0x0f172a, 0.22))
    ctx.setFillColor(white); rrect(ctx, frameX, frameY, frameW, frameH, 22); ctx.fillPath()
    ctx.setShadow(offset: .zero, blur: 0, color: nil)
    ctx.saveGState(); rrect(ctx, frameX, frameY, frameW, frameH, 22); ctx.clip()
    ctx.setFillColor(slate50); ctx.fill(R(frameX, frameY, frameW, barH))
    ctx.setStrokeColor(slate200); ctx.setLineWidth(1)
    ctx.beginPath(); ctx.move(to: CGPoint(x: frameX, y: CGFloat(H) - (frameY + barH)))
    ctx.addLine(to: CGPoint(x: frameX + frameW, y: CGFloat(H) - (frameY + barH))); ctx.strokePath()
    ctx.restoreGState()
    ellipse(ctx, frameX + 30, frameY + barH / 2, 7, 7, hx(0xf87171))
    ellipse(ctx, frameX + 54, frameY + barH / 2, 7, 7, hx(0xfbbf24))
    ellipse(ctx, frameX + 78, frameY + barH / 2, 7, 7, hx(0x34d399))
    text(ctx, idx, 17, 1, slate400, x: frameX + frameW - 24, top: frameY + 15, align: .right)
    let uw: CGFloat = 360, ux = frameX + frameW / 2 - uw / 2, uy = frameY + 9, uh: CGFloat = 28
    fillRR(ctx, ux, uy, uw, uh, 14, white)
    ctx.setStrokeColor(slate200); ctx.setLineWidth(1); rrect(ctx, ux, uy, uw, uh, 14); ctx.strokePath()
    ellipse(ctx, ux + 20, uy + uh / 2, 4, 4, green)
    text(ctx, url, 15, 1, slate500, x: ux + uw / 2 + 8, top: uy + 6, align: .center)
}
func drawFramedSite(_ ctx: CGContext, _ pi: Int, _ pan: Double) {
    let p = pages[pi]
    let maxPan = max(0.0, Double(p.fullH) - Double(contentH) / Double(s))
    let panC = min(max(pan, 0), maxPan)
    var topY = contentY - CGFloat(panC) * s
    let scaledH = p.fullH * s
    if scaledH < contentH { topY = contentY } // small page: no pan
    drawFrameChrome(ctx, "moneymngmt.app/" + pageDefs[pi], String(format: "%02d / 05", pi + 1))
    ctx.saveGState(); ctx.clip(to: R(contentX, contentY, contentW, contentH))
    drawImg(ctx, p.img, contentX, topY, 1920 * s, p.fullH * s)
    if let sb = p.sidebar { drawImg(ctx, sb, contentX, contentY, CGFloat(sb.width) * s, CGFloat(sb.height) * s) }
    if let tb = p.topbar { drawImg(ctx, tb, contentX + 256 * s, contentY, CGFloat(tb.width) * s, CGFloat(tb.height) * s) }
    ctx.restoreGState()
}

// ---------- extras ----------
func drawVignette(_ ctx: CGContext, _ f: CGPoint, _ zoom: Double) {
    let a = clamp((zoom - 1) / 0.34) * 0.34
    if a <= 0.01 { return }
    let cs = CGColorSpaceCreateDeviceRGB()
    let g = CGGradient(colorsSpace: cs, colors: [hx(0x0b1020, 0), hx(0x0b1020, CGFloat(a))] as CFArray, locations: [0.45, 1.0])!
    ctx.saveGState()
    ctx.drawRadialGradient(g, startCenter: f, startRadius: 120,
                           endCenter: f, endRadius: 1050, options: [])
    ctx.restoreGState()
}
func drawLowerThird(_ ctx: CGContext, _ title: String, _ sub: String, _ t: Double, _ start: Double) {
    let a = easeOutCubic(seg(t, start, 0.6))
    if a <= 0.002 { return }
    let slide = (1 - a) * 60
    ctx.saveGState(); ctx.setAlpha(CGFloat(a))
    let x = contentX + 44 + CGFloat(slide), y = contentY + contentH - 122
    let tw = max(textWidth(title, 30, 3), textWidth(sub, 19, 0)) + 150
    ctx.setShadow(offset: CGSize(width: 0, height: -10), blur: 30, color: hx(0x0b1020, 0.35))
    fillRR(ctx, x, y, tw, 92, 18, hx(0x11162b, 0.90))
    ctx.setShadow(offset: .zero, blur: 0, color: nil)
    fillRR(ctx, x, y, 6, 92, 3, green)
    // small icon dot
    ctx.saveGState(); ctx.setStrokeColor(greenLight); ctx.setLineWidth(3); ctx.setLineCap(.round)
    ctx.beginPath(); ctx.move(to: CGPoint(x: x + 34, y: CGFloat(H) - (y + 46)))
    ctx.addLine(to: CGPoint(x: x + 42, y: CGFloat(H) - (y + 56)))
    ctx.addLine(to: CGPoint(x: x + 56, y: CGFloat(H) - (y + 34)))
    ctx.strokePath(); ctx.restoreGState()
    text(ctx, title, 30, 3, white, x: x + 74, top: y + 18)
    text(ctx, sub, 19, 0, navy300, x: x + 76, top: y + 56)
    ctx.restoreGState()
}
func drawWipe(_ ctx: CGContext, _ t: Double, _ b: Double, _ d: Double = 0.38) {
    if t < b - d / 2 || t > b + d / 2 { return }
    let p = (t - (b - d / 2)) / d
    let a = sin(.pi * p)
    let x = -0.5 * Double(W) + p * 2.0 * Double(W)
    let bw = 0.30 * Double(W)
    ctx.saveGState(); ctx.setAlpha(CGFloat(a))
    ctx.setFillColor(navy950)
    ctx.beginPath()
    ctx.move(to: CGPoint(x: CGFloat(x), y: 0))
    ctx.addLine(to: CGPoint(x: CGFloat(x + bw), y: 0))
    ctx.addLine(to: CGPoint(x: CGFloat(x + bw - 0.22 * Double(W)), y: CGFloat(H)))
    ctx.addLine(to: CGPoint(x: CGFloat(x - 0.22 * Double(W)), y: CGFloat(H)))
    ctx.closePath(); ctx.fillPath()
    ctx.restoreGState()
}
func drawProgress(_ ctx: CGContext, _ t: Double) {
    ctx.setFillColor(hx(0xffffff, 0.12)); ctx.fill(R(0, CGFloat(H) - 5, CGFloat(W), 5))
    ctx.setFillColor(navy600); ctx.fill(R(0, CGFloat(H) - 5, CGFloat(Double(W) * clamp(t / TOTAL)), 5))
}

// ---------- brand background ----------
func brandBG(_ ctx: CGContext, _ t: Double) {
    let cs = CGColorSpaceCreateDeviceRGB()
    let g = CGGradient(colorsSpace: cs, colors: [navy950, navy900, navy800] as CFArray, locations: [0, 0.6, 1])!
    ctx.drawLinearGradient(g, start: CGPoint(x: 0, y: CGFloat(H)), end: CGPoint(x: CGFloat(W), y: 0), options: [])
    ctx.setFillColor(hx(0xffffff, 0.035))
    let off = CGFloat((t * 12).truncatingRemainder(dividingBy: 64))
    for gx in stride(from: -64.0, through: Double(W) + 64, by: 64) {
        for gy in stride(from: -64.0, through: Double(H) + 64, by: 64) {
            let px = CGFloat(gx) + off - 1
            let py = CGFloat(Double(H) - gy) - 1
            ctx.fill(CGRect(x: px, y: py, width: 2, height: 2))
        }
    }
}

// ---------- intro ----------
func drawIntro(_ ctx: CGContext, _ t: Double) {
    if t >= 6.0 { return }
    brandBG(ctx, t)
    logoMark(ctx, 960, 350, 150, seg(t, 0.55, 0.9))
    text(ctx, "I N T R O D U C I N G", 22, 1, navy300, x: 960, top: 214, align: .center, tracking: 6, alpha: CGFloat(seg(t, 1.0, 0.6)))
    text(ctx, "MoneyMngmt", 122, 3, white, x: 960, top: 448, align: .center, tracking: 1.5, alpha: CGFloat(seg(t, 1.3, 0.7)))
    text(ctx, "Your money, beautifully organised.", 34, 0, navy300, x: 960, top: 612, align: .center, alpha: CGFloat(seg(t, 1.9, 0.6)))
    text(ctx, "Powered by your own Google Spreadsheet", 22, 0, hx(0x8ea3cf), x: 960, top: 676, align: .center, alpha: CGFloat(seg(t, 2.4, 0.6)))
}

// ---------- features ----------
let FEATURES: [(String, String, UInt32)] = [
    ("Live Google Sheets sync", "Your data stays yours", 0x4a60a6),
    ("Income & expense tracking", "Every rupee, in one place", 0x16a34a),
    ("Category reports & trends", "See where it goes", 0xf59e0b),
    ("Monthly budgets & alerts", "Never overshoot", 0xdc2626),
    ("Search, filter & export", "CSV and PDF in one click", 0x5f79bb),
    ("Custom categories & settings", "Make it truly yours", 0x354170),
]
func drawFeatures(_ ctx: CGContext, _ t: Double, _ start: Double) {
    brandBG(ctx, t)
    logoMark(ctx, 200, 150, 90, easeOutCubic(seg(t, start + 0.2, 0.7)))
    text(ctx, "Everything you need", 68, 3, white, x: 200, top: 232, align: .left, alpha: CGFloat(easeOutCubic(seg(t, start + 0.35, 0.7))))
    text(ctx, "One fast, offline-friendly dashboard.", 26, 0, navy300, x: 202, top: 322, align: .left, alpha: CGFloat(easeOutCubic(seg(t, start + 0.55, 0.7))))
    let cx: CGFloat = 200, cw: CGFloat = 1520
    for (i, f) in FEATURES.enumerated() {
        let it = start + 0.9 + Double(i) * 0.62
        let a = easeOutCubic(seg(t, it, 0.55))
        if a <= 0.002 { continue }
        let rowY = 430 + CGFloat(i) * 96
        let slide = (1 - a) * 70
        ctx.saveGState(); ctx.setAlpha(CGFloat(a))
        fillRR(ctx, cx + CGFloat(slide), rowY, cw, 80, 18, hx(0xffffff, 0.06))
        ctx.setStrokeColor(hx(0xffffff, 0.10)); ctx.setLineWidth(1); rrect(ctx, cx + CGFloat(slide), rowY, cw, 80, 18); ctx.strokePath()
        let ix = cx + 44 + CGFloat(slide)
        fillRR(ctx, ix, rowY + 16, 48, 48, 14, hx(f.2, 0.95))
        checkGlyph(ctx, ix + 24, rowY + 40, 15, white)
        text(ctx, f.0, 30, 2, white, x: ix + 74, top: rowY + 16)
        text(ctx, f.1, 20, 0, navy300, x: ix + 76, top: rowY + 47)
        ctx.restoreGState()
    }
}

// ---------- outro ----------
func drawOutro(_ ctx: CGContext, _ t: Double, _ start: Double) {
    if t < start { return }
    brandBG(ctx, t)
    logoMark(ctx, 960, 360, 150, seg(t, start + 0.25, 0.9))
    text(ctx, "MoneyMngmt", 108, 3, white, x: 960, top: 470, align: .center, tracking: 1.5, alpha: CGFloat(seg(t, start + 0.55, 0.6)))
    text(ctx, "Track · Budget · Save — smarter every month", 30, 0, navy300, x: 960, top: 632, align: .center, alpha: CGFloat(seg(t, start + 0.85, 0.6)))
    let words = ["Overview", "Transactions", "Reports", "Budgets", "Settings"]
    var wx: CGFloat = 960 - 560
    for (i, w) in words.enumerated() {
        let wa = easeOutCubic(seg(t, start + 1.15 + Double(i) * 0.12, 0.45))
        if wa <= 0.002 { continue }
        let wd = textWidth(w, 22, 1)
        ctx.saveGState(); ctx.setAlpha(CGFloat(wa))
        fillRR(ctx, wx, 700, wd + 44, 48, 24, hx(0x4a60a6, 0.30))
        text(ctx, w, 22, 1, navy100, x: wx + (wd + 44) / 2, top: 711, align: .center)
        ctx.restoreGState()
        wx += wd + 44 + 14
    }
    text(ctx, "moneymngmt.app", 24, 1, greenLight, x: 960, top: 800, align: .center, alpha: CGFloat(seg(t, start + 1.8, 0.6)))
}

// ============================================================
//  RENDER
// ============================================================
let outURL = URL(fileURLWithPath: outPath)
try? FileManager.default.removeItem(at: outURL)
try? FileManager.default.createDirectory(at: outURL.deletingLastPathComponent(), withIntermediateDirectories: true)
let writer = try! AVAssetWriter(outputURL: outURL, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 7_500_000, AVVideoMaxKeyFrameIntervalKey: 60],
])
input.expectsMediaDataInRealTime = false
let attrs: [String: Any] = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
                            kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: attrs)
writer.add(input); writer.startWriting(); writer.startSession(atSourceTime: .zero)
let cs = CGColorSpaceCreateDeviceRGB()

for i in 0..<FRAMES {
    while !input.isReadyForMoreMediaData { usleep(400) }
    var px: CVPixelBuffer?
    CVPixelBufferCreate(kCFAllocatorDefault, W, H, kCVPixelFormatType_32ARGB, attrs as CFDictionary, &px)
    let buffer = px!
    CVPixelBufferLockBaseAddress(buffer, [])
    let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: W, height: H,
                        bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
                        space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue)!
    ctx.setShouldAntialias(true); ctx.setShouldSmoothFonts(true)
    ctx.setFillColor(slate100); ctx.fill(CGRect(x: 0, y: 0, width: CGFloat(W), height: CGFloat(H)))
    let t = Double(i) / Double(FPS)
    let si = sceneIndex(t)
    let sc = S[si]

    switch sc.kind {
    case .brand:
        drawIntro(ctx, t)
        if t >= 6.0 {
            ctx.saveGState()
            withCamera(ctx, 1.0, CGPoint(x: contentCX, y: contentCY))
            drawFramedSite(ctx, 0, 0)
            ctx.restoreGState()
            drawLowerThird(ctx, "Overview", "Welcome to MoneyMngmt", t, 6.3)
        }
    case .page:
        let pan = panFor(sc, t)
        let (z, rect) = zoomFor(sc, t)
        let f = rect != nil ? focusPoint(rect!, pan) : CGPoint(x: contentCX, y: contentCY)
        ctx.saveGState()
        withCamera(ctx, z, f)
        drawFramedSite(ctx, sc.page, pan)
        ctx.restoreGState()
        if rect != nil { drawVignette(ctx, f, z) }
        drawLowerThird(ctx, sc.ltTitle, sc.ltSub, t, sc.start + 0.7)
    case .features:
        drawFeatures(ctx, t, sc.start)
    case .outro:
        if t < sc.start + 0.5 { drawFeatures(ctx, min(t, sc.start), 55.9) }
        drawOutro(ctx, t, sc.start + 0.5)
    }

    // transitions
    for b in [6.0, 17.3, 25.4, 34.1, 41.6, 47.8, 55.9, 64.6] { drawWipe(ctx, t, b) }
    drawProgress(ctx, t)

    CVPixelBufferUnlockBaseAddress(buffer, [])
    adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: CMTimeScale(FPS)))
    if i % 90 == 0 { FileHandle.standardError.write("frame \(i)/\(FRAMES)\n".data(using: .utf8)!) }
}
input.markAsFinished()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }
sem.wait()
print("DONE status=\(writer.status.rawValue) error=\(String(describing: writer.error)) -> \(outPath)")
