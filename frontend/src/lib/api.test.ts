import { api } from './api'

describe('API client', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('encodes document IDs and search queries', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'a/b',
        name: 'note.md',
        relative_path: 'notes/note.md',
        root: '/home/user',
        size: 10,
        modified_at: '2026-01-01T00:00:00Z',
        content: '',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await api.file('a/b')
    await api.search('title & phrase')

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/files/a%2Fb', expect.any(Object))
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/search?q=title%20%26%20phrase',
      expect.any(Object),
    )
  })

  it('maps backend metadata and scan status into UI models', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        id: '1',
        name: 'readme.md',
        relative_path: 'docs/readme.md',
        root: '/home/user',
        size: 42,
        modified_at: '2026-01-01T00:00:00Z',
      }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        state: 'idle',
        indexed_files: 1,
        started_at: null,
        completed_at: '2026-01-01T00:00:01Z',
        error: null,
        generation: 1,
      }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.files()).resolves.toEqual([expect.objectContaining({
      path: 'docs/readme.md',
      modifiedAt: '2026-01-01T00:00:00Z',
    })])
    await expect(api.scanStatus()).resolves.toEqual(expect.objectContaining({
      state: 'idle',
      indexed: 1,
    }))
  })

  it('surfaces FastAPI error details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Index is unavailable' }), {
        status: 503,
        statusText: 'Service Unavailable',
      }),
    ))

    await expect(api.files()).rejects.toMatchObject({
      status: 503,
      detail: 'Index is unavailable',
    })
  })
})
