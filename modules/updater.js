// [GATEWAY_START] updater.js

import { ctx } from "./canvasContext.js";
import { removeBackground } from "./floodFill.js";

function updateCanvas(imageData, tolerance, globalOff, feather) {
  return new Promise((resolve, reject) => {
    try {
      let newData = removeBackground(imageData, tolerance, globalOff, feather);
      ctx.putImageData(newData, 0, 0);
      resolve(newData);
    } catch (error) {
      reject(error);
    }
  });
}

export { updateCanvas };

// [GATEWAY_END] updater.js
