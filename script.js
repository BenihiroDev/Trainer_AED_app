const powerButton = document.getElementById("power-button");
const beep = new Audio("audio/beep.mp3");
const padConnector = document.getElementById("pad-connector");
const padPopup = document.getElementById("pad-popup");
const closePopup = document.getElementById("close-popup");

let powerOn = false;
let pressTimer;

// Track which zone each pad is snapped to (null if not snapped)
const padZoneMap = {
  pad1: null,
  pad2: null
};

// Predetermined snap coordinates for each pad in each zone
// Coordinates are relative to the popup-content container
const snapCoordinates = {
  pad1: {
    zone1: { top: '23%', left: '30%' },
    zone2: { top: '40%', right: '27%' }
  },
  pad2: {
    zone1: { top: '23%', left: '30%' },
    zone2: { top: '40%', right: '27%' }
  }
};


/* POWER BUTTON CLICKY */
powerButton.addEventListener("click", function() {
  powerOn = !powerOn;
  beep.play();

  if (powerOn) {
    powerButton.classList.add("on");
    padConnector.classList.add("active");
  } else {
    powerButton.classList.remove("on");
    padConnector.classList.remove("active");
  }
});


/* PADS POP-UP */
function startPress() {
  if (powerOn) {
    pressTimer = setTimeout(function() {
      padPopup.classList.remove("hidden");
    }, 1000);
  }
}

function cancelPress() {
  clearTimeout(pressTimer);
}

padConnector.addEventListener("mousedown", startPress);
padConnector.addEventListener("mouseup", cancelPress);
padConnector.addEventListener("mouseleave", cancelPress);

padConnector.addEventListener("touchstart", startPress);
padConnector.addEventListener("touchend", cancelPress);


/* PADS POP-UP CLOSE */
closePopup.addEventListener("click", function() {
  padPopup.classList.add("hidden");
});


/* UTILITY: Calculate overlap percentage between pad and zone */
function getOverlapPercentage(pad, zone) {
  const padRect = pad.getBoundingClientRect();
  const zoneRect = zone.getBoundingClientRect();
  
  // Calculate intersection
  const xOverlap = Math.max(
    0,
    Math.min(padRect.right, zoneRect.right) - Math.max(padRect.left, zoneRect.left)
  );
  const yOverlap = Math.max(
    0,
    Math.min(padRect.bottom, zoneRect.bottom) - Math.max(padRect.top, zoneRect.top)
  );
  
  const intersectionArea = xOverlap * yOverlap;
  const padArea = padRect.width * padRect.height;
  
  return padArea > 0 ? (intersectionArea / padArea) * 100 : 0;
}

/* UTILITY: Check and snap pads to zones */
function checkAndSnapPads() {
  const pad1 = document.getElementById("pad1");
  const pad2 = document.getElementById("pad2");
  const zone1 = document.getElementById("zone1");
  const zone2 = document.getElementById("zone2");
  
  // Get overlap percentages for each pad in each zone
  const pad1Zone1Overlap = getOverlapPercentage(pad1, zone1);
  const pad1Zone2Overlap = getOverlapPercentage(pad1, zone2);
  const pad2Zone1Overlap = getOverlapPercentage(pad2, zone1);
  const pad2Zone2Overlap = getOverlapPercentage(pad2, zone2);
  
  const overlapThreshold = 80;
  
  // Determine where each pad should be
  let pad1Zone = null;
  let pad2Zone = null;
  
  if (pad1Zone1Overlap >= overlapThreshold) pad1Zone = 1;
  else if (pad1Zone2Overlap >= overlapThreshold) pad1Zone = 2;
  
  if (pad2Zone1Overlap >= overlapThreshold) pad2Zone = 1;
  else if (pad2Zone2Overlap >= overlapThreshold) pad2Zone = 2;
  
  // Check if both pads are in the same zone - if so, neither snaps
  if (pad1Zone && pad2Zone && pad1Zone === pad2Zone) {
    pad1Zone = null;
    pad2Zone = null;
  }
  
  // Update pad1
  padZoneMap.pad1 = pad1Zone;
  if (pad1Zone) {
    pad1.classList.add("snapped");
    // Clear old positioning properties
    pad1.style.left = '';
    pad1.style.right = '';
    pad1.style.top = '';
    pad1.style.bottom = '';
    // Apply new coordinates
    const coords = snapCoordinates.pad1[`zone${pad1Zone}`];
    Object.assign(pad1.style, coords);
  } else {
    pad1.classList.remove("snapped");
  }
  
  // Update pad2
  padZoneMap.pad2 = pad2Zone;
  if (pad2Zone) {
    pad2.classList.add("snapped");
    // Clear old positioning properties
    pad2.style.left = '';
    pad2.style.right = '';
    pad2.style.top = '';
    pad2.style.bottom = '';
    // Apply new coordinates
    const coords = snapCoordinates.pad2[`zone${pad2Zone}`];
    Object.assign(pad2.style, coords);
  } else {
    pad2.classList.remove("snapped");
  }
}

/* DRAGGABLE PADS */
function makeDraggable(pad) {
  let offsetX, offsetY, dragging = false;

  const parent = pad.parentElement;

  // Desktop events
  pad.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", dragMove);
  document.addEventListener("mouseup", stopDrag);

  // Mobile events
  pad.addEventListener("touchstart", startDragTouch, { passive: false });
  document.addEventListener("touchmove", dragMoveTouch, { passive: false });
  document.addEventListener("touchend", stopDrag);

  function startDrag(e) {
    dragging = true;
    offsetX = e.clientX - pad.offsetLeft;
    offsetY = e.clientY - pad.offsetTop;
  }

  function startDragTouch(e) {
    e.preventDefault();
    dragging = true;
    const touch = e.touches[0];
    offsetX = touch.clientX - pad.offsetLeft;
    offsetY = touch.clientY - pad.offsetTop;
  }

  function dragMove(e) {
    if (dragging) movePad(e.clientX, e.clientY);
  }

  function dragMoveTouch(e) {
    if (dragging) {
      const touch = e.touches[0];
      movePad(touch.clientX, touch.clientY);
    }
  }
function dragMoveTouch(e) {
  if (dragging) {
    e.preventDefault(); // needed to prevent scrolling
    const touch = e.touches[0];
    movePad(touch.clientX, touch.clientY);
  }
}
  function movePad(clientX, clientY) {
    // Calculate new position relative to parent
    let newLeft = clientX - offsetX;
    let newTop = clientY - offsetY;

    // Constrain within parent boundaries
    newLeft = Math.max(0, Math.min(newLeft, parent.clientWidth - pad.offsetWidth));
    newTop = Math.max(0, Math.min(newTop, parent.clientHeight - pad.offsetHeight));

    pad.style.left = newLeft + "px";
    pad.style.top = newTop + "px";
  }

  function stopDrag() {
    dragging = false;
    checkAndSnapPads();
  }
}

// Activate pads
makeDraggable(document.getElementById("pad1"));
makeDraggable(document.getElementById("pad2"));

