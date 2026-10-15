(function () {
  try {
    // Same default as ThemeProvider, so the boot cover does not flip theme on mount.
    var preference = localStorage.getItem("anv-theme") || "light";
    var resolved = preference === "system"
      ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : preference;
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-theme-preference", preference);
  } catch (_error) {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.setAttribute("data-theme-preference", "light");
  }
})();

/* Boot cover (see #anv-boot in index.html). "?skip" drops it for tooling;
   the timer is a last-resort lift in case the app bundle never runs. */
(function () {
  var root = document.documentElement;
  try {
    root.setAttribute("data-boot", new URLSearchParams(window.location.search).has("skip") ? "skip" : "on");
  } catch (_error) {
    root.setAttribute("data-boot", "on");
  }
  window.setTimeout(function () {
    if (root.getAttribute("data-boot") !== "on") return;
    root.setAttribute("data-boot", "done");
    var cover = document.getElementById("anv-boot");
    if (cover) cover.className = "is-done";
  }, 9000);
})();
