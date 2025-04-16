// Assuming ctx is the 2D context of your canvas element
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let originalImageData;
let currentImageData;
let clickColor;
let currentState = -1;
let stateHistory = [];
let currentStateIndex = -1;
let globalOff = true;

document.getElementById("floodToggle").addEventListener("change", function (e) {
  globalOff = e.target.checked; // checked = use flood fill; unchecked = global removal
  if (globalOff) {
    document.getElementById("toggleIndicator").innerText = "(off)";
  } else {
    document.getElementById("toggleIndicator").innerText = "(on)";
  }
});

function addNewState(imageData) {
  if (!imageData) return;
  let clone = ctx.createImageData(imageData.width, imageData.height);
  clone.data.set(imageData.data);

  // Trim forward history if we're not at the end
  stateHistory = stateHistory.slice(0, currentStateIndex + 1);

  // Add the new state
  currentStateIndex++;
  stateHistory.push(clone);
}

function undo() {
  if (currentStateIndex > 0) {
    currentStateIndex--;
    const clone = ctx.createImageData(
      stateHistory[currentStateIndex].width,
      stateHistory[currentStateIndex].height
    );
    clone.data.set(stateHistory[currentStateIndex].data);
    currentImageData = clone;
    ctx.putImageData(currentImageData, 0, 0);
  } else if (currentStateIndex === 0) {
    currentStateIndex = -1;
    const clone = ctx.createImageData(
      originalImageData.width,
      originalImageData.height
    );
    clone.data.set(originalImageData.data);
    currentImageData = clone;
    ctx.putImageData(currentImageData, 0, 0);
  }
}

function redo() {
  if (currentStateIndex === -1 && stateHistory.length > 0) {
    currentStateIndex = 0;
  } else if (currentStateIndex < stateHistory.length - 1) {
    currentStateIndex++;
  } else {
    return;
  }

  const clone = ctx.createImageData(
    stateHistory[currentStateIndex].width,
    stateHistory[currentStateIndex].height
  );
  clone.data.set(stateHistory[currentStateIndex].data);
  currentImageData = clone;
  ctx.putImageData(currentImageData, 0, 0);
}

document.getElementById("imageUpload").addEventListener("change", function (e) {
  if (e.target.files && e.target.files[0]) {
    const reader = new FileReader();

    reader.onload = function (event) {
      const img = new Image();

      img.onload = function () {
        if (currentImageData !== undefined) {
          currentImadaData = "";
          originalImageData = "";
          canvas.width = "";
          canvas.height = "";
        }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        originalImageData = ctx.getImageData(0, 0, img.width, img.height);
        currentImageData = originalImageData;
        // handleToleranceChange();
        document.getElementById("instructions").style.display = "none";
        addNewState(currentImageData);
      };

      img.onerror = function () {
        console.error("Error loading image.");
      };

      img.src = event.target.result;
    };

    reader.onerror = function () {
      console.error("Error reading file.");
    };

    reader.readAsDataURL(e.target.files[0]);
  } else {
    console.log("No file selected.");
  }
});

let lastClickX = 0;
let lastClickY = 0;

function handleClick(e) {
  let rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;

  lastClickX = e.clientX;
  lastClickY = e.clientY;

  let data = ctx.getImageData(x, y, 1, 1).data;
  clickColor = { r: data[0], g: data[1], b: data[2] };
  currentState = 0;

  let tolerance = parseInt(document.getElementById("toleranceSlider").value);

  let feather = parseInt(document.getElementById("featherSlider").value);

  runRemoval(currentImageData, tolerance, globalOff);
}

function runRemoval(imageData, tolerance, globalOff) {
  let feather = parseFloat(document.getElementById("featherSlider").value);

  updateCanvas(imageData, tolerance, globalOff, feather)
    .then((finalData) => {
      currentImageData = finalData; // update state when processing completes
      addNewState(finalData);
    })
    .catch((error) => {
      console.error("An error occurred:", error);
    });
}

document.getElementById("canvas").addEventListener("click", handleClick);

//end remove with feather

function floodFill(x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  let index = getPixelIndex(x, y);
  if (visited[index / 4]) return;

  let color = { r: data[index], g: data[index + 1], b: data[index + 2] };
  if (!isWithinTolerance(color, clickColor, tolerance)) {
    boundaryPixels.push({ x, y }); // Mark as boundary pixel
    return;
  }

  data[index + 3] = 0; // Set alpha to 0 for now
  visited[index / 4] = true;

  floodFill(x + 1, y);
  floodFill(x - 1, y);
  floodFill(x, y + 1);
  floodFill(x, y - 1);
}

function removeBackground(imageData, tolerance, globalOff, feather) {
  if (globalOff) {
    return floodFillFeather(imageData, tolerance, feather); // flood + feather
  } else {
    return removeGlobalFeather(imageData, tolerance, feather); // global + feather
  }
}

function removeGlobalFeather(imageData, tolerance, feather) {
  const newImageData = ctx.createImageData(imageData.width, imageData.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const distance = Math.sqrt(
      Math.pow(clickColor.r - r, 2) +
        Math.pow(clickColor.g - g, 2) +
        Math.pow(clickColor.b - b, 2)
    );

    let alpha = data[i + 3];
    if (distance <= tolerance) {
      alpha = 0;
    } else if (distance <= tolerance + feather) {
      const featherFactor = (distance - tolerance) / feather;
      alpha *= Math.pow(featherFactor, 2) * (3 - 2 * featherFactor); // smoothstep
    }

    newImageData.data[i] = r;
    newImageData.data[i + 1] = g;
    newImageData.data[i + 2] = b;
    newImageData.data[i + 3] = Math.round(alpha);
  }

  return newImageData;
}

function floodFillFeather(imageData, tolerance, feather) {
  const rect = canvas.getBoundingClientRect();
  const startX = Math.floor(lastClickX - rect.left);
  const startY = Math.floor(lastClickY - rect.top);

  const width = imageData.width;
  const height = imageData.height;
  const sourceData = imageData.data;

  const newImageData = ctx.createImageData(width, height);
  const newData = newImageData.data;
  newData.set(sourceData); // clone

  const visited = new Uint8Array(width * height);
  const distanceMap = new Float32Array(width * height).fill(Infinity);

  function getIndex(x, y) {
    return (y * width + x) * 4;
  }

  function colorAt(index) {
    return {
      r: sourceData[index],
      g: sourceData[index + 1],
      b: sourceData[index + 2],
    };
  }

  const baseColor = colorAt(getIndex(startX, startY));
  const queue = [{ x: startX, y: startY }];

  while (queue.length) {
    const { x, y } = queue.shift();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;

    const idx = y * width + x;
    const pixelIdx = idx * 4;
    if (visited[idx]) continue;

    const color = colorAt(pixelIdx);
    const dist = Math.sqrt(
      Math.pow(baseColor.r - color.r, 2) +
        Math.pow(baseColor.g - color.g, 2) +
        Math.pow(baseColor.b - color.b, 2)
    );

    if (dist > tolerance + feather) continue;

    visited[idx] = 1;
    distanceMap[idx] = dist;

    queue.push({ x: x + 1, y });
    queue.push({ x: x - 1, y });
    queue.push({ x, y: y + 1 });
    queue.push({ x, y: y - 1 });
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const i = idx * 4;
      const dist = distanceMap[idx];

      if (dist <= tolerance + feather) {
        let alpha = newData[i + 3];

        if (dist <= tolerance) {
          alpha = 0;
        } else {
          const featherFactor = (dist - tolerance) / feather;
          alpha *= Math.pow(featherFactor, 2) * (3 - 2 * featherFactor);
        }

        newData[i + 3] = Math.round(alpha);
      }
    }
  }

  return newImageData;
}

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

document.getElementById("undoButton").addEventListener("click", undo);
document.getElementById("redoButton").addEventListener("click", redo);

//save
document.getElementById("saveButton").addEventListener("click", function (e) {
  // Convert our canvas to a data URL
  let canvasUrl = canvas.toDataURL();
  // Create an anchor, and set the href value to our data URL
  const createEl = document.createElement("a");
  createEl.setAttribute("href", canvasUrl);

  // This is the name of our downloaded file
  createEl.download = "download-this-canvas";

  // Click the download button, causing a download, and then remove it
  createEl.click();
  createEl.remove();
});

let isMobile = window.innerWidth <= 768;
let toolPanel = document.getElementById("toolPanel");

let isRightClickHeld = false;
let isHoveringOverToolPanel = false;

toolPanel.addEventListener(
  "mouseenter",
  () => (isHoveringOverToolPanel = true)
);
toolPanel.addEventListener(
  "mouseleave",
  () => (isHoveringOverToolPanel = false)
);

if (!isMobile) {
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault(); // Prevent the default context menu
  });

  document.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      isRightClickHeld = true;
    }
  });

  document.addEventListener("mouseup", (e) => {
    if (e.button === 2) {
      isRightClickHeld = false;
    }
  });

  let throttleTimer;
  document.addEventListener("mousemove", function (e) {
    if (throttleTimer) return;
    throttleTimer = setTimeout(() => {
      moveToolPanel(e);
      throttleTimer = null;
    }, 0);
  });
}

function moveToolPanel(e) {
  // Only move if NOT hovering and NOT holding right-click
  if (isHoveringOverToolPanel || isRightClickHeld) return;

  const panelWidth = toolPanel.offsetWidth;
  const panelHeight = toolPanel.offsetHeight;
  const x = Math.min(e.clientX + 20, window.innerWidth - panelWidth);
  const y = Math.min(e.clientY + 20, window.innerHeight - panelHeight);

  toolPanel.style.left = `${x}px`;
  toolPanel.style.top = `${y}px`;
  toolPanel.style.position = "absolute";
}

let isDraggingMouse = false;
let mouseOffsetX = 0;
let mouseOffsetY = 0;

toolPanel.addEventListener("mousedown", function (e) {
  if (isMobile) return; // Skip desktop mouse drag on mobile
  isDraggingMouse = true;
  mouseOffsetX = e.clientX - toolPanel.offsetLeft;
  mouseOffsetY = e.clientY - toolPanel.offsetTop;
});

document.addEventListener("mousemove", function (e) {
  if (!isDraggingMouse) return;
  const x = e.clientX - mouseOffsetX;
  const y = e.clientY - mouseOffsetY;
  toolPanel.style.left = `${x}px`;
  toolPanel.style.top = `${y}px`;
});

document.addEventListener("mouseup", function () {
  isDraggingMouse = false;
});

// Implement the functionality for undo and redo buttons
document.getElementById("undoButton").addEventListener("click", undo);
document.getElementById("redoButton").addEventListener("click", redo);

// Add your undo and redo function definitions here
