// Samples a video at exact 60fps ticks (t = i/60) and writes the frame on screen at each tick.
// Usage: swift tools/extract-60fps.swift <video> <outDir>
import AVFoundation
import AppKit

let args = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let outDir = args[2]
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
let reader = try! AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(
  track: asset.tracks(withMediaType: .video)[0],
  outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(output)
reader.startReading()
let duration = CMTimeGetSeconds(asset.duration)
let total = Int((duration * 60).rounded(.down))
let ctx = CIContext()
func encode(_ s: CMSampleBuffer) -> Data {
  let rep = NSBitmapImageRep(ciImage: CIImage(cvPixelBuffer: CMSampleBufferGetImageBuffer(s)!))
  return rep.representation(using: .jpeg, properties: [.compressionFactor: 0.95])!
}
var cur: (pts: Double, data: Data)? = nil
var next = output.copyNextSampleBuffer()
var native = 0
var ticks: [String] = []
for i in 0..<total {
  let t = Double(i) / 60.0
  // advance to the last decoded frame whose timestamp is <= t
  while let n = next, CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(n)) <= t + 1e-6 || cur == nil {
    cur = (CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(n)), encode(n))
    native += 1
    next = output.copyNextSampleBuffer()
  }
  try! cur!.data.write(to: URL(fileURLWithPath: String(format: "%@/f60_%04d.jpg", outDir, i)))
  ticks.append(String(format: "{\"i\":%d,\"t\":%.5f,\"srcPts\":%.5f}", i, t, cur!.pts))
}
try! ("[\n" + ticks.joined(separator: ",\n") + "\n]\n").write(toFile: outDir + "/frames.json", atomically: true, encoding: .utf8)
print("ticks", total, "native frames used", native)
