import { dspGens } from '~/generated/typescript/dsp-gens.ts'
import type { DspApi } from '~/src/as/dsp/dsp-build.ts'
import { getAllPropsReverse } from '~/src/as/dsp/util.ts'
import type { Value } from '~/src/as/dsp/value.ts'
import { Token } from '~/src/lang/tokenize.ts'
import { parseNumber, type NumberFormat, type NumberInfo } from '~/src/lang/util.ts'

const DEBUG = false

export interface ProgramValue {
  results: ProgramValueResult[]
  tokensAstNode: Map<Token, AstNode>
}

export type ProgramValueResult = { result: AstNode } & ({
  genId: string
  genData: any
} | {
  op: Token
  index: AstNode
  list: AstNode & { type: AstNode.Type.List }
} | {
  op: Token
  lhs: AstNode
  rhs: AstNode
})

export class AstNode {
  constructor(
    public type: AstNode.Type,
    data: Partial<AstNode> = {},
    public captured: Token[] = []
  ) {
    Object.assign(this, data)
  }
  id?: string
  kind?: AstNode.ProcKind
  scope: Scope = new Scope(null)
  value?:
    | { tokens: Token[] }
    | Value.Audio
    | [Value.Audio, Value.Audio]
    | NumberInfo
    | string
    | number
    | ProgramValue

  format?: NumberFormat
  digits?: number

  get bounds() {
    return Token.bounds(this.captured)
  }
}

export namespace AstNode {
  export enum Type {
    Program = 'Program',
    Proc = 'Proc',
    ProcCall = 'ProcCall',
    Procedure = 'Procedure',
    List = 'List',
    Result = 'Result',
    Literal = 'Literal',
    Id = 'Id',
    String = 'String',
  }
  export const BlockType = {
    '[': AstNode.Type.ProcCall,
    '{': AstNode.Type.Procedure,
    '(': AstNode.Type.List,
  }
  export enum ProcKind {
    Gen,
    GenStereo,
    User,
    Special,
  }
}

class Scope {
  constructor(
    public parent: Scope | null,
    public vars: Record<string, AstNode> = {}
  ) { }
  stack: AstNode[] = []
  stackPop() {
    return this.stack.pop()
  }
  stackPush(x: AstNode) {
    this.stack.push(x)
  }
  stackUnshiftOfTypes(types: AstNode.Type[], climb?: boolean): AstNode | undefined {
    let s: Scope | null = this
    let res: any
    do {
      res = unshiftOfTypes(s.stack, types)
      if (res) return res
      if (!climb) return
    } while (s = s.parent)
  }
  stackPopOfTypes(types: AstNode.Type[], climb?: boolean): AstNode | undefined {
    let s: Scope | null = this
    let res: any
    do {
      res = popOfTypes(s.stack, types)
      if (res) return res
      if (!climb) return
    } while (s = s.parent)
  }
  lookup(prop: string, climb?: boolean) {
    let s: Scope | null = this
    do {
      if (prop in s.vars) return s.vars[prop]
      if (!climb) return
    } while (s = s.parent)
  }
}

function unshiftOfTypes(arr: any[], types: any[]) {
  for (let i = 0; i < arr.length; i++) {
    if (types.includes(arr[i]?.type)) {
      return arr.splice(i, 1)[0]
    }
  }
}

function popOfTypes(arr: any[], types: any[]) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (types.includes(arr[i]?.type)) {
      return arr.splice(i, 1)[0]
    }
  }
}

const ConsumeTypes = [
  AstNode.Type.Id,
  AstNode.Type.Literal,
  AstNode.Type.Result,
  AstNode.Type.Procedure,
  AstNode.Type.String,
]

const ScopeNatives = Object.fromEntries(
  [
    ...Object.entries(dspGens).map(([id]) =>
      [id, new AstNode(AstNode.Type.Proc, { id, kind: AstNode.ProcKind.Gen })]
    ),
    ...Object.entries(dspGens).filter(([, g]) => 'hasStereoOut' in g && g.hasStereoOut).map(([id]) =>
      [id + '_st', new AstNode(AstNode.Type.Proc, { id, kind: AstNode.ProcKind.GenStereo })]
    ),
  ]
)

const ScopeSpecial = {
  pan: new AstNode(AstNode.Type.Proc, { id: 'pan', kind: AstNode.ProcKind.Special })
}

const BinOps = new Set('+ * - / ^'.split(' '))
const AssignOps = new Set('= += *= -= /= ^='.split(' '))

export function interpret(g: DspApi, data: Record<string, any>, tokens: Token[]) {
  const scope: Scope = new Scope(null, { ...ScopeNatives, ...ScopeSpecial, ...data })
  const results: ProgramValueResult[] = []
  const tokensAstNode: Map<Token, AstNode> = new Map()
  const capturing = new Set<Token[]>()

  function map(tokens: Token[], node: AstNode) {
    tokens.forEach(t => tokensAstNode.set(t, node))
    return node
  }

  type Context = ReturnType<typeof createContext>

  const uncaptured = new Set<Token>()

  function createContext(tokens: Token[]) {
    let i = 0
    let t: Token

    function next() {
      t = tokens[i++]
      if (!uncaptured.has(t)) capturing.forEach(c => c.push(t))
      return t
    }
    function peek() {
      return tokens[i] ?? tokens[i - 1] ?? tokens.at(-1)
    }
    function expectText(text: string) {
      if (text && peek()?.text !== text) {
        throw new SyntaxError('Expected text ' + text, { cause: { nodes: [peek()].filter(Boolean) } })
      }
      return next()
    }
    function until(parent: Scope, text?: string) {
      const scope = new Scope(parent)
      const captured: Token[] = [t]
      capturing.add(captured)
      while (i < tokens.length && (!text || peek()?.text !== text)) {
        const res = process(c, scope, next())
        if (res) {
          if (Array.isArray(res)) {
            res.reverse().forEach(x => scope.stackPush(x))
          }
          else {
            scope.stackPush(res)
          }
        }
      }
      if (text) expectText(text)
      capturing.delete(captured)
      return { scope, captured }
    }
    function tokensUntil(text?: string) {
      const resTokens: Token[] = []
      while (i < tokens.length && (!text || peek()?.text !== text)) {
        resTokens.push(next())
      }
      if (text) expectText(text)
      return { tokens: resTokens }
    }

    const c = { tokens, next, peek, expectText, until, tokensUntil }

    return c
  }

  const root = createContext(tokens)

  function processProcCall(node: AstNode) {
    const proc: AstNode | undefined = node.scope.stack.shift()

    if (proc) {
      if (proc.kind === AstNode.ProcKind.Gen || proc.kind === AstNode.ProcKind.GenStereo) {
        const genId = proc.id as keyof typeof dspGens
        const genInfo = dspGens[genId]
        const allProps = getAllPropsReverse(genId) as string[]

        for (const p of allProps) {
          DEBUG && console.log(p)
          let item = node.scope.lookup(p)
          if (!item) {
            item = node.scope.stackUnshiftOfTypes(ConsumeTypes)
            if (['in'].includes(p)) {
              item = node.scope.parent!.stackPopOfTypes(ConsumeTypes, true)
            }
          }
          if (item) {
            node.scope.vars[p] = item
          }
        }

        const genData = Object.fromEntries(
          Object.entries(node.scope.vars).map(([key, { value }]) =>
            [key, value]
          )
        )

        // console.log(genId, genData)
        if (allProps.includes('in') && !('in' in genData)) {
          throw new Error('Missing input for ' + genId, { cause: { nodes: [node] } })
        }

        if (proc.kind === AstNode.ProcKind.Gen) {
          const value = g.gen[genId](genData)
          if (value) {
            // console.log(genId, value)
            const result = new AstNode(AstNode.Type.Result, { value }, node.captured)
            results.push({ result, genId, genData })

            // TODO: only return for hasAudioOut
            return result
          }
        }
        else if (proc.kind === AstNode.ProcKind.GenStereo) {
          const value = g.gen_st[genId](genData)
          if (value && Array.isArray(value)) {
            // console.log(genId, value)
            const result_left = new AstNode(AstNode.Type.Result, { value: value[0] }, node.captured)
            results.push({ result: result_left, genId, genData })
            const result_right = new AstNode(AstNode.Type.Result, { value: value[1] }, node.captured)
            results.push({ result: result_right, genId, genData })

            // TODO: only return for hasAudioOut
            return [result_left, result_right]
          }
        }
      }
      else if (proc.kind === AstNode.ProcKind.User && typeof proc.value === 'object' && 'tokens' in proc.value) {
        const c = createContext(proc.value?.tokens)
        const { scope } = c.until(node.scope)
        return scope.stack.at(-1)
      }
      else if (proc.kind === AstNode.ProcKind.Special) {
        if (proc.id === 'pan') {
          const value = node.scope.stackUnshiftOfTypes(ConsumeTypes)
          if (value?.value == null) throw new TypeError('Value expected.')
          g.pan(value.value as Value)
        }
      }
    }
  }

  function process(c: Context, scope: Scope, t: Token) {
    // console.log('process', t.type, t.text)
    switch (t.type) {
      case Token.Type.Number: {
        return new AstNode(AstNode.Type.Literal, { value: parseNumber(t.text) }, [t])
      }

      case Token.Type.String: {
        return new AstNode(AstNode.Type.String, { value: t.text.slice(1, -1) })
      }

      case Token.Type.Id: {
        const node = new AstNode(AstNode.Type.Id, { value: t.text }, [t])
        const prop = scope.lookup(t.text, true)
        if (prop) {
          // not a procedure and not a literal, then map it so that
          // we can do syntax highlighting as a variable.
          if (prop.type !== AstNode.Type.Proc && prop.type !== AstNode.Type.Literal) {
            map([t], node)
          }
          // if it's a procedure not at the call position, call it.
          if ((prop.type === AstNode.Type.Proc || prop.type === AstNode.Type.Procedure) && scope.stack.length > 0) {
            const childScope = new Scope(scope)
            childScope.stackPush(prop)
            const node = new AstNode(AstNode.Type.ProcCall, { scope: childScope, captured: [t] })
            return processProcCall(node)
          }
          return prop
        }
        // it's a bare identifier, so it's a user variable, so map it
        // for syntax highlighting.
        return map([t], node)
      }

      case Token.Type.Keyword: {
        if (t.text === '@') {
          if (scope.stack.length === 1) return scope.stack.pop()
          let l: AstNode & { value: Value }
          let r: Value = scope.stack.pop()?.value as Value
          if (r == null) return
          while (scope.stack.length) {
            l = scope.stack.pop() as AstNode & { value: Value }
            r = g.math.add(l.value, r)
          }
          const node = new AstNode(AstNode.Type.Result, { value: r }, [t])
          return node
        }
        break
      }

      case Token.Type.Op:
        if (t.text === '?') {
          const index = scope.stackPopOfTypes(ConsumeTypes)
          const list = scope.stackPopOfTypes([AstNode.Type.List], true) as (AstNode & { type: AstNode.Type.List }) | undefined
          if (!index) {
            throw new Error('Missing index for pick (?).', { cause: { nodes: [t] } })
          }
          if (!list) {
            throw new Error('Missing list for pick (?).', { cause: { nodes: [t] } })
          }
          const value = g.pick(list.scope.stack.map(x => x.value as Value), index.value as number | Value)
          const node = new AstNode(AstNode.Type.Result, { value }, [t])
          results.push({ result: node, op: t, index, list })
          return node
        }
        if (BinOps.has(t.text)) {
          const r = scope.stackPopOfTypes(ConsumeTypes)
          const l = scope.stackPopOfTypes(ConsumeTypes, true)
          if (!r) {
            throw new Error('Missing right operand.', { cause: { nodes: [t] } })
          }
          if (!l) {
            throw new Error('Missing left operand.', { cause: { nodes: [t] } })
          }
          const value = (g.math as any)[t.text](l.value, r.value)
          const node = new AstNode(AstNode.Type.Result, { value }, [t])
          results.push({ result: node, op: t, lhs: l, rhs: r })
          return node
        }
        if (AssignOps.has(t.text)) {
          const r = scope.stackPopOfTypes(ConsumeTypes)
          const l = scope.stackPopOfTypes(ConsumeTypes, true)
          if (!r) {
            throw new Error('Missing right operand.', { cause: { nodes: [t] } })
          }
          if (r.type !== AstNode.Type.Id) {
            // console.error(r, l, scope)
            throw new Error('Expected identifier for assignment operation.', { cause: { nodes: [t] } })
          }
          if (!l) {
            throw new Error('Missing left operand.', { cause: { nodes: [t] } })
          }
          scope.vars[r.value as string] = l
          return
        }
        switch (t.text) {
          case '{': {
            const op = t.text
            const close = Token.Close[op]
            const value = c.tokensUntil(close)
            // we prevent proc tokens from being captured
            // when the procedure is invoked at a different location
            value.tokens.forEach(t => uncaptured.add(t))
            const node = new AstNode(AstNode.Type.Procedure, { value })
            node.kind = AstNode.ProcKind.User
            return node
          }
          case '[':
          case '(': {
            const op = t.text
            const close = Token.Close[op]
            const node = new AstNode(AstNode.BlockType[op], c.until(scope, close))
            switch (node.type) {
              case AstNode.Type.ProcCall: {
                return processProcCall(node)
              }
            }
            return node
          }
        }
        break
    }
    throw new SyntaxError('Cannot handle token: ' + t.type + ' ' + t.text, { cause: { nodes: [t] } })
  }

  function program() {
    return new AstNode(AstNode.Type.Program, {
      ...root.until(scope),
      value: {
        results,
        tokensAstNode,
      } as ProgramValue
    }) as AstNode & { value: ProgramValue }
  }

  return program()
}
