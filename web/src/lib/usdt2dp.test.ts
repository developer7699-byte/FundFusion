import { describe, expect, it } from 'vitest'
import { usdt2dp } from './utils'

describe('usdt2dp', () => {
  it('rounds the string half up without a number', () => {
    expect(usdt2dp('1234.567890123456789012')).toBe('1,234.57')
    expect(usdt2dp('0.004999999999999999')).toBe('0.00')
    expect(usdt2dp('0.005')).toBe('0.01')
    expect(usdt2dp('99.999')).toBe('100.00')
    expect(usdt2dp('9007199254740993.123')).toBe('9,00,71,99,25,47,40,993.12')
    expect(usdt2dp(undefined)).toBe('0.00')
  })
})
