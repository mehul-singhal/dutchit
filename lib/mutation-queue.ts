// Lightweight offline mutation queue backed by localStorage.
// Mutations are stored as plain JSON operations.
// The OnlineSync component drains this queue when the connection restores.

export type QueuedMutation = {
  id: string
  key: string          // human-readable label e.g. 'add-expense'
  fn: string           // serialised async function body — NOT used; we use 'type' instead
  type: string         // operation type for replay
  payload: unknown     // data needed to replay the operation
  enqueuedAt: number
}

const STORAGE_KEY = 'dutchit:mutation-queue'

function read(): QueuedMutation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function write(q: QueuedMutation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(q))
}

export const MutationQueue = {
  getAll(): QueuedMutation[] {
    return read()
  },

  enqueue(type: string, key: string, payload: unknown): QueuedMutation {
    const entry: QueuedMutation = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      key,
      fn: '',
      type,
      payload,
      enqueuedAt: Date.now(),
    }
    const q = read()
    q.push(entry)
    write(q)
    return entry
  },

  remove(id: string) {
    write(read().filter((m) => m.id !== id))
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY)
  },

  count(): number {
    return read().length
  },
}
