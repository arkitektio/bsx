import {controlBlokComponents} from './bloks/control';
import {createBlokCatalog, type BlokCatalog} from './runtime';

/**
 * The base catalog, base@2 (`core/blok/spec/base_v2.json`): the language
 * every renderer implements (`if`/`else`, `foreach`, `match`/`case`/`default`,
 * `fragment`, `suspense`/`fallback`/`error`, `ask`). Its functions are the
 * vocabulary's (`functions/v2`), evaluated by the renderer.
 */
export const BASE_CATALOG_NAME = 'base';
export const BASE_CATALOG_VERSION = 2;
export const BASE_CATALOG_ID = `${BASE_CATALOG_NAME}@${BASE_CATALOG_VERSION}`;

export const baseBlokCatalog: BlokCatalog = createBlokCatalog(BASE_CATALOG_ID, controlBlokComponents);
