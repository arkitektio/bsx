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
