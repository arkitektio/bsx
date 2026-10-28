# @arkitektio/bsx

The BSX language, the blok catalogs, the blok runtime and the React renderer: one copy for every
Arkitekt frontend (the Orkestrator, newswitch, pokket).

| import | what | needs |
|---|---|---|
| `@arkitektio/bsx` | the language (`parseBsx`, `printBsx`, `analyzeBsx`, `completeBsx`, …), the vocabulary and the spec JSON | nothing |
| `@arkitektio/bsx/catalogs` | the global catalog contracts (`uiCatalog`, `htmlCatalog`, `logoCatalog`, `sceneCatalog`, `structureCatalog`, `shadcnCatalog`) and the prop-schema vocabulary | zod |
| `@arkitektio/bsx/runtime` | the runtime, `defineBlokCatalog` / `implementBlokCatalog` / `ownBlokCatalog` / `declareBlokUi`, declarations, persistence, `configureBlokPlatform` | react, zod, zustand, graphql |
| `@arkitektio/bsx/web` | `BlokRenderer`, `BlokComponentHost`, `BlokCatalogProvider`, `addBlokComponents` | react-dom |
| `@arkitektio/bsx/shadcn` | opt-in: ui@1, html@1, logo@1 and shadcn@1 drawn with shadcn/ui (`shadcnUi`, `shadcnHtml`, `shadcnLogo`, `shadcnExtras`) | radix-ui, tailwindcss, … |
| `@arkitektio/bsx/scene` | opt-in: scene@1 drawn with three (`threeScene`), and the scene hosts | three, @react-three/fiber, @react-three/drei |
| `@arkitektio/bsx/editor` | the Monaco BSX editor | @monaco-editor/react |
| `@arkitektio/bsx/tailwind` | Tailwind for the classes bloks bring at run time | tailwindcss, a Vite host (`?raw`) |

Every module is reachable by its path too (`@arkitektio/bsx/renderer/runtime/task`).

## Catalogs

A **catalog** is a contract: which components it holds and what each takes (a zod schema per
component, placement, text prop, callback events). It draws nothing. The UI defines catalogs, in
TypeScript; the spec JSON is written from them.

- **Global catalogs** are versioned (`ui@1`) and defined here. A UI that implements one whole claims
  it, so a blok that uses only global catalogs renders in every UI that claims them.
- **A UI's own catalog** is defined and registered by that UI: newswitch's `newswitch@2`,
  orkestrator's module bloks. A blok that uses one renders only there.

An **implementation** is the app's: a render per component, a map the compiler checks against the
contract (a missing or unknown render fails `tsc`).

```ts
import {uiCatalog} from '@arkitektio/bsx/catalogs';
import {configureBlokPlatform, declareBlokUi, implementBlokCatalog, type BlokRender} from '@arkitektio/bsx/runtime';
import {shadcnExtras, shadcnHtml, shadcnLogo, shadcnUiRenders} from '@arkitektio/bsx/shadcn';
import {threeScene} from '@arkitektio/bsx/scene';

// Draw over one part of the reference implementation:
const MyButton: BlokRender<typeof uiCatalog.components.Button> = ({component, schema}) => { /* … */ };
const ui = implementBlokCatalog(uiCatalog, {...shadcnUiRenders, Button: MyButton});

export const app = declareBlokUi({
  name: 'myapp',
  implements: [ui, shadcnHtml, shadcnLogo, shadcnExtras, threeScene, myOwnCatalog],
});
// app.catalog: what the renderers draw. app.claims: the global catalogs it implements whole.

// Once, before the first render: what the bloks get from the app.
configureBlokPlatform({toast, describeError, useKeepLive, useColorScheme, tailwindTheme: appThemeCss, catalog: app.catalog});
```

A UI's own components join the language's default view (parser, checks, editor) with
`registerBlokModules([parseSpecCatalog(blokModuleSpec(name, description, app.catalog), name)])`.

## In an app

- **Tailwind.** A blok's own classes are compiled at run time (`./tailwind`). The opt-in
  implementations' own classes are not: overlays portal outside the blok, and `tw-animate-css` is
  build-only. An app that uses `./shadcn` adds `@source "<path to>/node_modules/@arkitektio/bsx/dist";`.
  One that brings its own components does not need it.
- Under vitest, inline the package (`test.server.deps.inline: ['@arkitektio/bsx']`): `./tailwind` reads stylesheets with `?raw`.
- three must be a single copy in the app (it is a peer).
- `radix-ui` 1.4.x is what the shadcn implementation is tested against (its tabs fire `onValueChange` twice in 1.8).

## The spec JSON

`src/spec/catalogs/<name>@<version>.json` for the global catalogs is written from the contracts:
`pnpm build && pnpm spec:export` (a test fails while they disagree). arkitekt-spec's
`scripts/sync_standard_catalog.py` copies them in, and writes the language it owns into this
checkout: `vocabulary.json`, `catalogs/base@2.json` and the parity corpus `bsx_v2.json`. Never
edit those three here.
