'use strict'
import { TransformVisitor, utils } from 'visitor-as'
const { not, isStdlib } = utils
class UnrollTransform extends TransformVisitor {
  visitBlockStatement(node) {
    if (node.statements.length >= 1) {
      if (node.statements[0]?.expression?.expression?.text === 'unroll') {
        const args = node.statements[0].expression.args
        const body = args[1].declaration.body
        const times = args[0].value.low
        const res = body
        res.range = node.range
        body.statements = Array.from({ length: times }, () =>
          body.statements
        ).flat()
        return super.visitBlockStatement(res)
      }
    }
    return super.visitBlockStatement(node)
  }
  afterParse(parser) {
    const sources = parser.sources.filter(not(isStdlib))
    this.visit(sources)
  }
}
export default UnrollTransform
