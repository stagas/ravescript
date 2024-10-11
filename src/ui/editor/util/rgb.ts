import { hexToRgb } from 'utils'
import { oklchToHex } from './oklch.ts'

type f32 = number
type i32 = number

function i32(x: number) {
  return Math.floor(x)
}

export function rgbToInt(r: f32, g: f32, b: f32): i32 {
  return (clamp255(r * 255) << 16) | (clamp255(g * 255) << 8) | clamp255(b * 255)
}

export function hexToInt(hex: string) {
  const [r, g, b] = hexToRgb(hex)
  return rgbToInt(r, g, b)
}

export function intToHex(x: number) {
  return '#' + x.toString(16).padStart(6, '0')
}

export function clamp255(x: f32): i32 {
  if (x > 255) x = 255
  if (x < 0) x = 0
  return i32(x)
}

export function toHex(x: string) {
  return !x ? '#ffffff' : x.startsWith('oklch') ? oklchToHex(x) ?? x : x
}

