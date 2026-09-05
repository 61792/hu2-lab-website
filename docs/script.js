(() => {
  "use strict";

  const body = document.body;
  const header = document.querySelector("#siteHeader");
  const progress = document.querySelector("#scrollProgress");
  const menuToggle = document.querySelector("#menuToggle");
  const primaryNav = document.querySelector("#primaryNav");
  const navLinks = [...document.querySelectorAll("#primaryNav a")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // [LEARN-JS-01] 页面就绪状态：触发 CSS 中的首屏入场动画。
  requestAnimationFrame(() => body.classList.add("is-ready"));

  // [LEARN-JS-02] 滚动状态：压缩页头并更新顶部阅读进度。
  let scrollFrame = 0;
  const updateScrollUI = () => {
    scrollFrame = 0;
    const pageRange = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const ratio = Math.min(1, Math.max(0, window.scrollY / pageRange));

    header?.classList.toggle("is-scrolled", window.scrollY > 18);
    if (progress) progress.style.transform = `scaleX(${ratio})`;
  };

  const requestScrollUI = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollUI);
  };

  window.addEventListener("scroll", requestScrollUI, { passive: true });
  window.addEventListener("resize", requestScrollUI, { passive: true });
  updateScrollUI();

  // [LEARN-JS-03] 移动导航：全屏菜单、Escape、焦点返回与 Tab 循环。
  const setMenu = (open, moveFocus = false) => {
    if (!menuToggle || !primaryNav) return;

    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute(
      "aria-label",
      open ? "关闭导航菜单" : "打开导航菜单",
    );
    primaryNav.classList.toggle("is-open", open);
    body.classList.toggle("menu-open", open);

    if (moveFocus) {
      if (open) navLinks[0]?.focus();
      else menuToggle.focus();
    }
  };

  menuToggle?.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") !== "true";
    setMenu(open, open);
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  document.addEventListener("keydown", (event) => {
    const menuOpen = menuToggle?.getAttribute("aria-expanded") === "true";
    if (!menuOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setMenu(false, true);
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = [menuToggle, ...navLinks].filter(Boolean);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const wideViewport = window.matchMedia("(min-width: 921px)");
  const closeMenuOnWideViewport = (event) => {
    if (event.matches) setMenu(false);
  };
  wideViewport.addEventListener?.("change", closeMenuOnWideViewport);

  // [LEARN-JS-04] 进入视口渐显：只处理带 data-reveal 的内容块。
  const revealItems = [...document.querySelectorAll("[data-reveal]")];
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12%", threshold: 0.08 },
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // [LEARN-JS-05] 章节观察：把当前阅读位置同步到桌面导航高亮。
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window) {
    const sectionVisibility = new Map();
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          sectionVisibility.set(entry.target.id, entry.intersectionRatio);
        });

        const current = [...sectionVisibility.entries()]
          .filter(([, ratio]) => ratio > 0)
          .sort((a, b) => b[1] - a[1])[0]?.[0];

        navLinks.forEach((link) => {
          const active = link.getAttribute("href") === `#${current}`;
          link.classList.toggle("is-active", active);
          if (active) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-24% 0px -56%", threshold: [0, 0.05, 0.2, 0.45] },
    );
    sections.forEach((section) => navObserver.observe(section));
  }

  // [LEARN-JS-06] 成果筛选与折叠：研究方向可定位并高亮对应毕业论文。
  const filterButtons = [
    ...document.querySelectorAll(".output-filters [data-filter]"),
  ];
  const outputRows = [...document.querySelectorAll("[data-output-type]")];
  const thesisRows = outputRows.filter(
    (row) => row.dataset.outputType === "thesis",
  );
  const researchOutputLinks = [
    ...document.querySelectorAll("[data-research-target]"),
  ];
  const outputFilterBar = document.querySelector(".output-filters");
  const outputStatus = document.querySelector("#outputStatus");
  const outputExpand = document.querySelector("#outputExpand");
  const outputExpandLabel = document.querySelector("#outputExpandLabel");
  const outputVisibleLimit = 5;
  const researchDirectionLabels = {
    1: "方向1 · 低碳城市与社区更新",
    2: "方向2 · 社会—生态系统与区域治理",
    3: "方向3 · 建成环境、行为与健康",
  };
  let selectedOutputFilter = "all";
  let outputsExpanded = false;
  let activeResearchDirection = "";

  const getFilterLabel = () => {
    const selectedButton = filterButtons.find(
      (button) => button.dataset.filter === selectedOutputFilter,
    );
    return selectedButton?.childNodes[0]?.textContent.trim() || "成果";
  };

  const setFilterButtonState = () => {
    filterButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === selectedOutputFilter),
      );
    });
  };

  const setThesisHighlight = (row, highlighted) => {
    row.classList.toggle("is-research-highlighted", highlighted);
    row.setAttribute("aria-pressed", String(highlighted));
  };

  const clearThesisHighlights = () => {
    activeResearchDirection = "";
    thesisRows.forEach((row) => setThesisHighlight(row, false));
  };

  const centerSelectedFilter = () => {
    const selectedButton = filterButtons.find(
      (button) => button.dataset.filter === selectedOutputFilter,
    );
    if (!outputFilterBar || !selectedButton) return;

    const targetLeft =
      selectedButton.offsetLeft -
      (outputFilterBar.clientWidth - selectedButton.offsetWidth) / 2;
    outputFilterBar.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
  };

  const renderOutputs = () => {
    const matchingRows = outputRows.filter(
      (row) =>
        selectedOutputFilter === "all" ||
        row.dataset.outputType === selectedOutputFilter,
    );
    const shownCount = outputsExpanded
      ? matchingRows.length
      : Math.min(outputVisibleLimit, matchingRows.length);

    outputRows.forEach((row) => {
      const matchingIndex = matchingRows.indexOf(row);
      const show = matchingIndex >= 0 && matchingIndex < shownCount;
      row.hidden = !show;
      row.classList.toggle("is-first-visible", show && matchingIndex === 0);
    });

    if (outputStatus) {
      const highlightedTheses = thesisRows.filter((row) =>
        row.classList.contains("is-research-highlighted"),
      );

      if (selectedOutputFilter === "thesis" && highlightedTheses.length) {
        const activeDirectionRows = activeResearchDirection
          ? thesisRows.filter(
              (row) =>
                row.dataset.researchDirection === activeResearchDirection,
            )
          : [];
        const isExactDirectionSelection =
          activeDirectionRows.length === highlightedTheses.length &&
          activeDirectionRows.every((row) =>
            row.classList.contains("is-research-highlighted"),
          );
        const selectionLabel = isExactDirectionSelection
          ? researchDirectionLabels[activeResearchDirection]
          : "自定义选择";
        outputStatus.textContent = `${selectionLabel}：已高亮 ${highlightedTheses.length} / ${matchingRows.length} 篇毕业论文；再次点击论文可取消高亮`;
      } else {
        const label = selectedOutputFilter === "all" ? "成果" : getFilterLabel();
        outputStatus.textContent = `显示 ${shownCount} / ${matchingRows.length} 项${label}`;
      }
    }

    if (outputExpand) {
      const hasMore = matchingRows.length > outputVisibleLimit;
      outputExpand.hidden = !hasMore;
      outputExpand.setAttribute("aria-expanded", String(outputsExpanded && hasMore));
      if (outputExpandLabel && hasMore) {
        outputExpandLabel.textContent = outputsExpanded
          ? "收起至前 5 项"
          : `展开其余 ${matchingRows.length - outputVisibleLimit} 项`;
      }
    }

    requestScrollUI();
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedOutputFilter = button.dataset.filter || "all";
      outputsExpanded = false;
      clearThesisHighlights();
      setFilterButtonState();
      renderOutputs();
    });
  });

  researchOutputLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const direction = link.dataset.researchTarget || "";
      if (!researchDirectionLabels[direction]) return;

      selectedOutputFilter = "thesis";
      outputsExpanded = true;
      activeResearchDirection = direction;
      thesisRows.forEach((row) => {
        setThesisHighlight(
          row,
          row.dataset.researchDirection === activeResearchDirection,
        );
      });
      setFilterButtonState();
      renderOutputs();
      centerSelectedFilter();
    });
  });

  thesisRows.forEach((row) => {
    const title = row.querySelector("h3")?.textContent.trim() || "毕业论文";
    const author = row.querySelector(".output-main p")?.textContent.trim() || "";
    const direction = researchDirectionLabels[row.dataset.researchDirection] || "";
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-pressed", "false");
    row.setAttribute(
      "aria-label",
      `${direction}；毕业论文：${title}；${author}。按回车或空格切换高亮`,
    );

    const toggleHighlight = () => {
      const highlighted = !row.classList.contains("is-research-highlighted");
      activeResearchDirection = "";
      setThesisHighlight(row, highlighted);
      renderOutputs();
    };

    row.addEventListener("click", toggleHighlight);
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleHighlight();
    });
  });

  outputExpand?.addEventListener("click", () => {
    outputsExpanded = !outputsExpanded;
    renderOutputs();
  });

  setFilterButtonState();
  renderOutputs();

  // [LEARN-JS-07] Hero Canvas：网格、城市块、等值线、样本点和指针响应。
  const canvas = document.querySelector("#fieldCanvas");
  const context = canvas?.getContext("2d", { alpha: true });

  if (canvas && context) {
    const state = {
      width: 0,
      height: 0,
      pixelRatio: 1,
      pointerX: 0.62,
      pointerY: 0.42,
      targetX: 0.62,
      targetY: 0.42,
      frame: 0,
      visible: true,
    };

    const samplePoints = Array.from({ length: 25 }, (_, index) => ({
      x: ((index * 47) % 97) / 100,
      y: ((index * 71 + 13) % 89) / 100,
      speed: 0.45 + (index % 7) * 0.08,
      phase: index * 0.73,
      radius: index % 5 === 0 ? 2.6 : 1.35,
    }));

    const urbanBlocks = [
      [0.07, 0.1, 0.21, 0.13],
      [0.33, 0.1, 0.12, 0.21],
      [0.51, 0.1, 0.18, 0.09],
      [0.73, 0.1, 0.2, 0.17],
      [0.07, 0.29, 0.14, 0.22],
      [0.25, 0.36, 0.24, 0.15],
      [0.55, 0.25, 0.11, 0.25],
      [0.72, 0.33, 0.21, 0.12],
      [0.08, 0.59, 0.27, 0.16],
      [0.4, 0.57, 0.15, 0.25],
      [0.61, 0.55, 0.32, 0.09],
      [0.62, 0.7, 0.13, 0.17],
      [0.8, 0.7, 0.13, 0.17],
    ];

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      state.width = Math.max(1, bounds.width);
      state.height = Math.max(1, bounds.height);
      state.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(state.width * state.pixelRatio);
      canvas.height = Math.round(state.height * state.pixelRatio);
      context.setTransform(
        state.pixelRatio,
        0,
        0,
        state.pixelRatio,
        0,
        0,
      );
      drawField(performance.now());
    };

    const drawGrid = (time) => {
      const { width, height, pointerX, pointerY } = state;
      const gap = Math.max(34, Math.min(54, width / 10));
      const driftX = (pointerX - 0.5) * 10 + Math.sin(time * 0.00016) * 3;
      const driftY = (pointerY - 0.5) * 10 + Math.cos(time * 0.00013) * 3;

      context.save();
      context.strokeStyle = "rgba(226, 240, 231, 0.11)";
      context.lineWidth = 1;
      context.beginPath();
      for (let x = -gap + driftX; x <= width + gap; x += gap) {
        context.moveTo(x, 0);
        context.lineTo(x, height);
      }
      for (let y = -gap + driftY; y <= height + gap; y += gap) {
        context.moveTo(0, y);
        context.lineTo(width, y);
      }
      context.stroke();
      context.restore();
    };

    const drawBlocks = (time) => {
      const { width, height, pointerX, pointerY } = state;
      const usableHeight = height * 0.86;

      context.save();
      urbanBlocks.forEach(([x, y, w, h], index) => {
        const shift = Math.sin(time * 0.0003 + index) * 2.4;
        const px = x * width + (pointerX - 0.5) * (index % 2 ? -8 : 8);
        const py = y * usableHeight + shift + (pointerY - 0.5) * 8;
        const pw = w * width;
        const ph = h * usableHeight;

        context.fillStyle =
          index % 4 === 0
            ? "rgba(200, 244, 61, 0.105)"
            : "rgba(230, 241, 233, 0.035)";
        context.strokeStyle =
          index % 4 === 0
            ? "rgba(200, 244, 61, 0.45)"
            : "rgba(225, 241, 232, 0.18)";
        context.lineWidth = 1;
        context.fillRect(px, py, pw, ph);
        context.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      });
      context.restore();
    };

    const drawContours = (time) => {
      const { width, height, pointerX, pointerY } = state;
      const cx = width * (0.54 + (pointerX - 0.5) * 0.08);
      const cy = height * (0.43 + (pointerY - 0.5) * 0.08);

      context.save();
      context.translate(cx, cy);
      context.rotate(Math.sin(time * 0.00009) * 0.05);

      for (let ring = 0; ring < 7; ring += 1) {
        const rx = width * (0.1 + ring * 0.047);
        const ry = height * (0.07 + ring * 0.038);
        context.beginPath();
        for (let point = 0; point <= 96; point += 1) {
          const angle = (point / 96) * Math.PI * 2;
          const wave =
            1 +
            Math.sin(angle * 3 + ring * 0.8 + time * 0.00032) * 0.045 +
            Math.cos(angle * 5 - time * 0.0002) * 0.022;
          const x = Math.cos(angle) * rx * wave;
          const y = Math.sin(angle) * ry * wave;
          if (point === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        context.strokeStyle =
          ring === 2
            ? "rgba(200, 244, 61, 0.72)"
            : `rgba(207, 235, 220, ${0.29 - ring * 0.02})`;
        context.lineWidth = ring === 2 ? 1.5 : 1;
        context.stroke();
      }
      context.restore();
    };

    const drawSamples = (time) => {
      const { width, height, pointerX, pointerY } = state;
      context.save();

      samplePoints.forEach((point, index) => {
        const orbit = Math.sin(time * 0.00035 * point.speed + point.phase);
        const x =
          point.x * width + orbit * 9 + (pointerX - 0.5) * (8 + (index % 4));
        const y =
          point.y * height +
          Math.cos(time * 0.00028 * point.speed + point.phase) * 7 +
          (pointerY - 0.5) * (6 + (index % 3));

        context.beginPath();
        context.arc(x, y, point.radius, 0, Math.PI * 2);
        context.fillStyle =
          index % 5 === 0 ? "rgba(200, 244, 61, 0.9)" : "rgba(237, 247, 240, 0.58)";
        context.fill();
      });
      context.restore();
    };

    const drawCrosshair = () => {
      const { width, height, pointerX, pointerY } = state;
      const x = pointerX * width;
      const y = pointerY * height;

      context.save();
      context.strokeStyle = "rgba(200, 244, 61, 0.34)";
      context.lineWidth = 1;
      context.setLineDash([4, 7]);
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
      context.setLineDash([]);
      context.beginPath();
      context.arc(x, y, 12, 0, Math.PI * 2);
      context.strokeStyle = "rgba(200, 244, 61, 0.76)";
      context.stroke();
      context.restore();
    };

    function drawField(time) {
      const { width, height } = state;
      if (!width || !height) return;

      state.pointerX += (state.targetX - state.pointerX) * 0.055;
      state.pointerY += (state.targetY - state.pointerY) * 0.055;

      context.clearRect(0, 0, width, height);
      const wash = context.createRadialGradient(
        width * state.pointerX,
        height * state.pointerY,
        0,
        width * state.pointerX,
        height * state.pointerY,
        Math.max(width, height) * 0.72,
      );
      wash.addColorStop(0, "rgba(46, 88, 70, 0.34)");
      wash.addColorStop(0.42, "rgba(13, 45, 36, 0.12)");
      wash.addColorStop(1, "rgba(5, 20, 16, 0.48)");
      context.fillStyle = wash;
      context.fillRect(0, 0, width, height);

      drawGrid(time);
      drawBlocks(time);
      drawContours(time);
      drawSamples(time);
      drawCrosshair();
    }

    const animate = (time) => {
      drawField(time);
      if (!reducedMotion.matches && state.visible) {
        state.frame = requestAnimationFrame(animate);
      }
    };

    const startAnimation = () => {
      cancelAnimationFrame(state.frame);
      if (reducedMotion.matches) drawField(performance.now());
      else if (state.visible) state.frame = requestAnimationFrame(animate);
    };

    canvas.addEventListener(
      "pointermove",
      (event) => {
        const bounds = canvas.getBoundingClientRect();
        state.targetX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
        state.targetY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
      },
      { passive: true },
    );

    canvas.addEventListener("pointerleave", () => {
      state.targetX = 0.62;
      state.targetY = 0.42;
    });

    document.addEventListener("visibilitychange", () => {
      state.visible = !document.hidden;
      if (state.visible) startAnimation();
      else cancelAnimationFrame(state.frame);
    });

    reducedMotion.addEventListener?.("change", startAnimation);
    const canvasObserver = new ResizeObserver(resizeCanvas);
    canvasObserver.observe(canvas);
    resizeCanvas();
    startAnimation();
  }
})();
