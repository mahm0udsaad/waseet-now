import AppKit
import Foundation

func makeColor(hex: String, alpha: CGFloat = 1.0) -> NSColor {
    let cleaned = hex.replacingOccurrences(of: "#", with: "")
    guard cleaned.count == 6, let value = Int(cleaned, radix: 16) else {
        return NSColor.white
    }
    return NSColor(
        calibratedRed: CGFloat((value >> 16) & 0xff) / 255.0,
        green: CGFloat((value >> 8) & 0xff) / 255.0,
        blue: CGFloat(value & 0xff) / 255.0,
        alpha: alpha
    )
}

func makeParagraphStyle() -> NSMutableParagraphStyle {
    let style = NSMutableParagraphStyle()
    style.alignment = .center
    style.baseWritingDirection = .rightToLeft
    style.lineBreakMode = .byWordWrapping
    style.lineSpacing = 10
    return style
}

func drawText(_ text: String, in rect: CGRect, fontSize: CGFloat, weight: NSFont.Weight, color: NSColor, shadow: NSShadow? = nil) {
    let paragraph = makeParagraphStyle()
    let font = NSFont.systemFont(ofSize: fontSize, weight: weight)
    var attributes: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: color,
        .paragraphStyle: paragraph,
    ]
    if let shadow {
        attributes[.shadow] = shadow
    }
    let attributed = NSAttributedString(string: text, attributes: attributes)
    attributed.draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading])
}

let args = CommandLine.arguments
guard args.count >= 6 else {
    fputs("Usage: render-appstore-arabic-text.swift <title> <subtitle> <footer> <width> <height>\n", stderr)
    exit(1)
}

let title = args[1]
let subtitle = args[2]
let footer = args[3]
let width = Int(args[4]) ?? 1242
let height = Int(args[5]) ?? 2688

guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: width,
    pixelsHigh: height,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else {
    fputs("Failed to create bitmap\n", stderr)
    exit(1)
}

NSGraphicsContext.saveGraphicsState()
guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fputs("Failed to create graphics context\n", stderr)
    exit(1)
}
NSGraphicsContext.current = context

NSColor.clear.setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: width, height: height)).fill()

let titleShadow = NSShadow()
titleShadow.shadowColor = NSColor.black.withAlphaComponent(0.36)
titleShadow.shadowBlurRadius = 18
titleShadow.shadowOffset = NSSize(width: 0, height: -8)

drawText(
    subtitle,
    in: CGRect(x: 170, y: height - 590, width: width - 340, height: 160),
    fontSize: 60,
    weight: .medium,
    color: makeColor(hex: "F7F2EA")
)

drawText(
    title,
    in: CGRect(x: 120, y: height - 840, width: width - 240, height: 240),
    fontSize: 118,
    weight: .bold,
    color: makeColor(hex: "DFC06C"),
    shadow: titleShadow
)

drawText(
    footer,
    in: CGRect(x: 120, y: 78, width: width - 240, height: 120),
    fontSize: 82,
    weight: .medium,
    color: makeColor(hex: "D8B967")
)

NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Failed to encode PNG\n", stderr)
    exit(1)
}

FileHandle.standardOutput.write(Data(png.base64EncodedString().utf8))
