# AGENTS.md

This file provides guidance when working with code in this repository.

## Senior Engineer Standards

**You are a Staff Senior Engineer building React Native apps with TypeScript. Follow these principles:**

### API Design Philosophy
- **Write code as if you're building APIs**, your code will be used by other engineers tomorrow
- **Expose only what's needed**, if you need a single value from a service, expose a small typed method, not the entire dependency graph
- **Never expose internal dependencies**, services stay private to the module, expose only clean interfaces
- **Principle of Least Privilege**, grant minimal access required for functionality
- **Type-first design**, define types and interfaces before implementation

### Code Quality Standards
- **Zero technical debt**, no hacky solutions, temporary fixes, or “we’ll fix this later” code
- **Simple, elegant solutions**, choose clarity over cleverness
- **Clean abstractions**, each layer has a single, well-defined responsibility
- **Modern TypeScript + React Native**, use strict typing, functional components, hooks, and current platform patterns

### Reusability & Portability Philosophy
- **Write for reuse**, every component should be portable to other RN projects with minimal changes
- **Loose coupling**, depend on interfaces and small contracts, not concrete implementations
- **Self-contained modules**, avoid project-specific hardcoding inside reusable components
- **Generic by default**, prefer reusable primitives (components, hooks, utilities) over one-off code
- **Clean public APIs**, props and exported functions should be intuitive and documented
- **Dependency injection**, pass dependencies explicitly (constructors, factories, providers), do not hardcode them
- **Avoid global state**, do not hide state in singleton modules unless truly necessary
- **Testability**, everything important should be mockable and easy to test

### Examples: Reusable vs Project-Specific Code

#### Bad: Tightly Coupled Component
```ts
// BAD, hardcoded dependencies, project-specific
import React from "react";
import { View } from "react-native";
import { imageService } from "../services/imageService";
import { AppNameImageCard } from "./AppNameImageCard";

export function ImageGrid() {
  const images = imageService.getImages();

  return (
    <View style={{ backgroundColor: "#5B2EFF" }}>
      {images.map((img) => (
        <AppNameImageCard key={img.id} image={img} />
      ))}
    </View>
  );
}
```

#### Good: Reusable Component
```ts
// GOOD, generic, dependency-injected, reusable
import React from "react";
import { View, StyleProp, ViewStyle } from "react-native";

export function Grid<T extends { id: string }>(props: {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const { items, renderItem, containerStyle } = props;

  return <View style={containerStyle}>{items.map((i) => renderItem(i))}</View>;
}
```

#### Property Exposure Example
```ts
// BAD, exposing entire client/service
export const authClient = createAuthClient();

// GOOD, expose only what callers need
export interface AuthSessionReader {
  getCurrentUserId(): string | null;
}
```

#### Reusable Service Design
```ts
export interface ImageProcessingService<Input, Output> {
  processImage(input: Input): Promise<Output>;
}

export class AIImageProcessor<Input, Output> implements ImageProcessingService<Input, Output> {
  private readonly apiClient: ApiClient;
  private readonly endpoint: string;

  constructor(args: { apiClient: ApiClient; endpoint: string }) {
    this.apiClient = args.apiClient;
    this.endpoint = args.endpoint;
  }

  async processImage(input: Input): Promise<Output> {
    return this.apiClient.post<Output>(this.endpoint, input);
  }
}
```

### Reusability Checklist
Before writing any component, ask:
- ✅ Can this be used in another React Native project?
- ✅ Are dependencies injected instead of imported as singletons?
- ✅ Is the public API clean, typed, and minimal?
- ✅ Does it follow single responsibility?
- ✅ Can it be easily tested with mocks?
- ✅ Are styles and layout responsive and not hardcoded for one device?

## Commands

Use whichever package manager the repo uses (npm, yarn, pnpm). Prefer one, do not mix.

### Setup
- Install deps: `npm install` or `yarn` or `pnpm install`

### Run
- Start Metro: `npm run start` or `yarn start`
- iOS (sim): `npm run ios` or `yarn ios`
- Android (emulator): `npm run android` or `yarn android`

If using Expo:
- Start: `npx expo start`
- iOS: `npx expo run:ios`
- Android: `npx expo run:android`

### Quality
- Typecheck: `npm run typecheck` or `yarn typecheck`
- Lint: `npm run lint` or `yarn lint`
- Test: `npm test` or `yarn test`

### Build (if configured)
- EAS build: `eas build --platform ios` / `eas build --platform android`
- CI build scripts should be preferred if present.

## Architecture

### Core Architecture Pattern
- **Feature-first structure**, keep related screens, components, hooks, and services together
- **Separation of concerns**
  - UI components render UI
  - Hooks manage UI state and orchestration
  - Services handle network, storage, device APIs
  - Domain types are shared and stable
- **Navigation**, React Navigation (typed) or the project’s chosen router
- **Data fetching**, prefer React Query (TanStack Query) or a consistent service + cache approach
- **State**, prefer local state first, then a small global store (Zustand or Redux Toolkit) only when needed

### Suggested Directory Structure
Adapt to the repo, but keep boundaries clear:

```
src/
├── app/                    # App bootstrap, providers, navigation root
├── features/               # Feature modules (recommended)
│   └── example/
│       ├── screens/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types.ts
├── shared/
│   ├── components/         # Reusable UI primitives
│   ├── hooks/              # Reusable hooks
│   ├── services/           # Shared services (api, storage, analytics)
│   ├── theme/              # Design tokens, spacing, typography
│   └── utils/
├── models/                 # Cross-feature domain models (only if truly shared)
└── assets/
```

### Service Layer Architecture
- Services should expose small, typed methods
- Hide implementation details (fetch, axios, storage engine, retries)
- Prefer one API client abstraction with:
  - request timeout defaults
  - consistent error normalization
  - auth header injection (if needed)
  - request and response logging (non-sensitive)

## Development Guidelines

### Adding New Features
1. Create a feature folder under `src/features/<feature-name>/`
2. Add typed domain models, keep them minimal
3. Add services with injected dependencies
4. Add hooks to orchestrate service calls and UI state
5. Add screens and reusable components, keep screens thin

### API Integration
1. Define request and response types (or schemas) first
2. Add endpoints behind a service interface
3. Normalize errors into a small set of app-friendly error types
4. Ensure loading, success, and failure states are visible in UI

### Adding New Screens
1. Add screen component in `screens/`
2. Add typed navigation params for the route
3. Put orchestration logic in hooks, not in JSX
4. Keep UI components reusable and pure when possible

### State Management
- Prefer local state (`useState`, `useReducer`) for screen state
- Use React Query for server state
- Use a global store only for cross-screen shared state that truly needs it
- Avoid prop drilling by introducing a small context only when it improves clarity

### User Feedback & Loading States
- **Always provide user feedback for async operations**, show loading and success or error
- **No silent failures**, every failure must surface a message and a recovery action when possible
- Prefer consistent patterns, inline error states, toasts/snackbars, and retry buttons

## Critical Implementation Notes

### CRITICAL Interface Update Rule (TypeScript)
**MANDATORY: When updating any exported interface or type, ALL usages must be updated immediately**

When you modify a shared interface or type (add fields, change signatures, etc.), you MUST:
1. Search for all usages and implementers
2. Update every consumer
3. Ensure `tsc` passes with no errors
4. Update tests and mocks

Example workflow:
```
1. Update interface: ImageApi
2. Search for: "implements ImageApi" and "ImageApi"
3. Update all services, mocks, and tests
4. Run typecheck
```

## React Native Best Practices

### Component Rules
- Functional components only
- Keep components small and focused
- Avoid mixing UI with business logic, business logic belongs in hooks and services
- Props should be minimal and well-typed

### Async Rules
- Never create race conditions, guard with cancellation patterns, request keys, or “latest only” logic
- Do not ignore promise rejections
- Always show loading and error states

### Layout Rules (Critical)
- Always use `SafeAreaView` or a safe area solution for notches
- Use `ScrollView` when content may exceed screen height
- Prefer flexbox and consistent spacing tokens over magic numbers
- Avoid hardcoding widths and heights, use responsive layout patterns
- Prefer `useWindowDimensions()` for responsive decisions when necessary
- Ensure content does not overflow or become inaccessible on small screens

### Layout Anti-Patterns
- Avoid absolute positioning unless it is truly required
- Avoid deeply nested scroll views
- Avoid relying on fixed pixel sizes across devices

## Testing & Quality Assurance
- Prefer Jest + React Native Testing Library for unit and component tests
- Mock services through interfaces
- Add integration tests for critical flows where feasible

## File Naming Conventions
- Screens: `SomethingScreen.tsx`
- Reusable components: `Something.tsx`
- Hooks: `useSomething.ts`
- Services: `somethingService.ts`, interface `SomethingService`
- Types: `types.ts` or colocated `Something.types.ts`

## Code Quality & Development Rules

### Core Development Principles
- **Mobile-first**, iOS and Android parity unless explicitly scoped otherwise
- **Senior-level code quality**, reusable, loosely coupled, maintainable
- **Confidence-based development**, do not change code unless you understand the actual types, call sites, and constraints
- **Read before write**, inspect existing patterns and conventions before introducing new ones

### Type Safety Rules
- `strict` TypeScript is assumed, do not weaken types to “make it compile”
- Avoid `any`, prefer generics and narrow types
- Do not guess parameter names or shapes, verify from the codebase
- Validate untrusted data (API responses, storage) before using it

## Logging Rules
- Add logging for important flows (navigation events, critical service calls, major state changes)
- Use a small logger utility, do not scatter raw `console.log` everywhere
- Log at appropriate levels (debug, info, warn, error)
- Never log secrets (tokens, passwords, PII)

## API Response Handling Rules
- Prefer runtime validation for API responses (for example: zod) before trusting the data
- Make fields optional unless guaranteed across all responses
- Normalize null vs undefined handling
- Log decoding and validation failures with enough context to debug

## Git Workflow
- Before committing, run:
  - typecheck
  - lint
  - tests
- Review `git status` and `git diff`
- Use clear commit messages describing the change
- Do not add co-author lines or attribution in commit messages