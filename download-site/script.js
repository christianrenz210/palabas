// Direktang link ng APK asset (hindi ang release page).
// "latest" = laging pinakabagong release, kaya hindi na kailangang palitan bawat build.
const REPO = "christianrenz210/palabas";
const APK_URL = `https://github.com/${REPO}/releases/latest/download/palabas.apk`;
const COUNTDOWN = 3; // segundo bago mag-auto download

// Ipakita ang tamang version at laki ng pinakabagong APK
fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
  .then((r) => (r.ok ? r.json() : null))
  .then((rel) => {
    if (!rel) return;
    if (rel.name) document.getElementById("ver").textContent = rel.name.replace(/^Palabas\s*/i, "");
    const apk = (rel.assets || []).find((a) => a.name.endsWith(".apk"));
    if (apk) document.getElementById("size").textContent = (apk.size / 1048576).toFixed(2) + " MB";
  })
  .catch(() => {});

const btn = document.getElementById("download-btn");
const statusBox = document.getElementById("status");
const statusText = document.getElementById("status-text");
const barFill = document.getElementById("bar-fill");
const frame = document.getElementById("dl-frame");
document.getElementById("year").textContent = new Date().getFullYear();

let started = false;

function startDownload() {
  // Pinapadala ng GitHub ang APK bilang "attachment", kaya magda-download
  // agad ito nang hindi umaalis sa page at walang bagong tab.
  // Hidden iframe para sa desktop; location para sa mobile browsers.
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = APK_URL;
  } else {
    frame.src = APK_URL + "?t=" + Date.now();
  }

  started = true;
  barFill.style.width = "100%";
  statusBox.classList.add("done");
  statusText.innerHTML = "✓ Nagsimula na ang download! Tingnan ang notification o Downloads folder.";
  btn.lastChild.textContent = " I-download ulit";
}

// Countdown + auto download
let left = COUNTDOWN;
const countEl = document.getElementById("count");
barFill.style.width = "0%";

const timer = setInterval(() => {
  left--;
  barFill.style.width = ((COUNTDOWN - left) / COUNTDOWN) * 100 + "%";
  if (left > 0) {
    countEl.textContent = left;
  } else {
    clearInterval(timer);
    if (!started) startDownload();
  }
}, 1000);

btn.addEventListener("click", () => {
  clearInterval(timer);
  startDownload();
});
