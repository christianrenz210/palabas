// Ang APK ay nasa mismong website (/palabas.apk), kinokopya mula sa
// pinakabagong GitHub release tuwing nagde-deploy sa Vercel.
// Kaya hindi na dumadaan sa github.com ang download.
const REPO = "christianrenz210/palabas";
const LOCAL_APK = "/palabas.apk";
const GITHUB_APK = `https://github.com/${REPO}/releases/latest/download/palabas.apk`;
const COUNTDOWN = 3; // segundo bago mag-auto download

let apkUrl = LOCAL_APK;

// Kung wala ang APK sa site (hal. binuksan lang ang file sa computer), GitHub ang gamitin
fetch(LOCAL_APK, { method: "HEAD", cache: "no-store" })
  .then((r) => {
    if (!r.ok) apkUrl = GITHUB_APK;
    else {
      const len = Number(r.headers.get("content-length"));
      if (len) document.getElementById("size").textContent = (len / 1048576).toFixed(2) + " MB";
    }
  })
  .catch(() => { apkUrl = GITHUB_APK; });

// Ipakita ang version ng pinakabagong release
fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
  .then((r) => (r.ok ? r.json() : null))
  .then((rel) => {
    if (rel && rel.name) document.getElementById("ver").textContent = rel.name.replace(/^Palabas\s*/i, "");
  })
  .catch(() => {});

const btn = document.getElementById("download-btn");
const statusBox = document.getElementById("status");
const statusText = document.getElementById("status-text");
const barFill = document.getElementById("bar-fill");
document.getElementById("year").textContent = new Date().getFullYear();

let started = false;

function startDownload() {
  // Same-site na link + "download" attribute: magse-save agad ang file,
  // walang bagong tab at walang lilipatang page.
  const a = document.createElement("a");
  a.href = apkUrl;
  a.download = "palabas.apk";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();

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
