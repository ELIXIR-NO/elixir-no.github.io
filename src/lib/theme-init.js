// Runs inline in <head>, before the page paints, so it is plain browser
// JavaScript with no imports: base.astro inserts this file's text as it stands.
// The visitor's stored choice decides the theme, and the site is light until
// they choose.
(() => {
    const apply = () => {
        let stored = null;
        try { stored = localStorage.getItem("theme"); } catch {}
        document.documentElement.classList.toggle("dark", stored === "dark");
    };
    apply();
    // The back button restores a page as it was left, so the theme may have changed since.
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) apply();
    });
})();
