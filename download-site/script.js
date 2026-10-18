// The APK is hosted on this site (/moviescene.apk). Vercel copies it from the
// latest GitHub release on every deploy, so downloads never go through github.com.
const REPO = "christianrenz210/palabas";
const LOCAL_APK = "/moviescene.apk";
const GITHUB_APK = `https://github.com/${REPO}/releases/latest/download/palabas.apk`;

let apkUrl = LOCAL_APK;

// If the APK isn't on this site (e.g. the page was opened as a local file), use GitHub
fetch(LOCAL_APK, { method: "HEAD", cache: "no-store" })
  .then((r) => {
    if (!r.ok) apkUrl = GITHUB_APK;
    else {
      const len = Number(r.headers.get("content-length"));
      if (len) document.getElementById("size").textContent = (len / 1048576).toFixed(2) + " MB";
    }
  })
  .catch(() => { apkUrl = GITHUB_APK; });

// Show the version of the latest release
fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
  .then((r) => (r.ok ? r.json() : null))
  .then((rel) => {
    const v = rel && (rel.name || rel.tag_name || "").match(/v?\d+(\.\d+)*/i);
    if (v) document.getElementById("ver").textContent = v[0].startsWith("v") ? v[0] : "v" + v[0];
  })
  .catch(() => {});

const statusText = document.getElementById("status-text");
const btn = document.getElementById("download-btn");
document.getElementById("year").textContent = new Date().getFullYear();

// Downloads only when the button is tapped.
btn.addEventListener("click", () => {
  // Same-site link + "download" attribute: the file saves right away,
  // with no new tab and no page change.
  const a = document.createElement("a");
  a.href = apkUrl;
  a.download = "moviescene.apk";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();

  statusText.textContent = "✓ Download started. Check your notifications or Downloads folder.";
  statusText.classList.add("done");
  document.getElementById("btn-label").textContent = "Download again";
});
