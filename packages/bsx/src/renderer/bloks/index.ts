import {dataRenders} from './data';
import {feedbackRenders} from './feedback';
import {formRenders} from './forms';
import {htmlRenders} from './html';
import {iconRenders} from './icons';
import {inspectorRenders} from './inspector/Inspector';
import {layoutRenders} from './layout';
import {logoRenders} from './logo';
import {navigationRenders} from './navigation';
import {overlayRenders} from './overlays';
import {toastRenders} from './toast';
import {typographyRenders} from './typography';

/**
 * The shadcn/HTML/SVG renders, by component name: what `@arkitektio/bsx/shadcn`
 * implements ui@1, html@1, logo@1 and shadcn@1 with. Grouped by family as the
 * contracts are (`catalogs/parts`).
 */
export const domRenders = {
  ...layoutRenders,
  ...typographyRenders,
  ...htmlRenders,
  ...formRenders,
  ...overlayRenders,
  ...navigationRenders,
  ...feedbackRenders,
  ...dataRenders,
  ...iconRenders,
  ...toastRenders,
  ...inspectorRenders,
  ...logoRenders,
};
