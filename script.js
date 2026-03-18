const powerButton = document.getElementById("power-button");
const beep = new Audio("audio/beep.mp3");
const padConnector = document.getElementById("pad-connector");
const padPopup = document.getElementById("pad-popup");
const closePopup = document.getElementById("close-popup");

let powerOn = false;
let pressTimer;


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
  }
}

// Activate pads
makeDraggable(document.getElementById("pad1"));
makeDraggable(document.getElementById("pad2"));

