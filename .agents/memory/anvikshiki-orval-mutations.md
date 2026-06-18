---
name: Anvikshiki orval mutation conventions
description: How orval-generated TanStack Query v5 mutation and query hooks must be called in this project.
---

## Mutation variable shape

All orval-generated mutations in this project use `{ data: ... }` as the variable bag, NOT named-input objects.

**Correct:**
```ts
subscribeMutation.mutate({ data: { email } })
createMutation.mutate({ data: payload })
updateMutation.mutate({ slug, data: payload })
publishMutation.mutate({ slug, data: { publish: true } })
updateSubmission.mutate({ id, data: { status } })
adminLogin.mutate({ data: { email, password } })
```

**Wrong (these cause TS errors):**
```ts
subscribeMutation.mutate({ newsletterInput: { email } })
createMutation.mutate({ articleInput: payload })
updateMutation.mutate({ slug, articleUpdate: payload })
```

**Why:** Orval generates `MutationFunction<Result, { data: BodyType<Input> }>` or `{ slug: string; data: BodyType<Input> }` — the body param is always called `data`.

## Query options with `enabled` only

TanStack Query v5 `UseQueryOptions` requires `queryKey`. When passing only `enabled` to orval hooks, cast:

```ts
// Correct (cast as any):
useSearch({ q }, { query: { enabled: q.length >= 2 } as any })

// If slug is always defined from route params, just omit options:
const { data } = useGetArticle(slug!)
```

**Why:** Orval generates `query?: UseQueryOptions<...>` but TQ v5 made queryKey required. Casting `as any` bypasses the type issue without breaking runtime.
