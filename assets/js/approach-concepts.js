(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ledgerRows = [...document.querySelectorAll("[data-ledger-row]")];
  const activateLedgerRow = (row) => {
    ledgerRows.forEach((item) => {
      const active = item === row;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
  };

  ledgerRows.forEach((row) => {
    row.addEventListener("click", () => activateLedgerRow(row));
    row.addEventListener("focus", () => activateLedgerRow(row));
    if (window.matchMedia("(hover: hover)").matches) {
      row.addEventListener("pointerenter", () => activateLedgerRow(row));
    }
  });

  const pathway = document.querySelector("[data-pathway]");
  const pathwayContent = [
    {
      index: "01",
      title: "Direct and available",
      copy: "We stay involved and keep communication straightforward with residents, owners, boards, and vendors."
    },
    {
      index: "02",
      title: "Quick to respond",
      copy: "Maintenance requests are reviewed promptly, coordinated carefully, and followed through to completion."
    },
    {
      index: "03",
      title: "Well maintained",
      copy: "We pay attention to building systems, security, common areas, and the everyday details that keep a property running well."
    },
    {
      index: "04",
      title: "Built for the long term",
      copy: "Daily decisions are made with resident experience, property condition, and long-term value in mind."
    }
  ];

  if (pathway) {
    const nodes = [...pathway.querySelectorAll("[data-pathway-node]")];
    const index = pathway.querySelector("[data-pathway-index]");
    const title = pathway.querySelector("[data-pathway-title]");
    const copy = pathway.querySelector("[data-pathway-copy]");

    const activatePathwayNode = (position) => {
      const content = pathwayContent[position];
      if (!content) return;

      pathway.dataset.active = String(position);
      nodes.forEach((node, nodeIndex) => {
        const active = nodeIndex === position;
        node.classList.toggle("is-active", active);
        node.setAttribute("aria-pressed", String(active));
      });

      index.textContent = content.index;
      title.textContent = content.title;
      copy.textContent = content.copy;
    };

    nodes.forEach((node, nodeIndex) => {
      node.addEventListener("click", () => activatePathwayNode(nodeIndex));
      node.addEventListener("focus", () => activatePathwayNode(nodeIndex));
      if (window.matchMedia("(hover: hover)").matches) {
        node.addEventListener("pointerenter", () => activatePathwayNode(nodeIndex));
      }
    });
  }

  const concepts = [...document.querySelectorAll(".concept")];
  const navLinks = [...document.querySelectorAll(".concept-nav a")];

  if (reducedMotion || !("IntersectionObserver" in window)) {
    concepts.forEach((concept) => concept.classList.add("is-live"));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-live");
      });
    }, { rootMargin: "0px 0px -12%", threshold: 0.08 });

    concepts.forEach((concept) => revealObserver.observe(concept));
  }

  const navObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`);
    });
  }, { rootMargin: "-25% 0px -55%", threshold: [0.05, 0.2, 0.5] });

  concepts.forEach((concept) => navObserver.observe(concept));
})();
