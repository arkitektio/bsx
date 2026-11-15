# @arkitektio/bsx

The BSX language, the blok catalogs, the blok runtime and the React renderer: one copy for every
Arkitekt frontend (the Orkestrator, newswitch, pokket).

| import | what | needs |
|---|---|---|
| `@arkitektio/bsx` | the language (`parseBsx`, `printBsx`, `analyzeBsx`, `completeBsx`, …), the vocabulary and the spec JSON | nothing |
| `@arkitektio/bsx/catalogs` | the contracts of the base catalog's families (`uiCatalog`, `htmlCatalog`, `logoCatalog`, `sceneCatalog`, `structureCatalog`, `shadcnCatalog`) and the prop-schema vocabulary | zod |
| `@arkitektio/bsx/runtime` | the runtime, `defineBlokCatalog` / `implementBlokCatalog` / `ownBlokCatalog` / `declareBlokUi`, declarations, persistence, `configureBlokPlatform` | react, zod, zustand, graphql |
| `@arkitektio/bsx/web` | `BlokRenderer`, `BlokComponentHost`, `BlokCatalogProvider`, `addBlokComponents` | react-dom |
| `@arkitektio/bsx/shadcn` | opt-in: the ui, html, logo and shadcn families drawn with shadcn/ui (`shadcnUi`, `shadcnHtml`, `shadcnLogo`, `shadcnExtras`) | radix-ui, tailwindcss, … |
| `@arkitektio/bsx/scene` | opt-in: the scene family drawn with three (`threeScene`), and the scene hosts | three, @react-three/fiber, @react-three/drei |
| `@arkitektio/bsx/editor` | the Monaco BSX editor | @monaco-editor/react |
| `@arkitektio/bsx/tailwind` | Tailwind for the classes bloks bring at run time | tailwindcss, a Vite host (`?raw`) |

Every module is reachable by its path too (`@arkitektio/bsx/renderer/runtime/task`).

## Catalogs

A blok is drawn with one **catalog**: a versioned set of components, named by the address it is
published at.

- **The base catalog** (`https://arkitekt.live/catalogs/base/v3`) is what every renderer draws,
  whole, in the contexts it draws (html, scene, logo). arkitekt-spec owns it. A blok that names no
  catalog is written for it and renders everywhere.
- **An app catalog** extends another (in the end the base) with what one frontend draws beyond it:
  the Orkestrator's (`https://arkitekt.live/catalogs/orkestrator/v1`) adds mikro's scene. A blok
  names the one it is written for. A catalog only ever adds: it never redefines a component of
  what it extends.

In this package the base catalog's components are held as **contracts**, one family per toolkit
(`uiCatalog`, `htmlCatalog`, `shadcnCatalog`, `structureCatalog`, `sceneCatalog`, `logoCatalog`):
which components a family holds and what each takes (a zod schema per component, placement, text
prop, callback events). A contract draws nothing. The language's own elements (`if`, `foreach`,
text, the parts of a host's interface) are the renderer's (`renderer/bloks/control`).

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
// app.catalog: what the renderers draw. app.contexts: where it draws the base catalog whole.

// Once, before the first render: what the bloks get from the app.
configureBlokPlatform({toast, describeError, useKeepLive, useColorScheme, tailwindTheme: appThemeCss, catalog: app.catalog});
```

What a UI draws beyond the base is its app catalog. `blokCatalogSpec({id, name, version,
description}, app.catalog)` writes it as the spec does (what the UI publishes at `id`), and
`setAppBlokCatalog(parseSpecCatalog(spec, name))` makes it the app's own view, so its parser, checks
and editor know its components.

## Text

Text is a child like any other: `<Button>Go</Button>` parses into a `Button` with a `#text` node
under it, so parsing needs no catalog. The renderer decides what a component does with its text
(`lowerBlokText`, run by the preflight): one with a `textProp` takes it as that prop, any other run
of text is drawn as a `Text` (a `span` inside a plain html element). A tree stored before text was a
node holds the prop already and renders as it did.

## In an app

- **Tailwind.** A blok's own classes are compiled at run time (`./tailwind`). The opt-in
  implementations' own classes are not: overlays portal outside the blok, and `tw-animate-css` is
  build-only. An app that uses `./shadcn` adds `@source "<path to>/node_modules/@arkitektio/bsx/dist";`.
  One that brings its own components does not need it.
- Under vitest, inline the package (`test.server.deps.inline: ['@arkitektio/bsx']`): `./tailwind` reads stylesheets with `?raw`.
- three must be a single copy in the app (it is a peer).
- `radix-ui` 1.4.x is what the shadcn implementation is tested against (its tabs fire `onValueChange` twice in 1.8).

## The spec JSON

`src/spec/` is written by arkitekt-spec's `scripts/sync_standard_catalog.py`: `vocabulary.json`,
`catalogs/base@3.json`, the snapshot `catalogs/orkestrator@1.json` and the parity corpus
`bsx_v2.json`. Never edit them here.

What a component of a family takes is written in its contract here, and the spec's base catalog is
built from that. After changing a contract: `pnpm build && pnpm spec:export`, then in arkitekt-spec
`python scripts/build_base_catalog.py <this package>/dist/spec-export` and sync back. A test
(`catalogs/catalogs.test.ts`) fails while the two disagree.
