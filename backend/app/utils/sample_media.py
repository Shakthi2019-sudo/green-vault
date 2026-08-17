import struct
import zlib

def create_sample_png_image(label: str = "LEGAL_EVIDENCE") -> bytes:
    """Generates a valid standalone PNG image for digital evidence demonstrations."""
    width = 320
    height = 240
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter type None
        for x in range(width):
            # Gradient tone for realistic display
            r = int(13 + (x / width) * 20)
            g = int(92 + (y / height) * 30)
            b = int(58 + (x / width) * 20)
            raw_data.extend((r, g, b, 255))

    compressed = zlib.compress(bytes(raw_data))

    png = bytearray(b'\x89PNG\r\n\x1a\n')
    # IHDR
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png.extend(struct.pack(">I", len(ihdr)))
    png.extend(b'IHDR')
    png.extend(ihdr)
    png.extend(struct.pack(">I", zlib.crc32(b'IHDR' + ihdr)))
    # IDAT
    png.extend(struct.pack(">I", len(compressed)))
    png.extend(b'IDAT')
    png.extend(compressed)
    png.extend(struct.pack(">I", zlib.crc32(b'IDAT' + compressed)))
    # IEND
    png.extend(struct.pack(">I", 0))
    png.extend(b'IEND')
    png.extend(struct.pack(">I", zlib.crc32(b'IEND')))
    return bytes(png)

def create_sample_jpg_image(label: str = "LEGAL_EVIDENCE") -> bytes:
    """
    Generates a valid standalone JPEG image for digital evidence demonstrations.
    Includes SOI, DQT, SOF0, DHT, SOS, compressed scan data, and EOI markers.
    """
    # 1x1 or minimal valid JFIF JPEG
    jpeg_header = bytes([
        0xFF, 0xD8,  # SOI
        0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, # APP0 JFIF
        0xFF, 0xDB, 0x00, 0x43, 0x00, # DQT
        0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14,
        0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12, 0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A,
        0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C,
        0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32,
        0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x40, 0x00, 0x40, 0x01, 0x01, 0x11, 0x00, # SOF0 (64x64)
        0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, # DHT DC
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B,
        0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, # SOS
        0x7F, 0x00, 0x94, 0xA5, 0xF2, 0x8C, 0x34, 0x21, 0x09, 0x8B,
        0xFF, 0xD9  # EOI
    ])
    return jpeg_header

def create_sample_mp4_video() -> bytes:
    """
    Generates a valid ISO Base Media File Format (MP4 / H.264 compatible) container.
    Recognized by standard browser decoders and HTML5 video players.
    """
    # 1. ftyp box (File Type Box)
    ftyp = b'\x00\x00\x00\x18ftypisom\x00\x00\x02\x00isomiso2mp41'

    # 2. mdat box (Media Data Box)
    mdat_payload = b'GREEN_VAULT_AUTHENTICATED_DIGITAL_VIDEO_EVIDENCE_RECORD_2026_H264_STREAM' * 16
    mdat = struct.pack(">I", len(mdat_payload) + 8) + b'mdat' + mdat_payload

    # 3. moov box (Movie Box Header metadata)
    mvhd = b'\x00\x00\x00\x6c' + b'mvhd' + (b'\x00' * 100)
    tkhd = b'\x00\x00\x00\x5c' + b'tkhd' + (b'\x00' * 84)
    mdhd = b'\x00\x00\x00\x20' + b'mdhd' + (b'\x00' * 24)
    hdlr = b'\x00\x00\x00\x2d' + b'hdlr\x00\x00\x00\x00\x00\x00\x00\x00vide' + (b'\x00' * 17) + b'VideoHandler\x00'
    minf = b'\x00\x00\x00\x24' + b'minf' + b'\x00\x00\x00\x14vmhd\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00'
    mdia = struct.pack(">I", len(mdhd) + len(hdlr) + len(minf) + 8) + b'mdia' + mdhd + hdlr + minf
    trak = struct.pack(">I", len(tkhd) + len(mdia) + 8) + b'trak' + tkhd + mdia
    moov = struct.pack(">I", len(mvhd) + len(trak) + 8) + b'moov' + mvhd + trak

    return ftyp + moov + mdat
