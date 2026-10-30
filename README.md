# bsx

- `packages/bsx`: [`@arkitektio/bsx`](packages/bsx/README.md), the BSX language, runtime and React renderer.

The VS Code extension that uses it lives in [arkitektio/arkitekt-vscode](https://github.com/arkitektio/arkitekt-vscode).

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

Releases are cut by semantic-release from `main` (`next` for prereleases): `@arkitektio/bsx` goes to npm.
npm publishes through trusted publishing (OIDC): `@arkitektio/bsx`'s trusted publisher on npmjs.com is
`arkitektio/bsx`, workflow `release.yaml`, and no npm token exists anywhere.
