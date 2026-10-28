# bsx

- `packages/bsx`: [`@arkitektio/bsx`](packages/bsx/README.md), the BSX language, runtime and React renderer.
- `packages/vscode`: [BSX for VS Code](packages/vscode/README.md), highlighting, completion and `arkitekt check` in the editor.

```bash
pnpm install
pnpm build      # the library, then the extension against it
pnpm typecheck
pnpm test
```

Releases are cut by semantic-release from `main` (`next` for prereleases): `@arkitektio/bsx` goes to npm,
the `.vsix` onto the GitHub release, both with the same version.
npm publishes through trusted publishing (OIDC): `@arkitektio/bsx`'s trusted publisher on npmjs.com is
`arkitektio/bsx`, workflow `release.yaml`, and no npm token exists anywhere.
