import AVFoundation
import Foundation

// ============================================================
//  audio.swift — builds the full mix for the MoneyMngmt explainer:
//   • synthesised background music (lofi-ish pad + bass + kick + hats)
//   • synthesised sound effects (whoosh / pop / click / riser / chime)
//   • the TTS narration clips, placed on the timeline
//  Writes master.caf (48k stereo float). Converted to AAC at mux time.
// ============================================================

let SR = 44100.0
let TOTAL = 70.5
let N = Int(TOTAL * SR)

let NARR = "/private/var/folders/s6/j5qr3j_57wg_02y5hf7927_00000gn/T/opencode/ae/narr/"
// scene name + start + duration (mirrors advanced.swift)
let SCENES: [(String, Double, Double)] = [
    ("intro", 0.3, 8.4), ("overview", 8.7, 8.6), ("charts", 17.3, 8.1),
    ("transactions", 25.4, 8.7), ("reports", 34.1, 7.5), ("budgets", 41.6, 6.2),
    ("settings", 47.8, 8.1), ("features", 55.9, 8.2), ("outro", 64.1, 6.4),
]

var L = [Float](repeating: 0, count: N)
var R = [Float](repeating: 0, count: N)
var musicL = [Float](repeating: 0, count: N)
var musicR = [Float](repeating: 0, count: N)

// ---------- deterministic noise ----------
var seed: UInt64 = 0x1234_5678_9abc_def0
func rnd() -> Double {
    seed = seed &* 6364136223846793005 &+ 1442695040888963407
    return Double((seed >> 33) & 0xFFFF) / 32768.0 - 1.0
}

func add(_ i: Int, _ l: Double, _ r: Double, _ music: Bool = false) {
    guard i >= 0 && i < N else { return }
    if music { musicL[i] += Float(l); musicR[i] += Float(r) }
    else { L[i] += Float(l); R[i] += Float(r) }
}

// ---------- one-pole low pass ----------
func lowpass(_ x: [Float]) -> [Float] {
    var y = [Float](repeating: 0, count: x.count)
    let a = Float(exp(-2.0 * Double.pi * 3800.0 / SR))
    var z: Float = 0
    for i in 0..<x.count { z = x[i] * (1 - a) + z * a; y[i] = z }
    return y
}

// ============================================================
//  MUSIC  (88 BPM, Am - F - C - G)
// ============================================================
let bpm = 88.0, beat = 60.0 / bpm, bar = beat * 4
func midi(_ m: Double) -> Double { 440.0 * pow(2.0, (m - 69.0) / 12.0) }
let chords: [[Double]] = [
    [57, 60, 64, 69],  // Am
    [53, 57, 60, 65],  // F
    [48, 52, 55, 60],  // C
    [55, 59, 62, 67],  // G
]
var t = 0.0
var barIdx = 0
while t < TOTAL {
    let idx = barIdx % chords.count
    let tones = chords[idx]
    // pad
    for m in tones {
        let f = midi(m)
        let s0 = Int(t * SR), len = Int(bar * SR)
        for k in 0..<len {
            let tt = Double(k) / SR
            let env = min(1.0, tt / 0.45) * min(1.0, (bar - tt) / 0.7)
            let v = sin(2 * .pi * f * tt) * 0.05 * env
            add(s0 + k, v * 0.9, v, true)
        }
    }
    // bass on beats 1 & 3
    for b in [0.0, 2.0] {
        let f = midi(tones[0] - 12)
        let s0 = Int((t + b * beat) * SR), len = Int(beat * 0.9 * SR)
        for k in 0..<len {
            let tt = Double(k) / SR
            let env = exp(-tt * 5.0) * min(1.0, tt / 0.01)
            let v = sin(2 * .pi * f * tt) * 0.16 * env
            add(s0 + k, v, v, true)
        }
    }
    // kick on beats 1 & 3, soft
    for b in [0.0, 2.0] {
        let s0 = Int((t + b * beat) * SR), len = Int(0.22 * SR)
        for k in 0..<len {
            let tt = Double(k) / SR
            let f = 120.0 * exp(-tt * 22.0) + 45.0
            let env = exp(-tt * 16.0)
            let v = sin(2 * .pi * f * tt) * 0.30 * env
            add(s0 + k, v, v, true)
        }
    }
    // hats on offbeats
    for b in [0.5, 1.5, 2.5, 3.5] {
        let s0 = Int((t + b * beat) * SR), len = Int(0.05 * SR)
        var hp: Float = 0, prev: Float = 0
        for k in 0..<len {
            let tt = Double(k) / SR
            let n = Float(rnd())
            hp = n - prev + 0.9 * hp; prev = n
            let env = exp(-tt * 70.0)
            let v = Double(hp) * 0.05 * env
            add(s0 + k, v, v * 0.85, true)
        }
    }
    t += bar; barIdx += 1
}
// warm up music
musicL = lowpass(musicL); musicR = lowpass(musicR)
// fades
let fin = Int(1.2 * SR), fout = Int(2.5 * SR)
for i in 0..<fin { let g = Float(i) / Float(fin); musicL[i] *= g; musicR[i] *= g }
for i in 0..<fout { let g = Float(i) / Float(fout); let j = N - 1 - i; musicL[j] *= g; musicR[j] *= g }

// ============================================================
//  SFX
// ============================================================
func sfxWhoosh(_ at: Double) {
    let s0 = Int(at * SR), len = Int(0.7 * SR)
    var lp: Float = 0
    for k in 0..<len {
        let tt = Double(k) / SR
        let env = pow(sin(.pi * min(1, tt / 0.7)), 1.5)
        let cut = 6000.0 * exp(-tt * 3.5) + 400.0
        let a = Float(exp(-2.0 * Double.pi * cut / SR))
        lp = Float(rnd()) * (1 - a) + lp * a
        let v = Double(lp) * 0.5 * env
        add(s0 + k, v, v * 0.9)
    }
}
func sfxPop(_ at: Double, _ f: Double = 880) {
    let s0 = Int(at * SR), len = Int(0.16 * SR)
    for k in 0..<len {
        let tt = Double(k) / SR
        let env = exp(-tt * 30.0)
        let v = (sin(2 * .pi * f * tt) * 0.5 + rnd() * 0.12) * 0.45 * env
        add(s0 + k, v, v)
    }
}
func sfxClick(_ at: Double) {
    let s0 = Int(at * SR), len = Int(0.03 * SR)
    for k in 0..<len {
        let tt = Double(k) / SR
        let v = rnd() * 0.25 * exp(-tt * 120.0)
        add(s0 + k, v, v)
    }
}
func sfxRiser(_ at: Double) {
    let dur = 1.6, s0 = Int(at * SR), len = Int(dur * SR)
    for k in 0..<len {
        let tt = Double(k) / SR, p = tt / dur
        let f = 220.0 * pow(6.0, p)
        let v = sin(2 * .pi * f * tt) * 0.10 * pow(p, 1.4)
        add(s0 + k, v, v * 0.9)
    }
}
func sfxChime(_ at: Double) {
    let s0 = Int(at * SR), len = Int(1.6 * SR)
    for k in 0..<len {
        let tt = Double(k) / SR
        let env = exp(-tt * 2.6)
        let v = (sin(2 * .pi * 880 * tt) * 0.5 + sin(2 * .pi * 1320 * tt) * 0.3 + sin(2 * .pi * 1760 * tt) * 0.18) * 0.22 * env
        add(s0 + k, v, v)
    }
}

// ============================================================
//  NARRATION  (placed on scene starts)
// ============================================================
var narrEnv = [Float](repeating: 0, count: N)
for (i, sc) in SCENES.enumerated() {
    let path = NARR + "\(i + 1)_\(sc.0).aiff"
    guard let f = try? AVAudioFile(forReading: URL(fileURLWithPath: path)) else {
        FileHandle.standardError.write("missing \(path)\n".data(using: .utf8)!); continue
    }
    let fmt = f.processingFormat
    let frames = AVAudioFrameCount(f.length)
    guard let buf = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: frames) else { continue }
    try? f.read(into: buf)
    let inRate = fmt.sampleRate
    let ch = buf.floatChannelData![0]
    let startT = sc.1 + 0.45
    let outCount = Int(Double(frames) / inRate * SR)
    for j in 0..<outCount {
        let srcPos = Double(j) / SR * inRate
        let i0 = Int(srcPos), fr = Float(srcPos - Double(i0))
        let s = Double(ch[min(i0, Int(frames) - 1)]) * (1 - Double(fr)) + Double(ch[min(i0 + 1, Int(frames) - 1)]) * Double(fr)
        let idx = Int(startT * SR) + j
        let v = s * 0.95
        add(idx, v, v)
        if idx >= 0 && idx < N { narrEnv[idx] = 1 }
    }
}
// smooth narration envelope for ducking
var duck = [Float](repeating: 0, count: N)
do {
    var z: Float = 0
    let ra = Float(exp(-1.0 / (0.010 * SR))), rr = Float(exp(-1.0 / (0.35 * SR)))
    for i in 0..<N {
        let target: Float = narrEnv[i] > 0.5 ? 1 : 0
        let a = target > z ? ra : rr
        z = target * (1 - a) + z * a
        duck[i] = z
    }
}
// combine
for i in 0..<N {
    let d = 1.0 - 0.55 * Double(duck[i])
    L[i] += musicL[i] * Float(0.16 * d)
    R[i] += musicR[i] * Float(0.16 * d)
}

// ---------- SFX events ----------
sfxPop(1.0, 760); sfxPop(1.45, 1020)
for (i, sc) in SCENES.enumerated() where i >= 1 && i <= 6 { sfxWhoosh(sc.1) }
sfxWhoosh(SCENES[7].1)
for k in 0..<6 { sfxPop(SCENES[7].1 + 0.7 + Double(k) * 0.62, 700 + Double(k) * 90) }
sfxClick(SCENES[1].1 + 1.4); sfxClick(SCENES[3].1 + 1.4); sfxClick(SCENES[4].1 + 1.3)
sfxRiser(SCENES[8].1 - 1.7)
sfxChime(SCENES[8].1 + 0.5)

// ---------- master limiter + normalise ----------
var peak: Float = 0
for i in 0..<N {
    L[i] = tanh(L[i] * 1.05); R[i] = tanh(R[i] * 1.05)
    peak = max(peak, max(abs(L[i]), abs(R[i])))
}
let norm = min(1.6, 0.92 / max(peak, 0.0001))
for i in 0..<N { L[i] *= Float(norm); R[i] *= Float(norm) }

// ---------- write ----------
let outURL = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "master.caf")
try? FileManager.default.removeItem(at: outURL)
let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: SR, channels: 2, interleaved: false)!
let file = try AVAudioFile(forWriting: outURL, settings: format.settings)
let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(N))!
buffer.frameLength = AVAudioFrameCount(N)
L.withUnsafeBufferPointer { buffer.floatChannelData![0].update(from: $0.baseAddress!, count: N) }
R.withUnsafeBufferPointer { buffer.floatChannelData![1].update(from: $0.baseAddress!, count: N) }
try file.write(from: buffer)
print(String(format: "wrote %@  %.1fs  peak(pre)=%.3f norm=%.2f", outURL.path, TOTAL, peak, norm))
