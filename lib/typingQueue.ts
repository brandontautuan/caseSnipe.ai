/**
 * Global singleton typing queue — ensures only one argument message
 * types out at a time across all panels.
 */

type Listener = () => void;

let queue: string[] = [];          // IDs waiting to type
let activeId: string | null = null; // ID currently typing
const doneIds = new Set<string>();  // IDs that have finished
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function enqueue(id: string) {
  if (activeId === null) {
    activeId = id;
  } else {
    queue.push(id);
  }
  notify();
}

export function complete(id: string) {
  if (activeId !== id) return;
  doneIds.add(id);
  const next = queue.shift() ?? null;
  activeId = next;
  notify();
}

export function getActiveId() {
  return activeId;
}

export function isDone(id: string) {
  return doneIds.has(id);
}

export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetQueue() {
  queue = [];
  activeId = null;
  doneIds.clear();
  notify();
}
