import type { UiStrings } from '../types';
import { actions } from './actions';
import { affectedNodes } from './affectedNodes';
import { architecture } from './architecture';
import { diagram } from './diagram';
import { footer } from './footer';
import { fullscreenViewer } from './fullscreenViewer';
import { hero } from './hero';
import { lightbox } from './lightbox';
import { map } from './map';
import { meta } from './meta';
import { nav } from './nav';
import { nodeDetail } from './nodeDetail';
import { nodeGrid } from './nodeGrid';
import { nodeModal } from './nodeModal';
import { phases } from './phases';
import { shared } from './shared';
import { viewer3d } from './viewer3d';

export const es: UiStrings = {
  meta,
  nav,
  footer,
  shared,
  hero,
  architecture,
  actions,
  phases,
  nodeGrid,
  map,
  diagram,
  nodeModal,
  lightbox,
  viewer3d,
  fullscreenViewer,
  affectedNodes,
  nodeDetail,
};
