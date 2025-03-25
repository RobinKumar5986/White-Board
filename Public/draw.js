//FileName: draw.js

const canvas = document.getElementById("drawing-board");
const toolbar = document.getElementById("toolbar");
const context = canvas.getContext("2d", { willReadFrequently: true });

// Fix: Ensure the canvas fills the container
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

// Fix: Set default stroke color properly
document.getElementById("stroke").value = "#FFFFFF";
context.strokeStyle = "#FFFFFF";

let isPainting = false;
let lineWidth = 1;

// Stack for storing strokes
let strokes = [];
let currentStroke = [];
let backgroundImage = null;

//Save Stroke
const saveStroke = () => {
  if (currentStroke.length > 0) {
    strokes.push({
      path: [...currentStroke],
      color: context.strokeStyle,
      width: lineWidth,
    });
    currentStroke = [];
  }
};

// Un-do Stroke
const undoLast = () => {
  if (strokes.length > 0) {
    strokes.pop();
    redrawCanvas();
  }
};

const redrawCanvas = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background image if it exists
  if (backgroundImage) {
    context.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  }

  // Redraw all saved strokes
  strokes.forEach((stroke) => {
    context.beginPath();
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.width;
    stroke.path.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
      context.stroke();
    });
    context.closePath();
  });
};

// Clear Canvas
toolbar.addEventListener("click", (e) => {
  if (e.target.id === "clear") {
    strokes = [];
    backgroundImage = null;
    redrawCanvas();
  }
});

// Change Stroke Color & Line Width
toolbar.addEventListener("change", (e) => {
  if (e.target.id === "stroke") {
    context.strokeStyle = e.target.value;
  }
  if (e.target.id === "lineWidth") {
    lineWidth = parseInt(e.target.value, 10);
  }
});

let rect = canvas.getBoundingClientRect();

// Update canvas size & rect on window resize
const updateCanvasSize = () => {
  const currentStrokeStyle = context.strokeStyle;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  rect = canvas.getBoundingClientRect();
  context.strokeStyle = currentStrokeStyle;
  redrawCanvas();
};

window.addEventListener("resize", updateCanvasSize);
updateCanvasSize();

// Function to get the correct mouse position
const getMousePos = (e) => {
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
};

// Mouse Down (Start Drawing)
canvas.addEventListener("mousedown", (e) => {
  isPainting = true;
  const { x, y } = getMousePos(e);
  context.beginPath();
  context.moveTo(x, y);

  currentStroke.push({ x, y });
});

// Mouse Up (Stop Drawing)
canvas.addEventListener("mouseup", () => {
  isPainting = false;
  saveStroke(); // --> Save current stroke
  context.beginPath(); // Reset path
});

// Mouse Move (Draw)
canvas.addEventListener("mousemove", (e) => {
  if (!isPainting) return;

  const { x, y } = getMousePos(e);
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.lineTo(x, y);
  context.stroke();

  currentStroke.push({ x, y });
});

function handleUndoShortcut(e) {
  if (e.ctrlKey && e.key === "z") {
    undoLast();
    return;
  }
  //for handling ctrl + z form the tab
  if (e.ctrlKey && e.altKey && e.code === "KeyZ") {
    undoLast();
    return;
  }
}

// Listen for keydown events
document.addEventListener("keydown", handleUndoShortcut);
