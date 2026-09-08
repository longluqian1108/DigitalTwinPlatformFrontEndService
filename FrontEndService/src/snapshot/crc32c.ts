const table = new Uint32Array(256)
for (let i = 0; i < 256; i += 1) {
  let value = i
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? (value >>> 1) ^ 0x82f63b78 : value >>> 1
  table[i] = value >>> 0
}

export function crc32c(bytes: Uint8Array, zeroStart = -1, zeroLength = 0): number {
  let crc = 0xffffffff
  const zeroEnd = zeroStart + zeroLength
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = index >= zeroStart && index < zeroEnd ? 0 : bytes[index]!
    crc = (crc >>> 8) ^ (table[(crc ^ byte) & 0xff] ?? 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
