import { describe, expect, it } from 'vitest'
import { interpolatePosition } from '@/snapshot/hermite'

describe('browser-only Hermite interpolation', () => {
  it('clamps to authoritative endpoints and never extrapolates', () => {
    const p0 = { x: 0, y: 0, z: 0 }, p1 = { x: 10, y: 0, z: 0 }, velocity = { x: 10, y: 0, z: 0 }
    expect(interpolatePosition(p0, velocity, p1, velocity, 0, 1, -1, 20)).toEqual(p0)
    expect(interpolatePosition(p0, velocity, p1, velocity, 0, 1, 2, 20)).toEqual(p1)
    expect(interpolatePosition(p0, velocity, p1, velocity, 0, 1, .5, 20).x).toBeCloseTo(5)
  })

  it('falls back to linear when Hermite leaves the safety envelope', () => {
    const result = interpolatePosition({ x: 0, y: 0, z: 0 }, { x: 1000, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: -1000, y: 0, z: 0 }, 0, 1, .5, 0)
    expect(result.x).toBeCloseTo(.5)
  })
})
