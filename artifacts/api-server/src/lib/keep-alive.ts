/**
 * Keep a serverless invocation alive until background work finishes.
 *
 * On Vercel a function may be frozen as soon as its response is sent, so a
 * promise that is not awaited (the IndexNow submit and WebSub ping after a
 * publish) can be cut off before it runs. Vercel exposes `waitUntil` on the
 * request context; this is the same lookup `@vercel/functions` performs. Off
 * Vercel (local, tests) there is no context and the promise simply runs.
 */
const REQUEST_CONTEXT = Symbol.for("@vercel/request-context");

type RequestContext = { waitUntil?: (promise: Promise<unknown>) => void };

export function keepAlive<T>(promise: Promise<T>): Promise<T> {
  try {
    const context = (globalThis as any)[REQUEST_CONTEXT]?.get?.() as RequestContext | undefined;
    context?.waitUntil?.(promise.catch(() => undefined));
  } catch {
    // No request context: nothing to extend.
  }
  return promise;
}
