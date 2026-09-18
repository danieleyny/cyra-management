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
  const residenceImageCache = residences.map((residence) => {
    const image = new Image();
    image.decoding = "async";
    image.src = residenceThumbnail(residence.image);
    return image;
  });
  let lastFocused = null;

  const setupSiteIntro = () => {
    const intro = document.querySelector("[data-site-intro]");
    const root = document.documentElement;
    if (!intro || !root.classList.contains("intro-pending")) {
      intro?.remove();
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      try { sessionStorage.setItem("cyra-intro-v1", "seen"); } catch (error) { /* Storage may be unavailable. */ }
      intro.classList.add("is-exiting");
      root.classList.remove("intro-pending");
      root.classList.add("intro-revealing");
      window.setTimeout(() => {
        intro.remove();
        root.classList.remove("intro-revealing");
      }, 1100);
    };

    const heroArt = document.querySelector(".hero-art__image");
    const artReady = !heroArt || heroArt.complete
      ? Promise.resolve()
      : new Promise((resolve) => {
          heroArt.addEventListener("load", resolve, { once: true });
          heroArt.addEventListener("error", resolve, { once: true });
        });
    const minimumPlaytime = new Promise((resolve) => window.setTimeout(resolve, 1450));

    Promise.all([minimumPlaytime, artReady]).then(finish);
    window.setTimeout(finish, 2800);
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
          <img src="${thumbnail}" width="900" height="666" alt="${residence.alt}" loading="eager" decoding="async" draggable="false">
          <span class="residence-card__index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
          <span class="residence-card__arrow" aria-hidden="true">↗</span>
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

  const setupReveals = () => {
    const items = document.querySelectorAll(".reveal");
    const standardSection = document.querySelector(".brand-intro");
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

    if (standardSection) {
      const motionObserver = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        standardSection.classList.add("is-motion-live");
        motionObserver.disconnect();
      }, { rootMargin: "0px 0px 28%", threshold: 0.02 });
      motionObserver.observe(standardSection);
    }
  };

  const setupHeroMotion = () => {
    const hero = document.querySelector("[data-hero]");
    const stage = document.querySelector("[data-hero-stage]");
    if (!hero || !stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const updatePointer = (event) => {
      const rect = hero.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        hero.style.setProperty("--pointer-x", `${x * 100}%`);
        hero.style.setProperty("--pointer-y", `${y * 100}%`);
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
      status.textContent = "Please review the highlighted fields.";
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
      status.textContent = "Thank you. Your message has been sent to Cyra Management.";
      status.dataset.state = "success";
    } catch (error) {
      status.textContent = `We could not send your message. Your details are still here; please try again or email ${config.contact.email}.`;
      status.dataset.state = "error";
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalLabel;
    }
  };

  setupSiteIntro();
  renderResidences();
  setContactLinks();
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
