// [GATEWAY_START] main.js

import { initCanvas} from './canvasContext.js';
import { setupImageLoader } from './imageLoader.js';
import { setupStateManager } from './stateManager.js';
import { initToolPanel } from './toolPanel.js';
import { attachUIEvents } from './uiEvents.js';
import { bindUpdater } from './updater.js';

window.addEventListener('DOMContentLoaded', () => {
  initCanvas;
  setupImageLoader();
  setupStateManager();
  initToolPanel();
  attachUIEvents();
  bindUpdater();
});
