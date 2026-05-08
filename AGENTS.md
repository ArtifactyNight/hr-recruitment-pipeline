<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Instructions

## Logging Rule
Task: After EVERY task, append to `cowork-log.md`:
Goal: Cowork Log is a file that records your Claude Cowork sessions during assignments. We don't need to see how good you are at using AI, but rather how you think when working with AI.

```
### [DATETIME] - [TASK NAME]
**Prompt:** ...
**Output:** ...  
**Edited:** ...
```

## General
- Feature-Based Architecture pattern
- Use zustand for statemanagement

## Styling (UX & UI)
- Mininal and Modern
- User is Human Resource, Make UI is easy to understand but detailed 
- Using `shadcn/ui` components for making every page and components

## API Guideline
- Use `elysia` for Backend
- Use `@tanstack/react-query` and `@ap0nia/eden-react-query`  for mutation and query APIs\

# Example how to use `eden-react-query` for fetching client data

```tsx
import { eden } from './eden'

export function Products() {
  const { data } = eden.api.products.get.useQuery()

  return (
    <ul>
      {data?.map((product) => (
        <li id={product.id}>{product.name}</li>
      )}
    </ul>
  )
}
```
 
