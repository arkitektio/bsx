import {htmlCatalog} from './html';
import {logoCatalog} from './logo';
import {sceneCatalog} from './scene';
import {shadcnCatalog} from './shadcn';
import {structureCatalog} from './structure';
import {uiCatalog} from './ui';

export {htmlCatalog, logoCatalog, sceneCatalog, shadcnCatalog, structureCatalog, uiCatalog};
export * from './props';

/**
 * The families of the base catalog this package holds contracts for: every
 * component of it that is not the language's own (`renderer/bloks/control`).
 * The spec's `catalogs/base@3.json` is what they say (`catalogs.test.ts`).
 */
export const baseFamilies = [uiCatalog, htmlCatalog, logoCatalog, sceneCatalog, structureCatalog, shadcnCatalog] as const;
