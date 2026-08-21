export interface Vector3 {
  x: number
  y: number
  z: number
}

const mix = (a: number, b: number, s: number) => a + (b - a) * s
export function interpolatePosition(
  p0: Vector3,
  v0: Vector3,
  p1: Vector3,
  v1: Vector3,
  t0: number,
  t1: number,
  renderT: number,
  maxSpeed: number,
): Vector3 {
  if (t1 <= t0 || renderT <= t0) return { ...p0 }
  if (renderT >= t1) return { ...p1 }
  const s = Math.max(0, Math.min(1, (renderT - t0) / (t1 - t0)))
  const dt = t1 - t0
  const h00 = 2 * s ** 3 - 3 * s ** 2 + 1,
    h10 = s ** 3 - 2 * s ** 2 + s
  const h01 = -2 * s ** 3 + 3 * s ** 2,
    h11 = s ** 3 - s ** 2
  const result = {
    x: h00 * p0.x + h10 * dt * v0.x + h01 * p1.x + h11 * dt * v1.x,
    y: h00 * p0.y + h10 * dt * v0.y + h01 * p1.y + h11 * dt * v1.y,
    z: h00 * p0.z + h10 * dt * v0.z + h01 * p1.z + h11 * dt * v1.z,
  }
  const margin = maxSpeed * dt
  const within = (value: number, a: number, b: number) =>
    value >= Math.min(a, b) - margin && value <= Math.max(a, b) + margin
  return within(result.x, p0.x, p1.x) &&
    within(result.y, p0.y, p1.y) &&
    within(result.z, p0.z, p1.z)
    ? result
    : { x: mix(p0.x, p1.x, s), y: mix(p0.y, p1.y, s), z: mix(p0.z, p1.z, s) }
}
