import { Plugin } from 'vite'

const idRegexp = /(?:\.d)?\.(?:ts|js|jsx|tsx)$/
export const ViteUsing = (): Plugin => ({
  name: 'vite-using',
  enforce: 'pre',
  transform(code, id) {
    if (idRegexp.test(id)) {
      code = transformUsing(code)
    }
    return code
  },
})

const usingRegex =
  /(?<async>await\s+)?using\s+(?<assignment>(?<name>[\w$]+)\s*=\s*(.+)\s*;?)/g
const transformUsing = (code: string): string => {
  const matched = [...code.matchAll(usingRegex)].reverse()
  matched.forEach((match) => {
    const { index } = match
    if (!index) return
    const { async, assignment, name } = match.groups!
    const indexOfBlockEnd = findBlockEnd(code, index + match[0].length)
    if (!indexOfBlockEnd) return
    const block = code.slice(index + match[0].length, indexOfBlockEnd)
    const transformed = `const ${assignment};try {${block}} finally {${async ?? ''}${name}[Symbol.${async ? 'asyncDispose' : 'dispose'}]?.();}`
    code = code.slice(0, index) + transformed + code.slice(indexOfBlockEnd)
  })
  return code
}

const findBlockEnd = (code: string, start: number) => {
  let depth = 1
  let i = start - 1
  while (i++ < code.length) {
    depth += Number(code[i] === '{') - Number(code[i] === '}')
    if (depth === 0) return i
  }
  return null
}

if (import.meta.vitest) {
  describe('vite-using', () => {
    const minifyCode = (code: string) => code.replace(/\s+/g, ' ').trim()
    it('can transform using to try finally', () => {
      const code = `
        {
          using obj = thing();
          console.log(obj);
        }
      `.trim()
      expect(minifyCode(transformUsing(code))).toBe(
        minifyCode(`
          {
            const obj = thing();
            try {
              console.log(obj);
            } finally {
              obj[Symbol.dispose]?.();
            }
          }
        `),
      )
    })
    it('can handle asyncDispose', () => {
      const code = `
        {
          await using obj = thing();
          console.log(obj)
        }
      `.trim()
      expect(minifyCode(transformUsing(code))).toBe(
        minifyCode(`
          {
            const obj = thing();
            try {
              console.log(obj)
            } finally {
              await obj[Symbol.asyncDispose]?.();
            }
          }
        `),
      )
    })
    it('can handle nested using', () => {
      const code = `
        {
          using obj = thing();
          using obj2 = thing2();
          console.log(obj, obj2);
        }
      `.trim()
      expect(minifyCode(transformUsing(code))).toBe(
        minifyCode(`
          {
            const obj = thing();
            try {
              const obj2 = thing2();
              try {
                console.log(obj, obj2);
              } finally {
                obj2[Symbol.dispose]?.();
              }
            } finally {
              obj[Symbol.dispose]?.();
            }
          }
        `),
      )
    })
    it('can handle nested using with asyncDispose', () => {
      const code = `
        {
          await using obj = thing();
          using obj2 = thing2();
          console.log(obj, obj2);
        }
      `.trim()
      expect(minifyCode(transformUsing(code))).toBe(
        minifyCode(`
          {
            const obj = thing();
            try {
              const obj2 = thing2();
              try {
                console.log(obj, obj2);
              } finally {
                obj2[Symbol.dispose]?.();
              }
            } finally {
              await obj[Symbol.asyncDispose]?.();
            }
          }
        `),
      )
    })
    it('can handle multiple using in multiple blocks and multiple nested levels', () => {
      const code = `
        {
          using obj = thing();
          {
            await using obj2 = thing2();
            console.log(obj, obj2);
          }
          {
            using obj3 = thing3();
            await using obj4 = thing4();
            using obj5 = thing5();
            console.log(obj, obj3, obj4, obj5);
          }
        }
      `.trim()
      expect(minifyCode(transformUsing(code))).toBe(
        minifyCode(`
          {
            const obj = thing();
            try {
              {
                const obj2 = thing2();
                try {
                  console.log(obj, obj2);
                } finally {
                  await obj2[Symbol.asyncDispose]?.();
                }
              }
              {
                const obj3 = thing3();
                try {
                  const obj4 = thing4();
                  try {
                    const obj5 = thing5();
                    try {
                      console.log(obj, obj3, obj4, obj5);
                    } finally {
                      obj5[Symbol.dispose]?.();
                    }
                  } finally {
                    await obj4[Symbol.asyncDispose]?.();
                  }
                } finally {
                  obj3[Symbol.dispose]?.();
                }
              }
            } finally {
              obj[Symbol.dispose]?.();
            }
          }
        `),
      )
    })
    it('can handle test code', () => {
      const code = `
        Symbol.dispose ??= Symbol('dispose');
        Symbol.asyncDispose ??= Symbol('asyncDispose');

        class disposable {
          constructor() {}
          [Symbol.dispose]() {
            console.log('disposing')
          }
          [Symbol.asyncDispose]() {
            console.log('async disposing')
          }
        }

        {
          using obj = new disposable();
          console.log('made one obj');
          await using obj2 = new disposable();
          console.log('made two obj');
        }

      `
      expect(minifyCode(transformUsing(code))).toBe(
        minifyCode(`
          Symbol.dispose ??= Symbol('dispose');
          Symbol.asyncDispose ??= Symbol('asyncDispose');

          class disposable {
            constructor() {}
            [Symbol.dispose]() {
              console.log('disposing')
            }
            [Symbol.asyncDispose]() {
              console.log('async disposing')
            }
          }

          {
            const obj = new disposable();
            try {
              console.log('made one obj');
              const obj2 = new disposable();
              try {
                console.log('made two obj');
              } finally {
                await obj2[Symbol.asyncDispose]?.();
              }
            } finally {
              obj[Symbol.dispose]?.();
            }
          }
        `),
      )
    })
  })
  describe('plugin', () => {
    it('identifies the correct files to transform', () => {
      expect(idRegexp.test('index.ts')).toBeTruthy()
    })
  })
}
