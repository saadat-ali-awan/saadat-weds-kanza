// Decodes every frame of the source video to tools/ref/f_NNNN.jpg for tools/diff.mjs.
// Usage: swift tools/extract-frames.swift tools/source.mp4 tools/ref
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
var i = 0
while let sample = output.copyNextSampleBuffer() {
  let rep = NSBitmapImageRep(ciImage: CIImage(cvPixelBuffer: CMSampleBufferGetImageBuffer(sample)!))
  let jpg = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.92])!
  try! jpg.write(to: URL(fileURLWithPath: String(format: "%@/f_%04d.jpg", outDir, i)))
  i += 1
}
print("frames", i)
