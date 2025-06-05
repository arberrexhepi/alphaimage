// [GATEWAY_START] stateManager.js

import { ctx, canvas } from "./canvasContext.js";

export let originalImageData;
export let currentImageData;
let stateHistory = [];
let currentStateIndex = -1;

export function addNewState(imageData) {
  if (!imageData) return;
  let clone = ctx.createImageData(imageData.width, imageData.height);
  clone.data.set(imageData.data);
  stateHistory = stateHistory.slice(0, currentStateIndex + 1);
  currentStateIndex++;
  stateHistory.push(clone);
}

export function undo() {
  if (currentStateIndex > 0) {
    currentStateIndex--;
    const clone = ctx.createImageData(stateHistory[currentStateIndex].width, stateHistory[currentStateIndex].height);
    clone.data.set(stateHistory[currentStateIndex].data);
    currentImageData = clone;
    ctx.putImageData(currentImageData, 0, 0);
  } else if (currentStateIndex == 0) {
    currentStateIndex = -1;
    const clone = ctx.createImageData(originalImageData.width, originalImageData.height);
    clone.data.set(originalImageData.data);
    currentImageData = clone;
    ctx.putImageData(currentImageData, 0, 0);
  }
}

export function redo() {
  if (currentStateIndex == -1 && stateHistory.length > 0) {
    currentStateIndex = 0;
  } else if (currentStateIndex < stateHistory.length - 1) {
    currentStateIndex++;
  } else {
    return;
  }

  const clone = ctx.createImageData(stateHistory[currentStateIndex].width, stateHistory[currentStateIndex].height);
  clone.data.set(stateHistory[currentStateIndex].data);
  currentImageData = clone;
  ctx.putImageData(currentImageData, 0, 0);
}

export function setOriginal(data) {
  originalImageData = data;
  currentImageData = data;
}

// [GATEWAY_END] stateManager.js
