// Core DOM elements
const canvas = document.getElementById("drawing-board");
const context = canvas.getContext("2d", { willReadFrequently: true });
const toolbar = document.getElementById("toolbar");
const imageInput = document.getElementById("imageInput");
const imageList = document.getElementById("imageList");
const colorInput = document.getElementById("stroke");
const colorDisplay = document.getElementById("colorDisplay");
const eraserButton = document.getElementById("eraser");
const eraserSizeInput = document.getElementById("eraserSize");

// Page navigation DOM elements
const prevPageButton = document.getElementById("prev-page");
const nextPageButton = document.getElementById("next-page");
const currentPageSpan = document.getElementById("current-page");
const totalPagesSpan = document.getElementById("total-pages");
const newPageButton = document.getElementById("new-page");
const deletePageButton = document.getElementById("delete-page");

// Create eraser preview element
const eraserPreview = document.createElement("div");
eraserPreview.className = "eraser-preview";
document.body.appendChild(eraserPreview);

// Canvas initialization
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
colorInput.value = "#FFFFFF";
context.strokeStyle = "#FFFFFF";

// State variables
let isPainting = false;
let isDragging = false;
let isResizing = false;
let isErasing = false;
let lineWidth = 2;
let eraserSize = 10;
let currentColor = "#FFFFFF";
let draggedImage = null;
let resizeCorner = null;
let offsetX, offsetY;
let hoveredImage = null;
let hoverTimeout = null;
let showLockIcon = false;

// Page management
let currentPage = 0;
let nextPageId = 1;
let pages = [
  {
    id: nextPageId++,
    strokes: [],
    currentStroke: [],
    draggableImages: [],
    nextImageId: 1,
  },
];

// Reference to current page's data
let strokes = pages[currentPage].strokes;
let currentStroke = pages[currentPage].currentStroke;
let draggableImages = pages[currentPage].draggableImages;
let nextImageId = pages[currentPage].nextImageId;

// Constants
const HANDLE_SIZE = 10;
const LOCK_SIZE = 16;
const HOVER_DELAY = 1500;

// Update page navigation UI
function updatePageNavigation() {
  currentPageSpan.textContent = currentPage + 1;
  totalPagesSpan.textContent = pages.length;
  prevPageButton.disabled = currentPage === 0;
  nextPageButton.disabled = currentPage === pages.length - 1;
  deletePageButton.disabled = pages.length === 1;
}

// Switch to a specific page by ID
function switchToPage(pageId) {
  const pageIndex = pages.findIndex((page) => page.id === pageId);
  if (pageIndex === -1) return;

  pages[currentPage].strokes = [...strokes];
  pages[currentPage].currentStroke = [...currentStroke];
  pages[currentPage].draggableImages = [...draggableImages];
  pages[currentPage].nextImageId = nextImageId;

  currentPage = pageIndex;

  strokes = pages[currentPage].strokes || [];
  currentStroke = pages[currentPage].currentStroke || [];
  draggableImages = pages[currentPage].draggableImages || [];
  nextImageId = pages[currentPage].nextImageId || 1;

  imageList.innerHTML = "";
  draggableImages.forEach((img) => {
    const imageContainer = document.createElement("div");
    imageContainer.className = "image-container";
    imageContainer.dataset.imageId = img.id;

    const imgElement = document.createElement("img");
    imgElement.src = img.image.src;

    imgElement.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const imageObj = new Image();
      imageObj.src = imgElement.src;
      imageObj.onload = () => {
        draggableImages.push({
          id: img.id,
          image: imageObj,
          x: 50,
          y: 50,
          width: 106,
          height: 118,
          locked: false,
        });
        pages[currentPage].draggableImages = draggableImages;
        redrawCanvas();
      };
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.onclick = () => {
      imageContainer.remove();
      draggableImages = draggableImages.filter((di) => di.id !== img.id);
      pages[currentPage].draggableImages = draggableImages;
      redrawCanvas();
    };

    imageContainer.appendChild(imgElement);
    imageContainer.appendChild(removeBtn);
    imageList.appendChild(imageContainer);
  });

  redrawCanvas();
  updatePageNavigation();
}

// Create a new page
function createNewPage() {
  const newPage = {
    id: nextPageId++,
    strokes: [],
    currentStroke: [],
    draggableImages: [],
    nextImageId: 1,
  };
  pages.push(newPage);
  switchToPage(newPage.id);
}

// Delete the current page
function deleteCurrentPage() {
  if (pages.length <= 1) return;

  let targetPageId;
  if (currentPage === pages.length - 1) {
    targetPageId = pages[currentPage - 1].id;
  } else {
    targetPageId = pages[currentPage + 1].id;
  }

  const pageToDeleteIndex = currentPage;

  switchToPage(targetPageId);

  pages.splice(pageToDeleteIndex, 1);

  if (pageToDeleteIndex < currentPage) {
    currentPage--;
  }

  updatePageNavigation();
}

// Event Handlers
function handleImageUpload(event) {
  Array.from(event.target.files).forEach((file) => {
    if (file.type.startsWith("image/")) {
      addImageToListAndCanvas(file);
    }
  });
}

function handlePaste(event) {
  const items = (event.clipboardData || event.originalEvent.clipboardData)
    .items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const file = items[i].getAsFile();
      addImageToListAndCanvas(file);
      event.preventDefault();
      break;
    }
  }
}

function addImageToListAndCanvas(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const imageId = nextImageId++;
    const imageContainer = document.createElement("div");
    imageContainer.className = "image-container";
    imageContainer.dataset.imageId = imageId;

    const img = document.createElement("img");
    img.src = e.target.result;

    img.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const imageObj = new Image();
      imageObj.src = img.src;
      imageObj.onload = () => {
        draggableImages.push({
          id: imageId,
          image: imageObj,
          x: 50,
          y: 50,
          width: 106,
          height: 118,
          locked: false,
        });
        pages[currentPage].draggableImages = draggableImages;
        redrawCanvas();
      };
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.onclick = () => {
      imageContainer.remove();
      draggableImages = draggableImages.filter(
        (di) => di.id !== Number(imageContainer.dataset.imageId)
      );
      pages[currentPage].draggableImages = draggableImages;
      redrawCanvas();
    };

    imageContainer.appendChild(img);
    imageContainer.appendChild(removeBtn);
    imageList.appendChild(imageContainer);

    const imageObj = new Image();
    imageObj.src = e.target.result;
    imageObj.onload = () => {
      draggableImages.push({
        id: imageId,
        image: imageObj,
        x: 50,
        y: 50,
        width: 106,
        height: 118,
        locked: false,
      });
      pages[currentPage].draggableImages = draggableImages;
      redrawCanvas();
    };
  };
  reader.readAsDataURL(file);
}

function saveStroke() {
  if (currentStroke.length > 0) {
    strokes.push({
      path: [...currentStroke],
      color: isErasing ? "erase" : currentColor,
      width: isErasing ? eraserSize : lineWidth,
    });
    currentStroke = [];
    pages[currentPage].strokes = strokes;
    pages[currentPage].currentStroke = currentStroke;
    redrawCanvas();
  }
}

function undoLast() {
  if (strokes.length > 0) {
    strokes.pop();
    pages[currentPage].strokes = strokes;
    redrawCanvas();
  }
}

function redrawCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  draggableImages.forEach((img) => {
    context.drawImage(img.image, img.x, img.y, img.width, img.height);

    if (img === hoveredImage && showLockIcon) {
      context.fillStyle = img.locked
        ? "rgba(255, 0, 0, 0.7)"
        : "rgba(0, 255, 0, 0.7)";
      const lockX = img.x + img.width - LOCK_SIZE - 5;
      const lockY = img.y + 5;
      context.fillRect(lockX, lockY, LOCK_SIZE, LOCK_SIZE);
      context.fillStyle = "white";
      context.font = `${LOCK_SIZE - 4}px Arial`;
      context.fillText(
        img.locked ? "🔒" : "🔓",
        lockX + 2,
        lockY + LOCK_SIZE - 2
      );
    }
  });

  strokes.forEach((stroke) => {
    if (stroke.color === "erase") {
      context.globalCompositeOperation = "destination-out";
      context.beginPath();
      context.lineWidth = stroke.width;
      stroke.path.forEach((point, index) => {
        index === 0
          ? context.moveTo(point.x, point.y)
          : context.lineTo(point.x, point.y);
      });
      context.stroke();
      context.closePath();
      context.globalCompositeOperation = "source-over";
    } else {
      context.beginPath();
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.width;
      stroke.path.forEach((point, index) => {
        index === 0
          ? context.moveTo(point.x, point.y)
          : context.lineTo(point.x, point.y);
      });
      context.stroke();
      context.closePath();
    }
  });

  if (currentStroke.length > 0) {
    context.beginPath();
    if (isErasing) {
      context.globalCompositeOperation = "destination-out";
      context.lineWidth = eraserSize;
    } else {
      context.strokeStyle = currentColor;
      context.lineWidth = lineWidth;
    }
    currentStroke.forEach((point, index) => {
      index === 0
        ? context.moveTo(point.x, point.y)
        : context.lineTo(point.x, point.y);
    });
    context.stroke();
    context.closePath();
    context.globalCompositeOperation = "source-over";
  }
}

// Utility Functions
function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function checkResizeHandle(x, y, img) {
  const corners = [
    { corner: "top-left", x: img.x, y: img.y },
    { corner: "top-right", x: img.x + img.width, y: img.y },
    { corner: "bottom-left", x: img.x, y: img.y + img.height },
    { corner: "bottom-right", x: img.x + img.width, y: img.y + img.height },
  ];

  return (
    corners.find(
      (c) =>
        x >= c.x - HANDLE_SIZE / 2 &&
        x <= c.x + HANDLE_SIZE / 2 &&
        y >= c.y - HANDLE_SIZE / 2 &&
        y <= c.y + HANDLE_SIZE / 2
    )?.corner || null
  );
}

function updateCanvasSize() {
  const currentStrokeStyle = context.strokeStyle;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const rect = canvas.getBoundingClientRect();
  context.strokeStyle = currentStrokeStyle;
  redrawCanvas();
}

function updateEraserPreview(e) {
  if (isErasing && e.target === canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    eraserPreview.style.display = "block";
    eraserPreview.style.width = `${eraserSize}px`;
    eraserPreview.style.height = `${eraserSize}px`;
    eraserPreview.style.left = `${e.clientX - eraserSize / 2}px`;
    eraserPreview.style.top = `${e.clientY - eraserSize / 2}px`;
  } else {
    eraserPreview.style.display = "none";
  }
}

// Event Listeners
imageInput.addEventListener("change", handleImageUpload);
document.addEventListener("paste", handlePaste);

// Page navigation event listeners
prevPageButton.addEventListener("click", () => {
  if (currentPage > 0) {
    switchToPage(pages[currentPage - 1].id);
  }
});
nextPageButton.addEventListener("click", () => {
  if (currentPage < pages.length - 1) {
    switchToPage(pages[currentPage + 1].id);
  }
});
newPageButton.addEventListener("click", createNewPage);
deletePageButton.addEventListener("click", deleteCurrentPage);

toolbar.addEventListener("click", (e) => {
  if (e.target.id === "clear" || e.target.parentElement.id === "clear") {
    strokes = [];
    currentStroke = [];
    nextImageId = 1;
    pages[currentPage].strokes = strokes;
    pages[currentPage].currentStroke = currentStroke;
    pages[currentPage].draggableImages = draggableImages;
    pages[currentPage].nextImageId = nextImageId;
    redrawCanvas();
  }
  if (e.target.id === "eraser" || e.target.parentElement.id === "eraser") {
    isErasing = !isErasing;
    eraserButton.classList.toggle("active");
    canvas.classList.toggle("eraser-active");
    context.strokeStyle = isErasing ? "erase" : currentColor;
    if (!isErasing) {
      eraserPreview.style.display = "none";
      canvas.style.cursor = "default";
    }
  }
});

toolbar.addEventListener("change", (e) => {
  if (e.target.id === "stroke") {
    currentColor = e.target.value;
    if (!isErasing) context.strokeStyle = currentColor;
    colorDisplay.style.backgroundColor = currentColor;
  }
  if (e.target.id === "lineWidth") {
    lineWidth = parseInt(e.target.value, 10);
  }
  if (e.target.id === "eraserSize") {
    eraserSize = parseInt(e.target.value, 10);
  }
});

// Color picker interaction
colorDisplay.addEventListener("click", () => {
  colorInput.click();
});
colorInput.addEventListener("input", (e) => {
  currentColor = e.target.value;
  if (!isErasing) context.strokeStyle = currentColor;
  colorDisplay.style.backgroundColor = currentColor;
});

// Initial color sync
colorDisplay.style.backgroundColor = colorInput.value;

let rect = canvas.getBoundingClientRect();
window.addEventListener("resize", updateCanvasSize);
updateCanvasSize();

canvas.addEventListener("mousedown", (e) => {
  const { x, y } = getMousePos(e);

  for (let i = draggableImages.length - 1; i >= 0; i--) {
    const img = draggableImages[i];

    const lockX = img.x + img.width - LOCK_SIZE - 5;
    const lockY = img.y + 5;
    if (
      img === hoveredImage &&
      showLockIcon &&
      x >= lockX &&
      x <= lockX + LOCK_SIZE &&
      y >= lockY &&
      y <= lockY + LOCK_SIZE
    ) {
      img.locked = !img.locked;
      redrawCanvas();
      return;
    }

    if (img.locked) continue;

    const corner = checkResizeHandle(x, y, img);
    if (corner) {
      isResizing = true;
      draggedImage = img;
      resizeCorner = corner;
      canvas.style.cursor =
        corner.includes("left") && corner.includes("right")
          ? "nesw-resize"
          : "nwse-resize";
      return;
    }
    if (
      x >= img.x &&
      x <= img.x + img.width &&
      y >= img.y &&
      y <= img.y + img.height
    ) {
      isDragging = true;
      draggedImage = img;
      offsetX = x - img.x;
      offsetY = y - img.y;
      canvas.style.cursor = "pointer";
      return;
    }
  }

  isPainting = true;
  currentStroke = [{ x, y }];
  redrawCanvas();
});

canvas.addEventListener("mouseup", () => {
  if (isPainting) {
    isPainting = false;
    saveStroke();
  }
  if (isDragging || isResizing) {
    isDragging = false;
    isResizing = false;
    draggedImage = null;
    resizeCorner = null;
    canvas.style.cursor = "default";
  }
});

canvas.addEventListener("mousemove", (e) => {
  const { x, y } = getMousePos(e);
  updateEraserPreview(e);

  let newHoveredImage = null;
  for (let i = draggableImages.length - 1; i >= 0; i--) {
    const img = draggableImages[i];
    if (
      x >= img.x &&
      x <= img.x + img.width &&
      y >= img.y &&
      y <= img.y + img.height
    ) {
      newHoveredImage = img;
      break;
    }
  }

  if (newHoveredImage !== hoveredImage) {
    hoveredImage = newHoveredImage;
    showLockIcon = false;
    if (hoverTimeout) clearTimeout(hoverTimeout);
    if (hoveredImage) {
      hoverTimeout = setTimeout(() => {
        showLockIcon = true;
        redrawCanvas();
      }, HOVER_DELAY);
    }
    redrawCanvas();
  }

  if (isDragging && draggedImage && !draggedImage.locked) {
    draggedImage.x = x - offsetX;
    draggedImage.y = y - offsetY;
    redrawCanvas();
  } else if (isResizing && draggedImage && !draggedImage.locked) {
    switch (resizeCorner) {
      case "top-left":
        draggedImage.width += draggedImage.x - x;
        draggedImage.height += draggedImage.y - y;
        draggedImage.x = x;
        draggedImage.y = y;
        break;
      case "top-right":
        draggedImage.width = x - draggedImage.x;
        draggedImage.height += draggedImage.y - y;
        draggedImage.y = y;
        break;
      case "bottom-left":
        draggedImage.width += draggedImage.x - x;
        draggedImage.x = x;
        draggedImage.height = y - draggedImage.y;
        break;
      case "bottom-right":
        draggedImage.width = x - draggedImage.x;
        draggedImage.height = y - draggedImage.y;
        break;
    }
    draggedImage.width = Math.max(draggedImage.width, 20);
    draggedImage.height = Math.max(draggedImage.height, 20);
    redrawCanvas();
  } else if (isPainting) {
    currentStroke.push({ x, y });
    redrawCanvas();
  }
});

canvas.addEventListener("mouseleave", () => {
  if (hoverTimeout) clearTimeout(hoverTimeout);
  hoveredImage = null;
  showLockIcon = false;
  eraserPreview.style.display = "none";
  redrawCanvas();
  if (isPainting) {
    isPainting = false;
    saveStroke();
  }
});

document.addEventListener("mousemove", (e) => {
  updateEraserPreview(e);
});

document.addEventListener("keydown", (e) => {
  if (
    (e.ctrlKey && e.key === "z") ||
    (e.ctrlKey && e.altKey && e.code === "KeyZ")
  ) {
    undoLast();
  }
});

// Initial page navigation setup
updatePageNavigation();
