const powerButton = document.getElementById("power-button");
const powerOnBeep = new Audio("audio/beep3.mp3");
const applyPadsPromptAudio = new Audio("audio/apply-pads-plug-in-connector.mp3");
const applyPadsShortPromptAudio = new Audio("audio/apply-pads-plug-in-connector-short.mp3");
const SWITCH_SOUND_POOL_SIZE = 5;
const switchSoundPool = Array.from({ length: SWITCH_SOUND_POOL_SIZE }, () => {
  const audio = new Audio("audio/switch.mp3");
  audio.preload = "auto";
  audio.load();
  return audio;
});
let switchSoundIndex = 0;
const padConnector = document.getElementById("pad-connector");
const padPopup = document.getElementById("pad-popup");
const closePopup = document.getElementById("close-popup");
const padWarningPopup = document.getElementById("pad-warning-popup");
const closeWarningPopup = document.getElementById("close-warning-popup");

// Debug: Verify elements are found
console.log("Power Button found:", powerButton);
console.log("Pad Connector found:", padConnector);

let powerOn = false;
let powerOnSequenceTimeout = null;
let padButtonTouchedThisPowerCycle = false;
let padsReminderStartTimeout = null;
let padsReminderRepeatTimeout = null;
let padsSnapped = false;
let analyzeAudio = null;
let shockAdvisedAudio = null;
let shockDeliveredAudio = null;
let shockAdvisedStartTimeout = null;
let chargingBeepAudio = null;
let chargingBeepStartTimeout = null;

powerOnBeep.preload = "auto";
applyPadsPromptAudio.preload = "auto";
applyPadsShortPromptAudio.preload = "auto";

function stopPadsReminderLoop() {
  if (padsReminderStartTimeout !== null) {
    clearTimeout(padsReminderStartTimeout);
    padsReminderStartTimeout = null;
  }

  if (padsReminderRepeatTimeout !== null) {
    clearTimeout(padsReminderRepeatTimeout);
    padsReminderRepeatTimeout = null;
  }

  applyPadsShortPromptAudio.pause();
  applyPadsShortPromptAudio.currentTime = 0;
  applyPadsShortPromptAudio.onended = null;
}

function stopApplyPadsPrompts() {
  stopPadsReminderLoop();
  applyPadsPromptAudio.pause();
  applyPadsPromptAudio.currentTime = 0;
  applyPadsPromptAudio.onended = null;
}

function schedulePadsReminderStart() {
  stopPadsReminderLoop();

  padsReminderStartTimeout = setTimeout(function playReminderIfNeeded() {
    if (!powerOn || padButtonTouchedThisPowerCycle) {
      return;
    }

    applyPadsShortPromptAudio.currentTime = 0;
    applyPadsShortPromptAudio.play().catch(error => {
      console.log("Apply pads short prompt play error:", error);
    });

    applyPadsShortPromptAudio.onended = function() {
      if (!powerOn || padButtonTouchedThisPowerCycle) {
        return;
      }

      // Repeat every 10 seconds after each reminder ends.
      padsReminderRepeatTimeout = setTimeout(playReminderIfNeeded, 10000);
    };
  }, 5000);
}

function stopPowerOnAudioSequence() {
  if (powerOnSequenceTimeout !== null) {
    clearTimeout(powerOnSequenceTimeout);
    powerOnSequenceTimeout = null;
  }

  powerOnBeep.pause();
  powerOnBeep.currentTime = 0;
  powerOnBeep.onended = null;

  stopApplyPadsPrompts();
}

function playPowerOnAudioSequence() {
  stopPowerOnAudioSequence();

  // Leave a short gap for the switch click sound before startup prompts.
  powerOnSequenceTimeout = setTimeout(function() {
    if (!powerOn) return;

    powerOnBeep.currentTime = 0;
    powerOnBeep.play().catch(error => console.log("Beep3 play error:", error));

    powerOnBeep.onended = function() {
      if (!powerOn) return;
      applyPadsPromptAudio.currentTime = 0;
      applyPadsPromptAudio.play().catch(error => console.log("Apply pads prompt play error:", error));

      applyPadsPromptAudio.onended = function() {
        if (!powerOn || padButtonTouchedThisPowerCycle) {
          return;
        }

        schedulePadsReminderStart();
      };
    };
  }, 160);
}

function playSwitchSound() {
  // Rotate through preloaded audio objects to minimize click-to-sound latency.
  const audio = switchSoundPool[switchSoundIndex];
  switchSoundIndex = (switchSoundIndex + 1) % SWITCH_SOUND_POOL_SIZE;
  audio.currentTime = 0;
  audio.play().catch(error => console.log("Switch sound play error:", error));
}

const SILENT_BUTTONS = new Set(["close-popup", "close-warning-popup"]);

document.addEventListener("pointerdown", function(e) {
  const pressedButton = e.target.closest("button");
  if (pressedButton && !SILENT_BUTTONS.has(pressedButton.id)) {
    playSwitchSound();
  }
});

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

// Indicator bulbs (used later for alert blink)
const indicator1 = document.getElementById("indic-bulb-1");
const indicator2 = document.getElementById("indic-bulb-2");
const shockButton = document.getElementById("shock-button");

function startIndicatorAlert() {
  if (indicator1) indicator1.classList.add("alert-1");
  if (indicator2) indicator2.classList.add("alert-2");
}

function startAnalyzeIndicatorAlert() {
  if (indicator1) indicator1.classList.add("analyze-1");
}

function startPostShockIndicatorAlert() {
  if (indicator2) indicator2.classList.add("post-shock-green");
}

function stopIndicatorAlert() {
  if (indicator1) indicator1.classList.remove("alert-1");
  if (indicator2) indicator2.classList.remove("alert-2");
  if (indicator1) indicator1.classList.remove("analyze-1");
  if (indicator2) indicator2.classList.remove("post-shock-green");
}

function activateShockButton() {
  if (shockButton) {
    shockButton.classList.add("activate");
  }
}

function deactivateShockButton() {
  if (shockButton) {
    shockButton.classList.remove("activate");
  }
}

function arePadsCorrectlyPlaced() {
  return padZoneMap.pad1 !== null && padZoneMap.pad2 !== null;
}

function stopChargingBeep() {
  clearTimeout(chargingBeepStartTimeout);
  chargingBeepStartTimeout = null;
  if (chargingBeepAudio) {
    chargingBeepAudio.pause();
    chargingBeepAudio.currentTime = 0;
    chargingBeepAudio = null;
  }
}

function stopRhythmAndShockSequence() {
  if (shockAdvisedStartTimeout !== null) {
    clearTimeout(shockAdvisedStartTimeout);
    shockAdvisedStartTimeout = null;
  }

  stopChargingBeep();

  if (analyzeAudio) {
    analyzeAudio.pause();
    analyzeAudio.currentTime = 0;
    analyzeAudio.onended = null;
    analyzeAudio = null;
  }

  if (shockAdvisedAudio) {
    shockAdvisedAudio.pause();
    shockAdvisedAudio.currentTime = 0;
    shockAdvisedAudio.onended = null;
    shockAdvisedAudio = null;
  }

  if (shockDeliveredAudio) {
    shockDeliveredAudio.pause();
    shockDeliveredAudio.currentTime = 0;
    shockDeliveredAudio.onended = null;
    shockDeliveredAudio = null;
  }
}

shockButton.addEventListener("click", function() {
  if (!powerOn || !shockButton.classList.contains("activate")) {
    return;
  }

  // Stop any in-flight rhythm/charging voice prompts immediately.
  stopRhythmAndShockSequence();
  stopIndicatorAlert();
  deactivateShockButton();

  shockDeliveredAudio = new Audio("audio/shock-delivered-start-cpr.mp3");
  shockDeliveredAudio.play().catch(error => console.log("Shock delivered audio play error:", error));

  // After shock delivery, show lower green blink at 100 BPM.
  startPostShockIndicatorAlert();
});

powerButton.addEventListener("click", function() {
  console.log("Power button clicked! PowerOn state before:", powerOn);
  powerOn = !powerOn;
  console.log("PowerOn state after:", powerOn);

  if (powerOn) {
    console.log("Turning power ON");
    padButtonTouchedThisPowerCycle = false;
    playPowerOnAudioSequence();
    powerButton.classList.add("on");
    padConnector.classList.add("active");
    padConnector.style.pointerEvents = "auto";
    padConnector.style.opacity = "1";
  } else {
    console.log("Turning power OFF");
    stopPowerOnAudioSequence();
    stopPadsReminderLoop();
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
  padsSnapped = false;
  
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
  
  // Stop charging beep if running
  stopRhythmAndShockSequence();

  // Reset indicator bulbs
  stopIndicatorAlert();
  
  // Reset shock button
  deactivateShockButton();
  
  // Hide popup
  padPopup.classList.add("hidden");
  if (padWarningPopup) {
    padWarningPopup.classList.add("hidden");
  }
}
padConnector.addEventListener("click", function() {
  if (powerOn) {
    padButtonTouchedThisPowerCycle = true;
    stopPadsReminderLoop();
    padPopup.classList.remove("hidden");
  }
});


/* PADS POP-UP CLOSE */
closePopup.addEventListener("click", function() {
  padPopup.classList.add("hidden");

  if (!arePadsCorrectlyPlaced() && padWarningPopup) {
    padWarningPopup.classList.remove("hidden");
  }
});

if (closeWarningPopup) {
  closeWarningPopup.addEventListener("click", function() {
    padWarningPopup.classList.add("hidden");
  });
}


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
  if (padZoneMap.pad1 !== null && padZoneMap.pad2 !== null && !padsSnapped) {
    padsSnapped = true;
    // Once pads are correctly placed, stop pending/playing apply-pads prompts.
    stopApplyPadsPrompts();
    stopRhythmAndShockSequence();

    // Change pad connector to completed state (stops blinking, keeps darker color)
    padConnector.classList.remove("active");
    padConnector.classList.add("completed");
    padConnector.style.pointerEvents = "none";
    
    // Play analyzing-heart-rhythm prompt
    analyzeAudio = new Audio("audio/analyzing-heart-rhythm-do-not-touch-patient.mp3");
    startAnalyzeIndicatorAlert();
    analyzeAudio.play().catch(error => console.log("Analyze audio play error:", error));

    analyzeAudio.onended = function() {
      // 0.5s gap before shock-advised audio
      shockAdvisedStartTimeout = setTimeout(function() {
        shockAdvisedStartTimeout = null;
        shockAdvisedAudio = new Audio("audio/shock-advised-charging-stay-clear-deliver-shock-now.mp3");

        // Transition from analyze top-only blink to alternating red alert blink.
        stopIndicatorAlert();
        startIndicatorAlert();

        shockAdvisedAudio.play().catch(error => console.log("Shock advised audio play error:", error));

        // "deliver shock now" starts at ~7.62s into the audio — begin beep overlay and activate shock button then
        chargingBeepStartTimeout = setTimeout(function() {
          chargingBeepAudio = new Audio("audio/beep5-60s.mp3");
          chargingBeepAudio.play().catch(error => console.log("Charging beep play error:", error));
          activateShockButton();
        }, 7620);
      }, 500);
    };
    
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

