import fs from 'node:fs';

function readPng(buf) {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (buf.length < 24 || !sig.every((b, i) => buf[i] === b)) return null;
    return {format: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20)};
}

function readJpeg(buf) {
    if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    let o = 2;
    while (o + 9 < buf.length) {
        if (buf[o] !== 0xff) return null;
        const marker = buf[o + 1];
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {o += 2; continue;}
        const len = buf.readUInt16BE(o + 2);
        const isSOF = marker >= 0xc0 && marker <= 0xcf &&
            marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isSOF) return {format: 'jpeg', height: buf.readUInt16BE(o + 5), width: buf.readUInt16BE(o + 7)};
        o += 2 + len;
    }
    return null;
}

function readWebp(buf) {
    if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' ||
        buf.toString('ascii', 8, 12) !== 'WEBP') return null;
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') {
        return {format: 'webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff};
    }
    if (chunk === 'VP8L') {
        const b = buf.subarray(21);
        return {
            format: 'webp',
            width: 1 + (((b[1] & 0x3f) << 8) | b[0]),
            height: 1 + (((b[3] & 0x0f) << 10) | (b[2] << 2) | ((b[1] & 0xc0) >> 6)),
        };
    }
    if (chunk === 'VP8X') {
        return {
            format: 'webp',
            width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
            height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
        };
    }
    return null;
}

// Reads image dimensions from the file header without any native dependency.
// Throws if the file is missing, empty, or not a valid PNG/JPEG/WebP.
export function probeImage(absPath) {
    const buf = fs.readFileSync(absPath);
    if (buf.length === 0) throw new Error(`empty file: ${absPath}`);
    const r = readPng(buf) || readJpeg(buf) || readWebp(buf);
    if (!r || !r.width || !r.height) throw new Error(`unrecognized or corrupt image: ${absPath}`);
    return {...r, bytes: buf.length};
}
