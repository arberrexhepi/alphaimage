// [GATEWAY_START] uiEvents.js
import { updateCanvas } from "./updater.js";
import { ctx, clickColor } from "./canvasContext.js";
import { addNewState } from "./stateManager.js";

export function setupEventListeners() {
  document.getElementById("toleranceSlider").addEventListener("change", runChange);
  document.getElementById("featherSlider").addEventListener("change", runChange);
  document.getElementById("canvas").addEventListener("click", handleClick);
}

function handleClick(e) {
  let rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;

  let data = ctx.getImageData(x, y, 1, 1).data;
  clickColor = { r: data[0], g: data[1], b: data[2] };

  let tolerance = parseInt(document.getElementById("toleranceSlider").value);
  let feather = parseInt(document.getElementById("reatherSlider").value);

  runRemoval(currentImageData, tolerance, globalOff, feather)
    .then((data) => {
      currentImageData = data;
      addNewState(data);
    })
    .catch((error) => {
      console.error("Error running removal: ", error);
    });
}

function runChange() {
  if (currentImageData) {
    addNewState(currentImageData);
  }
}

// [GATEWAY_END] uiEvents.js
