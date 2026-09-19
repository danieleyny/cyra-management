(() => {
  "use strict";

  const config = window.CYRA_CONFIG;
  const residences = window.CYRA_RESIDENCES || [];
  const body = document.body;
  const header = document.querySelector("[data-header]");
  const menu = document.querySelector("#mobile-menu");
  const menuToggle = document.querySelector(".menu-toggle");
  const menuClose = document.querySelector(".mobile-menu__close");
  const residenceGrid = document.querySelector("#residence-grid");
  const residenceDialog = document.querySelector("#residence-dialog");
  const form = document.querySelector("#contact-form");
  const residenceThumbnail = (source) => source.replace(/\.webp$/, "-900.webp");
  let lastFocused = null;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stardustPalette = ["#ffad87", "#c9a8ff", "#72e9df", "#fff8ef"];
  const createSeededRandom = (seed) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const createStardustMap = (width, height) => {
    const seed = 9167 + Math.round(width / 8) * 31 + Math.round(height / 8) * 17;
    const random = createSeededRandom(seed);
    const count = width < 600 ? 54 : 104;
    const stars = [];
    for (let index = 0; index < count; index += 1) {
      const edgeBias = random();
      const x = edgeBias < .48 ? Math.pow(random(), .72) : 1 - Math.pow(random(), .72);
      const y = Math.pow(random(), .9);
      stars.push({
        x,
        y,
        radius: .45 + Math.pow(random(), 2.3) * 1.75,
        color: Math.floor(random() * stardustPalette.length),
        phase: random() * Math.PI * 2,
        speed: .42 + random() * .9,
        glow: .35 + random() * .65
      });
    }
    return stars;
  };

  const paintStardust = (context, stars, width, height, time, alpha = 1) => {
    if (!context || !stars.length || alpha <= 0) return;
    context.save();
    context.globalCompositeOperation = "lighter";
    stars.forEach((star) => {
      const shimmer = .48 + .52 * Math.pow((Math.sin(time * .001 * star.speed + star.phase) + 1) / 2, 2.6);
      const opacity = alpha * (.22 + shimmer * .72) * star.glow;
      const x = star.x * width;
      const y = star.y * height;
      const radius = star.radius * (.82 + shimmer * .34);
      const color = stardustPalette[star.color];
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = color;
      context.globalAlpha = opacity;
      context.shadowColor = color;
      context.shadowBlur = 5 + radius * 6;
      context.fill();
      if (star.radius > 1.45 && shimmer > .78) {
        const ray = radius * (2.5 + shimmer * 2.2);
        context.beginPath();
        context.moveTo(x - ray, y);
        context.lineTo(x + ray, y);
        context.moveTo(x, y - ray);
        context.lineTo(x, y + ray);
        context.lineWidth = .45;
        context.strokeStyle = color;
        context.globalAlpha = opacity * .56;
        context.stroke();
      }
    });
    context.restore();
  };

  const setupSiteIntro = () => {
    const intro = document.querySelector("[data-site-intro]");
    const root = document.documentElement;
    if (!intro || !root.classList.contains("intro-pending")) {
      intro?.remove();
      return;
    }

    const canvas = intro.querySelector("[data-intro-canvas]");
    const context = canvas?.getContext("2d", { alpha: true });
    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const easeOut = (value) => 1 - Math.pow(1 - clamp(value), 3);
    let finished = false;
    let frame = 0;
    let startedAt = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let particles = [];
    let overspray = [];
    let particleGroups = [[], [], [], []];
    let oversprayGroups = [[], [], [], []];
    let settledStars = [];
    let textStyle = {};
    let sequenceReady = false;
    let artIsReady = false;
    let lasersStarted = false;
    let slicingStarted = false;
    let blastingStarted = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resizeCanvas);
      try { sessionStorage.setItem("cyra-intro-v5", "seen"); } catch (error) { /* Storage may be unavailable. */ }
      intro.classList.add("is-exiting");
      root.classList.remove("intro-pending");
      root.classList.add("intro-revealing");
      window.setTimeout(() => {
        intro.remove();
        root.classList.remove("intro-revealing");
      }, 1260);
    };

    const heroArt = document.querySelector(".hero-art__image");
    const artReady = !heroArt || heroArt.complete
      ? Promise.resolve()
      : new Promise((resolve) => {
          heroArt.addEventListener("load", resolve, { once: true });
          heroArt.addEventListener("error", resolve, { once: true });
        });
    const maybeFinish = () => {
      if (sequenceReady && artIsReady) finish();
    };
    artReady.then(() => {
      artIsReady = true;
      maybeFinish();
    });

    const buildPaintMap = () => {
      if (!context) return;
      const mask = document.createElement("canvas");
      mask.width = Math.max(1, Math.round(width));
      mask.height = Math.max(1, Math.round(height));
      const maskContext = mask.getContext("2d", { willReadFrequently: true });
      if (!maskContext) return;

      const fontSize = Math.min(width < 600 ? width * .285 : width * .19, height * .32, 250);
      const font = `700 ${fontSize}px Manrope, Arial, sans-serif`;
      const centerX = width / 2;
      const centerY = height * .5;
      maskContext.font = font;
      maskContext.textAlign = "center";
      maskContext.textBaseline = "middle";
      maskContext.fillStyle = "#fff";
      maskContext.fillText("CYRA", centerX, centerY);

      const measuredWidth = maskContext.measureText("CYRA").width;
      const left = Math.max(0, Math.floor(centerX - measuredWidth / 2 - fontSize * .08));
      const top = Math.max(0, Math.floor(centerY - fontSize * .62));
      const sampleWidth = Math.min(mask.width - left, Math.ceil(measuredWidth + fontSize * .16));
      const sampleHeight = Math.min(mask.height - top, Math.ceil(fontSize * 1.24));
      const step = width < 600 ? 3 : 4;
      const paint = [];
      const mist = [];
      const addMotion = (point) => {
        const angle = Math.atan2(point.y - centerY, point.x - centerX);
        const fragment = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 8);
        const fragmentAngle = ((fragment + .5) / 8) * Math.PI * 2 - Math.PI;
        const fragmentSpin = [-.045, .032, -.038, .048, -.042, .035, -.05, .04][fragment];
        const sliceDistance = (width < 600 ? 12 : 18) + Math.random() * (width < 600 ? 12 : 18);
        const blastAngle = angle + (Math.random() - .5) * .72;
        const blastDistance = Math.max(width, height) * (.24 + Math.random() * .56);
        return {
          ...point,
          sliceX: Math.cos(fragmentAngle) * sliceDistance,
          sliceY: Math.sin(fragmentAngle) * sliceDistance,
          sliceSpin: fragmentSpin,
          blastX: Math.cos(blastAngle) * blastDistance,
          blastY: Math.sin(blastAngle) * blastDistance,
          trail: Math.random()
        };
      };

      try {
        const pixels = maskContext.getImageData(left, top, sampleWidth, sampleHeight).data;
        for (let y = 0; y < sampleHeight; y += step) {
          for (let x = 0; x < sampleWidth; x += step) {
            if (pixels[((y * sampleWidth + x) * 4) + 3] < 72 || Math.random() < .22) continue;
            const xRatio = x / sampleWidth;
            const color = Math.random() < .08 ? 3 : xRatio < .34 ? 0 : xRatio < .68 ? 1 : 2;
            const phase = clamp(xRatio + (Math.random() - .5) * .22);
            const point = addMotion({
              x: left + x + (Math.random() - .5) * step * 1.35,
              y: top + y + (Math.random() - .5) * step * 1.35,
              radius: .6 + Math.random() * (width < 600 ? 1.4 : 1.8),
              color,
              phase
            });
            paint.push(point);
            if (Math.random() < .075) {
              const angle = Math.random() * Math.PI * 2;
              const distance = 5 + Math.random() * Math.min(32, fontSize * .18);
              mist.push(addMotion({
                x: point.x + Math.cos(angle) * distance,
                y: point.y + Math.sin(angle) * distance,
                radius: .25 + Math.random() * .75,
                color,
                phase: clamp(phase + (Math.random() - .5) * .08)
              }));
            }
          }
        }
      } catch (error) {
        particles = [];
        overspray = [];
        return;
      }

      particles = paint.sort((a, b) => a.phase - b.phase).slice(0, 9000);
      overspray = mist.sort((a, b) => a.phase - b.phase).slice(0, 900);
      particleGroups = [[], [], [], []];
      oversprayGroups = [[], [], [], []];
      particles.forEach((point) => particleGroups[point.color].push(point));
      overspray.forEach((point) => oversprayGroups[point.color].push(point));
      textStyle = { centerX, centerY, font, left, right: left + sampleWidth, fontSize };
      if (particles.length) intro.classList.add("is-canvas-ready");
    };

    const resizeCanvas = () => {
      if (!canvas || !context) return;
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      buildPaintMap();
      settledStars = createStardustMap(width, height);
    };

    const drawPaint = (progress, sliceProgress, blastProgress) => {
      if (!context || !particles.length) return;
      const palette = ["#ff9e74", "#b98cff", "#66e6db", "#fff6ed"];
      const paintProgress = easeOut(progress);
      const sliceAmount = easeOut(sliceProgress) * (1 - blastProgress);
      const blastAmount = Math.pow(easeOut(blastProgress), 1.12);
      const blastAlpha = Math.pow(1 - blastProgress, 1.55);
      const positionPoint = (point) => {
        const rotation = point.sliceSpin * sliceAmount;
        const cosine = Math.cos(rotation);
        const sine = Math.sin(rotation);
        const relativeX = point.x - textStyle.centerX;
        const relativeY = point.y - textStyle.centerY;
        return {
          x: textStyle.centerX + relativeX * cosine - relativeY * sine + point.sliceX * sliceAmount + point.blastX * blastAmount,
          y: textStyle.centerY + relativeX * sine + relativeY * cosine + point.sliceY * sliceAmount + point.blastY * blastAmount
        };
      };
      context.save();
      context.globalCompositeOperation = "lighter";

      palette.forEach((color, colorIndex) => {
        if (blastProgress > 0) {
          context.beginPath();
          particleGroups[colorIndex].forEach((point) => {
            if (point.phase > paintProgress || point.trail > .13) return;
            const position = positionPoint(point);
            context.moveTo(position.x - point.blastX * blastAmount * .035, position.y - point.blastY * blastAmount * .035);
            context.lineTo(position.x, position.y);
          });
          context.lineWidth = width < 600 ? .7 : 1;
          context.strokeStyle = color;
          context.globalAlpha = .38 * blastAlpha;
          context.shadowColor = color;
          context.shadowBlur = 10;
          context.stroke();
        }

        context.beginPath();
        particleGroups[colorIndex].forEach((point) => {
          if (point.phase > paintProgress) return;
          const position = positionPoint(point);
          const radius = point.radius * (1 + blastAmount * .7);
          context.moveTo(position.x + radius, position.y);
          context.arc(position.x, position.y, radius, 0, Math.PI * 2);
        });
        context.globalAlpha = (colorIndex === 3 ? .82 : .72) * blastAlpha;
        context.fillStyle = color;
        context.fill();

        context.beginPath();
        oversprayGroups[colorIndex].forEach((point) => {
          if (point.phase > paintProgress) return;
          const position = positionPoint(point);
          context.moveTo(position.x + point.radius, position.y);
          context.arc(position.x, position.y, point.radius, 0, Math.PI * 2);
        });
        context.globalAlpha = .28 * blastAlpha;
        context.fill();
      });

      if (paintProgress < .98 && sliceProgress <= 0 && blastProgress <= 0) {
        const nozzleX = textStyle.left + (textStyle.right - textStyle.left) * paintProgress;
        const nozzleY = textStyle.centerY + Math.sin(paintProgress * Math.PI * 5) * textStyle.fontSize * .08;
        const cloud = context.createRadialGradient(nozzleX, nozzleY, 0, nozzleX, nozzleY, textStyle.fontSize * .26);
        cloud.addColorStop(0, "rgba(255,255,255,.2)");
        cloud.addColorStop(.28, "rgba(185,140,255,.12)");
        cloud.addColorStop(1, "rgba(102,230,219,0)");
        context.globalAlpha = .9;
        context.fillStyle = cloud;
        context.fillRect(nozzleX - textStyle.fontSize * .3, nozzleY - textStyle.fontSize * .3, textStyle.fontSize * .6, textStyle.fontSize * .6);
      }
      context.restore();
    };

    const drawLasers = (progress) => {
      if (!context || progress <= 0) return;
      const beams = [
        [-.08, .12, 1.08, .88], [-.08, .84, 1.08, .16], [.16, -.08, .84, 1.08],
        [.82, -.08, .25, 1.08], [-.08, .43, 1.08, .61], [.48, -.08, .58, 1.08], [1.08, .28, -.08, .72]
      ];
      const colors = ["#ff9e74", "#66e6db", "#b98cff"];

      context.save();
      context.globalCompositeOperation = "destination-out";
      context.lineCap = "round";
      beams.forEach((beam, index) => {
        const local = clamp((progress - index * .065) / .58);
        if (local <= .08) return;
        const cutHead = easeOut(clamp((local - .08) / .52));
        const startX = beam[0] * width;
        const startY = beam[1] * height;
        const endX = beam[2] * width;
        const endY = beam[3] * height;
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(startX + (endX - startX) * cutHead, startY + (endY - startY) * cutHead);
        context.lineWidth = width < 600 ? 5.5 : 10;
        context.strokeStyle = "rgba(0,0,0,.96)";
        context.stroke();
      });
      context.restore();

      context.save();
      context.globalCompositeOperation = "lighter";
      beams.forEach((beam, index) => {
        const local = clamp((progress - index * .065) / .58);
        if (local <= 0 || local >= 1) return;
        const head = easeOut(local);
        const tail = easeOut(clamp((local - .28) / .72));
        const startX = beam[0] * width;
        const startY = beam[1] * height;
        const endX = beam[2] * width;
        const endY = beam[3] * height;
        const x1 = startX + (endX - startX) * tail;
        const y1 = startY + (endY - startY) * tail;
        const x2 = startX + (endX - startX) * head;
        const y2 = startY + (endY - startY) * head;
        const color = colors[index % colors.length];

        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.lineWidth = width < 600 ? 2.8 : 4;
        context.strokeStyle = color;
        context.shadowColor = color;
        context.shadowBlur = 34;
        context.globalAlpha = .82;
        context.stroke();

        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.lineWidth = .75;
        context.strokeStyle = "#fff";
        context.shadowBlur = 8;
        context.globalAlpha = .9;
        context.stroke();
      });

      if (progress > .45 && progress < .95) {
        const flareStrength = Math.sin(clamp((progress - .45) / .5) * Math.PI);
        const flare = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.min(width, height) * .24);
        flare.addColorStop(0, `rgba(255,255,255,${.28 * flareStrength})`);
        flare.addColorStop(.18, `rgba(185,140,255,${.2 * flareStrength})`);
        flare.addColorStop(1, "rgba(102,230,219,0)");
        context.fillStyle = flare;
        context.globalAlpha = 1;
        context.fillRect(0, 0, width, height);
      }
      context.restore();
    };

    const drawExplosion = (progress) => {
      if (!context || progress <= 0) return;
      const blast = easeOut(progress);
      const radius = Math.min(width, height);
      context.save();
      context.globalCompositeOperation = "lighter";

      const flareAlpha = Math.pow(1 - progress, 2);
      const flare = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, radius * (.08 + blast * .34));
      flare.addColorStop(0, `rgba(255,255,255,${.94 * flareAlpha})`);
      flare.addColorStop(.08, `rgba(224,199,255,${.72 * flareAlpha})`);
      flare.addColorStop(.34, `rgba(102,230,219,${.3 * flareAlpha})`);
      flare.addColorStop(1, "rgba(255,158,116,0)");
      context.fillStyle = flare;
      context.fillRect(0, 0, width, height);

      context.beginPath();
      context.arc(width / 2, height / 2, radius * blast * .58, 0, Math.PI * 2);
      context.lineWidth = width < 600 ? 1.5 : 2.5;
      context.strokeStyle = `rgba(255,255,255,${.72 * (1 - progress)})`;
      context.shadowColor = "#b98cff";
      context.shadowBlur = 28;
      context.stroke();

      context.beginPath();
      context.arc(width / 2, height / 2, radius * blast * .42, 0, Math.PI * 2);
      context.lineWidth = 1;
      context.strokeStyle = `rgba(102,230,219,${.55 * (1 - progress)})`;
      context.stroke();
      context.restore();
    };

    const drawFrame = (time) => {
      if (!context || finished) return;
      const elapsed = time - startedAt;
      context.clearRect(0, 0, width, height);
      const laserProgress = clamp((elapsed - 1280) / 980);
      const sliceProgress = clamp((elapsed - 1430) / 720);
      const blastProgress = clamp((elapsed - 2350) / 720);
      drawPaint(clamp((elapsed - 80) / 1500), sliceProgress, blastProgress);
      if (laserProgress > 0 && !lasersStarted) {
        lasersStarted = true;
        intro.classList.add("is-laser-live");
      }
      drawLasers(laserProgress);
      if (sliceProgress > .18 && !slicingStarted) {
        slicingStarted = true;
        intro.classList.add("is-slicing");
      }
      if (blastProgress > 0 && !blastingStarted) {
        blastingStarted = true;
        intro.classList.add("is-blasting");
      }
      drawExplosion(blastProgress);
      paintStardust(context, settledStars, width, height, time, easeOut(clamp((blastProgress - .12) / .74)) * .72);
      if (elapsed >= 3070 && !sequenceReady) {
        sequenceReady = true;
        maybeFinish();
      }
      frame = requestAnimationFrame(drawFrame);
    };

    const startAnimation = () => {
      if (!canvas || !context || finished) {
        sequenceReady = true;
        maybeFinish();
        return;
      }
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas, { passive: true });
      startedAt = performance.now();
      frame = requestAnimationFrame(drawFrame);
    };

    const fontReady = document.fonts?.ready || Promise.resolve();
    Promise.race([fontReady, new Promise((resolve) => window.setTimeout(resolve, 240))]).then(startAnimation);
    window.setTimeout(finish, 4100);
  };

  const setContactLinks = () => {
    if (!config) return;
    document.querySelectorAll("[data-contact-email]").forEach((link) => {
      link.textContent = config.contact.email;
      link.href = `mailto:${config.contact.email}`;
    });
    document.querySelectorAll("[data-contact-phone]").forEach((link) => {
      link.textContent = config.contact.phoneDisplay;
      link.href = `tel:${config.contact.phoneHref}`;
    });
    document.querySelectorAll("[data-contact-whatsapp]").forEach((link) => {
      link.textContent = config.contact.whatsappDisplay;
      link.href = config.contact.whatsappHref;
    });
  };

  const createResidenceCard = (residence, index) => {
    const article = document.createElement("article");
    const thumbnail = residenceThumbnail(residence.image);
    article.className = `residence-card residence-card--${index + 1} reveal`;
    article.style.setProperty("--card-index", index);
    article.innerHTML = `
      <button class="residence-card__button" type="button" data-residence-id="${residence.id}" aria-label="View details for ${residence.address}">
        <span class="residence-card__image-wrap">
          <img src="${thumbnail}" width="900" height="666" alt="${residence.alt}" loading="${index < 2 ? "eager" : "lazy"}" decoding="async" draggable="false">
          <span class="residence-card__index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
          <span class="residence-card__arrow" aria-hidden="true"><svg class="icon icon--arrow-up-right" viewBox="0 0 16 16"><path d="M3 13L13 3M7 3h6v6"/></svg></span>
        </span>
        <span class="residence-card__meta">
          <span><small>${residence.region}</small><strong>${residence.address}</strong></span>
          <span class="residence-card__location">${residence.location}</span>
        </span>
      </button>`;
    article.querySelector("img")?.addEventListener("error", (event) => {
      event.currentTarget.src = residence.image;
    }, { once: true });
    return article;
  };

  const renderResidences = () => {
    if (!residenceGrid) return;
    residences.forEach((residence, index) => {
      residenceGrid.append(createResidenceCard(residence, index));
    });
  };

  const openResidence = (id, trigger) => {
    const residence = residences.find((item) => item.id === id);
    if (!residence || !residenceDialog) return;
    lastFocused = trigger;
    residenceDialog.querySelector("[data-dialog-region]").textContent = residence.region;
    residenceDialog.querySelector("[data-dialog-title]").textContent = residence.address;
    residenceDialog.querySelector("[data-dialog-location]").textContent = residence.location;
    const image = residenceDialog.querySelector("[data-dialog-image]");
    image.src = residence.image;
    image.alt = residence.alt;
    image.width = residence.width || 1800;
    image.height = residence.height || 1331;
    residenceDialog.querySelector("[data-dialog-types]").innerHTML = residence.types
      .map((type) => `<li><span>${type.name}</span><span>${type.size}</span></li>`)
      .join("");
    residenceDialog.showModal();
    body.classList.add("modal-open");
  };

  const closeResidence = () => {
    if (!residenceDialog?.open) return;
    residenceDialog.close();
    body.classList.remove("modal-open");
    lastFocused?.focus();
  };

  const openMenu = () => {
    if (!menu || !menuToggle) return;
    lastFocused = document.activeElement;
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close menu");
    body.classList.add("nav-open");
    document.querySelectorAll(".site-header, main, .site-footer").forEach((region) => region.setAttribute("inert", ""));
    menuClose?.focus();
  };

  const closeMenu = () => {
    if (!menu || !menuToggle) return;
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
    body.classList.remove("nav-open");
    document.querySelectorAll(".site-header, main, .site-footer").forEach((region) => region.removeAttribute("inert"));
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
  };

  const trapMenuFocus = (event) => {
    if (event.key === "Escape") {
      closeMenu();
      return;
    }
    if (event.key !== "Tab" || !menu?.classList.contains("is-open")) return;
    const focusable = [...menu.querySelectorAll("a[href], button:not([disabled])")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const setupHeroStardust = () => {
    const canvas = document.querySelector("[data-hero-stardust]");
    const glints = document.querySelector("[data-hero-glints]");
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context || !glints) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      const nextWidth = Math.max(1, Math.round(bounds.width));
      const nextHeight = Math.max(1, Math.round(bounds.height));
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const stars = createStardustMap(width, height);
      context.clearRect(0, 0, width, height);
      paintStardust(context, stars, width, height, 1200, .66);
      if (reducedMotion) return;

      const brightest = stars.filter((star) => star.radius > 1.25).slice(0, width < 600 ? 6 : 10);
      const nodes = brightest.map((star, index) => {
        const glint = document.createElement("i");
        glint.style.left = `${star.x * 100}%`;
        glint.style.top = `${star.y * 100}%`;
        glint.style.setProperty("--glint-color", stardustPalette[star.color]);
        glint.style.animationDelay = `${-index * .68}s`;
        glint.style.animationDuration = `${3.6 + index * .31}s`;
        return glint;
      });
      glints.replaceChildren(...nodes);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
  };

  const setupHeroFlow = () => {
    const hero = document.querySelector("[data-hero]");
    const canvas = document.querySelector("[data-hero-flow]");
    const context = canvas?.getContext("2d", { alpha: true });
    if (!hero || !canvas || !context) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let lastDrawn = 0;
    const colors = ["#ff9e74", "#a48bff", "#66e6db"];
    const waveY = (x, layer, time) => {
      const base = height * (.32 + layer * .18);
      const slow = Math.sin(x * Math.PI * (1.8 + layer * .22) + time * .00018 * (layer % 2 ? -1 : 1) + layer * 1.7);
      const detail = Math.sin(x * Math.PI * 4.2 - time * .00011 + layer) * .35;
      return base + (slow + detail) * height * (.1 - layer * .012);
    };

    const render = (time = 0) => {
      frame = 0;
      if (!visible) return;
      if (!reducedMotion && time - lastDrawn < (width < 740 ? 80 : 50)) {
        frame = requestAnimationFrame(render);
        return;
      }
      lastDrawn = time;
      context.clearRect(0, 0, width, height);
      context.save();
      context.globalCompositeOperation = "lighter";

      for (let layer = 0; layer < 3; layer += 1) {
        const gradient = context.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, "rgba(255,158,116,0)");
        gradient.addColorStop(.2, `${colors[layer]}55`);
        gradient.addColorStop(.52, `${colors[(layer + 1) % colors.length]}72`);
        gradient.addColorStop(.8, `${colors[(layer + 2) % colors.length]}48`);
        gradient.addColorStop(1, "rgba(102,230,219,0)");
        context.beginPath();
        for (let x = 0; x <= width; x += 16) {
          const normalized = x / width;
          const y = waveY(normalized, layer, time);
          if (x === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.strokeStyle = gradient;
        context.lineWidth = layer === 1 ? 1.1 : .7;
        context.globalAlpha = layer === 1 ? .52 : .34;
        context.shadowColor = colors[layer];
        context.shadowBlur = layer === 1 ? 5 : 0;
        context.stroke();
      }

      for (let index = 0; index < 8; index += 1) {
        const layer = index % 3;
        const progress = ((time / (7300 + layer * 1150)) + index * .137) % 1;
        const x = progress * width;
        const y = waveY(progress, layer, time);
        const pulse = .72 + Math.sin(time * .002 + index) * .28;
        context.beginPath();
        context.arc(x, y, .9 + pulse * 1.25, 0, Math.PI * 2);
        context.fillStyle = colors[layer];
        context.globalAlpha = .46 + pulse * .38;
        context.shadowColor = colors[layer];
        context.shadowBlur = 7 + pulse * 5;
        context.fill();
      }
      context.restore();
      if (!reducedMotion) frame = requestAnimationFrame(render);
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      const nextWidth = Math.max(1, Math.round(bounds.width));
      const nextHeight = Math.max(1, Math.round(bounds.height));
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (reducedMotion) render(0);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    if (reducedMotion) return;

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      hero.classList.toggle("is-offscreen", !visible);
      if (visible && !frame) frame = requestAnimationFrame(render);
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    }, { threshold: 0 });
    observer.observe(hero);
    frame = requestAnimationFrame(render);
  };

  const setupCareConstellation = () => {
    const constellation = document.querySelector("[data-care-constellation]");
    const points = [...(constellation?.querySelectorAll("li") || [])];
    if (!constellation || !points.length || reducedMotion) return;

    let activeIndex = 0;
    let timer = 0;
    let inView = false;
    const activate = (index) => {
      activeIndex = index;
      points.forEach((point, pointIndex) => point.classList.toggle("is-active", pointIndex === activeIndex));
    };
    const stop = () => {
      window.clearInterval(timer);
      timer = 0;
    };
    const start = () => {
      if (timer || !inView) return;
      timer = window.setInterval(() => activate((activeIndex + 1) % points.length), 2200);
    };

    points.forEach((point, index) => {
      point.addEventListener("pointerenter", () => {
        stop();
        activate(index);
      });
      point.addEventListener("pointerleave", start);
      point.addEventListener("pointerdown", () => activate(index), { passive: true });
    });

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
      else stop();
    }, { threshold: .2 });
    observer.observe(constellation);
  };

  const setupReveals = () => {
    const items = document.querySelectorAll(".reveal");
    const motionSections = document.querySelectorAll(".brand-intro, .approach, .promise, .contact");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.12 });
    items.forEach((item) => observer.observe(item));

    const motionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-motion-live", entry.isIntersecting));
    }, { rootMargin: "0px 0px 18% 0px", threshold: 0.01 });
    motionSections.forEach((section) => motionObserver.observe(section));
  };

  const setupHeroMotion = () => {
    const hero = document.querySelector("[data-hero]");
    const stage = document.querySelector("[data-hero-stage]");
    if (!hero || !stage || reducedMotion || !window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    const updatePointer = (event) => {
      const rect = hero.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        stage.style.setProperty("--tilt-x", `${(0.5 - y) * 4}deg`);
        stage.style.setProperty("--tilt-y", `${(x - 0.5) * 5}deg`);
      });
    };

    hero.addEventListener("pointermove", updatePointer, { passive: true });
    hero.addEventListener("pointerleave", () => {
      stage.style.setProperty("--tilt-x", "0deg");
      stage.style.setProperty("--tilt-y", "0deg");
    });
  };

  const setupResidenceRail = () => {
    const rail = document.querySelector("#residence-grid");
    const previous = document.querySelector("[data-residence-prev]");
    const next = document.querySelector("[data-residence-next]");
    const progress = document.querySelector("[data-residence-progress]");
    const current = document.querySelector("[data-residence-current]");
    if (!rail) return;

    const move = (direction) => {
      const card = rail.querySelector(".residence-card");
      const distance = (card?.getBoundingClientRect().width || rail.clientWidth * .8) + 28;
      rail.scrollBy({ left: direction * distance, behavior: "smooth" });
    };

    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      const ratio = max > 0 ? rail.scrollLeft / max : 0;
      if (progress) progress.style.transform = `scaleX(${Math.max(.08, ratio)})`;
      const cards = [...rail.querySelectorAll(".residence-card")];
      if (current && cards.length) {
        const railLeft = rail.getBoundingClientRect().left;
        let closest = 0;
        let distance = Infinity;
        cards.forEach((card, index) => {
          const value = Math.abs(card.getBoundingClientRect().left - railLeft);
          if (value < distance) { distance = value; closest = index; }
        });
        current.textContent = String(closest + 1).padStart(2, "0");
      }
    };

    previous?.addEventListener("click", () => move(-1));
    next?.addEventListener("click", () => move(1));
    rail.addEventListener("wheel", (event) => {
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      event.preventDefault();
      window.scrollBy({ top: event.deltaY * unit, left: 0, behavior: "auto" });
    }, { passive: false });
    rail.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    window.addEventListener("resize", () => requestAnimationFrame(update), { passive: true });
    update();
  };

  const setupPageAtmosphere = () => {
    const progress = document.querySelector("[data-page-progress]");
    let scheduled = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      if (progress) progress.style.transform = `scaleX(${ratio})`;
      document.documentElement.style.setProperty("--page-scroll", String(ratio));
      scheduled = false;
    };
    window.addEventListener("scroll", () => {
      if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  };

  const clearFieldError = (field) => {
    field.removeAttribute("aria-invalid");
    const error = document.querySelector(`#${field.id}-error`);
    if (error) error.textContent = "";
  };

  const showFieldError = (field) => {
    const error = document.querySelector(`#${field.id}-error`);
    if (!error) return;
    let message = field.validationMessage;
    if (field.validity.valueMissing) message = "Please complete this field.";
    if (field.validity.typeMismatch && field.type === "email") message = "Please enter a valid email address.";
    field.setAttribute("aria-invalid", "true");
    error.textContent = message;
  };

  const validateForm = () => {
    const fields = [...form.querySelectorAll("input:not([type='hidden']), select, textarea")];
    let firstInvalid = null;
    fields.forEach((field) => {
      clearFieldError(field);
      if (!field.checkValidity()) {
        showFieldError(field);
        firstInvalid ||= field;
      }
    });
    firstInvalid?.focus();
    return !firstInvalid;
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    const status = form.querySelector("[data-form-status]");
    const submitButton = form.querySelector("button[type='submit']");
    if (!validateForm()) {
      status.textContent = "Please check the highlighted fields.";
      status.dataset.state = "error";
      return;
    }
    if (!config?.contact.formEndpoint || config.contact.formEndpoint.includes("YOUR_FORMSPREE_FORM_ID")) {
      status.textContent = `Online inquiries are being configured. Please email ${config?.contact.email || "Cyra Management"}.`;
      status.dataset.state = "error";
      return;
    }

    const originalLabel = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = "Sending…";
    status.textContent = "";
    status.dataset.state = "";

    try {
      const response = await fetch(config.contact.formEndpoint, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error("Submission failed");
      form.reset();
      status.textContent = "Thanks—your message has been sent.";
      status.dataset.state = "success";
    } catch (error) {
      status.textContent = `We couldn’t send your message. Please try again or email ${config.contact.email}.`;
      status.dataset.state = "error";
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalLabel;
    }
  };

  setupSiteIntro();
  renderResidences();
  setContactLinks();
  setupHeroStardust();
  setupHeroFlow();
  setupCareConstellation();
  setupReveals();
  setupHeroMotion();
  setupResidenceRail();
  setupPageAtmosphere();

  window.addEventListener("scroll", () => header?.classList.toggle("is-scrolled", window.scrollY > 40), { passive: true });
  menuToggle?.addEventListener("click", () => menu?.classList.contains("is-open") ? closeMenu() : openMenu());
  menuClose?.addEventListener("click", closeMenu);
  menu?.addEventListener("keydown", trapMenuFocus);
  menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  residenceGrid?.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-residence-id]");
    if (trigger) openResidence(trigger.dataset.residenceId, trigger);
  });
  residenceDialog?.querySelectorAll("[data-dialog-close]").forEach((control) => control.addEventListener("click", closeResidence));
  residenceDialog?.addEventListener("click", (event) => {
    if (event.target === residenceDialog) closeResidence();
  });
  residenceDialog?.addEventListener("close", () => body.classList.remove("modal-open"));

  document.querySelectorAll("[data-resident-support]").forEach((link) => {
    link.addEventListener("click", () => {
      const inquiry = document.querySelector("#inquiry-type");
      if (inquiry) inquiry.value = "current-resident";
    });
  });

  form?.setAttribute("action", config?.contact.formEndpoint || "");
  form?.setAttribute("novalidate", "");
  form?.addEventListener("submit", handleFormSubmit);
  form?.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", () => clearFieldError(field));
    field.addEventListener("blur", () => {
      clearFieldError(field);
      if (!field.checkValidity()) showFieldError(field);
    });
  });

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
