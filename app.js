// Assuming ctx is the 2D context of your canvas element
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let originalImageData = null; // Initialize as null
let currentImageData;
let clickColor;
let currentState = -1;
let stateHistory = [];
let currentStateIndex = -1;
let globalOff = true;

// Crop functionality variables
let isCropping = false;
let cropRectangle = { startX: 0, startY: 0, endX: 0, endY: 0 };
let tempCanvasData;

// Button references for crop
const cropButton = document.getElementById("cropButton");
const confirmCropButton = document.getElementById("confirmCropButton");
const cancelCropButton = document.getElementById("cancelCropButton");

// References to other UI elements to disable/enable during cropping
const toleranceSlider = document.getElementById("toleranceSlider");
const featherSlider = document.getElementById("featherSlider");
const floodToggle = document.getElementById("floodToggle");
const saveButton = document.getElementById("saveButton");
const imageUpload = document.getElementById("imageUpload");
// Assuming undoButton and redoButton are already referenced or can be easily selected
const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");

// Resize functionality UI elements
const resizeWidthInput = document.getElementById("resizeWidthInput");
const resizeHeightInput = document.getElementById("resizeHeightInput");
const maintainAspectRatioCheckbox = document.getElementById("maintainAspectRatioCheckbox");
const applyResizeButton = document.getElementById("applyResizeButton");


document.getElementById("floodToggle").addEventListener("change", function (e) {
  globalOff = e.target.checked; // checked = use flood fill; unchecked = global removal
  if (globalOff) {
    document.getElementById("toggleIndicator").innerText = "(off)";
  } else {
    document.getElementById("toggleIndicator").innerText = "(on)";
  }
});

function addNewState(imageData) {
  if (!imageDataToStore) return;
  let imageClone = ctx.createImageData(imageDataToStore.width, imageDataToStore.height);
  imageClone.data.set(imageDataToStore.data);

  const newState = {
    imageData: imageClone,
    width: canvas.width, // Capture canvas width at this state
    height: canvas.height // Capture canvas height at this state
  };

  // Trim forward history if we're not at the end
  stateHistory = stateHistory.slice(0, currentStateIndex + 1);

  // Add the new state
  currentStateIndex++;
  stateHistory.push(newState);
}

function undo() {
  if (currentStateIndex > 0) { // Was previously in history, move to prior history state
    currentStateIndex--;
    const stateToRestore = stateHistory[currentStateIndex];
    canvas.width = stateToRestore.width;
    canvas.height = stateToRestore.height;
    currentImageData = stateToRestore.imageData; // Use direct reference
    ctx.putImageData(currentImageData, 0, 0);
    resizeWidthInput.value = stateToRestore.width;
    resizeHeightInput.value = stateToRestore.height;
  } else if (currentStateIndex === 0) { // Was at the first history state, move to original
    currentStateIndex = -1;
    if (originalImageData && typeof originalImageData.width !== 'undefined') { // Check if originalImageData and its properties are set
        canvas.width = originalImageData.width;
        canvas.height = originalImageData.height;
        
        // Create a fresh copy for currentImageData from originalImageData.imageData
        const od = ctx.createImageData(originalImageData.imageData.width, originalImageData.imageData.height);
        od.data.set(originalImageData.imageData.data);
        currentImageData = od; // Assign the new ImageData object
        
        ctx.putImageData(currentImageData, 0, 0);
        resizeWidthInput.value = originalImageData.width;
        resizeHeightInput.value = originalImageData.height;
    }
    // else: No original image loaded, or it's been cleared. Nothing to undo to.
  }
  // If currentStateIndex is already -1, do nothing (no more undos)
}

function redo() {
  if (currentStateIndex < stateHistory.length - 1) {
    currentStateIndex++;
    const stateToRestore = stateHistory[currentStateIndex];
    canvas.width = stateToRestore.width;
    canvas.height = stateToRestore.height;
    currentImageData = stateToRestore.imageData; // Use direct reference
    ctx.putImageData(currentImageData, 0, 0);
    resizeWidthInput.value = stateToRestore.width;
    resizeHeightInput.value = stateToRestore.height;
  }
  // If currentStateIndex is already at the end of history, or if history is empty and index is -1
}

document.getElementById("imageUpload").addEventListener("change", function (e) {
  if (e.target.files && e.target.files[0]) {
    const reader = new FileReader();

    reader.onload = function (event) {
      const img = new Image();

      img.onload = function () {
        // Reset cropping state if a new image is loaded
        if (isCropping) {
          cancelCropButton.click(); // Simulate cancel to reset UI
        }
        if (currentImageData !== undefined) {
          currentImadaData = "";
          originalImageData = "";
          canvas.width = "";
          canvas.height = "";
        }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // 1. Capture and set the structured originalImageData
        const initialImgData = ctx.getImageData(0, 0, img.width, img.height);
        originalImageData = { 
            imageData: initialImgData, 
            width: img.width, 
            height: img.height 
        };

        // 2. currentImageData is a copy of the initial image data
        currentImageData = ctx.createImageData(originalImageData.imageData.width, originalImageData.imageData.height);
        currentImageData.data.set(originalImageData.imageData.data);
        
        // document.getElementById("instructions").style.display = "none"; // Already done
        
        // 3. Add the initial state to history (uses currentImageData and current canvas dimensions)
        // Ensure canvas dimensions are set before addNewState if addNewState relies on them. They are.
        addNewState(currentImageData); 

        // Populate resize inputs with original dimensions
        // This uses the new structure of originalImageData
        if (originalImageData) { 
          resizeWidthInput.value = originalImageData.width;
          resizeHeightInput.value = originalImageData.height;
        }
        document.getElementById("instructions").style.display = "none"; // Moved after resize inputs populated
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
  if (isCropping) return; // Don't process color selection clicks if cropping

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


// --- CROP FUNCTIONALITY ---

function drawCropRectangle() {
  if (!cropRectangle.startX || !cropRectangle.startY || !cropRectangle.endX || !cropRectangle.endY) return;
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    cropRectangle.startX,
    cropRectangle.startY,
    cropRectangle.endX - cropRectangle.startX,
    cropRectangle.endY - cropRectangle.startY
  );
}

function handleCropMouseDown(e) {
  if (!isCropping) return;
  const rect = canvas.getBoundingClientRect();
  cropRectangle.startX = e.clientX - rect.left;
  cropRectangle.startY = e.clientY - rect.top;
  cropRectangle.endX = e.clientX - rect.left; // Initialize end to start
  cropRectangle.endY = e.clientY - rect.top;

  // Store canvas data before drawing the rectangle for the first time in this drag sequence
  if (tempCanvasData) { // Ensure tempCanvasData from the beginning of crop mode is used
    ctx.putImageData(tempCanvasData, 0, 0);
  }


  canvas.addEventListener('mousemove', handleCropMouseMove);
  canvas.addEventListener('mouseup', handleCropMouseUp);
}

function handleCropMouseMove(e) {
  if (!isCropping) return; // Should be redundant if listeners are removed, but good practice
  const rect = canvas.getBoundingClientRect();
  cropRectangle.endX = e.clientX - rect.left;
  cropRectangle.endY = e.clientY - rect.top;

  // Restore original canvas state then draw rectangle
  if (tempCanvasData) {
    ctx.putImageData(tempCanvasData, 0, 0);
  }
  drawCropRectangle();
}

function handleCropMouseUp(e) {
  if (!isCropping) return;
  canvas.removeEventListener('mousemove', handleCropMouseMove);
  canvas.removeEventListener('mouseup', handleCropMouseUp);
  // Final cropRectangle is now set. Confirmation will handle the actual crop.
  // For now, just ensure the rectangle stays drawn until confirm/cancel
  if (tempCanvasData) {
    ctx.putImageData(tempCanvasData, 0, 0);
  }
  drawCropRectangle();
}

cropButton.addEventListener('click', () => {
  if (!originalImageData) {
    alert("Please upload an image first.");
    return;
  }
  isCropping = true;

  // Disable other controls
  toleranceSlider.disabled = true;
  featherSlider.disabled = true;
  floodToggle.disabled = true;
  saveButton.disabled = true;
  imageUpload.disabled = true;
  undoButton.disabled = true;
  redoButton.disabled = true;
  document.getElementById("canvas").removeEventListener("click", handleClick);


  // Show/hide buttons
  cropButton.style.display = 'none';
  confirmCropButton.style.display = 'inline-block';
  cancelCropButton.style.display = 'inline-block';

  // Store canvas data
  tempCanvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Add visual cue
  canvas.style.border = '2px dashed red';
  // Attach mousedown listener for cropping
  canvas.addEventListener('mousedown', handleCropMouseDown);
});

cancelCropButton.addEventListener('click', () => {
  isCropping = false;

  // Re-enable other controls
  toleranceSlider.disabled = false;
  featherSlider.disabled = false;
  floodToggle.disabled = false;
  saveButton.disabled = false;
  imageUpload.disabled = false;
  undoButton.disabled = false;
  redoButton.disabled = false;
  document.getElementById("canvas").addEventListener("click", handleClick);


  // Show/hide buttons
  cropButton.style.display = 'inline-block';
  confirmCropButton.style.display = 'none';
  cancelCropButton.style.display = 'none';

  // Restore canvas content
  if (tempCanvasData) {
    ctx.putImageData(tempCanvasData, 0, 0);
    tempCanvasData = null; // Clear it
  }
  cropRectangle = { startX: 0, startY: 0, endX: 0, endY: 0 }; // Reset crop rectangle

  // Remove visual cue
  canvas.style.border = '1px solid #ccc'; // Or original border

  // Remove crop-specific listeners
  canvas.removeEventListener('mousedown', handleCropMouseDown);
  canvas.removeEventListener('mousemove', handleCropMouseMove); // Ensure these are also removed
  canvas.removeEventListener('mouseup', handleCropMouseUp);
});

confirmCropButton.addEventListener('click', () => {
  if (!isCropping || !originalImageData) return;

  // Ensure valid crop rectangle (width and height > 0)
  const cropWidth = Math.abs(cropRectangle.endX - cropRectangle.startX);
  const cropHeight = Math.abs(cropRectangle.endY - cropRectangle.startY);

  if (cropWidth > 0 && cropHeight > 0) {
    // Determine top-left corner of the crop rectangle
    const sx = Math.min(cropRectangle.startX, cropRectangle.endX);
    const sy = Math.min(cropRectangle.startY, cropRectangle.endY);

    // Get the cropped image data from the original image (or tempCanvasData if it represents the state before selection box)
    // It's better to use tempCanvasData as it's the state before any selection rectangle was drawn.
    const croppedImageData = ctx.getImageData(sx, sy, cropWidth, cropHeight);

    // Clear canvas and resize it to the new dimensions
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    ctx.putImageData(croppedImageData, 0, 0);

    // Update currentImageData to reflect the crop
    currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // originalImageData = currentImageData; // REMOVED: originalImageData should be immutable
    
    // Add new state to history
    addNewState(currentImageData);

  } else {
    // If crop dimensions are invalid, just restore the canvas without cropping
    if (tempCanvasData) {
      ctx.putImageData(tempCanvasData, 0, 0);
    }
  }

  // Reset cropping state (similar to cancel)
  isCropping = false;
  toleranceSlider.disabled = false;
  featherSlider.disabled = false;
  floodToggle.disabled = false;
  saveButton.disabled = false;
  imageUpload.disabled = false;
  undoButton.disabled = false;
  redoButton.disabled = false;
  document.getElementById("canvas").addEventListener("click", handleClick);

  cropButton.style.display = 'inline-block';
  confirmCropButton.style.display = 'none';
  cancelCropButton.style.display = 'none';

  if (tempCanvasData) {
     // No need to restore tempCanvasData here as we've committed the crop
    tempCanvasData = null;
  }
  cropRectangle = { startX: 0, startY: 0, endX: 0, endY: 0 };
  canvas.style.border = '1px solid #ccc'; // Or original border

  canvas.removeEventListener('mousedown', handleCropMouseDown);
  canvas.removeEventListener('mousemove', handleCropMouseMove);
  canvas.removeEventListener('mouseup', handleCropMouseUp);
});


// --- RESIZE FUNCTIONALITY ---

// Event listener for width input
resizeWidthInput.addEventListener('input', () => {
  if (!originalImageData || typeof originalImageData.width === 'undefined' || typeof originalImageData.height === 'undefined') return;
  if (maintainAspectRatioCheckbox.checked) {
    const aspectRatio = originalImageData.height / originalImageData.width;
    const newWidth = parseInt(resizeWidthInput.value);
    if (!isNaN(newWidth) && newWidth > 0) {
      resizeHeightInput.value = Math.round(newWidth * aspectRatio);
    } else if (resizeWidthInput.value === "") { // Handle empty input
        resizeHeightInput.value = "";
    }
  }
});

// Event listener for height input
resizeHeightInput.addEventListener('input', () => {
  if (!originalImageData || typeof originalImageData.width === 'undefined' || typeof originalImageData.height === 'undefined') return;
  if (maintainAspectRatioCheckbox.checked) {
    const aspectRatio = originalImageData.width / originalImageData.height;
    const newHeight = parseInt(resizeHeightInput.value);
    if (!isNaN(newHeight) && newHeight > 0) {
      resizeWidthInput.value = Math.round(newHeight * aspectRatio);
    } else if (resizeHeightInput.value === "") { // Handle empty input
        resizeWidthInput.value = "";
    }
  }
});

// Event listener for aspect ratio checkbox
maintainAspectRatioCheckbox.addEventListener('change', () => {
  if (!originalImageData || typeof originalImageData.width === 'undefined' || typeof originalImageData.height === 'undefined' || !resizeWidthInput.value) return;
  if (maintainAspectRatioCheckbox.checked) {
    // When checked, adjust height based on current width and original aspect ratio
    const aspectRatio = originalImageData.height / originalImageData.width;
    const currentWidth = parseInt(resizeWidthInput.value);
    if (!isNaN(currentWidth) && currentWidth > 0) {
      resizeHeightInput.value = Math.round(currentWidth * aspectRatio);
    }
  }
  // If unchecked, no immediate action is needed, user can set dimensions freely.
});

applyResizeButton.addEventListener('click', () => {
  if (!currentImageData) { 
    alert("Please upload an image first.");
    return;
  }

  const newWidth = parseInt(resizeWidthInput.value);
  const newHeight = parseInt(resizeHeightInput.value);

  if (!newWidth || !newHeight || newWidth <= 0 || newHeight <= 0) {
    alert("Dimensions must be positive numbers.");
    return;
  }

  // Create a temporary canvas to draw the scaled image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = newWidth;
  tempCanvas.height = newHeight;
  const tempCtx = tempCanvas.getContext('2d');

  // Create a source canvas to hold currentImageData
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = currentImageData.width;
  sourceCanvas.height = currentImageData.height;
  sourceCanvas.getContext('2d').putImageData(currentImageData, 0, 0);

  // Draw the source canvas to the temporary canvas, scaled
  tempCtx.drawImage(sourceCanvas, 0, 0, currentImageData.width, currentImageData.height, 0, 0, newWidth, newHeight);

  // Update the main canvas
  canvas.width = newWidth;
  canvas.height = newHeight;
  ctx.drawImage(tempCanvas, 0, 0);

  // Update currentImageData and history
  currentImageData = ctx.getImageData(0, 0, newWidth, newHeight);
  addNewState(currentImageData);

  // originalImageData = currentImageData; // REMOVED: originalImageData should be immutable

  // Update input fields to reflect the applied dimensions
  resizeWidthInput.value = newWidth;
  resizeHeightInput.value = newHeight;

  // No specific UI changes like disabling buttons are needed as per current design.
});


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
// undoButton and redoButton event listeners are already added above.

// Add your undo and redo function definitions here
// These are already defined earlier in the script.
