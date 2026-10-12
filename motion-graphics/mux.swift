import AVFoundation
import Foundation

// usage: mux <video.mp4> <audio.caf> <out.mp4>
let videoURL = URL(fileURLWithPath: CommandLine.arguments[1])
let audioURL = URL(fileURLWithPath: CommandLine.arguments[2])
let outURL = URL(fileURLWithPath: CommandLine.arguments[3])

func wait(_ e: AVAssetExportSession) {
    let sem = DispatchSemaphore(value: 0)
    e.exportAsynchronously { sem.signal() }
    sem.wait()
}

// 1) transcode the float CAF to AAC (.m4a) so it can live in an MP4
let m4aURL = URL(fileURLWithPath: NSTemporaryDirectory() + "mm_audio_\(UUID().uuidString).m4a")
try? FileManager.default.removeItem(at: m4aURL)
guard let aExporter = AVAssetExportSession(asset: AVURLAsset(url: audioURL),
                                           presetName: AVAssetExportPresetAppleM4A) else {
    print("no audio exporter"); exit(1)
}
aExporter.outputURL = m4aURL
aExporter.outputFileType = .m4a
wait(aExporter)
guard aExporter.status == .completed else {
    print("audio export failed \(aExporter.status.rawValue) \(String(describing: aExporter.error))"); exit(1)
}

// 2) compose video + audio and export
let comp = AVMutableComposition()
let vAsset = AVURLAsset(url: videoURL)
let aAsset = AVURLAsset(url: m4aURL)
guard let vTrack = vAsset.tracks(withMediaType: .video).first,
      let aTrack = aAsset.tracks(withMediaType: .audio).first else {
    print("missing track"); exit(1)
}
let vComp = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
let aComp = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
try vComp.insertTimeRange(CMTimeRange(start: .zero, duration: vAsset.duration), of: vTrack, at: .zero)
let adur = min(aAsset.duration, vAsset.duration)
try aComp.insertTimeRange(CMTimeRange(start: .zero, duration: adur), of: aTrack, at: .zero)
vComp.preferredTransform = vTrack.preferredTransform

try? FileManager.default.removeItem(at: outURL)
guard let exporter = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough) else {
    print("no exporter"); exit(1)
}
exporter.outputURL = outURL
exporter.outputFileType = .mp4
wait(exporter)
print("mux status=\(exporter.status.rawValue) err=\(String(describing: exporter.error)) -> \(outURL.path)")
try? FileManager.default.removeItem(at: m4aURL)
