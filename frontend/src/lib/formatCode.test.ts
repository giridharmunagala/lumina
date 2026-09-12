import { canFormat, formatCode, formatterFor } from './formatCode'

describe('formatCode', () => {
  it('recognises supported languages case-insensitively', () => {
    expect(canFormat('JSON')).toBe(true)
    expect(canFormat('tsx')).toBe(true)
    expect(canFormat('mermaid')).toBe(false)
    expect(canFormat('')).toBe(false)
    expect(formatterFor('yml')?.parser).toBe('yaml')
  })

  it('pretty-prints minified JSON', async () => {
    const output = await formatCode('{"b":1,"a":[1,2]}', 'json')
    expect(output).toBe('{ "b": 1, "a": [1, 2] }')
  })

  it('pretty-prints JavaScript', async () => {
    const output = await formatCode('const a=[1,2,3].map(n=>n*2)', 'js')
    expect(output).toBe('const a = [1, 2, 3].map((n) => n * 2);')
  })

  it('reports a readable error for invalid source', async () => {
    await expect(formatCode('{oops', 'json')).rejects.toThrow(/Could not format this block/)
  })

  it('refuses unknown languages', async () => {
    await expect(formatCode('x', 'brainfuck')).rejects.toThrow(/cannot format/)
  })
})
