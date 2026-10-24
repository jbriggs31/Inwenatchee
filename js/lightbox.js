// Click-to-enlarge for images inside .photos galleries only.
// Thumbnail markup is left as authored; this script adds the keyboard hook.

(function () {
  const galleries = Array.from(document.querySelectorAll(".photos"));
  if (!galleries.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const svg = {
    close: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9.5 5.5L16 12l-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  const dialog = document.createElement("div");
  dialog.className = "lightbox";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Enlarged photo");
  dialog.tabIndex = -1;
  dialog.hidden = true;

  const backdrop = document.createElement("div");
  backdrop.className = "lightbox-backdrop";

  const closeBtn = button("Close", "lightbox-close", svg.close);
  const prevBtn = button("Previous photo", "lightbox-prev", svg.prev);
  const nextBtn = button("Next photo", "lightbox-next", svg.next);

  const stage = document.createElement("div");
  stage.className = "lightbox-stage";

  const fit = document.createElement("div");
  fit.className = "lightbox-fit";

  const image = document.createElement("img");
  image.className = "lightbox-img";
  image.alt = "";
  image.setAttribute("aria-hidden", "true");

  const meta = document.createElement("div");
  meta.className = "lightbox-meta";
  meta.setAttribute("aria-live", "polite");
  meta.setAttribute("aria-atomic", "true");

  const caption = document.createElement("p");
  caption.className = "lightbox-caption";
  caption.id = "lightbox-caption";
  dialog.setAttribute("aria-describedby", "lightbox-caption");

  const count = document.createElement("p");
  count.className = "lightbox-count";

  fit.appendChild(image);
  meta.appendChild(caption);
  meta.appendChild(count);
  stage.appendChild(fit);
  stage.appendChild(meta);
  dialog.append(backdrop, stage, closeBtn, prevBtn, nextBtn);
  document.body.appendChild(dialog);

  let photos = [];
  let index = 0;
  let opener = null;
  let isOpen = false;
  let generation = 0;
  let lockedScroll = 0;
  const preloaded = new Set();
  let swipe = null;

  galleries.forEach(function (gallery) {
    const group = Array.from(gallery.querySelectorAll("img"));
    group.forEach(function (thumb, thumbIndex) {
      const alt = thumb.getAttribute("alt") || "";
      thumb.setAttribute("tabindex", "0");
      thumb.setAttribute("role", "button");
      thumb.setAttribute("aria-label", "Enlarge photo: " + alt);
      thumb.addEventListener("click", function () {
        open(group, thumbIndex, thumb);
      });
      thumb.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open(group, thumbIndex, thumb);
      });
      thumb.addEventListener("keyup", function (event) {
        if (event.key === " ") event.preventDefault();
      });
    });
  });

  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", function () { step(-1); });
  nextBtn.addEventListener("click", function () { step(1); });
  backdrop.addEventListener("click", close);

  document.addEventListener("keydown", onKeydown);
  document.addEventListener("focusin", onFocusIn);
  dialog.addEventListener("touchstart", onTouchStart, { passive: true });
  dialog.addEventListener("touchend", onTouchEnd, { passive: true });
  dialog.addEventListener("touchcancel", function () { swipe = null; }, { passive: true });
  dialog.addEventListener("touchmove", function (event) {
    if (!isOpen) return;
    if (event.target.closest(".lightbox-meta")) return;
    event.preventDefault();
  }, { passive: false });

  function button(label, className, icon) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "lightbox-btn " + className;
    el.setAttribute("aria-label", label);
    el.innerHTML = icon;
    return el;
  }

  function sourceOf(thumb) {
    return thumb.currentSrc || thumb.getAttribute("src") || "";
  }

  function preload(thumb) {
    const src = sourceOf(thumb);
    if (!src || preloaded.has(src)) return;
    preloaded.add(src);
    const el = new Image();
    el.src = src;
  }

  function show(nextIndex) {
    const total = photos.length;
    index = (nextIndex + total) % total;
    const thumb = photos[index];
    const alt = thumb.getAttribute("alt") || "";
    const src = sourceOf(thumb);
    if (image.getAttribute("src") !== src) image.src = src;
    caption.textContent = alt;
    count.textContent = (index + 1) + " of " + total;
    const single = total < 2;
    prevBtn.disabled = single;
    nextBtn.disabled = single;
    if (total > 1) {
      preload(photos[(index - 1 + total) % total]);
      preload(photos[(index + 1) % total]);
    }
  }

  function open(group, thumbIndex, thumb) {
    generation += 1;
    photos = group;
    opener = thumb;
    show(thumbIndex);
    isOpen = true;
    lockScroll();
    dialog.hidden = false;
    if (reduceMotion.matches) dialog.classList.add("is-open");
    else requestAnimationFrame(function () { dialog.classList.add("is-open"); });
    dialog.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    const token = generation;
    const returnTo = opener;
    dialog.classList.remove("is-open");

    const finish = function () {
      if (token !== generation) return;
      generation += 1;
      dialog.hidden = true;
      image.removeAttribute("src");
      unlockScroll();
      if (returnTo) returnTo.focus();
    };

    if (reduceMotion.matches) {
      finish();
      return;
    }
    const timer = window.setTimeout(finish, 280);
    dialog.addEventListener("transitionend", function (event) {
      if (event.target !== dialog || event.propertyName !== "opacity") return;
      window.clearTimeout(timer);
      finish();
    }, { once: true });
  }

  function step(delta) {
    if (!isOpen || photos.length < 2) return;
    show(index + delta);
  }

  function tabbables() {
    return [closeBtn, prevBtn, nextBtn].filter(function (el) { return !el.disabled; });
  }

  function onKeydown(event) {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
      return;
    }
    if (event.key !== "Tab") return;
    const items = tabbables();
    if (!items.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || active === dialog || !dialog.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !dialog.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }

  function onFocusIn(event) {
    if (!isOpen) return;
    if (event.target === dialog || dialog.contains(event.target)) return;
    const items = tabbables();
    (items[0] || dialog).focus();
  }

  function onTouchStart(event) {
    if (!isOpen || event.touches.length !== 1) {
      swipe = null;
      return;
    }
    const touch = event.touches[0];
    swipe = { x: touch.clientX, y: touch.clientY, id: touch.identifier };
  }

  function onTouchEnd(event) {
    if (!swipe) return;
    let touch = null;
    for (let i = 0; i < event.changedTouches.length; i += 1) {
      if (event.changedTouches[i].identifier === swipe.id) touch = event.changedTouches[i];
    }
    const start = swipe;
    swipe = null;
    if (!touch || !isOpen) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    step(dx < 0 ? 1 : -1);
  }

  function lockScroll() {
    lockedScroll = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.add("lightbox-open");
    document.body.style.position = "fixed";
    document.body.style.top = "-" + lockedScroll + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockScroll() {
    document.body.classList.remove("lightbox-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, lockedScroll);
  }
})();
