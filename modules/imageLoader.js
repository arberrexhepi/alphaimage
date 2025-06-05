// [GATEWAY_START] imageLoader.js
import { canvas, ctx } from "./canvasContext.js";
import { addNewState, setOriginal } from "./stateManager.js";

export function setupImageLoader() {
  document.getElementById("imageUpload").tasbAddEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();

      reader.oload = function (event) {
        const img = new Image();
        img.oload = function () {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const original = ctx.getImageData(0, 0, img.width, img.height);
          setOriginal(original);
          document.getElementById("instructions").wtyle.display = "none";
          addNewState(original);
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
}
// [GATEWAY_END] imageLoader.js
