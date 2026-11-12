(() => {
  // Constants: 1 pica = 12px -> 45p x 60p single-page sheet (540px x 720px)
  const PICA = 12;
  const PAGE_PICAS_W = 45;
  const PAGE_PICAS_H = 60;
  const PAGE_W = PAGE_PICAS_W * PICA; // 540
  const PAGE_H = PAGE_PICAS_H * PICA; // 720
  const MIN_W = 3 * PICA; // 3 picas
  const MIN_H = 2 * PICA; // 2 picas

  const TYPE_META = {
    photo: {
      badge: "PHOTO BOX",
      defaultLabel: "PHOTO: Candid / Portrait",
      wpBlock: "Image / Cover Block",
      defaultW: 18 * PICA,
      defaultH: 15 * PICA,
    },
    text: {
      badge: "TEXT COLUMN",
      defaultLabel: "COPY: Body Column",
      wpBlock: "Paragraph / Columns Block",
      defaultW: 18 * PICA,
      defaultH: 20 * PICA,
    },
    headline: {
      badge: "HEADLINE",
      defaultLabel: "HEADLINE: Feature Title",
      wpBlock: "Heading Block (H1/H2)",
      defaultW: 39 * PICA,
      defaultH: 4 * PICA,
    },
    caption: {
      badge: "CAPTION / FOLIO",
      defaultLabel: "CAPTION: Photo Cutline",
      wpBlock: "Caption / Quote Block",
      defaultW: 18 * PICA,
      defaultH: 4 * PICA,
    },
    sticky: {
      badge: "STICKY NOTE",
      defaultLabel: "Personal Note",
      wpBlock: "Excluded from Wireframe",
      defaultW: 14 * PICA,
      defaultH: 11 * PICA,
    },
  };

  // Starter 1965 Single-Page Yearbook Dummy Layout (in picas * PICA)
  function getDefaultLayout() {
    return [
      {
        id: uid(),
        type: "headline",
        x: 3 * PICA,
        y: 3 * PICA,
        w: 39 * PICA,
        h: 5 * PICA,
        label: "CAMPUS LIFE & AUTUMN TRADITIONS",
      },
      {
        id: uid(),
        type: "photo",
        x: 3 * PICA,
        y: 9 * PICA,
        w: 24 * PICA,
        h: 22 * PICA,
        label: "LEAD PHOTO: Quad Gathering (24p x 22p)",
      },
      {
        id: uid(),
        type: "caption",
        x: 3 * PICA,
        y: 32 * PICA,
        w: 24 * PICA,
        h: 4 * PICA,
        label: "CUTLINE: Seniors on library steps, Oct. 1964",
      },
      {
        id: uid(),
        type: "text",
        x: 28 * PICA,
        y: 9 * PICA,
        w: 14 * PICA,
        h: 27 * PICA,
        label: "LEAD COPY: Col 1",
      },
      {
        id: uid(),
        type: "text",
        x: 3 * PICA,
        y: 38 * PICA,
        w: 19 * PICA,
        h: 19 * PICA,
        label: "BODY COPY: Col 2",
      },
      {
        id: uid(),
        type: "photo",
        x: 23 * PICA,
        y: 38 * PICA,
        w: 19 * PICA,
        h: 14 * PICA,
        label: "SECONDARY PHOTO: Club Officers",
      },
      {
        id: uid(),
        type: "caption",
        x: 23 * PICA,
        y: 53 * PICA,
        w: 19 * PICA,
        h: 4 * PICA,
        label: "FOLIO: Page 14 — Student Activities",
      },
    ];
  }

  // Application State
  let blocks = getDefaultLayout();
  let selectedId = null;
  let undoStack = [];
  let snapToGrid = true;

  // DOM References
  const dummyPage = document.getElementById("dummyPage");
  const blocksLayer = document.getElementById("blocksLayer");
  const rulerTop = document.getElementById("rulerTop");
  const rulerLeft = document.getElementById("rulerLeft");

  const toggleGrid = document.getElementById("toggleGrid");
  const toggleSnap = document.getElementById("toggleSnap");
  const btnUndo = document.getElementById("btnUndo");
  const btnReset = document.getElementById("btnReset");
  const btnClear = document.getElementById("btnClear");
  const btnExportCode = document.getElementById("btnExportCode");
  const btnExportPng = document.getElementById("btnExportPng");
  const includeStickyPng = document.getElementById("includeStickyPng");

  const contextEmpty = document.getElementById("contextEmpty");
  const contextActive = document.getElementById("contextActive");
  const selectedTypeBadge = document.getElementById("selectedTypeBadge");
  const selectedLabelInput = document.getElementById("selectedLabelInput");
  const selectedMetrics = document.getElementById("selectedMetrics");
  const btnForward = document.getElementById("btnForward");
  const btnBackward = document.getElementById("btnBackward");
  const btnDuplicate = document.getElementById("btnDuplicate");
  const btnDelete = document.getElementById("btnDelete");

  const exportModal = document.getElementById("exportModal");
  const btnCloseModal = document.getElementById("btnCloseModal");
  const btnCopyCode = document.getElementById("btnCopyCode");
  const exportedCodeOutput = document.getElementById("exportedCodeOutput");
  const wpMappingSummary = document.getElementById("wpMappingSummary");

  function uid() {
    return "blk_" + Math.random().toString(36).slice(2, 9);
  }

  function snap(val) {
    return snapToGrid ? Math.round(val / PICA) * PICA : Math.round(val);
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function saveHistory() {
    undoStack.push(JSON.stringify(blocks));
    if (undoStack.length > 35) undoStack.shift();
    btnUndo.disabled = undoStack.length === 0;
  }

  function undo() {
    if (undoStack.length === 0) return;
    blocks = JSON.parse(undoStack.pop());
    if (!blocks.some((b) => b.id === selectedId)) {
      selectedId = null;
    }
    btnUndo.disabled = undoStack.length === 0;
    render();
  }

  // Build Pica Rulers (0p to 45p, 0p to 60p)
  function buildRulers() {
    rulerTop.innerHTML = "";
    rulerLeft.innerHTML = "";

    for (let p = 0; p <= PAGE_PICAS_W; p += 3) {
      const tick = document.createElement("div");
      tick.className = "ruler-tick-x";
      tick.style.left = `${p * PICA}px`; tick.textContent = `${p}p`;
      rulerTop.appendChild(tick);
    }

    for (let p = 0; p <= PAGE_PICAS_H; p += 3) {
      const tick = document.createElement("div");
      tick.className = "ruler-tick-y";
      tick.style.top = `${p * PICA}px`; tick.textContent = `${p}p`;
      rulerLeft.appendChild(tick);
    }
  }

  // Render All Blocks & Update Contextual Bar
  function render() {
    blocksLayer.innerHTML = "";

    blocks.forEach((block) => {
      const el = document.createElement("div");
      el.className = `layout-block block-${block.type}${block.id === selectedId ? " selected" : ""}`;
      el.dataset.id = block.id;
      el.style.left = `${block.x}px`; el.style.top = `${block.y}px`;
      el.style.width = `${block.w}px`; el.style.height = `${block.h}px`;

      if (block.type === "sticky") {
        const header = document.createElement("div");
        header.className = "sticky-header";
        header.innerHTML = `<span>${escapeHtml(block.label \vert{}\vert{} "Note")}</span><span>Excluded</span>`;  const textarea = document.createElement("textarea"); textarea.className = "sticky-textarea"; textarea.placeholder = "Write personal notes or ideas here..."; textarea.value = block.noteText \vert{}\vert{} "";  textarea.addEventListener("mousedown", (e) => { e.stopPropagation(); if (selectedId !== block.id) { selectedId = block.id; render(); // Re-focus textarea after re-render const refreshed = blocksLayer.querySelector( `.layout-block[data-id="${block.id}"] textarea`
            );
            if (refreshed) refreshed.focus();
          }
        });

        textarea.addEventListener("input", (e) => {
          block.noteText = e.target.value;
        });

        el.appendChild(header);
        el.appendChild(textarea);
      } else {
        const labelEl = document.createElement("div");
        labelEl.className = "block-label";
        labelEl.textContent = block.label;
        el.appendChild(labelEl);

        if (block.type === "text") {
          const lines = document.createElement("div");
          lines.className = "ruled-lines";
          el.appendChild(lines);
        }
      }

      // Dimension pill when selected
      const dimTag = document.createElement("div");
      dimTag.className = "block-dim-tag";
      dimTag.textContent = formatPicaDims(block);
      el.appendChild(dimTag);

      // 8 Resize Handles
      ["nw", "n", "ne", "e", "se", "s", "sw", "w"].forEach((dir) => {
        const handle = document.createElement("div");
        handle.className = `resize-handle handle-${dir}`; handle.dataset.dir = dir; el.appendChild(handle); });  // Drag / Resize Initiation el.addEventListener("mousedown", (e) => onBlockMouseDown(e, block.id)); blocksLayer.appendChild(el); });  updateContextBar(); }  function formatPicaDims(b) { const pw = Math.round((b.w / PICA) * 10) / 10; const ph = Math.round((b.h / PICA) * 10) / 10; return `${pw}p × ${ph}p`; }  function updateContextBar() { const selected = blocks.find((b) => b.id === selectedId); if (!selected) { contextEmpty.classList.remove("hidden"); contextActive.classList.add("hidden"); return; }  contextEmpty.classList.add("hidden"); contextActive.classList.remove("hidden");  const meta = TYPE_META[selected.type]; selectedTypeBadge.textContent = meta.badge; selectedLabelInput.value = selected.label;  const pw = Math.round((selected.w / PICA) * 10) / 10; const ph = Math.round((selected.h / PICA) * 10) / 10; const px = Math.round((selected.x / PICA) * 10) / 10; const py = Math.round((selected.y / PICA) * 10) / 10; const pctW = Math.round((selected.w / PAGE_W) * 100); const pctH = Math.round((selected.h / PAGE_H) * 100);  selectedMetrics.textContent = `W: ${pw}p (${pctW}\%) • H: ${ph}p (${pctH}\%) • X: ${px}p, Y: ${py}p`; }  // Dragging & 8-Direction Resizing function onBlockMouseDown(e, id) { if (e.button !== 0) return; e.stopPropagation();  const block = blocks.find((b) => b.id === id); if (!block) return;  selectedId = id; render();  const isHandle = e.target.classList.contains("resize-handle"); const dir = isHandle ? e.target.dataset.dir : null;  const startX = e.clientX; const startY = e.clientY; const orig = { x: block.x, y: block.y, w: block.w, h: block.h }; let hasMoved = false;  function onMouseMove(moveEvent) { const dx = moveEvent.clientX - startX; const dy = moveEvent.clientY - startY;  if (!hasMoved && (Math.abs(dx) > 2 \vert{}\vert{} Math.abs(dy) > 2)) { saveHistory(); hasMoved = true; } if (!hasMoved) return;  if (!isHandle) { // Move block within 45p x 60p sheet const nextX = clamp(snap(orig.x + dx), 0, PAGE_W - orig.w); const nextY = clamp(snap(orig.y + dy), 0, PAGE_H - orig.h); block.x = nextX; block.y = nextY; } else { // Resize block let { x, y, w, h } = orig;  if (dir.includes("e")) { w = clamp(snap(orig.w + dx), MIN_W, PAGE_W - orig.x); } if (dir.includes("s")) { h = clamp(snap(orig.h + dy), MIN_H, PAGE_H - orig.y); } if (dir.includes("w")) { const proposedX = clamp(snap(orig.x + dx), 0, orig.x + orig.w - MIN_W); w = orig.x + orig.w - proposedX; x = proposedX; } if (dir.includes("n")) { const proposedY = clamp(snap(orig.y + dy), 0, orig.y + orig.h - MIN_H); h = orig.y + orig.h - proposedY; y = proposedY; }  block.x = x; block.y = y; block.w = w; block.h = h; }  // Fast DOM update during drag const domEl = blocksLayer.querySelector(`.layout-block[data-id="${block.id}"]`);
      if (domEl) {
        domEl.style.left = `${block.x}px`; domEl.style.top = `${block.y}px`;
        domEl.style.width = `${block.w}px`; domEl.style.height = `${block.h}px`;
        const tag = domEl.querySelector(".block-dim-tag");
        if (tag) tag.textContent = formatPicaDims(block);
      }
      updateContextBar();
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (hasMoved) render();
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  // Add New Block
  function addBlock(type) {
    const meta = TYPE_META[type];
    if (!meta) return;

    saveHistory();
    const offset = (blocks.length % 6) * PICA;
    const newBlock = {
      id: uid(),
      type,
      x: clamp(3 * PICA + offset, 0, PAGE_W - meta.defaultW),
      y: clamp(6 * PICA + offset, 0, PAGE_H - meta.defaultH),
      w: meta.defaultW,
      h: meta.defaultH,
      label: meta.defaultLabel,
      noteText: type === "sticky" ? "" : undefined,
    };

    blocks.push(newBlock);
    selectedId = newBlock.id;
    render();
  }

  // Block Actions
  function duplicateSelected() {
    const src = blocks.find((b) => b.id === selectedId);
    if (!src) return;

    saveHistory();
    const copy = {
      ...src,
      id: uid(),
      x: clamp(src.x + 2 * PICA, 0, PAGE_W - src.w),
      y: clamp(src.y + 2 * PICA, 0, PAGE_H - src.h),
    };
    blocks.push(copy);
    selectedId = copy.id;
    render();
  }

  function deleteSelected() {
    if (!selectedId) return;
    saveHistory();
    blocks = blocks.filter((b) => b.id !== selectedId);
    selectedId = null;
    render();
  }

  function moveLayer(delta) {
    const idx = blocks.findIndex((b) => b.id === selectedId);
    if (idx === -1) return;
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;

    saveHistory();
    const [item] = blocks.splice(idx, 1);
    blocks.splice(targetIdx, 0, item);
    render();
  }

  // Wireframe HTML/CSS & WordPress Block Exporter (Excludes Sticky Notes)
  function openWireframeModal() {
    const wireframeBlocks = blocks.filter((b) => b.type !== "sticky");
    const stickyCount = blocks.length - wireframeBlocks.length;

    // Sort top-to-bottom, left-to-right for semantic reading order
    const sorted = [...wireframeBlocks].sort((a, b) =>
      Math.abs(a.y - b.y) > PICA ? a.y - b.y : a.x - b.x
    );

    let summaryHtml = `<strong>1965 Dummy &rarr; WordPress Block Translation (${sorted.length} blocks):</strong>`;
    if (stickyCount > 0) {
      summaryHtml += ` <em>(${stickyCount} personal sticky${stickyCount === 1 ? "note" : "notes"} excluded)</em>`;
    }
    summaryHtml += `<ul>`;

    sorted.forEach((b) => {
      const pctW = Math.round((b.w / PAGE_W) * 100);
      const pctX = Math.round((b.x / PAGE_W) * 100);
      summaryHtml += `<li><strong>${escapeHtml(b.label)}</strong> &rarr; <code>${TYPE_META[b.type].wpBlock}</code> (Width: ${pctW}\%, Left Offset:${pctX}%)</li>`;
    });
    summaryHtml += `</ul>`;
    wpMappingSummary.innerHTML = summaryHtml;

    const htmlItems = sorted
      .map((b, i) => {
        const leftPct = ((b.x / PAGE_W) * 100).toFixed(1);
        const topPct = ((b.y / PAGE_H) * 100).toFixed(1);
        const widthPct = ((b.w / PAGE_W) * 100).toFixed(1);
        const heightPct = ((b.h / PAGE_H) * 100).toFixed(1);
        const tag = b.type === "headline" ? "h2" : b.type === "photo" ? "figure" : "div";

        return `  <!-- ${TYPE_META[b.type].wpBlock} -->
  <${tag} class="wf-block wf-${b.type}" style="left:${leftPct}\%; top:${topPct}%; width:${widthPct}\%; height:${heightPct}%;">
    <span>${escapeHtml(b.label)}</span>
  </${tag}>`;
      })
      .join("\n\n");

    const fullCode = `<!-- Responsive Wireframe Generated from 1965 Yearbook Dummy (45p x 60p) -->
<section class="yearbook-wireframe-page">
${htmlItems}
</section>

<style>
  .yearbook-wireframe-page {
    position: relative;
    width: 100%;
    max-width: 720px;
    aspect-ratio: 45 / 60; /* 3:4 Single-Page Proportion */
    margin: 0 auto;
    background: #fafafa;
    border: 1px solid #d4d4d8;
  }
  .wf-block {
    position: absolute;
    box-sizing: border-box;
    margin: 0;
    padding: 0.5rem;
    border: 1.5px solid #3f3f46;
    background: #f4f4f5;
    font-family: system-ui, sans-serif;
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .wf-photo { background: #e4e4e7; }
  .wf-headline { font-weight: 700; font-size: 1rem; justify-content: flex-start; }
  .wf-caption { border-style: dashed; font-style: italic; }
</style>`;

    exportedCodeOutput.textContent = fullCode;
    exportModal.classList.remove("hidden");
  }

  // Crisp 2x Retina PNG Snapshot Renderer
  function downloadPngSnapshot() {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_W * scale;
    canvas.height = PAGE_H * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    // Paper Base
    ctx.fillStyle = "#f4efe4";
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // Optional Pica Grid & 3-Pica Margin
    if (toggleGrid.checked) {
      ctx.strokeStyle = "rgba(66, 115, 168, 0.16)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= PAGE_W; x += PICA) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, PAGE_H);
        ctx.stroke();
      }
      for (let y = 0; y <= PAGE_H; y += PICA) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(PAGE_W, y);
        ctx.stroke();
      }

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(185, 65, 65, 0.4)";
      ctx.strokeRect(36, 36, PAGE_W - 72, PAGE_H - 72);
      ctx.restore();
    }

    // Sheet Header Stamp
    ctx.fillStyle = "rgba(47, 45, 42, 0.6)";
    ctx.font = "10px 'Courier Prime', monospace";
    ctx.fillText("YEARBOOK DUMMY — SINGLE PAGE (45p × 60p)", 36, 20);

    // Draw Blocks
    const includeStickies = includeStickyPng.checked;
    blocks.forEach((b) => {
      if (b.type === "sticky" && !includeStickies) return;

      ctx.save();
      if (b.type === "sticky") {
        ctx.fillStyle = "#fef08a";
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 1.5;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        ctx.fillStyle = "#713f12";
        ctx.font = "bold 9px sans-serif";
        ctx.fillText(b.label || "NOTE", b.x + 6, b.y + 13);

        ctx.fillStyle = "#422006";
        ctx.font = "13px sans-serif";
        wrapCanvasText(ctx, b.noteText || "", b.x + 6, b.y + 28, b.w - 12, 15);
      } else if (b.type === "photo") {
        ctx.fillStyle = "rgba(232, 224, 208, 0.9)";
        ctx.strokeStyle = "#2f2d2a";
        ctx.lineWidth = 2;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        // Diagonal X lines
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + b.w, b.y + b.h);
        ctx.moveTo(b.x + b.w, b.y);
        ctx.lineTo(b.x, b.y + b.h);
        ctx.stroke();

        // Centered Label Pill
        ctx.font = "bold 11px 'Courier Prime', monospace";
        const textW = Math.min(ctx.measureText(b.label).width + 12, b.w - 10);
        const pillX = b.x + (b.w - textW) / 2;
        const pillY = b.y + b.h / 2 - 9;
        ctx.fillStyle = "#f4efe4";
        ctx.fillRect(pillX, pillY, textW, 18);
        ctx.strokeRect(pillX, pillY, textW, 18);
        ctx.fillStyle = "#2f2d2a";
        ctx.textAlign = "center";
        ctx.fillText(b.label, b.x + b.w / 2, pillY + 13, b.w - 14);
      } else if (b.type === "text") {
        ctx.fillStyle = "rgba(244, 239, 228, 0.85)";
        ctx.strokeStyle = "#2f2d2a";
        ctx.lineWidth = 1.5;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        ctx.fillStyle = "#2f2d2a";
        ctx.font = "bold 10px 'Courier Prime', monospace";
        ctx.fillText(b.label.toUpperCase(), b.x + 8, b.y + 14, b.w - 16);

        ctx.strokeStyle = "rgba(47, 45, 42, 0.45)";
        ctx.lineWidth = 1;
        for (let ly = b.y + 22; ly < b.y + b.h - 6; ly += 8) {
          ctx.beginPath();
          ctx.moveTo(b.x + 8, ly);
          ctx.lineTo(b.x + b.w - 8, ly);
          ctx.stroke();
        }
      } else if (b.type === "headline") {
        ctx.fillStyle = "rgba(238, 231, 216, 0.92)";
        ctx.strokeStyle = "#2f2d2a";
        ctx.lineWidth = 2;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        ctx.fillStyle = "#2f2d2a";
        ctx.font = "bold 15px 'Courier Prime', monospace";
        ctx.fillText(b.label, b.x + 10, b.y + b.h / 2 + 5, b.w - 20);
      } else if (b.type === "caption") {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.fillStyle = "rgba(244, 239, 228, 0.9)";
        ctx.strokeStyle = "#2f2d2a";
        ctx.lineWidth = 1.5;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.restore();

        ctx.fillStyle = "#2f2d2a";
        ctx.font = "italic 11px 'Courier Prime', monospace";
        ctx.fillText(b.label, b.x + 7, b.y + b.h / 2 + 4, b.w - 14);
      }
      ctx.restore();
    });

    const link = document.createElement("a");
    link.download = "1965-yearbook-layout-dummy-45x60p.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(/\s+/);
    let line = "";
    let currY = y;
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      if (ctx.measureText(testLine).width > maxWidth && i > 0) {
        ctx.fillText(line, x, currY);
        line = words[i] + " ";
        currY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currY);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Event Listeners
  document.querySelectorAll("[data-add-type]").forEach((btn) => {
    btn.addEventListener("click", () => addBlock(btn.dataset.addType));
  });

  toggleGrid.addEventListener("change", () => {
    dummyPage.classList.toggle("show-grid", toggleGrid.checked);
  });

  toggleSnap.addEventListener("change", () => {
    snapToGrid = toggleSnap.checked;
  });

  btnUndo.addEventListener("click", undo);

  btnReset.addEventListener("click", () => {
    saveHistory();
    blocks = getDefaultLayout();
    selectedId = null;
    render();
  });

  btnClear.addEventListener("click", () => {
    saveHistory();
    blocks = [];
    selectedId = null;
    render();
  });

  selectedLabelInput.addEventListener("input", (e) => {
    const selected = blocks.find((b) => b.id === selectedId);
    if (!selected) return;
    selected.label = e.target.value;
    const domLabel = blocksLayer.querySelector(
      `.layout-block[data-id="${selected.id}"] .block-label, .layout-block[data-id="${selected.id}"] .sticky-header span:first-child`
    );
    if (domLabel) domLabel.textContent = selected.label;
  });

  btnForward.addEventListener("click", () => moveLayer(1));
  btnBackward.addEventListener("click", () => moveLayer(-1));
  btnDuplicate.addEventListener("click", duplicateSelected);
  btnDelete.addEventListener("click", deleteSelected);

  // Deselect when clicking empty paper
  dummyPage.addEventListener("mousedown", (e) => {
    if (e.target === dummyPage || e.target === blocksLayer) {
      selectedId = null;
      render();
    }
  });

  // Keyboard Shortcuts (Undo, Duplicate, Delete, Arrow Nudge)
  window.addEventListener("keydown", (e) => {
    const activeTag = document.activeElement?.tagName;
    const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA";

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      if (!isTyping) {
        e.preventDefault();
        undo();
      }
      return;
    }

    if (isTyping || !selectedId) return;

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      duplicateSelected();
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteSelected();
      return;
    }

    const step = e.shiftKey ? 1 : PICA;
    const selected = blocks.find((b) => b.id === selectedId);
    if (!selected) return;

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      saveHistory();
      if (e.key === "ArrowLeft") selected.x = clamp(selected.x - step, 0, PAGE_W - selected.w);
      if (e.key === "ArrowRight") selected.x = clamp(selected.x + step, 0, PAGE_W - selected.w);
      if (e.key === "ArrowUp") selected.y = clamp(selected.y - step, 0, PAGE_H - selected.h);
      if (e.key === "ArrowDown") selected.y = clamp(selected.y + step, 0, PAGE_H - selected.h);
      render();
    }
  });

  // Modal Controls
  btnExportCode.addEventListener("click", openWireframeModal);
  btnCloseModal.addEventListener("click", () => exportModal.classList.add("hidden"));
  exportModal.addEventListener("click", (e) => {
    if (e.target === exportModal) exportModal.classList.add("hidden");
  });

  btnCopyCode.addEventListener("click", () => {
    navigator.clipboard.writeText(exportedCodeOutput.textContent).then(() => {
      const orig = btnCopyCode.textContent;
      btnCopyCode.textContent = "Copied!";
      setTimeout(() => (btnCopyCode.textContent = orig), 1500);
    });
  });

  btnExportPng.addEventListener("click", downloadPngSnapshot);

  // Initialize
  buildRulers();
  render();
})();