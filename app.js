(function () {
  const gallery = document.getElementById("gallery");

  if (!PHOTOS || PHOTOS.length === 0) return;

  const CONFIG = {
    batchSize: 5,
    showDuration: 5500,
    enterDuration: 1400,
    exitDuration: 1200,
    batchGap: 600,
    stagger: 180,
  };

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

  function batchSize(remaining) {
    return Math.min(CONFIG.batchSize, remaining);
  }

  const LAYOUT_SLOTS = [
    { row: 0, col: 0, cols: 2 },
    { row: 0, col: 1, cols: 2 },
    { row: 1, col: 0, cols: 3 },
    { row: 1, col: 1, cols: 3 },
    { row: 1, col: 2, cols: 3 },
  ];

  function getGallerySize() {
    const rect = gallery.getBoundingClientRect();
    return {
      width: rect.width || gallery.clientWidth || 1100,
      height: rect.height || gallery.clientHeight || 500,
    };
  }

  function getCardSize(width, height) {
    const pad = 24;
    const gapH = 40;
    const gapV = 36;
    const areaH = height * 0.68;

    const wFromBottom = Math.floor((width - pad * 2 - gapH * 2) / 3);
    const wFromTop = Math.floor((width - pad * 2 - gapH) / 2);
    const w = Math.min(wFromBottom, wFromTop, 300);

    const h = Math.floor((areaH - pad * 2 - gapV) / 2);
    return { w, h: Math.min(h, 340) };
  }

  function rowStartX(cols, width, cardW, gapH) {
    const totalW = cols * cardW + (cols - 1) * gapH;
    return (width - totalW) / 2;
  }

  function pickLayout(count) {
    const { width, height } = getGallerySize();
    const pad = 24;
    const gapH = 40;
    const gapV = 36;
    const areaH = height * 0.68;
    const size = getCardSize(width, height);
    const blockH = size.h * 2 + gapV;
    const startY = pad + (areaH - blockH) / 2;
    const rowTops = [startY, startY + size.h + gapV];
    const layouts = [];

    for (let i = 0; i < count; i++) {
      const slot = LAYOUT_SLOTS[i];
      const leftPx = rowStartX(slot.cols, width, size.w, gapH) + slot.col * (size.w + gapH);
      layouts.push({
        leftPx,
        topPx: rowTops[slot.row],
        size,
      });
    }

    return layouts;
  }

  function createCard(photo, layout, index) {
    const size = layout.size;
    const dir = entryDirs[Math.floor(Math.random() * entryDirs.length)];
    const rotate = -3 + Math.random() * 6;
    const floatX = 3 + Math.random() * 5;
    const floatY = 2 + Math.random() * 5;

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
      const size = batchSize(queue.length);
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
