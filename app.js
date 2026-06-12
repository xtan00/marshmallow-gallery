(function () {
  const gallery = document.getElementById("gallery");

  if (!PHOTOS || PHOTOS.length === 0) return;

  const CONFIG = {
    batchMin: 3,
    batchMax: 4,
    showDuration: 5500,
    enterDuration: 1400,
    exitDuration: 1200,
    batchGap: 600,
    stagger: 180,
  };

  const sizes = [
    { w: 150, h: 190 },
    { w: 180, h: 150 },
    { w: 165, h: 165 },
    { w: 140, h: 180 },
    { w: 200, h: 155 },
    { w: 145, h: 145 },
  ];

  const entryDirs = [
    { x: "-120%", y: "0", ex: "120%", ey: "0" },
    { x: "120%", y: "0", ex: "-120%", ey: "0" },
    { x: "0", y: "110%", ex: "0", ey: "-110%" },
    { x: "0", y: "-110%", ex: "0", ey: "110%" },
    { x: "-80%", y: "80%", ex: "80%", ey: "-80%" },
    { x: "80%", y: "-80%", ex: "-80%", ey: "80%" },
  ];

  let running = true;

  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML = `
    <button class="lightbox-close" aria-label="关闭">×</button>
    <img src="" alt="小狗照片" />
  `;
  document.body.appendChild(lightbox);

  const lbImg = lightbox.querySelector("img");
  const lbClose = lightbox.querySelector(".lightbox-close");

  function openLightbox(src, alt) {
    lbImg.src = src;
    lbImg.alt = alt;
    lightbox.classList.add("active");
  }

  function closeLightbox() {
    lightbox.classList.remove("active");
    lbImg.src = "";
  }

  lbClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  function shuffle(arr) {
    const list = [...arr];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function randomBatchSize(remaining) {
    const max = Math.min(CONFIG.batchMax, remaining);
    const min = Math.min(CONFIG.batchMin, max);
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function getGallerySize() {
    const rect = gallery.getBoundingClientRect();
    return {
      width: rect.width || gallery.clientWidth || 1100,
      height: rect.height || gallery.clientHeight || 500,
    };
  }

  function rectsOverlap(a, b, gap) {
    return !(
      a.left + a.w + gap <= b.left ||
      b.left + b.w + gap <= a.left ||
      a.top + a.h + gap <= b.top ||
      b.top + b.h + gap <= a.top
    );
  }

  function pickGridLayout(count, width, height, startIndex) {
    const layouts = [];
    const cols = Math.min(count, 2);
    const rows = Math.ceil(count / cols);
    const areaHeight = height * 0.48;
    const padding = 20;
    const cellW = (width - padding * 2) / cols;
    const cellH = (areaHeight - padding * 2) / rows;

    for (let i = 0; i < count; i++) {
      const size = sizes[(startIndex + i) % sizes.length];
      const col = i % cols;
      const row = Math.floor(i / cols);
      layouts.push({
        leftPx: padding + col * cellW + Math.max((cellW - size.w) / 2, 0),
        topPx: padding + row * cellH + Math.max((cellH - size.h) / 2, 0),
        size,
      });
    }
    return layouts;
  }

  function pickLayout(count) {
    const { width, height } = getGallerySize();
    const padding = 20;
    const gap = 48;
    const areaHeight = height * 0.48;
    const placed = [];
    const layouts = [];

    for (let i = 0; i < count; i++) {
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      let found = false;

      for (let attempt = 0; attempt < 100; attempt++) {
        const maxLeft = width - size.w - padding;
        const maxTop = areaHeight - size.h - padding;
        if (maxLeft < padding || maxTop < padding) break;

        const candidate = {
          left: padding + Math.random() * (maxLeft - padding),
          top: padding + Math.random() * (maxTop - padding),
          w: size.w,
          h: size.h,
        };

        if (!placed.some((rect) => rectsOverlap(candidate, rect, gap))) {
          placed.push(candidate);
          layouts.push({ leftPx: candidate.left, topPx: candidate.top, size });
          found = true;
          break;
        }
      }

      if (!found) {
        return pickGridLayout(count, width, height, layouts.length);
      }
    }

    return layouts;
  }

  function createCard(photo, layout, index) {
    const size = layout.size;
    const dir = entryDirs[Math.floor(Math.random() * entryDirs.length)];
    const rotate = -10 + Math.random() * 20;
    const floatX = 12 + Math.random() * 20;
    const floatY = 8 + Math.random() * 16;

    const card = document.createElement("div");
    card.className = "photo-card";
    card.style.width = size.w + "px";
    card.style.height = size.h + "px";
    card.style.left = layout.leftPx + "px";
    card.style.top = layout.topPx + "px";
    card.style.setProperty("--enter-x", dir.x);
    card.style.setProperty("--enter-y", dir.y);
    card.style.setProperty("--exit-x", dir.ex);
    card.style.setProperty("--exit-y", dir.ey);
    card.style.setProperty("--rotate", rotate + "deg");
    card.style.setProperty("--dx", floatX + "px");
    card.style.setProperty("--dy", -floatY + "px");
    card.style.zIndex = String(10 + index);

    const src = `images/${photo.file}`;
    const alt = photo.caption || "我的小狗";

    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    img.loading = "eager";

    card.appendChild(img);

    if (photo.caption) {
      const cap = document.createElement("div");
      cap.className = "caption";
      cap.textContent = photo.caption;
      card.appendChild(cap);
    }

    card.addEventListener("click", () => openLightbox(src, alt));
    return card;
  }

  function animateCard(card, phase) {
    return new Promise((resolve) => {
      const duration =
        phase === "enter"
          ? CONFIG.enterDuration
          : phase === "exit"
            ? CONFIG.exitDuration
            : CONFIG.showDuration;

      card.classList.remove("entering", "floating", "exiting");
      card.classList.add(
        phase === "enter" ? "entering" : phase === "exit" ? "exiting" : "floating"
      );

      if (phase === "float") {
        resolve();
        return;
      }

      const onEnd = (e) => {
        if (e.target !== card) return;
        card.removeEventListener("animationend", onEnd);
        resolve();
      };
      card.addEventListener("animationend", onEnd);
      setTimeout(resolve, duration + 120);
    });
  }

  async function showBatch(batch) {
    const layouts = pickLayout(batch.length);
    const cards = batch.map((photo, i) => {
      const card = createCard(photo, layouts[i], i);
      gallery.appendChild(card);
      return card;
    });

    await Promise.all(
      cards.map((card, i) => wait(i * CONFIG.stagger).then(() => animateCard(card, "enter")))
    );

    cards.forEach((card) => card.classList.add("floating"));
    await wait(CONFIG.showDuration);

    await Promise.all(
      cards.map((card, i) => wait(i * CONFIG.stagger).then(() => animateCard(card, "exit")))
    );

    cards.forEach((card) => card.remove());
  }

  async function runCycle() {
    const queue = shuffle(PHOTOS);

    while (queue.length > 0 && running) {
      const size = randomBatchSize(queue.length);
      const batch = queue.splice(0, size);
      await showBatch(batch);
      if (queue.length > 0) await wait(CONFIG.batchGap);
    }

    if (running) {
      await wait(1500);
      runCycle();
    }
  }

  runCycle();
})();
