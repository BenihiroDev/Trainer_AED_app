const powerButton = document.getElementById("power-button");
const beep = new Audio("audio/beep.mp3");
const padConnector = document.getElementById("pad-connector");
const padPopup = document.getElementById("pad-popup");
const closePopup = document.getElementById("close-popup");

let powerOn = false;
let pressTimer;

// Prevent context menu (right-click) to disable saving/sharing
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  return false;
});

// Prevent drag and drop of images
document.addEventListener('dragstart', function(e) {
  e.preventDefault();
  return false;
});

// Prevent text selection on mobile
document.addEventListener('selectstart', function(e) {
  e.preventDefault();
  return false;
});

// Track which zone each pad is snapped to (null if not snapped)
const padZoneMap = {
  pad1: null,
  pad2: null
};

// Predetermined snap coordinates for each pad in each zone
// Coordinates are relative to the body image (percentages of image dimensions)
const snapCoordinates = {
  pad1: {
    zone1: { imageOffsetX: '35%', imageOffsetY: '37%' },
    zone2: { imageOffsetX: '70%', imageOffsetY: '60%' }
  },
  pad2: {
    zone1: { imageOffsetX: '35%', imageOffsetY: '37%' },
    zone2: { imageOffsetX: '70%', imageOffsetY: '60%' }
  }
};


/* POWER BUTTON CLICKY */
powerButton.addEventListener("click", function() {
  powerOn = !powerOn;
  beep.play();

  if (powerOn) {
    powerButton.classList.add("on");
    padConnector.classList.add("active");
    padConnector.style.pointerEvents = "auto";
    padConnector.style.opacity = "1";
  } else {
    powerButton.classList.remove("on");
    padConnector.classList.remove("active");
    resetToInitialState();
  }
});


/* UTILITY: Reset to initial state */
function resetToInitialState() {
  // Reset pad zone map
  padZoneMap.pad1 = null;
  padZoneMap.pad2 = null;
  
  // Reset pad positions and styles
  const pad1 = document.getElementById("pad1");
  const pad2 = document.getElementById("pad2");
  
  if (pad1) {
    pad1.style.top = "";
    pad1.style.left = "";
    pad1.style.right = "";
    pad1.style.bottom = "";
    pad1.classList.remove("snapped");
  }
  
  if (pad2) {
    pad2.style.top = "";
    pad2.style.left = "";
    pad2.style.right = "";
    pad2.style.bottom = "";
    pad2.classList.remove("snapped");
  }
  
  // Reset pad connector to initial state
  padConnector.classList.remove("active");
  padConnector.classList.remove("completed");
  padConnector.style.pointerEvents = "auto";
  padConnector.style.opacity = "1";
  
  // Hide popup
  padPopup.classList.add("hidden");
}
function startPress() {
  if (powerOn) {
    pressTimer = setTimeout(function() {
      padPopup.classList.remove("hidden");
    }, 100);
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
  const bodyImage = document.getElementById("body-image");
  const popupContent = document.querySelector(".popup-content");
  
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
  
  // Helper function to calculate snap position relative to body image
  function calculateSnapPosition(padId, zone) {
    const coords = snapCoordinates[padId][`zone${zone}`];
    const bodyImageRect = bodyImage.getBoundingClientRect();
    const popupContentRect = popupContent.getBoundingClientRect();
    
    // Calculate image position relative to popup-content
    const imageLeftInPopup = bodyImageRect.left - popupContentRect.left;
    const imageTopInPopup = bodyImageRect.top - popupContentRect.top;
    
    // Parse percentage values
    const offsetXPercent = parseFloat(coords.imageOffsetX) / 100;
    const offsetYPercent = parseFloat(coords.imageOffsetY) / 100;
    
    // Calculate absolute position within popup-content
    const left = imageLeftInPopup + (bodyImageRect.width * offsetXPercent);
    const top = imageTopInPopup + (bodyImageRect.height * offsetYPercent);
    
    // Center the pad on that point
    const padWidth = pad1.offsetWidth;
    const padHeight = pad1.offsetHeight;
    
    return {
      top: (top - padHeight / 2) + 'px',
      left: (left - padWidth / 2) + 'px'
    };
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
    const snapPos = calculateSnapPosition('pad1', pad1Zone);
    pad1.style.top = snapPos.top;
    pad1.style.left = snapPos.left;
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
    const snapPos = calculateSnapPosition('pad2', pad2Zone);
    pad2.style.top = snapPos.top;
    pad2.style.left = snapPos.left;
  } else {
    pad2.classList.remove("snapped");
  }
  
  // Check if both pads are successfully snapped
  if (padZoneMap.pad1 !== null && padZoneMap.pad2 !== null) {
    // Change pad connector to completed state (stops blinking, keeps darker color)
    padConnector.classList.remove("active");
    padConnector.classList.add("completed");
    padConnector.style.pointerEvents = "none";
    
    // Play audio immediately (within user gesture for mobile compatibility)
    const beep2Audio = new Audio("audio/beep2.mp3");
    beep2Audio.play().catch(error => console.log("Beep2 play error:", error));
    
    // Close popup after a delay to let user see the snap
    setTimeout(function() {
      padPopup.classList.add("hidden");
    }, 500);
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

