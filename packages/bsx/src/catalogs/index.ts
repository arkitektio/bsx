import {htmlCatalog} from './html';
import {logoCatalog} from './logo';
import {sceneCatalog} from './scene';
import {shadcnCatalog} from './shadcn';
import {structureCatalog} from './structure';
import {uiCatalog} from './ui';

export {htmlCatalog, logoCatalog, sceneCatalog, shadcnCatalog, structureCatalog, uiCatalog};
export * from './props';

/** The global catalogs this package defines: what the spec publishes, every UI may claim. */
export const globalCatalogs = [uiCatalog, htmlCatalog, logoCatalog, sceneCatalog, structureCatalog, shadcnCatalog] as const;
