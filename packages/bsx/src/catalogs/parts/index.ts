import {dataContracts} from './data';
import {feedbackContracts} from './feedback';
import {formContracts} from './forms';
import {htmlContracts} from './html';
import {iconContracts} from './icons';
import {inspectorContracts} from './inspector';
import {layoutContracts} from './layout';
import {logoContracts} from './logo';
import {navigationContracts} from './navigation';
import {overlayContracts} from './overlays';
import {runContracts} from './run';
import {sceneContracts} from './scene';
import {structureContracts} from './structure';
import {toastContracts} from './toast';
import {typographyContracts} from './typography';

/**
 * Every component contract this package defines, by name, grouped by family
 * as the renders are. The catalogs (`../ui.ts`, `../scene.ts`, ...) pick theirs
 * from here; a name is one component, in one catalog.
 */
export const parts = {
  ...layoutContracts,
  ...typographyContracts,
  ...htmlContracts,
  ...formContracts,
  ...overlayContracts,
  ...navigationContracts,
  ...feedbackContracts,
  ...dataContracts,
  ...iconContracts,
  ...toastContracts,
  ...inspectorContracts,
  ...logoContracts,
  ...sceneContracts,
  ...runContracts,
  ...structureContracts,
};
