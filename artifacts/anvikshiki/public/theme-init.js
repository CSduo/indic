(function () {
  try {
    var preference = localStorage.getItem("anv-theme") || "system";
    var resolved = preference === "system"
      ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : preference;
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-theme-preference", preference);
  } catch (_error) {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.setAttribute("data-theme-preference", "system");
  }
})();
