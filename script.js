const powerButton = document.getElementById("power-button");
const beep = new Audio("audio/beep.mp3");
const padConnector = document.getElementById("pad-connector");

let powerOn = false;

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