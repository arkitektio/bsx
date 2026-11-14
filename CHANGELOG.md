# [4.2.0](https://github.com/arkitektio/bsx/compare/v4.1.0...v4.2.0) (2026-11-14)


### Features

* **ports:** the dependency picker: one line per dependency, folded while it resolves by itself ([b19c9f6](https://github.com/arkitektio/bsx/commit/b19c9f6ba3ba807fb3d10712e9cd94e9b27a202f))

# [4.1.0](https://github.com/arkitektio/bsx/compare/v4.0.1...v4.1.0) (2026-11-13)


### Features

* **run:** an action's assign bloks: <args /> and assign.start() ([5025bee](https://github.com/arkitektio/bsx/commit/5025bee6b97af6619e2e993e15b2de60e2afb4b0))

## [4.0.1](https://github.com/arkitektio/bsx/compare/v4.0.0...v4.0.1) (2026-11-13)


### Bug Fixes

* **scene:** a Space shown on its own opens its scene before its notice ([4f818d9](https://github.com/arkitektio/bsx/commit/4f818d96859c8d63e6d333ee0a9a94fa05ebaf30))

# [4.0.0](https://github.com/arkitektio/bsx/compare/v3.0.0...v4.0.0) (2026-11-13)


* feat(scene)!: an action's Space places its run's dependencies in a shared room ([6bc3cc3](https://github.com/arkitektio/bsx/commit/6bc3cc3207fdd1d97cdc8e80888a9a500234d680))


### BREAKING CHANGES

* `<Overlay>` and `<Anchor>` and the OVERLAY context are gone, and
`resolveAnchors` with them. `BlokSpaceHost` is now `{useRoom(room), renderAgent(agentId,
blok)}` (a room is `{poseOf, save?, reset?}`) instead of `{placementOf}`.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

# [3.0.0](https://github.com/arkitektio/bsx/compare/v2.3.0...v3.0.0) (2026-11-05)


* feat(ports)!: drop ActionDescription and the handlebars peer ([9c0026a](https://github.com/arkitektio/bsx/commit/9c0026a027359b22f466bf32036c29eefab5adcc))


### BREAKING CHANGES

* @arkitektio/bsx/ports no longer exports
ActionDescription, FormActionDescription or useActionDescription, and
handlebars is no longer an (optional) peer. Render the description
string directly.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

# [2.3.0](https://github.com/arkitektio/bsx/compare/v2.2.1...v2.3.0) (2026-11-01)


### Features

* BlokComponentHost draws a component's tree ([539fb22](https://github.com/arkitektio/bsx/commit/539fb22947bde240c2dd78e92d7e832bc11f56f7))
* the port engine, in @arkitektio/bsx/ports ([ec62a0e](https://github.com/arkitektio/bsx/commit/ec62a0e366e2d8032894f222483a584da2b832c9))

## [2.2.1](https://github.com/arkitektio/bsx/compare/v2.2.0...v2.2.1) (2026-10-31)


### Bug Fixes

* a foreach inside a foreach reads its items' fields ([eab430a](https://github.com/arkitektio/bsx/commit/eab430a55871f75e03b4dbdef2afeab1aafeaae3))

# [2.2.0](https://github.com/arkitektio/bsx/compare/v2.1.0...v2.2.0) (2026-10-30)


### Features

* the classic math functions ([01efd75](https://github.com/arkitektio/bsx/commit/01efd75c549738ed06d3af3d41878b2fd888f40c))

# [2.1.0](https://github.com/arkitektio/bsx/compare/v2.0.0...v2.1.0) (2026-10-30)


### Features

* **vscode:** complete against a blok's own scope; arkitekt.server.connect ([31dc47a](https://github.com/arkitektio/bsx/commit/31dc47a25f8341eb9739faff3abcd3cdb1ec97d3))

# [2.0.0](https://github.com/arkitektio/bsx/compare/v1.0.1...v2.0.0) (2026-10-28)


* feat!: catalogs are contracts, apps implement them ([7746bd4](https://github.com/arkitektio/bsx/commit/7746bd4d34cfc294c4a8eae435b8170f96a0b194))


### BREAKING CHANGES

* @arkitektio/bsx/web no longer exports the component
sets (composeBlokCatalog, shadcnComposableComponents, logoBlokComponents,
RawInspector, the bloks barrel). Import the renders from
@arkitektio/bsx/shadcn and @arkitektio/bsx/scene and compose them with
declareBlokUi.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

## [1.0.1](https://github.com/arkitektio/bsx/compare/v1.0.0...v1.0.1) (2026-10-28)


### Bug Fixes

* **release:** publish with Node 24's npm 11 so trusted publishing (OIDC) applies ([2a5c112](https://github.com/arkitektio/bsx/commit/2a5c11283a875e1626eaa0e13bc6f652f0b51d4b))

# 1.0.0 (2026-10-28)


### Features

* @arkitektio/bsx, the BSX language, blok runtime and React renderer ([948a434](https://github.com/arkitektio/bsx/commit/948a434ad0c52265021a2bc0edbfaf1825132d4b))
