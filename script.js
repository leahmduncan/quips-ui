/* =====================================================================
           CONSTANTS & 45p × 60p SINGLE-PAGE PRESETS
           1 pica (1p) = 12px
           Sheet Width:  45p = 540px (3p margin inset -> live width 39p = 468px, x: 36..504)
           Sheet Height: 60p = 720px (3p margin inset -> live height 54p = 648px, y: 36..684)
           ===================================================================== */
        const SHEET_WIDTH = 540;   // 45p
        const SHEET_HEIGHT = 720;  // 60p
        const PICA_PX = 12;

        const PAGE_PRESETS = {
            feature: [
                { id: 1, type: 'photo', x: 0,  y: 36,  w: 540, h: 179, label: 'Hero Photo', imageURL: 'assets/hero-banner.jpg'},
                { id: 2, type: 'photo', x: 48,  y: 230, w: 180, h: 452,  label: 'Tall Photo', imageURL: 'assets/hero-vertical.jpg' },
                { id: 3, type: 'photo', x: 250, y: 442, w: 240, h: 240,  label: 'Photo Grid', imageURL: 'assets/hero-grid.jpg' },
                { id: 5, type: 'text',  x: 250,  y: 230, w: 240, h: 200, label: 'Paragraph' },
            ],
            club: [
                { id: 1, type: 'headline', x: 36,  y: 36,  w: 468, h: 48,  label: 'FRESHMAN COURT'},
                { id: 3, type: 'photo',    x: 324,  y: 98, w: 180, h: 228, label: 'Headshot', imageURL: 'assets/title-headshot.jpg'},
                { id: 8, type: 'text',     x: 36,  y: 98, w: 276, h: 248, label: 'Paragraph'},
                { id: 4, type: 'caption',  x: 324,  y: 332, w: 180, h: 24,  label: 'Freshman Advisor' },
                { id: 5, type: 'caption',  x: 36,  y: 355, w: 180, h: 24, label: 'Freshman Court Members'},
                { id: 6, type: 'photo',    x: 36, y: 385, w: 468, h: 300, label: 'Group Photo', imageURL: 'assets/title-group.jpg'},
            ],
            portraits: [
                { id: 1, type: 'photo',    x: 36,  y: 36,  w: 228, h: 228, label: 'Anchor Photo', imageURL: 'assets/vertical-anchor.jpg' },
                { id: 2, type: 'caption',  x: 36,  y: 270, w: 228, h: 24,  label: 'Class Officers'},
                { id: 3, type: 'photo',    x: 36,  y: 300, w: 228, h: 126, label: 'Pair 1', imageURL: 'assets/vertical-duo-1.jpg' },
                { id: 5, type: 'photo',    x: 36,  y: 426, w: 228, h: 126, label: 'Pair 2', imageURL: 'assets/vertical-duo-2.jpg'},
                { id: 6, type: 'photo',    x: 36,  y: 552, w: 228, h: 126, label: 'Pair 3', imageURL: 'assets/vertical-duo-3.jpg'},
                { id: 7, type: 'headline', x: 274, y: 36,  w: 228, h: 228,  label: '1965 Senior Class' },
                { id: 8, type: 'rule',     x: 274, y: 280, w: 228, h: 12,  label: 'Separator' },
                { id: 9, type: 'text',     x: 274, y: 300, w: 228, h: 115, label: 'Descriptive Text' },
                { id: 10, type: 'text',    x: 274, y: 426, w: 228, h: 115, label: 'Descriptive Text' },
                { id: 10, type: 'text',    x: 274, y: 552, w: 228, h: 115, label: 'Descriptive Text' },
            ],
            blank: []
            };

        /* =====================================================================
           APPLICATION STATE
           ===================================================================== */
        let currentPresetKey = 'feature';
        let blocks = [];
        let selectedId = null;
        let nextBlockId = 100;
        let showGuides = true;
        let snapEnabled = true;
      
        // Canvas Zoom State
        let zoomLevel = 1;
        const MIN_ZOOM = 0.5;  // 50%
        const MAX_ZOOM = 2.5;  // 250%
        const BASE_WRAPPER_W = SHEET_WIDTH + 36;  // 540 + 18px padding on each side = 576px
        const BASE_WRAPPER_H = SHEET_HEIGHT + 36; // 720 + 18px padding on each side = 756px

        // Undo History Stack
        let undoStack = [];
        const MAX_UNDO = 45;

        // Pointer Drag / Resize Interaction State
        let interaction = null;

        // Inline Editing State
        let inlineEditingId = null;

        /* =====================================================================
           INITIALIZATION
           ===================================================================== */
        window.addEventListener('DOMContentLoaded', () => {
            loadPreset('feature', false);
            setupPaletteDragAndDrop();
            setupCanvasDeselect();
            setupKeyboardShortcuts();
        });

        /* =====================================================================
           HELPER: PICA FORMATTING (12px = 1p)
           ===================================================================== */
        function formatPica(px) {
            const p = px / PICA_PX;
            return Number.isInteger(p) ? `${p}p` : `${Number(p.toFixed(1))}p`;
        }

        /* =====================================================================
           UNDO HISTORY MANAGEMENT
           ===================================================================== */
        function pushUndoState(snapshot = null) {
            const stateToSave = snapshot || JSON.stringify(blocks);
            if (undoStack.length > 0 && undoStack[undoStack.length - 1] === stateToSave) {
                return;
            }
            undoStack.push(stateToSave);
            if (undoStack.length > MAX_UNDO) {
                undoStack.shift();
            }
            updateUndoButton();
        }

        function undo() {
            if (undoStack.length === 0) return;
            const prevJSON = undoStack.pop();
            blocks = JSON.parse(prevJSON);
            if (selectedId && !blocks.some(b => b.id === selectedId)) {
                selectedId = null;
            }
            inlineEditingId = null;
            updateUndoButton();
            renderAll();
            showToast('Reverted last change');
        }

        function updateUndoButton() {
            document.getElementById('btn-undo').disabled = undoStack.length === 0;
        }

        /* =====================================================================
           PRESET LOADING & DISPLAY GUIDES
           ===================================================================== */
        function handlePresetChange(presetKey) {
            pushUndoState();
            loadPreset(presetKey, true);
        }

        function resetCurrentPreset() {
            pushUndoState();
            loadPreset(currentPresetKey, true);
            showToast('Page reset to preset layout');
        }

        function loadPreset(presetKey, notify) {
            currentPresetKey = presetKey;
            document.getElementById('preset-selector').value = presetKey;
            const preset = PAGE_PRESETS[presetKey] || [];
            blocks = JSON.parse(JSON.stringify(preset));
            nextBlockId = blocks.reduce((max, b) => Math.max(max, b.id), 0) + 1;
            selectedId = null;
            inlineEditingId = null;
            renderAll();
            if (notify) {
                const label = document.getElementById('preset-selector').selectedOptions[0].text;
                showToast(`Loaded: ${label}`);
            }
        }

        function toggleGuides() {
            showGuides = document.getElementById('toggle-grid').checked;
            document.getElementById('pica-grid-overlay').style.display = showGuides ? 'block' : 'none';
            document.getElementById('sheet-margin-overlay').style.display = showGuides ? 'block' : 'none';
        }

        function toggleSnap() {
            snapEnabled = document.getElementById('toggle-snap').checked;
            showToast(snapEnabled ? 'Snap to Grid (1p / 12px) enabled' : 'Freeform positioning enabled');
        }

        function snapValue(val) {
            return snapEnabled ? Math.round(val / PICA_PX) * PICA_PX : Math.round(val);
        }

        function changeZoom(delta) {
          setZoom(zoomLevel + delta);
        }

        function setZoom(nextZoom) {
          zoomLevel = Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom)) * 10) / 10;

          const stage = document.getElementById('zoom-stage');
          const wrapper = document.getElementById('sheet-wrapper');
          const label = document.getElementById('zoom-label');

          wrapper.style.transform = `scale(${zoomLevel})`;
          stage.style.width = `${Math.round(BASE_WRAPPER_W * zoomLevel)}px`;
          stage.style.height = `${Math.round(BASE_WRAPPER_H * zoomLevel)}px`;
          label.textContent = `${Math.round(zoomLevel * 100)}%`;
        }

        /* =====================================================================
           ADDING & MANIPULATING BLOCKS
           ===================================================================== */
        function createBlockData(type, customX = null, customY = null) {
            const defaults = {
                photo:    { w: 228, h: 168, label: 'Photo Block' },
                headline: { w: 468, h: 54,  label: 'SECTION HEADLINE' },
                text:     { w: 222, h: 216, label: 'Body Copy Column' },
                caption:  { w: 228, h: 42,  label: 'Photo cutline or caption...' },
                rule:     { w: 468, h: 18,  label: 'Divider Rule' },
                sticky:   { w: 204, h: 156, label: '' }
            };
            const cfg = defaults[type] || defaults.photo;
            const offset = (blocks.length % 6) * 24;

            let x = customX !== null ? customX - Math.round(cfg.w / 2) : 36 + offset;
            let y = customY !== null ? customY - Math.round(cfg.h / 2) : 48 + offset;

            x = snapValue(Math.max(0, Math.min(SHEET_WIDTH - cfg.w, x)));
            y = snapValue(Math.max(0, Math.min(SHEET_HEIGHT - cfg.h, y)));

            return {
                id: nextBlockId++,
                type,
                x,
                y,
                w: cfg.w,
                h: cfg.h,
                label: cfg.label
            };
        }

        function addBlock(type, customX = null, customY = null) {
            pushUndoState();
            const newBlock = createBlockData(type, customX, customY);
            blocks.push(newBlock);
            selectedId = newBlock.id;
            inlineEditingId = null;
            renderAll();

            if (type === 'sticky') {
                setTimeout(() => {
                    const ta = document.querySelector(`[data-id="${newBlock.id}"] .sticky-textarea`);
                    if (ta) ta.focus();
                }, 20);
            }
        }

        function duplicateSelected() {
            if (!selectedId) return;
            const src = blocks.find(b => b.id === selectedId);
            if (!src) return;

            pushUndoState();
            const copy = JSON.parse(JSON.stringify(src));
            copy.id = nextBlockId++;
            copy.x = Math.min(SHEET_WIDTH - copy.w, copy.x + 24);
            copy.y = Math.min(SHEET_HEIGHT - copy.h, copy.y + 24);
            blocks.push(copy);
            selectedId = copy.id;
            renderAll();
            showToast('Block duplicated');
        }

        function deleteSelected() {
            if (!selectedId) return;
            pushUndoState();
            blocks = blocks.filter(b => b.id !== selectedId);
            selectedId = null;
            inlineEditingId = null;
            renderAll();
            showToast('Block removed');
        }

        function bringForward() {
            if (!selectedId) return;
            const idx = blocks.findIndex(b => b.id === selectedId);
            if (idx === -1 || idx === blocks.length - 1) return;
            pushUndoState();
            const [item] = blocks.splice(idx, 1);
            blocks.splice(idx + 1, 0, item);
            renderCanvas();
        }

        function sendBackward() {
            if (!selectedId) return;
            const idx = blocks.findIndex(b => b.id === selectedId);
            if (idx <= 0) return;
            pushUndoState();
            const [item] = blocks.splice(idx, 1);
            blocks.splice(idx - 1, 0, item);
            renderCanvas();
        }

        /* =====================================================================
           DRAG & DROP FROM SIDEBAR PALETTE ONTO 45p × 60p SHEET
           ===================================================================== */
        function setupPaletteDragAndDrop() {
            const paletteItems = document.querySelectorAll('.palette-item');
            const sheetEl = document.getElementById('dummy-sheet');

            paletteItems.forEach(item => {
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', item.dataset.blockType);
                    e.dataTransfer.effectAllowed = 'copy';
                });
            });

            sheetEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });

            sheetEl.addEventListener('drop', (e) => {
                e.preventDefault();
                const type = e.dataTransfer.getData('text/plain');
                if (!type) return;
                const rect = sheetEl.getBoundingClientRect();
                const dropX = (e.clientX - rect.left) / zoomLevel;
                const dropY = (e.clientY - rect.top) / zoomLevel;                
                addBlock(type, dropX, dropY);
            });
        }

        /* =====================================================================
           RENDERING CANVAS & CONTEXTUAL TOOLBAR
           ===================================================================== */
        function renderAll() {
            renderCanvas();
            updateContextBar();
        }

        function renderCanvas() {
            const layer = document.getElementById('canvas-layer');
            layer.innerHTML = '';

            blocks.forEach(block => {
                const isSelected = block.id === selectedId;
                const isEditingInline = block.id === inlineEditingId;

                const el = document.createElement('div');
                el.dataset.id = block.id;
                el.style.left = `${block.x}px`;
                el.style.top = `${block.y}px`;
                el.style.width = `${block.w}px`;
                el.style.height = `${block.h}px`;

                if (block.type === 'sticky') {
                    el.className = `draft-block block-sticky ${isSelected ? 'selected' : ''}`;
                    el.innerHTML = `
                        <div class="sticky-drag-bar" title="Drag Sticky Note">
                            <div class="sticky-grip"><span></span><span></span><span></span></div>
                            <span style="font-size: 9px; font-weight: 700; color: #854d0e; letter-spacing: 0.05em;">Sticky Note</span>
                        </div>
                        <textarea class="sticky-textarea" placeholder="Write personal reminders or layout notes...">${escapeHTML(block.label)}</textarea>
                        <div class="sticky-footer-tag">Personal Note — Excluded from Export</div>
                    `;

                    const textarea = el.querySelector('.sticky-textarea');
                    let stickyInitialSnapshot = null;

                    textarea.addEventListener('focus', () => {
                        stickyInitialSnapshot = JSON.stringify(blocks);
                        if (selectedId !== block.id) {
                            selectedId = block.id;
                            renderAll();
                            setTimeout(() => {
                                const refocused = document.querySelector(`[data-id="${block.id}"] .sticky-textarea`);
                                if (refocused) refocused.focus();
                            }, 0);
                        }
                    });

                    textarea.addEventListener('input', (e) => {
                        block.label = e.target.value;
                    });

                    textarea.addEventListener('blur', () => {
                        if (stickyInitialSnapshot && stickyInitialSnapshot !== JSON.stringify(blocks)) {
                            pushUndoState(stickyInitialSnapshot);
                        }
                        stickyInitialSnapshot = null;
                    });

                    // Allow typing inside textarea without triggering drag
                    textarea.addEventListener('pointerdown', (e) => {
                        e.stopPropagation();
                        if (selectedId !== block.id) {
                            selectedId = block.id;
                            renderAll();
                            setTimeout(() => {
                                const refocused = document.querySelector(`[data-id="${block.id}"] .sticky-textarea`);
                                if (refocused) refocused.focus();
                            }, 0);
                        }
                    });
                } else {
                    el.className = `draft-block wireframe-block block-${block.type} ${isSelected ? 'selected' : ''}`;

                    const picaDim = `${formatPica(block.w)}×${formatPica(block.h)}`;

                    if (block.type === 'photo') {
                      if (block.imageURL) {
                        el.style.backgroundImage = `url('${block.imageURL}')`;
                        el.style.backgroundSize = 'cover';
                        el.style.backgroundPosition = 'center';
                        el.innerHTML = `
                          <div class="photo-header-bar">
                            <span class="pencil-tag">${escapeHTML(block.label || 'Photo Block')}</span>
                            <span class="pica-readout">${picaDim}</span>
                          </div>
                        `;
                      } else {                      
                        el.innerHTML = `
                            <svg class="photo-svg" viewBox="0 0 ${block.w} ${block.h}" preserveAspectRatio="none">
                                <line x1="0" y1="0" x2="${block.w}" y2="${block.h}" class="photo-line"></line>
                                <line x1="${block.w}" y1="0" x2="0" y2="${block.h}" class="photo-line"></line>
                            </svg>
                            <div class="photo-header-bar">
                                <span class="pencil-tag">${escapeHTML(block.label || 'Photo Block')}</span>
                                <span class="pica-readout">${picaDim}</span>
                            </div>
                        `;
                      }
                    } else if (block.type === 'headline') {
                        const fontSize = Math.max(14, Math.min(28, Math.round(block.h * 0.44)));
                        el.innerHTML = `
                            <div class="headline-text" style="font-size: ${fontSize}px;">${escapeHTML(block.label || 'HEADLINE')}</div>
                        `;
                    } else if (block.type === 'text') {
                        el.innerHTML = `
                            <div class="text-col-header">${escapeHTML(block.label || 'Body Copy Column')}</div>
                            <div class="ruled-lines-body"></div>
                        `;
                    } else if (block.type === 'caption') {
                        el.innerHTML = `
                            <div class="caption-text">${escapeHTML(block.label || 'Caption / Cutline')}</div>
                        `;
                    } else if (block.type === 'rule') {
                        el.innerHTML = `
                            <div class="rule-double-stroke"></div>
                        `;
                    }

                    // Double-click to inline edit label
                    el.addEventListener('dblclick', (e) => {
                        e.stopPropagation();
                        startInlineRename(block.id);
                    });

                    if (isEditingInline) {
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.className = 'inline-rename-input';
                        input.value = block.label;
                        const beforeRenameSnapshot = JSON.stringify(blocks);

                        el.innerHTML = '';
                        el.style.display = 'flex';
                        el.style.alignItems = 'center';
                        el.style.justifyContent = 'center';
                        el.appendChild(input);

                        const commitRename = () => {
                            if (inlineEditingId !== block.id) return;
                            const trimmed = input.value.trim();
                            if (trimmed && trimmed !== block.label) {
                                pushUndoState(beforeRenameSnapshot);
                                block.label = trimmed;
                            }
                            inlineEditingId = null;
                            renderAll();
                        };

                        input.addEventListener('pointerdown', e => e.stopPropagation());
                        input.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                commitRename();
                            } else if (e.key === 'Escape') {
                                inlineEditingId = null;
                                renderAll();
                            }
                        });
                        input.addEventListener('blur', commitRename);

                        setTimeout(() => {
                            input.focus();
                            input.select();
                        }, 10);
                    }
                }

                // Append 8 resize handles if selected and not inline-editing
                if (isSelected && !isEditingInline) {
                    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
                    handles.forEach(dir => {
                        const h = document.createElement('div');
                        h.className = `resize-handle handle-${dir}`;
                        h.addEventListener('pointerdown', (e) => beginResize(e, block.id, dir));
                        el.appendChild(h);
                    });
                }

                // Pointer down to select & drag
                el.addEventListener('pointerdown', (e) => {
                    if (e.target.classList.contains('resize-handle')) return;
                    if (inlineEditingId === block.id) return;
                    beginDrag(e, block.id);
                });

                layer.appendChild(el);
            });
        }

        function startInlineRename(id) {
            const block = blocks.find(b => b.id === id);
            if (!block || block.type === 'sticky') return;
            selectedId = id;
            inlineEditingId = id;
            renderAll();
        }

        /* =====================================================================
           CONTEXTUAL TOOLBAR UPDATES
           ===================================================================== */
        let contextLabelBeforeSnapshot = null;

        function updateContextBar() {
            const idleEl = document.getElementById('context-idle');
            const activeEl = document.getElementById('context-active');

            if (!selectedId) {
                idleEl.style.display = 'flex';
                activeEl.classList.remove('visible');
                return;
            }

            const block = blocks.find(b => b.id === selectedId);
            if (!block) {
                idleEl.style.display = 'flex';
                activeEl.classList.remove('visible');
                return;
            }

            idleEl.style.display = 'none';
            activeEl.classList.add('visible');

            const typeNames = {
                photo: 'Photo Block',
                headline: 'Headline',
                text: 'Body Copy',
                caption: 'Caption / Cutline',
                rule: 'Rule / Divider',
                sticky: 'Sticky Note'
            };

            document.getElementById('ctx-type').textContent = typeNames[block.type] || block.type;

            const labelWrapper = document.getElementById('ctx-label-wrapper');
            const labelInput = document.getElementById('ctx-label-input');

            if (block.type === 'sticky') {
                labelWrapper.style.display = 'none';
            } else {
                labelWrapper.style.display = 'flex';
                if (document.activeElement !== labelInput) {
                    labelInput.value = block.label;
                }
            }

            updateContextMetrics(block);
        }

        function updateContextMetrics(block) {
            const xPica = formatPica(block.x);
            const yPica = formatPica(block.y);
            const wPica = formatPica(block.w);
            const hPica = formatPica(block.h);
            const pctPageW = Math.round((block.w / SHEET_WIDTH) * 100);
            document.getElementById('ctx-metrics').textContent = `X: ${xPica}  Y: ${yPica}  |  W: ${wPica} (${pctPageW}%) × H: ${hPica}`;
        }

        function handleContextLabelInput(newVal) {
            if (!selectedId) return;
            const block = blocks.find(b => b.id === selectedId);
            if (!block || block.type === 'sticky') return;

            if (!contextLabelBeforeSnapshot) {
                contextLabelBeforeSnapshot = JSON.stringify(blocks);
            }
            block.label = newVal;
            renderCanvas();
        }

        document.addEventListener('DOMContentLoaded', () => {
            const ctxInput = document.getElementById('ctx-label-input');
            ctxInput.addEventListener('focus', () => {
                contextLabelBeforeSnapshot = JSON.stringify(blocks);
            });
            ctxInput.addEventListener('blur', () => {
                if (contextLabelBeforeSnapshot && contextLabelBeforeSnapshot !== JSON.stringify(blocks)) {
                    pushUndoState(contextLabelBeforeSnapshot);
                }
                contextLabelBeforeSnapshot = null;
            });
            ctxInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    ctxInput.blur();
                }
            });
        });

        /* =====================================================================
           POINTER DRAGGING & 8-HANDLE RESIZING
           ===================================================================== */
        function beginDrag(e, id) {
            e.stopPropagation();
            if (inlineEditingId && inlineEditingId !== id) {
                inlineEditingId = null;
            }

            selectedId = id;
            const block = blocks.find(b => b.id === id);
            if (!block) return;

            interaction = {
                mode: 'drag',
                id,
                startX: e.clientX,
                startY: e.clientY,
                origX: block.x,
                origY: block.y,
                preSnapshot: JSON.stringify(blocks),
                moved: false
            };

            renderAll();
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
        }

        function beginResize(e, id, handle) {
            e.stopPropagation();
            selectedId = id;
            const block = blocks.find(b => b.id === id);
            if (!block) return;

            interaction = {
                mode: 'resize',
                id,
                handle,
                startX: e.clientX,
                startY: e.clientY,
                origX: block.x,
                origY: block.y,
                origW: block.w,
                origH: block.h,
                preSnapshot: JSON.stringify(blocks),
                moved: false
            };

            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
        }

        function onPointerMove(e) {
            if (!interaction) return;
            const block = blocks.find(b => b.id === interaction.id);
            if (!block) return;

            const dx = (e.clientX - interaction.startX) / zoomLevel;
            const dy = (e.clientY - interaction.startY) / zoomLevel;

            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                interaction.moved = true;
            }

            if (interaction.mode === 'drag') {
                let nx = snapValue(interaction.origX + dx);
                let ny = snapValue(interaction.origY + dy);

                nx = Math.max(0, Math.min(SHEET_WIDTH - block.w, nx));
                ny = Math.max(0, Math.min(SHEET_HEIGHT - block.h, ny));

                block.x = nx;
                block.y = ny;
            } else if (interaction.mode === 'resize') {
                const minW = block.type === 'sticky' ? 132 : 36;
                const minH = block.type === 'rule' ? 12 : (block.type === 'sticky' ? 96 : 24);
                const h = interaction.handle;

                let newX = interaction.origX;
                let newY = interaction.origY;
                let newW = interaction.origW;
                let newH = interaction.origH;

                if (h.includes('e')) {
                    newW = snapValue(interaction.origW + dx);
                }
                if (h.includes('s')) {
                    newH = snapValue(interaction.origH + dy);
                }
                if (h.includes('w')) {
                    const proposedW = snapValue(interaction.origW - dx);
                    if (proposedW >= minW) {
                        newW = proposedW;
                        newX = interaction.origX + (interaction.origW - newW);
                    }
                }
                if (h.includes('n')) {
                    const proposedH = snapValue(interaction.origH - dy);
                    if (proposedH >= minH) {
                        newH = proposedH;
                        newY = interaction.origY + (interaction.origH - newH);
                    }
                }

                // Clamp within 45p × 60p sheet boundaries
                newX = Math.max(0, newX);
                newY = Math.max(0, newY);
                newW = Math.max(minW, Math.min(SHEET_WIDTH - newX, newW));
                newH = Math.max(minH, Math.min(SHEET_HEIGHT - newY, newH));

                block.x = newX;
                block.y = newY;
                block.w = newW;
                block.h = newH;
            }

            renderCanvas();
            updateContextMetrics(block);
        }

        function onPointerUp() {
            if (interaction && interaction.moved) {
                pushUndoState(interaction.preSnapshot);
            }
            interaction = null;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        }

        /* =====================================================================
           DESELECT & KEYBOARD SHORTCUTS
           ===================================================================== */
        function setupCanvasDeselect() {
            const scrollArea = document.getElementById('canvas-scroll-area');
            scrollArea.addEventListener('pointerdown', (e) => {
                if (
                    e.target === scrollArea ||
                    e.target.classList.contains('sheet-wrapper') ||
                    e.target.id === 'dummy-sheet' ||
                    e.target.id === 'canvas-layer'
                ) {
                    if (selectedId !== null || inlineEditingId !== null) {
                        selectedId = null;
                        inlineEditingId = null;
                        renderAll();
                    }
                }
            });
        }

        function setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                const activeTag = document.activeElement ? document.activeElement.tagName : '';
                const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

                // Undo: Ctrl/Cmd + Z
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !isTyping) {
                    e.preventDefault();
                    undo();
                    return;
                }

                // Duplicate: Ctrl/Cmd + D
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                    e.preventDefault();
                    if (selectedId && !isTyping) {
                        duplicateSelected();
                    }
                    return;
                }

                if (isTyping || !selectedId) return;

                // Delete / Backspace
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    deleteSelected();
                    return;
                }

                // Arrow key nudging (1px, or 12px / 1p with Shift)
                const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
                if (arrowKeys.includes(e.key)) {
                    e.preventDefault();
                    const block = blocks.find(b => b.id === selectedId);
                    if (!block) return;

                    pushUndoState();
                    const step = e.shiftKey ? PICA_PX : 1;
                    if (e.key === 'ArrowUp')    block.y = Math.max(0, block.y - step);
                    if (e.key === 'ArrowDown')  block.y = Math.min(SHEET_HEIGHT - block.h, block.y + step);
                    if (e.key === 'ArrowLeft')  block.x = Math.max(0, block.x - step);
                    if (e.key === 'ArrowRight') block.x = Math.min(SHEET_WIDTH - block.w, block.x + step);

                    renderAll();
                }
            });
        }

        /* =====================================================================
           EXPORT WIREFRAME CODE (SEMANTIC HTML5 + CSS, STICKY NOTES EXCLUDED)
           ===================================================================== */
        function openExportCodeModal() {
            const wireframeBlocks = blocks.filter(b => b.type !== 'sticky');
            const stickyCount = blocks.filter(b => b.type === 'sticky').length;

            const noticeText = document.getElementById('export-exclusion-text');
            if (stickyCount > 0) {
                noticeText.textContent = `${stickyCount} personal Sticky Note${stickyCount > 1 ? 's were' : ' was'} excluded so only your clean structural wireframe blocks appear in the code.`;
            } else {
                noticeText.textContent = 'Personal Sticky Notes are strictly excluded from exported HTML/CSS wireframe code.';
            }

            document.getElementById('wireframe-code-output').textContent = generateSemanticWireframeCode(wireframeBlocks);
            openModal('export-code-modal');
        }

        function generateSemanticWireframeCode(wireframeBlocks) {
            // Sort top-to-bottom, then left-to-right for clean semantic reading order
            const sorted = [...wireframeBlocks].sort((a, b) => (a.y - b.y) || (a.x - b.x));

            const elementsHTML = sorted.map((b) => {
                const leftPct = ((b.x / SHEET_WIDTH) * 100).toFixed(2);
                const topPct = ((b.y / SHEET_HEIGHT) * 100).toFixed(2);
                const widthPct = ((b.w / SHEET_WIDTH) * 100).toFixed(2);
                const heightPct = ((b.h / SHEET_HEIGHT) * 100).toFixed(2);
                const safeLabel = escapeHTML(b.label || b.type);
                const picaComment = `<!-- ${formatPica(b.w)} × ${formatPica(b.h)} -->`;

                if (b.type === 'headline') {
                    return `    ${picaComment}\n    <header class="wf-block wf-headline" style="left:${leftPct}%; top:${topPct}%; width:${widthPct}%; height:${heightPct}%;">\n      <h2>${safeLabel}</h2>\n    </header>`;
                }
                if (b.type === 'photo') {
                    return `    ${picaComment}\n    <figure class="wf-block wf-photo" style="left:${leftPct}%; top:${topPct}%; width:${widthPct}%; height:${heightPct}%;">\n      <span>${safeLabel}</span>\n    </figure>`;
                }
                if (b.type === 'text') {
                    return `    ${picaComment}\n    <article class="wf-block wf-copy" style="left:${leftPct}%; top:${topPct}%; width:${widthPct}%; height:${heightPct}%;">\n      <h3>${safeLabel}</h3>\n      <p>Portfolio body copy column placeholder...</p>\n    </article>`;
                }
                if (b.type === 'caption') {
                    return `    ${picaComment}\n    <figcaption class="wf-block wf-caption" style="left:${leftPct}%; top:${topPct}%; width:${widthPct}%; height:${heightPct}%;">\n      ${safeLabel}\n    </figcaption>`;
                }
                if (b.type === 'rule') {
                    return `    ${picaComment}\n    <hr class="wf-block wf-rule" style="left:${leftPct}%; top:${topPct}%; width:${widthPct}%; height:${heightPct}%;" aria-label="${safeLabel}">`;
                }
                return '';
            }).join('\n\n');

            return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>1965 Layout Dummy — Web Wireframe (45p × 60p)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f3ef;
      color: #2b2927;
      padding: 24px;
      display: flex;
      justify-content: center;
    }
    /* Proportional 45p × 60p Page Container */
    .wireframe-page {
      position: relative;
      width: 100%;
      max-width: 720px;
      aspect-ratio: 45 / 60;
      background: #ffffff;
      border: 2px solid #2b2927;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    }
    .wf-block {
      position: absolute;
      border: 1.5px solid #2b2927;
      padding: 0.6rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
    }
    .wf-photo {
      background: #eae6df;
      align-items: center;
      text-align: center;
      font-weight: 600;
      font-size: 0.85rem;
    }
    .wf-headline {
      align-items: center;
      text-align: center;
      font-family: Georgia, serif;
    }
    .wf-copy {
      justify-content: flex-start;
      gap: 0.4rem;
      font-size: 0.82rem;
    }
    .wf-caption {
      border-style: dashed;
      align-items: center;
      text-align: center;
      font-style: italic;
      font-size: 0.78rem;
    }
    .wf-rule {
      border: none;
      border-top: 2px solid #2b2927;
      padding: 0;
    }
  </style>
</head>
<body>
  <main class="wireframe-page">
${elementsHTML}
  </main>
</body>
</html>`;
        }

        function copyWireframeCode() {
            const code = document.getElementById('wireframe-code-output').textContent;
            const temp = document.createElement('textarea');
            temp.value = code;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
            showToast('Wireframe HTML/CSS code copied to clipboard');
        }

        function downloadWireframeHTML() {
            const code = document.getElementById('wireframe-code-output').textContent;
            const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `1965-wireframe-45x60p-${currentPresetKey}.html`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Downloaded wireframe .html file');
        }

        /* =====================================================================
           EXPORT PNG SNAPSHOT (2X HIGH-DPI: 1080px × 1440px)
           ===================================================================== */
        function openSnapshotModal() {
            refreshSnapshotPreview();
            openModal('snapshot-modal');
        }

        function refreshSnapshotPreview() {
            const includeStickies = document.getElementById('chk-include-sticky-png').checked;
            const dataUrl = renderSheetToOffscreenCanvas(includeStickies);
            document.getElementById('snapshot-preview-img').src = dataUrl;
        }

        function downloadSnapshotPNG() {
            const includeStickies = document.getElementById('chk-include-sticky-png').checked;
            const dataUrl = renderSheetToOffscreenCanvas(includeStickies);
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = '1965-layout-dummy-45x60p.png';
            a.click();
            closeModal('snapshot-modal');
            showToast('Downloaded 1965-layout-dummy-45x60p.png');
        }

        function renderSheetToOffscreenCanvas(includeStickies) {
            const scale = 2; // 2x high-DPI output (1080 × 1440)
            const canvas = document.getElementById('offscreen-canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = SHEET_WIDTH * scale;
            canvas.height = SHEET_HEIGHT * scale;

            ctx.save();
            ctx.scale(scale, scale);

            // 1. Aged 1965 Cream Newsprint Base
            ctx.fillStyle = '#f4efe4';
            ctx.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);

            // Outer border
            ctx.strokeStyle = '#cfc3ae';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(0.75, 0.75, SHEET_WIDTH - 1.5, SHEET_HEIGHT - 1.5);

            // 2. Pica Grid & 3p Margins (if enabled)
            if (showGuides) {
                // Minor 12px (1p) lines
                ctx.strokeStyle = 'rgba(84, 128, 164, 0.22)';
                ctx.lineWidth = 0.75;
                for (let x = 12; x < SHEET_WIDTH; x += 12) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, SHEET_HEIGHT);
                    ctx.stroke();
                }
                for (let y = 12; y < SHEET_HEIGHT; y += 12) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(SHEET_WIDTH, y);
                    ctx.stroke();
                }

                // Major 72px (6p) lines
                ctx.strokeStyle = 'rgba(68, 112, 148, 0.36)';
                ctx.lineWidth = 1;
                for (let x = 72; x < SHEET_WIDTH; x += 72) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, SHEET_HEIGHT);
                    ctx.stroke();
                }
                for (let y = 72; y < SHEET_HEIGHT; y += 72) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(SHEET_WIDTH, y);
                    ctx.stroke();
                }

                // Dashed 3p (36px) Margin Guides on all 4 sides
                ctx.save();
                ctx.setLineDash([5, 4]);
                ctx.strokeStyle = 'rgba(43, 41, 39, 0.38)';
                ctx.lineWidth = 1.25;
                ctx.strokeRect(36, 36, SHEET_WIDTH - 72, SHEET_HEIGHT - 72);
                ctx.restore();
            }

            // 3. Top Slug / Header Line
            ctx.fillStyle = 'rgba(43, 41, 39, 0.58)';
            ctx.font = '9.5px "Courier Prime", monospace';
            ctx.fillText('1965 YEARBOOK LAYOUT DUMMY • SINGLE SHEET 45p × 60p', 36, 20);
            ctx.textAlign = 'right';
            ctx.fillText('1p = 12px', SHEET_WIDTH - 36, 20);
            ctx.textAlign = 'left';

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(43, 41, 39, 0.2)';
            ctx.lineWidth = 1;
            ctx.moveTo(36, 24);
            ctx.lineTo(SHEET_WIDTH - 36, 24);
            ctx.stroke();

            // 4. Draw Blocks in Stacking Order
            blocks.forEach(b => {
                if (b.type === 'sticky' && !includeStickies) return;

                ctx.save();
                if (b.type === 'sticky') {
                    ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
                    ctx.rotate((-1.3 * Math.PI) / 180);
                    ctx.translate(-b.w / 2, -b.h / 2);

                    ctx.shadowColor = 'rgba(34, 26, 18, 0.28)';
                    ctx.shadowBlur = 12;
                    ctx.shadowOffsetY = 6;
                    ctx.fillStyle = '#fef08a';
                    ctx.fillRect(0, 0, b.w, b.h);

                    ctx.shadowColor = 'transparent';
                    ctx.strokeStyle = '#eab308';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(0, 0, b.w, b.h);

                    ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
                    ctx.fillRect(0, 0, b.w, 22);

                    ctx.fillStyle = '#422006';
                    ctx.font = '600 15px "Caveat", cursive';
                    wrapCanvasText(ctx, b.label || '', 10, 38, b.w - 20, 18);
                } else {
                    ctx.translate(b.x, b.y);
                    ctx.strokeStyle = '#2b2927';
                    ctx.lineWidth = 2;

                    if (b.type === 'photo') {
                        ctx.fillStyle = 'rgba(232, 224, 208, 0.74)';
                        ctx.fillRect(0, 0, b.w, b.h);
                        ctx.strokeRect(0, 0, b.w, b.h);

                        // Diagonal pencil X crosshairs
                        ctx.beginPath();
                        ctx.lineWidth = 1.4;
                        ctx.moveTo(0, 0);
                        ctx.lineTo(b.w, b.h);
                        ctx.moveTo(b.w, 0);
                        ctx.lineTo(0, b.h);
                        ctx.stroke();

                        const tagText = `${b.label || 'Photo Block'} (${formatPica(b.w)}×${formatPica(b.h)})`;
                        ctx.font = 'bold 10.5px "Courier Prime", monospace';
                        const tagW = Math.min(b.w - 12, ctx.measureText(tagText).width + 10);
                        ctx.fillStyle = 'rgba(244, 239, 228, 0.94)';
                        ctx.fillRect(6, 6, tagW, 17);
                        ctx.fillStyle = '#2b2927';
                        ctx.fillText(tagText, 10, 18, b.w - 18);
                    } else if (b.type === 'headline') {
                        ctx.fillStyle = 'rgba(244, 239, 228, 0.88)';
                        ctx.fillRect(0, 0, b.w, b.h);
                        ctx.strokeRect(0, 0, b.w, b.h);

                        const fontSize = Math.max(14, Math.min(28, Math.round(b.h * 0.44)));
                        ctx.fillStyle = '#2b2927';
                        ctx.font = `800 ${fontSize}px "Playfair Display", Georgia, serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(b.label || 'HEADLINE', b.w / 2, b.h / 2, b.w - 16);
                    } else if (b.type === 'text') {
                        ctx.fillStyle = 'rgba(248, 244, 235, 0.76)';
                        ctx.fillRect(0, 0, b.w, b.h);
                        ctx.strokeRect(0, 0, b.w, b.h);

                        ctx.fillStyle = '#2b2927';
                        ctx.font = 'bold 10.5px "Courier Prime", monospace';
                        ctx.fillText((b.label || 'BODY COPY').toUpperCase(), 8, 17, b.w - 16);

                        ctx.beginPath();
                        ctx.lineWidth = 1.4;
                        ctx.moveTo(8, 22);
                        ctx.lineTo(b.w - 8, 22);
                        ctx.stroke();

                        ctx.strokeStyle = 'rgba(43, 41, 39, 0.45)';
                        ctx.lineWidth = 1;
                        for (let ly = 33; ly < b.h - 8; ly += 11) {
                            ctx.beginPath();
                            ctx.moveTo(8, ly);
                            ctx.lineTo(b.w - 8, ly);
                            ctx.stroke();
                        }
                    } else if (b.type === 'caption') {
                        ctx.fillStyle = 'rgba(242, 236, 223, 0.85)';
                        ctx.fillRect(0, 0, b.w, b.h);
                        ctx.save();
                        ctx.setLineDash([5, 3]);
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(0, 0, b.w, b.h);
                        ctx.restore();

                        ctx.fillStyle = '#2b2927';
                        ctx.font = 'italic 11px "Courier Prime", monospace';
                        wrapCanvasText(ctx, b.label || 'Caption', 8, 16, b.w - 16, 14);
                    } else if (b.type === 'rule') {
                        const midY = b.h / 2;
                        ctx.beginPath();
                        ctx.lineWidth = 2;
                        ctx.moveTo(4, midY - 2);
                        ctx.lineTo(b.w - 4, midY - 2);
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.lineWidth = 1;
                        ctx.moveTo(4, midY + 2);
                        ctx.lineTo(b.w - 4, midY + 2);
                        ctx.stroke();
                    }
                }
                ctx.restore();
            });

            ctx.restore();
            return canvas.toDataURL('image/png');
        }

        function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
            const paragraphs = text.split('\n');
            let curY = y;
            paragraphs.forEach(p => {
                const words = p.split(' ');
                let line = '';
                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                        ctx.fillText(line.trim(), x, curY);
                        line = words[n] + ' ';
                        curY += lineHeight;
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line.trim(), x, curY);
                curY += lineHeight;
            });
        }

        /* =====================================================================
           MODAL & TOAST HELPERS
           ===================================================================== */
        function openModal(id) {
            document.getElementById(id).classList.add('open');
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('open');
        }

        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    backdrop.classList.remove('open');
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
            }
        });

        let toastTimer = null;
        function showToast(msg) {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.classList.add('show');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => {
                toast.classList.remove('show');
            }, 2600);
        }

        function escapeHTML(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }