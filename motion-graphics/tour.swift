import AVFoundation
import CoreGraphics
import CoreText
import Foundation
import ImageIO

// ============================================================
//  MoneyMngmt — website intro / tour video
//  Composites REAL screenshots of the running site into a
//  1920x1080, 30 fps ~24 s promo with a browser frame + tour.
// ============================================================

let W = 1920, H = 1080, FPS = 30, DUR_S = 24.0
let FRAMES = Int(Double(FPS) * DUR_S)

let SHOT_DIR = "/private/var/folders/s6/j5qr3j_57wg_02y5hf7927_00000gn/T/opencode/ae/shots/"
let outPath: String = CommandLine.arguments.count > 1
    ? CommandLine.arguments[1]
    : "/Users/najiyanasri/money mngmt 2/motion-graphics/MoneyMngmt_Website_Tour.mp4"

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

// ---------- image draw (top-left coords, upright) ----------
func drawImg(_ ctx: CGContext, _ img: CGImage, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) {
    // x,y is the TOP-LEFT corner; R() maps to CoreGraphics bottom-left space.
    ctx.draw(img, in: R(x, y, w, h))
}
func loadImg(_ path: String) -> CGImage? {
    guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
          let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { return nil }
    return img
}

// ---------- brand mark ----------
func logoMark(_ ctx: CGContext, _ cx: CGFloat, _ cy: CGFloat, _ s: CGFloat, _ appear: Double) {
    if appear <= 0.001 { return }
    let sc = CGFloat(lerp(0.6, 1.0, easeOutBack(appear)))
    let w = s * sc, h = s * sc, x = cx - w / 2, y = cy - h / 2
    ctx.saveGState()
    ctx.setShadow(offset: CGSize(width: 0, height: -10), blur: 30, color: hx(0x1e2645, 0.35))
    ctx.setFillColor(navy600); rrect(ctx, x, y, w, h, s * 0.28); ctx.fillPath()
    ctx.restoreGState()
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
        ctx.beginPath()
        ctx.move(to: CGPoint(x: p2.x - w * 0.17, y: tipY - h * 0.02))
        ctx.addLine(to: CGPoint(x: p2.x, y: tipY))
        ctx.addLine(to: CGPoint(x: p2.x - w * 0.01, y: tipY + h * 0.17))
        ctx.strokePath(); ctx.restoreGState()
    }
}

// ============================================================
//  PAGES
// ============================================================
struct Page {
    var name: String
    var title: String
    var subtitle: String
    var url: String
    var img: CGImage
    var sidebar: CGImage?
    var topbar: CGImage?
    var fullH: CGFloat
}
let defs: [(String, String, String, String)] = [
    ("overview", "Overview", "Your money at a glance", "moneymngmt.app/overview"),
    ("transactions", "Transactions", "Every record, in one place", "moneymngmt.app/transactions"),
    ("reports", "Reports", "See where your money goes", "moneymngmt.app/reports"),
    ("budgets", "Budgets", "Set limits, stay on track", "moneymngmt.app/budgets"),
    ("settings", "Settings", "Connect, customise, control", "moneymngmt.app/settings"),
]
var pages: [Page] = []
for d in defs {
    guard let img = loadImg(SHOT_DIR + d.0 + "-full.png") else { continue }
    let sidebar = img.cropping(to: CGRect(x: 0, y: 0, width: 256, height: min(1080, img.height)))
    let topbar = img.cropping(to: CGRect(x: 256, y: 0, width: 1664, height: min(64, img.height)))
    pages.append(Page(name: d.0, title: d.1, subtitle: d.2, url: d.3,
                      img: img, sidebar: sidebar, topbar: topbar, fullH: CGFloat(img.height)))
}
if pages.isEmpty { print("ERROR: no screenshots loaded"); exit(1) }

// ---------- layout ----------
let frameX: CGFloat = 80, frameY: CGFloat = 118, frameW: CGFloat = 1760, frameH: CGFloat = 930
let barH: CGFloat = 46
let contentX: CGFloat = frameX, contentY: CGFloat = frameY + barH
let contentW: CGFloat = frameW, contentH: CGFloat = frameH - barH
let s = contentW / 1920.0

// ---------- timeline ----------
let xf = 0.5
let pStart: [Double] = [3.4, 8.6, 13.4, 17.0, 20.0]
let pEnd: [Double] = [8.6, 13.4, 17.0, 20.0, 22.6]

func frameAlpha(_ t: Double) -> Double {
    if t < 3.4 { return 0 }
    if t > 22.6 { return clamp(1 - (t - 22.6) / 0.5) }
    return easeOutCubic(seg(t, 3.1, 0.6))
}

func drawPage(_ ctx: CGContext, _ i: Int, _ t: Double, _ alpha: Double) {
    if alpha <= 0.002 { return }
    let p = pages[i]
    // pan
    let dur = pEnd[i] - pStart[i]
    let maxPan = max(0, p.fullH - contentH / s)
    let panT = easeInOutCubic(seg(t, pStart[i] + 0.45, max(0.6, dur - 1.1)))
    let pan = CGFloat(maxPan * panT)
    ctx.saveGState()
    ctx.setAlpha(CGFloat(alpha))
    ctx.clip(to: R(contentX, contentY, contentW, contentH))
    drawImg(ctx, p.img, contentX, contentY - pan * s, 1920 * s, p.fullH * s)
    if let sb = p.sidebar {
        drawImg(ctx, sb, contentX, contentY, CGFloat(sb.width) * s, CGFloat(sb.height) * s)
    }
    if let tb = p.topbar {
        drawImg(ctx, tb, contentX + 256 * s, contentY, CGFloat(tb.width) * s, CGFloat(tb.height) * s)
    }
    ctx.restoreGState()
}

func drawFrameChrome(_ ctx: CGContext, _ t: Double, _ alpha: Double) {
    if alpha <= 0.002 { return }
    let grow = easeOutCubic(seg(t, 3.15, 0.6))
    let sc = CGFloat(lerp(0.965, 1.0, grow))
    ctx.saveGState()
    ctx.setAlpha(CGFloat(alpha))
    // scale whole frame about its center
    ctx.translateBy(x: frameX + frameW / 2, y: CGFloat(H) - (frameY + frameH / 2))
    ctx.scaleBy(x: sc, y: sc)
    ctx.translateBy(x: -(frameX + frameW / 2), y: -(CGFloat(H) - (frameY + frameH / 2)))
    // window
    ctx.setShadow(offset: CGSize(width: 0, height: -24), blur: 60, color: hx(0x0f172a, 0.22))
    ctx.setFillColor(white); rrect(ctx, frameX, frameY, frameW, frameH, 22); ctx.fillPath()
    ctx.setShadow(offset: .zero, blur: 0, color: nil)
    // title bar
    ctx.saveGState(); rrect(ctx, frameX, frameY, frameW, frameH, 22); ctx.clip()
    ctx.setFillColor(slate50); ctx.fill(R(frameX, frameY, frameW, barH))
    ctx.setStrokeColor(slate200); ctx.setLineWidth(1)
    ctx.beginPath(); ctx.move(to: CGPoint(x: frameX, y: CGFloat(H) - (frameY + barH)))
    ctx.addLine(to: CGPoint(x: frameX + frameW, y: CGFloat(H) - (frameY + barH))); ctx.strokePath()
    ctx.restoreGState()
    // traffic lights
    ellipse(ctx, frameX + 30, frameY + barH / 2, 7, 7, hx(0xf87171))
    ellipse(ctx, frameX + 54, frameY + barH / 2, 7, 7, hx(0xfbbf24))
    ellipse(ctx, frameX + 78, frameY + barH / 2, 7, 7, hx(0x34d399))
    // page index
    let idx = "0\(currentPage(t) + 1) / 0\(pages.count)"
    text(ctx, idx, 17, 1, slate400, x: frameX + frameW - 24, top: frameY + 15, align: .right)
    // url pill (updates per page, crossfades)
    let urlW: CGFloat = 360, urlX = frameX + frameW / 2 - urlW / 2, urlY = frameY + 9, urlH: CGFloat = 28
    fillRR(ctx, urlX, urlY, urlW, urlH, 14, white)
    ctx.setStrokeColor(slate200); ctx.setLineWidth(1); rrect(ctx, urlX, urlY, urlW, urlH, 14); ctx.strokePath()
    // lock dot
    ellipse(ctx, urlX + 20, urlY + urlH / 2, 4, 4, green)
    let cpi = currentPage(t)
    text(ctx, pages[cpi].url, 15, 1, slate500, x: urlX + urlW / 2 + 8, top: urlY + 6, align: .center)
    ctx.restoreGState()
}

func currentPage(_ t: Double) -> Int {
    var k = 0
    for i in 0..<pages.count { if t >= pStart[i] { k = i } }
    return k
}

func drawCaptionFor(_ ctx: CGContext, _ i: Int, _ a: Double) {
    if a <= 0.002 { return }
    ctx.saveGState(); ctx.setAlpha(CGFloat(a))
    text(ctx, "0\(i + 1)", 44, 4, hx(0xc7d2ea), x: 92, top: 22, tracking: 1)
    text(ctx, pages[i].title, 46, 3, navy950, x: 156, top: 22)
    text(ctx, pages[i].subtitle, 22, 0, slate500, x: 94, top: 84)
    ctx.restoreGState()
}
func drawCaption(_ ctx: CGContext, _ t: Double, _ alpha: Double) {
    if alpha <= 0.002 || t < 3.0 { return }
    let k = currentPage(t)
    let ak = easeOutCubic(seg(t, pStart[k] - 0.25, 0.6))
    drawCaptionFor(ctx, k, alpha * ak)
    if k > 0 { drawCaptionFor(ctx, k - 1, alpha * (1 - ak)) }
    // progress dots
    ctx.saveGState(); ctx.setAlpha(CGFloat(alpha))
    let n = pages.count
    let dotR: CGFloat = 5
    var dx: CGFloat = 1828 - CGFloat(n - 1) * 26
    for i in 0..<n {
        let on = i <= k
        ellipse(ctx, dx, 58, dotR + (i == k ? 2 : 0), dotR + (i == k ? 2 : 0), on ? navy700 : slate300)
        if i == k { ellipse(ctx, dx, 58, dotR - 1, dotR - 1, white) }
        dx += 26
    }
    ctx.restoreGState()
}

// ---------- intro / outro ----------
func drawIntro(_ ctx: CGContext, _ t: Double) {
    let a = 1 - easeOutCubic(seg(t, 2.9, 0.5))
    if a <= 0.002 { return }
    ctx.saveGState(); ctx.setAlpha(CGFloat(a))
    let cs = CGColorSpaceCreateDeviceRGB()
    let grad = CGGradient(colorsSpace: cs, colors: [navy950, navy900] as CFArray, locations: [0, 1])!
    ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: CGFloat(H)), end: CGPoint(x: CGFloat(W), y: 0), options: [])
    for gx in stride(from: 0, through: W, by: 64) {
        for gy in stride(from: 0, through: H, by: 64) {
            ctx.setFillColor(hx(0xffffff, 0.03))
            ctx.fill(CGRect(x: CGFloat(gx) - 1, y: CGFloat(H - gy) - 1, width: 2, height: 2))
        }
    }
    logoMark(ctx, 960, 350, 150, seg(t, 0.2, 0.9))
    text(ctx, "I N T R O D U C I N G", 22, 1, navy300, x: 960, top: 210, align: .center, tracking: 6, alpha: CGFloat(seg(t, 0.6, 0.6)))
    text(ctx, "MoneyMngmt", 122, 3, white, x: 960, top: 448, align: .center, tracking: 1.5, alpha: CGFloat(seg(t, 0.9, 0.7)))
    text(ctx, "Your personal finance dashboard", 34, 0, navy300, x: 960, top: 610, align: .center, alpha: CGFloat(seg(t, 1.5, 0.6)))
    text(ctx, "Track every rupee · Budget with confidence · Know where it goes", 24, 0, hx(0x94a3b8), x: 960, top: 672, align: .center, alpha: CGFloat(seg(t, 2.0, 0.6)))
    ctx.restoreGState()
}

func drawOutro(_ ctx: CGContext, _ t: Double) {
    if t < 22.4 { return }
    let a = easeOutCubic(seg(t, 22.4, 0.6))
    let endFade = t > 23.5 ? clamp((DUR_S - t) / 0.5) : 1.0
    ctx.saveGState(); ctx.setAlpha(CGFloat(a * endFade))
    let cs = CGColorSpaceCreateDeviceRGB()
    let grad = CGGradient(colorsSpace: cs, colors: [navy950, navy900] as CFArray, locations: [0, 1])!
    ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: CGFloat(H)), end: CGPoint(x: CGFloat(W), y: CGFloat(H)), options: [])
    logoMark(ctx, 960, 360, 150, seg(t, 22.6, 0.9))
    text(ctx, "MoneyMngmt", 108, 3, white, x: 960, top: 470, align: .center, tracking: 1.5, alpha: CGFloat(seg(t, 22.9, 0.6)))
    text(ctx, "Powered by Google Sheets", 30, 0, navy300, x: 960, top: 632, align: .center, alpha: CGFloat(seg(t, 23.2, 0.6)))
    let words = ["Track", "Budget", "Save"]
    var wx: CGFloat = 960 - 300
    for (i, wd) in words.enumerated() {
        let wa = seg(t, 23.4 + Double(i) * 0.14, 0.45)
        if wa <= 0.002 { continue }
        let wdW = textWidth(wd, 26, 2)
        ctx.saveGState(); ctx.setAlpha(CGFloat(a * endFade * wa))
        fillRR(ctx, wx, 700, wdW + 48, 52, 26, hx(0x4a60a6, 0.30))
        text(ctx, wd, 26, 2, greenLight, x: wx + (wdW + 48) / 2, top: 712, align: .center)
        ctx.restoreGState()
        wx += wdW + 48 + 18
    }
    ctx.restoreGState()
}

// ============================================================
//  RENDER
// ============================================================
let outURL = URL(fileURLWithPath: outPath)
try? FileManager.default.removeItem(at: outURL)
try? FileManager.default.createDirectory(at: outURL.deletingLastPathComponent(), withIntermediateDirectories: true)
let writer = try! AVAssetWriter(outputURL: outURL, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: W, AVVideoHeightKey: H,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 16_000_000,
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
    ctx.setFillColor(slate100); ctx.fill(CGRect(x: 0, y: 0, width: CGFloat(W), height: CGFloat(H)))

    // tour
    let fa = frameAlpha(t)
    if fa > 0.002 {
        drawFrameChrome(ctx, t, fa)
        let k = currentPage(t)
        if k > 0 { drawPage(ctx, k - 1, t, fa) }
        let inA = k == 0 ? fa : easeOutCubic(seg(t, pStart[k] - xf, xf))
        drawPage(ctx, k, t, min(fa, inA))
        drawCaption(ctx, t, fa)
    }
    drawIntro(ctx, t)
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
