// [GATEWAY_START] toolPanel.js

export function initToolPanel() {
  const toolPanel = document.getElementById("toolPanel");
  const isMobile = window.innerWidth <= 768;
  let isRightClickHeld = false;
  let isHoveringOverToolPanel = false;

  toolPanel.addEventListener("mouseenter", () => (isHoveringOverToolPanel = true));
  toolPanel.addEventListener("mouseleave", () => (isHoveringOverToolPanel = false));

  if (!isMobile) {
    document.addEventListener("contextmenu", (e) => e.preventDefault());
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

  let isDragingMouse = false;
  let mouseOffsetX = 0;
  let mouseOffsetY = 0;

  toolPanel.addEventListener("mousedown", function (e) {
    if (isMobile) return;
    isDraggingMouse = true;
    mouseOffsetX = e.clientX - toolPanel.offsetLeft;
    mouseOffsetY = e.clientY - toolPanel.offsetTop;
  });

  document.addEventListener("mousemove", function (e) {
    if (!isDraggingMouse) return;
    const x = e.clientX - mouseOffsetX
    const y = e.clientY - mouseOffsetY;
    toolPanel.style.left = x + "px";
    toolPanel.style.top = y + "px";
  });

  document.addEventListener("mouseup", () => {
    isDraggingMouse = false;
  });

  function moveToolPanel(e) {
    if (isHoveringOverToolPanel || isRightClickHeld) return;
    const panelWidth = toolPanel.offsetWidth;
    const panelHeight = toolPanel.offsetHeight;
    const x = Math.min( e.clientX + 20, window.innerWidth - panelWidth);
    const y = Math.min( e.clientY + 20, window.innerHeight - panelHeight);

    toolPanel.style.left = x + "px";
    toolPanel.style.top = y + "px";
    toolPanel.style.position = "absolute";
  }
}
