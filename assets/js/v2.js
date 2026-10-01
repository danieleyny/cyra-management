(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setupV2ContactLinks = () => {
    const contact = window.CYRA_CONFIG?.contact;
    if (!contact) return;

    const values = {
      phone: { text: contact.phoneDisplay, href: `tel:${contact.phoneHref}` },
      email: { text: contact.email, href: `mailto:${contact.email}` },
      whatsapp: { text: contact.whatsappDisplay, href: contact.whatsappHref }
    };

    document.querySelectorAll("[data-v2-contact]").forEach((link) => {
      const value = values[link.dataset.v2Contact];
      if (!value) return;
      link.href = value.href;
      const label = link.querySelector("strong");
      if (label) label.textContent = value.text;
    });
  };

  const setupCareFlow = () => {
    const section = document.querySelector(".care-flow-v2");
    if (!section) return;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      section.classList.add("is-v2-revealed", "is-v2-live");
      return;
    }

    let revealed = false;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!revealed) {
            revealed = true;
            section.classList.add("is-v2-revealed");
          }
          section.classList.add("is-v2-live");
        } else {
          section.classList.remove("is-v2-live");
        }
      });
    }, { threshold: .14, rootMargin: "10% 0px 10%" });

    observer.observe(section);
  };

  const setupResidenceAtmosphere = () => {
    const section = document.querySelector("#residences");
    const rail = document.querySelector("#residence-grid");
    if (!section || !rail) return;

    const cards = [...rail.querySelectorAll(".residence-card")];
    if (!cards.length) return;
    let scheduled = false;
    let hoveredCard = null;

    const regionKey = (region = "") => {
      const normalized = region.toLowerCase();
      if (normalized.includes("hudson")) return "hudson";
      if (normalized.includes("florida")) return "south-florida";
      return "new-york";
    };

    const activate = (card) => {
      const index = Math.max(0, cards.indexOf(card));
      cards.forEach((item) => item.classList.toggle("is-v2-current", item === card));
      section.dataset.v2Region = regionKey(window.CYRA_RESIDENCES?.[index]?.region);
    };

    const update = () => {
      if (hoveredCard) {
        activate(hoveredCard);
        scheduled = false;
        return;
      }

      const railRect = rail.getBoundingClientRect();
      const inset = parseFloat(getComputedStyle(rail).scrollPaddingInlineStart) || 0;
      const marker = railRect.left + inset;
      let closest = cards[0];
      let distance = Infinity;

      cards.forEach((card) => {
        const value = Math.abs(card.getBoundingClientRect().left - marker);
        if (value < distance) {
          distance = value;
          closest = card;
        }
      });

      activate(closest);
      scheduled = false;
    };

    rail.addEventListener("scroll", () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    }, { passive: true });

    cards.forEach((card) => {
      card.addEventListener("pointerenter", () => {
        if (!window.matchMedia("(pointer: fine)").matches) return;
        hoveredCard = card;
        update();
      });
      card.addEventListener("pointerleave", () => {
        hoveredCard = null;
        update();
      });
      card.addEventListener("focusin", () => {
        hoveredCard = card;
        update();
      });
      card.addEventListener("focusout", () => {
        hoveredCard = null;
        update();
      });
    });

    if ("IntersectionObserver" in window && !reducedMotion) {
      const observer = new IntersectionObserver(([entry]) => {
        section.classList.toggle("is-v2-motion-live", entry.isIntersecting);
      }, { threshold: .08 });
      observer.observe(section);
    } else {
      section.classList.add("is-v2-motion-live");
    }

    window.addEventListener("resize", () => requestAnimationFrame(update), { passive: true });
    update();
  };

  const setupLightFollow = () => {
    if (reducedMotion || !window.matchMedia("(pointer: fine)").matches) return;
    document.querySelectorAll(".button, .contact-action-v2").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty("--v2-pointer-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        element.style.setProperty("--v2-pointer-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      }, { passive: true });
    });
  };

  const setupContactOptions = () => {
    const details = document.querySelector(".contact-options-v2");
    if (!details) return;
    const fields = [...details.querySelectorAll("input")];
    fields.forEach((field) => {
      field.addEventListener("invalid", () => { details.open = true; });
    });
  };

  const setupSeamLifecycle = () => {
    const sections = [...document.querySelectorAll(".services, .about, .contact")];
    if (!sections.length) return;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-v2-motion-live"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-v2-motion-live", entry.isIntersecting));
    }, { threshold: .01, rootMargin: "8% 0px 8%" });
    sections.forEach((section) => observer.observe(section));
  };

  const setupVisualSections = () => {
    const sections = [...document.querySelectorAll("[data-visual-section]")];
    if (!sections.length) return;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-v2-live"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-v2-live", entry.isIntersecting);
      });
    }, { threshold: .12, rootMargin: "8% 0px 8%" });

    sections.forEach((section) => observer.observe(section));
  };

  setupV2ContactLinks();
  setupCareFlow();
  setupResidenceAtmosphere();
  setupLightFollow();
  setupContactOptions();
  setupSeamLifecycle();
  setupVisualSections();
  document.documentElement.classList.add("v2-ready");
})();
