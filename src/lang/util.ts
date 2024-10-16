export type NumberFormat = 'f' | 'd' | 'h' | 'k' | '#'

export interface NumberInfo {
  value: number
  format: 'f' | 'd' | 'h' | 'k' | '#'
  digits: number
}

const testModifierRegExp = /[\.khd#]/

export function parseNumber(x: string): NumberInfo {
  let value: number
  let format: NumberFormat = 'f'
  let digits = 0

  let res: any
  out: {
    if (res = testModifierRegExp.exec(x)) {
      switch (res[0]) {
        case '.': {
          const [, b = ''] = x.split('.')
          digits = b.length
          value = Number(x)
          break out
        }

        case 'k': {
          const [a, b = ''] = x.split('k')
          format = 'k'
          digits = b.length
          value = Number(a) * 1000 + Number(b) * (1000 / (10 ** digits))
          break out
        }

        case 'h': {
          const [a, b = ''] = x.split('h')
          format = 'h'
          digits = b.length
          value = Number(a) * 100 + Number(b) * (100 / (10 ** digits))
          break out
        }

        case 'd': {
          const [a, b = ''] = x.split('d')
          format = 'd'
          digits = b.length
          value = Number(a) * 10 + Number(b) * digits
          break out
        }

        case '#': {
          format = '#'
          value = parseInt(x.slice(1), 16)
          break out
        }
      }
    }

    value = Number(x)
  }

  return { value, format, digits }
}
