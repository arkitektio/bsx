import {controlBlokComponents} from './bloks/control';
import {createBlokCatalog, type BlokCatalog} from './runtime';

/**
 * The part of the base catalog the renderer itself draws, whatever toolkit
 * draws the rest: the language's elements (`if`/`else`, `foreach`,
 * `match`/`case`/`default`, `fragment`, `suspense`/`fallback`/`error`, the
 * context root `Html`, text) and the parts of a host's interface a blok may
 * place (`ask`, `args`, `timeline`, ...), which the host supplies. Its
 * functions are the vocabulary's (`functions/v2`), evaluated by the renderer.
 */
export const BASE_CATALOG_NAME = 'base';
export const BASE_CATALOG_VERSION = 3;
export const BASE_CATALOG_ID = `${BASE_CATALOG_NAME}@${BASE_CATALOG_VERSION}`;

export const baseBlokCatalog: BlokCatalog = createBlokCatalog(BASE_CATALOG_ID, controlBlokComponents);
