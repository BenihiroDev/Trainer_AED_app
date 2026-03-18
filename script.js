const powerButton = document.getElementById("power-button");
const beep = new Audio("audio/beep.mp3");
const padConnector = document.getElementById("pad-connector");
const padPopup = document.getElementById("pad-popup");
const closePopup = document.getElementById("close-popup");

let powerOn = false;
let pressTimer;

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



closePopup.addEventListener("click", function() {
  padPopup.classList.add("hidden");
});