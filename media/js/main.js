/* The Sixty-Four | interactions */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 1. Placeholder label when an image file is missing ---- */
  function markMissing(img) {
    var frame = img.closest(".frame");
    if (frame) frame.classList.add("is-missing");
  }
  document.querySelectorAll(".frame img").forEach(function (img) {
    img.addEventListener("error", function () { markMissing(img); });
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) markMissing(img);
  });

  /* ---- 3. Navbar state, scroll progress, back-to-top button ---- */
  var nav = document.getElementById("mainNav");
  var progress = document.getElementById("progressLine");
  var toTop = document.getElementById("toTop");

  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    nav.classList.toggle("scrolled", y > 40);
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    toTop.classList.toggle("show", y > 500);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function scrollToTop(e) {
    if (e) e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }
  toTop.addEventListener("click", scrollToTop);
  document.querySelectorAll("[data-top]").forEach(function (el) {
    el.addEventListener("click", scrollToTop);
  });

  // Show the word "Top" instead if chess.png is missing
  var stickerImg = document.getElementById("toTopImg");
  function stickerMissing() { toTop.classList.add("no-img"); }
  stickerImg.addEventListener("error", stickerMissing);
  if (stickerImg.complete && stickerImg.naturalWidth === 0) stickerMissing();

  // Close the mobile menu after choosing a link
  var menu = document.getElementById("navMenu");
  document.querySelectorAll("#navMenu .nav-link").forEach(function (link) {
    link.addEventListener("click", function () {
      if (menu.classList.contains("show")) bootstrap.Collapse.getOrCreateInstance(menu).hide();
    });
  });

  /* ---- 4. Opening move replay ---- */
  document.querySelectorAll("[data-replay]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.dataset.busy) return;
      btn.dataset.busy = "1";
      var moves = btn.parentElement.querySelectorAll("[data-moves] span");
      moves.forEach(function (m) {
        m.classList.remove("just-played");
        m.classList.add("hidden-move");
      });
      moves.forEach(function (m, idx) {
        setTimeout(function () {
          moves.forEach(function (x) { x.classList.remove("just-played"); });
          m.classList.remove("hidden-move");
          m.classList.add("just-played");
          if (idx === moves.length - 1) {
            setTimeout(function () {
              m.classList.remove("just-played");
              delete btn.dataset.busy;
            }, 700);
          }
        }, reduceMotion ? 0 : 550 * (idx + 1));
      });
    });
  });

  /* ---- 5. Image lightbox for opening boards ---- */
  var modalEl = document.getElementById("imgModal");
  modalEl.addEventListener("show.bs.modal", function (event) {
    var trigger = event.relatedTarget;
    if (!trigger) return;
    var frame = document.getElementById("imgModalFrame");
    var img = document.getElementById("imgModalImg");
    frame.classList.remove("is-missing");
    frame.dataset.label = trigger.dataset.label;
    document.getElementById("imgModalTitle").textContent = trigger.dataset.title;
    img.alt = trigger.dataset.title + " board";
    img.onerror = function () { frame.classList.add("is-missing"); };
    img.src = trigger.dataset.src;
  });

  /* ---- 6. Footer year ---- */
  document.getElementById("year").textContent = new Date().getFullYear();
})();
