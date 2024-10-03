import { z } from 'zod'
import { parseForm } from './parse-form.ts'

describe('parseForm', () => {
  it('with form element', () => {
    const schema = z.object({
      foo: z.string(),
      bar: z.string(),
    })

    const form = <form>
      <input name="foo" value="foo" />
      <input name="bar" value="bar" />
    </form> as HTMLFormElement

    const obj = parseForm(form, schema)

    expect(obj).toEqual({
      foo: 'foo',
      bar: 'bar',
    })
  })
})
