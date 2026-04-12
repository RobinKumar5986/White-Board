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

// Shape/Text DOM elements
const shapeButton = document.getElementById("shape-btn");
const shapePanel = document.getElementById("shape-panel");
const textButton = document.getElementById("text-btn");
const textPanel = document.getElementById("text-panel");
const textInput = document.getElementById("text-input");
const fontSizeInput = document.getElementById("font-size");
const fontFamilySelect = document.getElementById("font-family");
const boldBtn = document.getElementById("bold-btn");
const italicBtn = document.getElementById("italic-btn");

// Page navigation DOM elements
const prevPageButton = document.getElementById("prev-page");
const nextPageButton = document.getElementById("next-page");
const currentPageSpan = document.getElementById("current-page");
const totalPagesSpan = document.getElementById("total-pages");
const newPageButton = document.getElementById("new-page");
const deletePageButton = document.getElementById("delete-page");

// Mobile undo/redo
const mobileUndo = document.getElementById("mobile-undo");
const mobileRedo = document.getElementById("mobile-redo");

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
let isDrawingShape = false;
let activeShapeType = null;
let shapeStartX = 0, shapeStartY = 0;
let lineWidth = 2;
let eraserSize = 10;
let currentColor = "#FFFFFF";
let draggedImage = null;
let resizeCorner = null;
let offsetX, offsetY;
let hoveredImage = null;
let hoverTimeout = null;
let showLockIcon = false;

// Text tool state
let isTextMode = false;
let isEditingText = false;
let editingTextObj = null;
let textCursor = 0;
let textBlink = null;
let showCursor = true;

// Redo stack
let redoStack = [];

// Shape panel toggle
let shapePanelOpen = false;
let textPanelOpen = false;

// Page management
let currentPage = 0;
let nextPageId = 1;
let pages = [
  {
    id: nextPageId++,
    strokes: [],
    currentStroke: [],
    draggableImages: [],
    draggableShapes: [],
    draggableTexts: [],
    nextImageId: 1,
    nextShapeId: 1,
    nextTextId: 1,
  },
];

// References to current page data
let strokes = pages[currentPage].strokes;
let currentStroke = pages[currentPage].currentStroke;
let draggableImages = pages[currentPage].draggableImages;
let draggableShapes = pages[currentPage].draggableShapes;
let draggableTexts = pages[currentPage].draggableTexts;
let nextImageId = pages[currentPage].nextImageId;
let nextShapeId = pages[currentPage].nextShapeId;
let nextTextId = pages[currentPage].nextTextId;

// Constants
const HANDLE_SIZE = 12;
const LOCK_SIZE = 16;
const HOVER_DELAY = 1500;

//  Undo / Redo 
function undoLast() {
  if (strokes.length > 0) {
    redoStack.push(strokes.pop());
    pages[currentPage].strokes = strokes;
    redrawCanvas();
    updateMobileButtons();
  }
}

function redoLast() {
  if (redoStack.length > 0) {
    strokes.push(redoStack.pop());
    pages[currentPage].strokes = strokes;
    redrawCanvas();
    updateMobileButtons();
  }
}

function updateMobileButtons() {
  if (mobileUndo) mobileUndo.disabled = strokes.length === 0;
  if (mobileRedo) mobileRedo.disabled = redoStack.length === 0;
}

//  Page Navigation 
function updatePageNavigation() {
  currentPageSpan.textContent = currentPage + 1;
  totalPagesSpan.textContent = pages.length;
  prevPageButton.disabled = currentPage === 0;
  nextPageButton.disabled = currentPage === pages.length - 1;
  deletePageButton.disabled = pages.length === 1;
}

function saveCurrent() {
  pages[currentPage].strokes = [...strokes];
  pages[currentPage].currentStroke = [...currentStroke];
  pages[currentPage].draggableImages = [...draggableImages];
  pages[currentPage].draggableShapes = [...draggableShapes];
  pages[currentPage].draggableTexts = [...draggableTexts];
  pages[currentPage].nextImageId = nextImageId;
  pages[currentPage].nextShapeId = nextShapeId;
  pages[currentPage].nextTextId = nextTextId;
}

function switchToPage(pageId) {
  const pageIndex = pages.findIndex((page) => page.id === pageId);
  if (pageIndex === -1) return;

  saveCurrent();
  currentPage = pageIndex;

  strokes = pages[currentPage].strokes || [];
  currentStroke = pages[currentPage].currentStroke || [];
  draggableImages = pages[currentPage].draggableImages || [];
  draggableShapes = pages[currentPage].draggableShapes || [];
  draggableTexts = pages[currentPage].draggableTexts || [];
  nextImageId = pages[currentPage].nextImageId || 1;
  nextShapeId = pages[currentPage].nextShapeId || 1;
  nextTextId = pages[currentPage].nextTextId || 1;
  redoStack = [];

  imageList.innerHTML = "";
  draggableImages.forEach((img) => addImageToSidebar(img));

  redrawCanvas();
  updatePageNavigation();
  updateMobileButtons();
}

function createNewPage() {
  const newPage = {
    id: nextPageId++,
    strokes: [],
    currentStroke: [],
    draggableImages: [],
    draggableShapes: [],
    draggableTexts: [],
    nextImageId: 1,
    nextShapeId: 1,
    nextTextId: 1,
  };
  pages.push(newPage);
  switchToPage(newPage.id);
}

function deleteCurrentPage() {
  if (pages.length <= 1) return;
  let targetPageId =
    currentPage === pages.length - 1
      ? pages[currentPage - 1].id
      : pages[currentPage + 1].id;
  const pageToDeleteIndex = currentPage;
  switchToPage(targetPageId);
  pages.splice(pageToDeleteIndex, 1);
  if (pageToDeleteIndex < currentPage) currentPage--;
  updatePageNavigation();
}

//  Image Handling 
function addImageToSidebar(imgObj) {
  const imageContainer = document.createElement("div");
  imageContainer.className = "image-container";
  imageContainer.dataset.imageId = imgObj.id;
  const imgEl = document.createElement("img");
  imgEl.src = imgObj.image.src;
  imgEl.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const imageObj = new Image();
    imageObj.src = imgEl.src;
    imageObj.onload = () => {
      draggableImages.push({
        id: imgObj.id,
        image: imageObj,
        x: 50, y: 50,
        width: 106, height: 118,
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
    draggableImages = draggableImages.filter((di) => di.id !== imgObj.id);
    pages[currentPage].draggableImages = draggableImages;
    redrawCanvas();
  };
  imageContainer.appendChild(imgEl);
  imageContainer.appendChild(removeBtn);
  imageList.appendChild(imageContainer);
}

function handleImageUpload(event) {
  Array.from(event.target.files).forEach((file) => {
    if (file.type.startsWith("image/")) addImageToListAndCanvas(file);
  });
}

function handlePaste(event) {
  const items = (event.clipboardData || event.originalEvent.clipboardData).items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      addImageToListAndCanvas(items[i].getAsFile());
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
    img.addEventListener("mousedown", (ev) => {
      ev.preventDefault();
      const imageObj = new Image();
      imageObj.src = img.src;
      imageObj.onload = () => {
        draggableImages.push({ id: imageId, image: imageObj, x: 50, y: 50, width: 106, height: 118, locked: false });
        pages[currentPage].draggableImages = draggableImages;
        redrawCanvas();
      };
    });
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.onclick = () => {
      imageContainer.remove();
      draggableImages = draggableImages.filter((di) => di.id !== Number(imageContainer.dataset.imageId));
      pages[currentPage].draggableImages = draggableImages;
      redrawCanvas();
    };
    imageContainer.appendChild(img);
    imageContainer.appendChild(removeBtn);
    imageList.appendChild(imageContainer);

    const imageObj = new Image();
    imageObj.src = e.target.result;
    imageObj.onload = () => {
      draggableImages.push({ id: imageId, image: imageObj, x: 50, y: 50, width: 106, height: 118, locked: false });
      pages[currentPage].draggableImages = draggableImages;
      redrawCanvas();
    };
  };
  reader.readAsDataURL(file);
}

//  Shape Tool 
function spawnShape(type) {
  const shape = {
    id: nextShapeId++,
    type,
    x: 60, y: 60,
    width: 120, height: 80,
    color: currentColor,
    strokeColor: currentColor,
    fillColor: "transparent",
    strokeWidth: lineWidth,
    locked: false,
  };
  draggableShapes.push(shape);
  pages[currentPage].draggableShapes = draggableShapes;
  pages[currentPage].nextShapeId = nextShapeId;
  redrawCanvas();
  // close panel
  shapePanelOpen = false;
  shapePanel.classList.remove("open");
}

function drawShape(ctx, shape, isHovered) {
  ctx.save();
  ctx.strokeStyle = shape.strokeColor;
  ctx.lineWidth = shape.strokeWidth;
  ctx.fillStyle = shape.fillColor === "transparent" ? "rgba(0,0,0,0)" : shape.fillColor;

  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;

  ctx.beginPath();
  switch (shape.type) {
    case "rect":
      ctx.rect(shape.x, shape.y, shape.width, shape.height);
      break;
    case "ellipse":
      ctx.ellipse(cx, cy, Math.abs(shape.width / 2), Math.abs(shape.height / 2), 0, 0, Math.PI * 2);
      break;
    case "triangle": {
      ctx.moveTo(cx, shape.y);
      ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
      ctx.lineTo(shape.x, shape.y + shape.height);
      ctx.closePath();
      break;
    }
    case "line":
      ctx.moveTo(shape.x, shape.y + shape.height / 2);
      ctx.lineTo(shape.x + shape.width, shape.y + shape.height / 2);
      break;
    case "arrow": {
      const ax = shape.x, ay = shape.y + shape.height / 2;
      const bx = shape.x + shape.width, by = ay;
      const hw = 14, hh = 10;
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx - hw, by);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - hw, by - hh);
      ctx.lineTo(bx - hw, by + hh);
      ctx.closePath();
      ctx.fillStyle = shape.strokeColor;
      ctx.fill();
      ctx.restore();
      if (isHovered) drawObjectHandles(ctx, shape);
      return;
    }
    case "star": {
      const spikes = 5, outerR = Math.min(shape.width, shape.height) / 2;
      const innerR = outerR * 0.45;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;
      ctx.moveTo(cx, cy - outerR);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
        rot += step;
        ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerR);
      ctx.closePath();
      break;
    }
    case "diamond": {
      ctx.moveTo(cx, shape.y);
      ctx.lineTo(shape.x + shape.width, cy);
      ctx.lineTo(cx, shape.y + shape.height);
      ctx.lineTo(shape.x, cy);
      ctx.closePath();
      break;
    }
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (isHovered) drawObjectHandles(ctx, shape);
}

//  Text Tool 
function getTextFont(textObj) {
  const bold = textObj.bold ? "bold " : "";
  const italic = textObj.italic ? "italic " : "";
  return `${italic}${bold}${textObj.fontSize}px ${textObj.fontFamily}`;
}

function measureText(textObj) {
  context.save();
  context.font = getTextFont(textObj);
  const lines = textObj.text.split("\n");
  const widths = lines.map((l) => context.measureText(l || " ").width);
  context.restore();
  return {
    width: Math.max(...widths) + 20,
    height: lines.length * textObj.fontSize * 1.35 + 16,
  };
}

function spawnText() {
  const content = textInput.value.trim() || "Text";
  const textObj = {
    id: nextTextId++,
    text: content,
    x: 80, y: 80,
    fontSize: parseInt(fontSizeInput.value) || 24,
    fontFamily: fontFamilySelect.value || "sans-serif",
    color: currentColor,
    bold: boldBtn.classList.contains("active"),
    italic: italicBtn.classList.contains("active"),
    locked: false,
  };
  const { width, height } = measureText(textObj);
  textObj.width = width;
  textObj.height = height;
  draggableTexts.push(textObj);
  pages[currentPage].draggableTexts = draggableTexts;
  pages[currentPage].nextTextId = nextTextId;
  redrawCanvas();
  textInput.value = "";
  textPanelOpen = false;
  textPanel.classList.remove("open");
}

function drawTextObj(ctx, textObj, isHovered) {
  ctx.save();
  ctx.font = getTextFont(textObj);
  ctx.fillStyle = textObj.color;
  ctx.textBaseline = "top";
  const lines = textObj.text.split("\n");
  const lineH = textObj.fontSize * 1.35;
  lines.forEach((line, i) => {
    ctx.fillText(line, textObj.x + 8, textObj.y + 8 + i * lineH);
  });

  // Cursor while editing
  if (isEditingText && editingTextObj === textObj && showCursor) {
    const before = textObj.text.slice(0, textCursor);
    const beforeLines = before.split("\n");
    const cursorLine = beforeLines.length - 1;
    const cursorCol = beforeLines[cursorLine];
    const cursorX = textObj.x + 8 + ctx.measureText(cursorCol).width;
    const cursorY = textObj.y + 8 + cursorLine * lineH;
    ctx.fillStyle = textObj.color;
    ctx.fillRect(cursorX, cursorY, 2, textObj.fontSize);
  }
  ctx.restore();

  if (isHovered) drawObjectHandles(ctx, textObj);
}

//  Shared Handle / Lock Drawing 
function drawObjectHandles(ctx, obj) {
  ctx.save();
  if (!obj.locked) {
    ctx.strokeStyle = "rgba(99,179,237,0.8)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    ctx.setLineDash([]);
    const corners = [
      { x: obj.x, y: obj.y },
      { x: obj.x + obj.width, y: obj.y },
      { x: obj.x, y: obj.y + obj.height },
      { x: obj.x + obj.width, y: obj.y + obj.height },
    ];
    corners.forEach((c) => {
      ctx.fillStyle = "#63b3ed";
      ctx.strokeStyle = "#2b6cb0";
      ctx.lineWidth = 1;
      ctx.fillRect(c.x - HANDLE_SIZE / 2, c.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.strokeRect(c.x - HANDLE_SIZE / 2, c.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    });
  }
  if (showLockIcon && hoveredImage === obj) {
    const lockX = obj.x + obj.width - LOCK_SIZE - 5;
    const lockY = obj.y + 5;
    ctx.fillStyle = obj.locked ? "rgba(255,0,0,0.75)" : "rgba(0,200,100,0.75)";
    ctx.fillRect(lockX, lockY, LOCK_SIZE, LOCK_SIZE);
    ctx.fillStyle = "white";
    ctx.font = `${LOCK_SIZE - 4}px Arial`;
    ctx.fillText(obj.locked ? "🔒" : "🔓", lockX + 2, lockY + LOCK_SIZE - 2);
    const delX = lockX - LOCK_SIZE - 4;
    const delY = lockY;
    ctx.fillStyle = "rgba(220,50,50,0.85)";
    ctx.fillRect(delX, delY, LOCK_SIZE, LOCK_SIZE);
    ctx.fillStyle = "white";
    ctx.fillText("🗑", delX + 1, delY + LOCK_SIZE - 2);
  }
  ctx.restore();
}

//  Canvas Redraw 
function redrawCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw images
  draggableImages.forEach((img) => {
    context.drawImage(img.image, img.x, img.y, img.width, img.height);
    if (img === hoveredImage) drawObjectHandles(context, img);
  });

  // Draw shapes
  draggableShapes.forEach((shape) => {
    drawShape(context, shape, shape === hoveredImage);
  });

  // Draw text objects
  draggableTexts.forEach((textObj) => {
    drawTextObj(context, textObj, textObj === hoveredImage);
  });

  // Draw strokes
  strokes.forEach((stroke) => {
    if (stroke.color === "erase") {
      context.globalCompositeOperation = "destination-out";
      context.beginPath();
      context.lineWidth = stroke.width;
      stroke.path.forEach((point, index) => {
        index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y);
      });
      context.stroke();
      context.closePath();
      context.globalCompositeOperation = "source-over";
    } else {
      context.beginPath();
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.width;
      stroke.path.forEach((point, index) => {
        index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y);
      });
      context.stroke();
      context.closePath();
    }
  });

  // Current stroke preview
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
      index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y);
    });
    context.stroke();
    context.closePath();
    context.globalCompositeOperation = "source-over";
  }

  // Shape preview while drawing
  if (isDrawingShape && activeShapeType) {
    const previewShape = {
      type: activeShapeType,
      x: Math.min(shapeStartX, shapeCurrentX),
      y: Math.min(shapeStartY, shapeCurrentY),
      width: Math.abs(shapeCurrentX - shapeStartX),
      height: Math.abs(shapeCurrentY - shapeStartY),
      strokeColor: currentColor,
      fillColor: "transparent",
      strokeWidth: lineWidth,
    };
    drawShape(context, previewShape, false);
  }
}

//  Stroke Saving 
function saveStroke() {
  if (currentStroke.length > 0) {
    strokes.push({
      path: [...currentStroke],
      color: isErasing ? "erase" : currentColor,
      width: isErasing ? eraserSize : lineWidth,
    });
    currentStroke = [];
    redoStack = [];
    pages[currentPage].strokes = strokes;
    pages[currentPage].currentStroke = currentStroke;
    redrawCanvas();
    updateMobileButtons();
  }
}

//  Utility 
function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
  if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX - rect.left, y: e.changedTouches[0].clientY - rect.top };
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function checkResizeHandle(x, y, obj) {
  const corners = [
    { corner: "top-left", x: obj.x, y: obj.y },
    { corner: "top-right", x: obj.x + obj.width, y: obj.y },
    { corner: "bottom-left", x: obj.x, y: obj.y + obj.height },
    { corner: "bottom-right", x: obj.x + obj.width, y: obj.y + obj.height },
  ];
  return corners.find((c) =>
    x >= c.x - HANDLE_SIZE / 2 && x <= c.x + HANDLE_SIZE / 2 &&
    y >= c.y - HANDLE_SIZE / 2 && y <= c.y + HANDLE_SIZE / 2
  )?.corner || null;
}

function hitTestObject(x, y, obj) {
  return x >= obj.x && x <= obj.x + obj.width && y >= obj.y && y <= obj.y + obj.height;
}

// Returns first hovered object across all layers (text > shape > image, top to bottom)
function findHoveredObject(x, y) {
  for (let i = draggableTexts.length - 1; i >= 0; i--) {
    if (hitTestObject(x, y, draggableTexts[i])) return draggableTexts[i];
  }
  for (let i = draggableShapes.length - 1; i >= 0; i--) {
    if (hitTestObject(x, y, draggableShapes[i])) return draggableShapes[i];
  }
  for (let i = draggableImages.length - 1; i >= 0; i--) {
    if (hitTestObject(x, y, draggableImages[i])) return draggableImages[i];
  }
  return null;
}

function updateCanvasSize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  redrawCanvas();
}

function updateEraserPreview(e) {
  if (isErasing && e.target === canvas) {
    eraserPreview.style.display = "block";
    eraserPreview.style.width = `${eraserSize}px`;
    eraserPreview.style.height = `${eraserSize}px`;
    eraserPreview.style.left = `${e.clientX - eraserSize / 2}px`;
    eraserPreview.style.top = `${e.clientY - eraserSize / 2}px`;
  } else {
    eraserPreview.style.display = "none";
  }
}

//  Shape preview tracking 
let shapeCurrentX = 0, shapeCurrentY = 0;

//  Pointer Down 
function onPointerDown(e) {
  const { x, y } = getMousePos(e);

  // Close panels on canvas click
  shapePanelOpen = false;
  shapePanel.classList.remove("open");
  textPanelOpen = false;
  textPanel.classList.remove("open");

  // Stop text edit if clicking outside current text obj
  if (isEditingText) {
    const hit = findHoveredObject(x, y);
    if (hit !== editingTextObj) {
      commitTextEdit();
    }
  }

  // Lock icon check for any object
  if (hoveredImage && showLockIcon) {
    const obj = hoveredImage;
    const lockX = obj.x + obj.width - LOCK_SIZE - 5;
    const lockY = obj.y + 5;
    const delX = lockX - LOCK_SIZE - 4;
    if (x >= delX && x <= delX + LOCK_SIZE && y >= lockY && y <= lockY + LOCK_SIZE) {
      draggableImages = draggableImages.filter((o) => o !== obj);
      draggableShapes = draggableShapes.filter((o) => o !== obj);
      draggableTexts = draggableTexts.filter((o) => o !== obj);
      pages[currentPage].draggableImages = draggableImages;
      pages[currentPage].draggableShapes = draggableShapes;
      pages[currentPage].draggableTexts = draggableTexts;
      hoveredImage = null; showLockIcon = false;
      redrawCanvas(); return;
    }
    if (x >= lockX && x <= lockX + LOCK_SIZE && y >= lockY && y <= lockY + LOCK_SIZE) {
      obj.locked = !obj.locked;
      redrawCanvas(); return;
    }
  }

  // Text mode: click canvas to place new text
  if (isTextMode && !isEditingText) {
    const hit = findHoveredObject(x, y);
    if (hit && hit.text !== undefined) {
      startEditingText(hit, x, y);
    } else {
      const textObj = {
        id: nextTextId++,
        text: "",
        x: x - 10, y: y - 15,
        fontSize: parseInt(fontSizeInput.value) || 24,
        fontFamily: fontFamilySelect.value || "sans-serif",
        color: currentColor,
        bold: boldBtn.classList.contains("active"),
        italic: italicBtn.classList.contains("active"),
        locked: false,
        width: 10, height: 40,
      };
      draggableTexts.push(textObj);
      pages[currentPage].draggableTexts = draggableTexts;
      pages[currentPage].nextTextId = nextTextId;
      startEditingText(textObj, x, y);
    }
    return;
  }

  // Check all draggable objects (texts, shapes, images) for resize/drag
  const allObjs = [...draggableTexts, ...draggableShapes, ...draggableImages];
  for (let i = allObjs.length - 1; i >= 0; i--) {
    const obj = allObjs[i];
    if (obj.locked) continue;

    // Double-click on text = edit
    if (obj.text !== undefined && e.detail === 2 && hitTestObject(x, y, obj)) {
      startEditingText(obj, x, y);
      return;
    }

    const corner = checkResizeHandle(x, y, obj);
    if (corner && obj === hoveredImage) {
      isResizing = true;
      draggedImage = obj;
      resizeCorner = corner;
      return;
    }
    if (hitTestObject(x, y, obj)) {
      isDragging = true;
      draggedImage = obj;
      offsetX = x - obj.x;
      offsetY = y - obj.y;
      canvas.style.cursor = "grabbing";
      return;
    }
  }

  // Freehand drawing
  isPainting = true;
  currentStroke = [{ x, y }];
  redrawCanvas();
}

//  Text Editing 
function startEditingText(textObj, x, y) {
  isEditingText = true;
  editingTextObj = textObj;
  textCursor = textObj.text.length;
  if (textBlink) clearInterval(textBlink);
  showCursor = true;
  textBlink = setInterval(() => {
    showCursor = !showCursor;
    redrawCanvas();
  }, 530);
  hoveredImage = textObj;
  redrawCanvas();
}

function commitTextEdit() {
  if (!isEditingText) return;
  isEditingText = false;
  if (editingTextObj && editingTextObj.text === "") {
    // Remove empty text objects
    draggableTexts = draggableTexts.filter((t) => t !== editingTextObj);
    pages[currentPage].draggableTexts = draggableTexts;
  }
  editingTextObj = null;
  if (textBlink) { clearInterval(textBlink); textBlink = null; }
  showCursor = false;
  redrawCanvas();
}

function updateTextSize(textObj) {
  const { width, height } = measureText(textObj);
  textObj.width = Math.max(width, 20);
  textObj.height = Math.max(height, textObj.fontSize * 1.4 + 16);
}

//  Pointer Move 
function onPointerMove(e) {
  const { x, y } = getMousePos(e);
  updateEraserPreview(e);

  // Update hovered object
  const newHovered = findHoveredObject(x, y);
  if (newHovered !== hoveredImage) {
    hoveredImage = newHovered;
    showLockIcon = false;
    if (hoverTimeout) clearTimeout(hoverTimeout);
    if (hoveredImage) {
      hoverTimeout = setTimeout(() => { showLockIcon = true; redrawCanvas(); }, HOVER_DELAY);
    }
    redrawCanvas();
  }

  if (isDragging && draggedImage && !draggedImage.locked) {
    draggedImage.x = x - offsetX;
    draggedImage.y = y - offsetY;
    redrawCanvas();
  } else if (isResizing && draggedImage && !draggedImage.locked) {
    applyResize(draggedImage, x, y);
    redrawCanvas();
  } else if (isPainting) {
    currentStroke.push({ x, y });
    redrawCanvas();
  }
}

function applyResize(obj, x, y) {
  const isText = obj.text !== undefined;
  switch (resizeCorner) {
    case "top-left":
      obj.width += obj.x - x; obj.height += obj.y - y;
      obj.x = x; obj.y = y; break;
    case "top-right":
      obj.width = x - obj.x; obj.height += obj.y - y; obj.y = y; break;
    case "bottom-left":
      obj.width += obj.x - x; obj.x = x; obj.height = y - obj.y; break;
    case "bottom-right":
      obj.width = x - obj.x; obj.height = y - obj.y; break;
  }
  obj.width = Math.max(obj.width, 20);
  obj.height = Math.max(obj.height, 20);

  // For text: scale font size proportionally
  if (isText) {
    obj.fontSize = Math.max(8, Math.round(obj.height * 0.55));
    updateTextSize(obj);
  }
}

//  Pointer Up 
function onPointerUp(e) {
  if (isPainting) { isPainting = false; saveStroke(); }
  if (isDragging || isResizing) {
    isDragging = false; isResizing = false; draggedImage = null; resizeCorner = null;
    canvas.style.cursor = isTextMode ? "text" : "default";
  }
}

//  Keyboard in Text Edit Mode 
document.addEventListener("keydown", (e) => {
  if (isEditingText && editingTextObj) {
    if (e.key === "Escape") { commitTextEdit(); return; }
    if (e.key === "Backspace") {
      if (textCursor > 0) {
        editingTextObj.text = editingTextObj.text.slice(0, textCursor - 1) + editingTextObj.text.slice(textCursor);
        textCursor--;
        updateTextSize(editingTextObj);
        redrawCanvas();
      }
      e.preventDefault(); return;
    }
    if (e.key === "Delete") {
      editingTextObj.text = editingTextObj.text.slice(0, textCursor) + editingTextObj.text.slice(textCursor + 1);
      updateTextSize(editingTextObj);
      redrawCanvas();
      e.preventDefault(); return;
    }
    if (e.key === "ArrowLeft") { textCursor = Math.max(0, textCursor - 1); redrawCanvas(); return; }
    if (e.key === "ArrowRight") { textCursor = Math.min(editingTextObj.text.length, textCursor + 1); redrawCanvas(); return; }
    if (e.key === "Enter") {
      editingTextObj.text = editingTextObj.text.slice(0, textCursor) + "\n" + editingTextObj.text.slice(textCursor);
      textCursor++;
      updateTextSize(editingTextObj);
      redrawCanvas();
      e.preventDefault(); return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      editingTextObj.text = editingTextObj.text.slice(0, textCursor) + e.key + editingTextObj.text.slice(textCursor);
      textCursor++;
      updateTextSize(editingTextObj);
      redrawCanvas();
      e.preventDefault(); return;
    }
    return;
  }

  // Global undo/redo
  if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { undoLast(); e.preventDefault(); }
  if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { redoLast(); e.preventDefault(); }
});

//  Canvas Events 
canvas.addEventListener("mousedown", onPointerDown);
canvas.addEventListener("mousemove", onPointerMove);
canvas.addEventListener("mouseup", onPointerUp);
canvas.addEventListener("mouseleave", () => {
  if (hoverTimeout) clearTimeout(hoverTimeout);
  hoveredImage = null; showLockIcon = false;
  eraserPreview.style.display = "none";
  redrawCanvas();
  if (isPainting) { isPainting = false; saveStroke(); }
});

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  onPointerDown(e);
}, { passive: false });
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  onPointerMove(e);
}, { passive: false });
canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  onPointerUp(e);
}, { passive: false });
canvas.addEventListener("touchcancel", () => {
  isPainting = false; isDragging = false; isResizing = false; draggedImage = null;
  if (currentStroke.length > 0) saveStroke();
});

document.addEventListener("mousemove", updateEraserPreview);
document.addEventListener("paste", handlePaste);
imageInput.addEventListener("change", handleImageUpload);

//  Toolbar Interactions 
toolbar.addEventListener("click", (e) => {
  const target = e.target.closest("button, #clear");

  if (!target) return;

  if (target.id === "clear") {
    strokes = []; currentStroke = []; nextImageId = 1;
    draggableImages = []; draggableShapes = []; draggableTexts = [];
    pages[currentPage].strokes = strokes;
    pages[currentPage].currentStroke = currentStroke;
    pages[currentPage].draggableImages = draggableImages;
    pages[currentPage].draggableShapes = draggableShapes;
    pages[currentPage].draggableTexts = draggableTexts;
    redrawCanvas(); return;
  }
  if (target.id === "eraser") {
    isErasing = !isErasing;
    isTextMode = false;
    textButton && textButton.classList.remove("active");
    canvas.style.cursor = isErasing ? "none" : "default";
    eraserButton.classList.toggle("active", isErasing);
    canvas.classList.toggle("eraser-active", isErasing);
    if (!isErasing) eraserPreview.style.display = "none";
    return;
  }
  if (target.id === "shape-btn") {
    shapePanelOpen = !shapePanelOpen;
    shapePanel.classList.toggle("open", shapePanelOpen);
    return;
  }
  if (target.id === "text-btn") {
    isTextMode = !isTextMode;
    textButton.classList.toggle("active", isTextMode);
    canvas.style.cursor = isTextMode ? "text" : "default";
    if (isTextMode) {
      isErasing = false;
      eraserButton.classList.remove("active");
      canvas.classList.remove("eraser-active");
      eraserPreview.style.display = "none";
    }
    textPanelOpen = isTextMode;
    textPanel.classList.toggle("open", isTextMode);
    return;
  }
  if (target.id === "add-text-btn") {
    spawnText(); return;
  }
  if (target.id === "bold-btn") { boldBtn.classList.toggle("active"); return; }
  if (target.id === "italic-btn") { italicBtn.classList.toggle("active"); return; }

  // Shape spawn buttons
  const shapeType = target.dataset.shape;
  if (shapeType) { spawnShape(shapeType); return; }
});

toolbar.addEventListener("change", (e) => {
  if (e.target.id === "stroke") {
    currentColor = e.target.value;
    if (!isErasing) context.strokeStyle = currentColor;
    colorDisplay.style.backgroundColor = currentColor;
  }
  if (e.target.id === "lineWidth") lineWidth = parseInt(e.target.value, 10);
  if (e.target.id === "eraserSize") eraserSize = parseInt(e.target.value, 10);
});

colorDisplay.addEventListener("click", () => colorInput.click());
colorInput.addEventListener("input", (e) => {
  currentColor = e.target.value;
  if (!isErasing) context.strokeStyle = currentColor;
  colorDisplay.style.backgroundColor = currentColor;
});
colorDisplay.style.backgroundColor = colorInput.value;

//  Page navigation 
prevPageButton.addEventListener("click", () => { if (currentPage > 0) switchToPage(pages[currentPage - 1].id); });
nextPageButton.addEventListener("click", () => { if (currentPage < pages.length - 1) switchToPage(pages[currentPage + 1].id); });
newPageButton.addEventListener("click", createNewPage);
deletePageButton.addEventListener("click", deleteCurrentPage);

//  Mobile undo/redo 
if (mobileUndo) mobileUndo.addEventListener("click", undoLast);
if (mobileRedo) mobileRedo.addEventListener("click", redoLast);

//  Resize 
window.addEventListener("resize", updateCanvasSize);
updateCanvasSize();
updatePageNavigation();
updateMobileButtons();