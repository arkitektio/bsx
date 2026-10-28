# @arkitektio/bsx

The BSX language, the blok spec, the blok runtime and the React renderer: one copy for every
Arkitekt frontend (the Orkestrator, newswitch, pokket).

| import | what | needs |
|---|---|---|
| `@arkitektio/bsx` | the language (`parseBsx`, `printBsx`, `analyzeBsx`, `completeBsx`, …), the vocabulary and catalogs | nothing |
| `@arkitektio/bsx/runtime` | the runtime, the function library, declarations, persistence, `configureBlokPlatform` | react, zod, zustand, graphql |
| `@arkitektio/bsx/web` | `BlokRenderer`, `BlokComponentHost`, the ui@1/html@1/logo@1 components, catalog composition | react-dom, radix-ui, tailwindcss, … |
| `@arkitektio/bsx/scene` | the scene@1 and run components | three, @react-three/fiber, @react-three/drei |
| `@arkitektio/bsx/editor` | the Monaco BSX editor | @monaco-editor/react |
| `@arkitektio/bsx/tailwind` | Tailwind for the classes bloks bring at run time | tailwindcss, a Vite host (`?raw`) |

Every module is reachable by its path too (`@arkitektio/bsx/renderer/runtime/task`).

## In an app

```ts
import {configureBlokPlatform} from '@arkitektio/bsx/runtime';
import {composeBlokCatalog, shadcnComposableComponents, logoBlokComponents, RawInspector} from '@arkitektio/bsx/web';
import {sceneBlokComponents, runBlokComponents} from '@arkitektio/bsx/scene';

export const catalog = composeBlokCatalog('https://example.org/catalog.json', [
  ...shadcnComposableComponents, ...sceneBlokComponents, ...runBlokComponents, ...logoBlokComponents, RawInspector,
]);

// Once, before the first render: what the bloks get from the app.
configureBlokPlatform({toast, describeError, useKeepLive, useColorScheme, tailwindTheme: appThemeCss, catalog});
```

- Tailwind does not scan `node_modules`: add `@source "<path to>/node_modules/@arkitektio/bsx/dist";`.
- Under vitest, inline the package (`test.server.deps.inline: ['@arkitektio/bsx']`): `./tailwind` reads stylesheets with `?raw`.
- three must be a single copy in the app (it is a peer).
- `radix-ui` 1.4.x is what the components are tested against (its tabs fire `onValueChange` twice in 1.8).

The spec data (`src/spec/*.json`) is written by arkitekt-spec's `scripts/sync_standard_catalog.py`; never edit it here.
