/**
 * One PDF - Main Application Controller
 * Handles routing, tool catalog rendering, search filtering, workspace modal, and tool actions.
 */

document.addEventListener("DOMContentLoaded", () => {
  const toolsRegistry = window.OnePDF_Tools;
  const pdfEngine = window.OnePDF_PDFEngine;
  const ipynbEngine = window.OnePDF_IPYNBEngine;
  const aiEngine = window.OnePDF_AIEngine;

  // DOM Elements
  const toolsGrid = document.getElementById("toolsGrid");
  const searchInput = document.getElementById("toolSearchInput");
  const searchClearBtn = document.getElementById("searchClearBtn");
  const categoryPills = document.querySelectorAll(".cat-pill");
  const categoryTitle = document.getElementById("categoryHeading");
  const categoryCount = document.getElementById("categoryCount");

  // Tool Modal Elements
  const toolModalOverlay = document.getElementById("toolModalOverlay");
  const toolModalClose = document.getElementById("toolModalClose");
  const toolModalTitle = document.getElementById("toolModalTitle");
  const toolModalDesc = document.getElementById("toolModalDesc");
  const toolModalIcon = document.getElementById("toolModalIcon");
  const toolDropzone = document.getElementById("toolDropzone");
  const toolFileInput = document.getElementById("toolFileInput");
  const sampleFileBtn = document.getElementById("sampleFileBtn");
  const fileQueueSection = document.getElementById("fileQueueSection");
  const fileQueueList = document.getElementById("fileQueueList");
  const toolConfigPanel = document.getElementById("toolConfigPanel");
  const processBtn = document.getElementById("processBtn");
  const progressWrap = document.getElementById("processingProgressWrap");
  const progressBar = document.getElementById("progressBar");
  const progressStatus = document.getElementById("progressStatus");
  const progressPercent = document.getElementById("progressPercent");
  const toolResultSection = document.getElementById("toolResultSection");
  const resultDownloadBtn = document.getElementById("resultDownloadBtn");
  const resultPreviewBtn = document.getElementById("resultPreviewBtn");
  const startAgainBtn = document.getElementById("startAgainBtn");

  // State
  let currentCategory = "all";
  let currentTool = null;
  let selectedFiles = [];
  let processedResultBlob = null;
  let processedResultUrl = null;
  let currentNotebookData = null;

  // SVG Icons Helper
  const getIconSvg = (iconName) => {
    const icons = {
      notebook: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/><path d="M6 14h10"/><path d="M18 2v20"/></svg>`,
      merge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 6 4-4 4 4"/><path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22"/><path d="m20 22-5-5"/></svg>`,
      split: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="m12 12 9-9"/><path d="m12 12-9-9"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/><path d="m21 21-9-9"/><path d="m3 21 9-9"/></svg>`,
      "trash-2": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
      copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
      "rotate-cw": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>`,
      move: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/></svg>`,
      hash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>`,
      repeat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>`,
      "file-plus": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" x2="12" y1="18" y2="12"/><line x1="9" x2="15" y1="15" y2="15"/></svg>`,
      "minimize-2": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" x2="21" y1="10" y2="3"/><line x1="3" x2="10" y1="21" y2="14"/></svg>`,
      layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
      "eye-off": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`,
      tool: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
      archive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>`,
      image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
      images: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 22H4a2 2 0 0 1-2-2V6"/><rect width="16" height="16" x="6" y="2" rx="2"/><circle cx="12" cy="8" r="2"/><path d="m22 14-4-4-6 6"/></svg>`,
      "file-text": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`,
      table: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`,
      code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
      globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
      "align-left": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/></svg>`,
      stamp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 22h14"/><path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z"/><path d="M14 13V8.5C14 7.12 12.88 6 11.5 6S9 7.12 9 8.5V13"/></svg>`,
      "pen-tool": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`,
      "edit-2": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
      crop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>`,
      lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
      unlock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
      "git-diff": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/></svg>`,
      sparkles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
      "message-square": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
      search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>`
    };
    return icons[iconName] || icons.notebook;
  };

  // Toast Notification
  const showToast = (message, type = "info") => {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(20px)";
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  };

  // Update Category Navigation Pills with Dynamic Counts
  const updateCategoryPills = () => {
    categoryPills.forEach(pill => {
      const catId = pill.dataset.category;
      if (catId === "all") {
        pill.innerHTML = `All Tools <span class="pill-count-badge">(${toolsRegistry.DATABASE.length})</span>`;
      } else {
        const catObj = toolsRegistry.CATEGORIES.find(c => c.id === catId);
        const count = toolsRegistry.getByCategory(catId).length;
        const displayName = catObj ? catObj.name : catId;
        pill.innerHTML = `${displayName} <span class="pill-count-badge">(${count})</span>`;
      }
    });
  };

  // Render Tool Cards
  const renderTools = () => {
    const query = searchInput.value.trim();
    let tools = [];

    if (query) {
      tools = toolsRegistry.search(query);
      categoryTitle.textContent = `Search results for "${query}"`;
    } else {
      tools = toolsRegistry.getByCategory(currentCategory);
      const catObj = toolsRegistry.CATEGORIES.find(c => c.id === currentCategory);
      categoryTitle.textContent = catObj ? catObj.name : "All Tools";
    }

    categoryCount.textContent = `${tools.length} ${tools.length === 1 ? 'tool' : 'tools'} available`;
    toolsGrid.innerHTML = "";

    if (tools.length === 0) {
      toolsGrid.innerHTML = `
        <div class="no-results-card">
          <div class="no-results-icon">🔍</div>
          <h3>No matching tools found</h3>
          <p style="color: var(--text-muted); margin-top: 8px;">Try searching with different terms like "merge", "compress", or "notebook".</p>
        </div>
      `;
      return;
    }

    tools.forEach(tool => {
      const card = document.createElement("div");
      card.className = `tool-card ${tool.featured ? 'featured-card' : ''}`;
      card.onclick = () => openTool(tool.id);

      const badgeClass = tool.badge ? `badge-${tool.badge.toLowerCase().replace(/[^a-z]/g, '')}` : '';

      card.innerHTML = `
        <div class="card-top-row">
          <div class="tool-icon-box">
            ${getIconSvg(tool.icon)}
          </div>
          ${tool.badge ? `<span class="card-badge ${badgeClass}">${tool.badge}</span>` : ''}
        </div>
        <div class="tool-info">
          <h3 class="tool-card-title">${tool.name}</h3>
          <p class="tool-card-desc">${tool.description}</p>
        </div>
        <div class="card-action-row">
          <span class="tool-cat-label">${tool.category}</span>
          <span class="btn-use-tool">Use Tool &rarr;</span>
        </div>
      `;
      toolsGrid.appendChild(card);
    });
  };

  // Open Tool Workspace Modal
  const openTool = (toolId) => {
    const tool = toolsRegistry.getToolById(toolId);
    if (!tool) return;

    currentTool = tool;
    selectedFiles = [];
    processedResultBlob = null;
    processedResultUrl = null;
    currentNotebookData = null;

    toolModalTitle.textContent = tool.name;
    toolModalDesc.textContent = tool.description;
    toolModalIcon.innerHTML = getIconSvg(tool.icon);

    // Dropzone configuration
    toolFileInput.accept = tool.accept || "*";
    toolFileInput.multiple = !!tool.multiple;

    // Reset UI states
    resetToolUI();
    buildToolConfig(tool);

    toolModalOverlay.classList.add("active");
    document.body.style.overflow = "hidden";

    if (window.location.pathname !== "/" + toolId && !window.location.hash.includes(toolId)) {
      try {
        history.pushState({ toolId }, "", "/" + toolId);
      } catch (e) {
        window.location.hash = "#/" + toolId;
      }
    }
  };

  // Close Tool Modal
  const closeTool = () => {
    toolModalOverlay.classList.remove("active");
    document.body.style.overflow = "";
    if (processedResultUrl) {
      URL.revokeObjectURL(processedResultUrl);
      processedResultUrl = null;
    }
    if (window.location.pathname !== "/") {
      try {
        history.pushState(null, "", "/");
      } catch (e) {
        window.location.hash = "";
      }
    }
  };

  const resetToolUI = () => {
    fileQueueSection.style.display = "none";
    fileQueueList.innerHTML = "";
    progressWrap.style.display = "none";
    toolResultSection.classList.remove("active");
    processBtn.disabled = false;
    processBtn.innerHTML = `<span>Process Document</span> &rarr;`;
    if (currentTool) {
      processBtn.textContent = currentTool.actionType === "ipynb-to-pdf" ? "Convert Notebook to PDF" : `Process with ${currentTool.name}`;
    }
  };

  // Build Options Panel Dynamically
  const buildToolConfig = (tool) => {
    toolConfigPanel.innerHTML = "";

    // Show/hide sample file button
    if (tool.actionType === "ipynb-to-pdf" || tool.accept.includes(".pdf")) {
      sampleFileBtn.style.display = "inline-flex";
      sampleFileBtn.innerHTML = `✨ Load Sample ${tool.actionType === "ipynb-to-pdf" ? "Notebook" : "PDF"}`;
    } else {
      sampleFileBtn.style.display = "none";
    }

    if (tool.actionType === "ipynb-to-pdf") {
      toolConfigPanel.innerHTML = `
        <div id="ipynbInspectContainer" style="display: none;"></div>
        <div class="config-section-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Notebook Conversion Settings</div>
        
        <div class="config-group" style="margin-bottom: 14px;">
          <label class="config-label">Execution Mode</label>
          <select class="config-select" id="nbOptMode">
            <option value="export_existing" selected>Mode 1: Export Existing Outputs (Safe & Instant)</option>
            <option value="run_and_export">Mode 2: Run Notebook & Export (Isolated Sandbox)</option>
          </select>
        </div>

        <div class="config-grid">
          <label class="config-checkbox-label">
            <input type="checkbox" id="nbOptCode" checked> Include Code
          </label>
          <label class="config-checkbox-label">
            <input type="checkbox" id="nbOptOutput" checked> Include Outputs
          </label>
          <label class="config-checkbox-label">
            <input type="checkbox" id="nbOptImages" checked> Include Images & Plots
          </label>
          <label class="config-checkbox-label">
            <input type="checkbox" id="nbOptExecNumbers" checked> Include In [n] / Out [n] Labels
          </label>
          <label class="config-checkbox-label">
            <input type="checkbox" id="nbOptHighlight" checked> Syntax Highlighting
          </label>
          <label class="config-checkbox-label">
            <input type="checkbox" id="nbOptToc"> Table of Contents
          </label>
          <div class="config-group">
            <label class="config-label">Page Size</label>
            <select class="config-select" id="nbOptPageSize">
              <option value="A4" selected>A4 (210 x 297 mm)</option>
              <option value="Letter">Letter (8.5 x 11 in)</option>
            </select>
          </div>
          <div class="config-group">
            <label class="config-label">Orientation</label>
            <select class="config-select" id="nbOptOrientation">
              <option value="portrait" selected>Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
          <div class="config-group">
            <label class="config-label">Page Margins</label>
            <select class="config-select" id="nbOptMargins">
              <option value="normal" selected>Normal (18mm)</option>
              <option value="small">Small (14mm)</option>
              <option value="large">Large (24mm)</option>
            </select>
          </div>
        </div>

        <div id="ipynbPreviewSection" style="margin-top: 24px; display: none;">
          <div class="preview-header-bar">
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">📖 REAL-TIME HIGH-FIDELITY NOTEBOOK PREVIEW</div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Updates in real time</span>
          </div>
          <div class="preview-container-box" id="ipynbPreviewBox"></div>
        </div>
      `;

      // Live change listener for notebook preview
      const rerenderPreview = () => {
        if (!currentNotebookData) return;
        const fname = selectedFiles && selectedFiles.length > 0 ? selectedFiles[0].name : "IPCV PRGMS.ipynb";
        const options = {
          includeCode: document.getElementById("nbOptCode").checked,
          includeOutput: document.getElementById("nbOptOutput").checked,
          includeImages: document.getElementById("nbOptImages").checked,
          includeExecutionNumbers: document.getElementById("nbOptExecNumbers").checked,
          syntaxHighlighting: document.getElementById("nbOptHighlight").checked,
          includeToc: document.getElementById("nbOptToc").checked,
          pageSize: document.getElementById("nbOptPageSize").value,
          orientation: document.getElementById("nbOptOrientation").value,
          margins: document.getElementById("nbOptMargins").value
        };
        const previewHtml = ipynbEngine.renderPreview(currentNotebookData, options, fname);
        const box = document.getElementById("ipynbPreviewBox");
        if (box) box.innerHTML = previewHtml;
      };

      ["nbOptMode", "nbOptCode", "nbOptOutput", "nbOptImages", "nbOptExecNumbers", "nbOptHighlight", "nbOptToc", "nbOptPageSize", "nbOptOrientation", "nbOptMargins"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", rerenderPreview);
      });
    } else if (tool.actionType === "watermark") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Watermark Settings</div>
        <div class="config-grid">
          <div class="config-group">
            <label class="config-label">Watermark Text</label>
            <input type="text" class="config-input" id="watermarkText" value="CONFIDENTIAL" placeholder="e.g. DRAFT, COPY, SECRET" />
          </div>
          <div class="config-group">
            <label class="config-label">Rotation Angle</label>
            <select class="config-select" id="watermarkAngle">
              <option value="45" selected>Diagonal (45°)</option>
              <option value="0">Horizontal (0°)</option>
              <option value="-45">Reverse Diagonal (-45°)</option>
            </select>
          </div>
          <div class="config-group">
            <label class="config-label">Opacity Level</label>
            <select class="config-select" id="watermarkOpacity">
              <option value="0.15">Subtle (15%)</option>
              <option value="0.25" selected>Standard (25%)</option>
              <option value="0.5">Prominent (50%)</option>
              <option value="0.8">Opaque (80%)</option>
            </select>
          </div>
          <div class="config-group">
            <label class="config-label">Font Size</label>
            <select class="config-select" id="watermarkFontSize">
              <option value="36">Medium (36pt)</option>
              <option value="48" selected>Large (48pt)</option>
              <option value="64">Extra Large (64pt)</option>
            </select>
          </div>
        </div>
      `;
    } else if (tool.actionType === "page-numbers") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Page Numbering Options</div>
        <div class="config-grid">
          <div class="config-group">
            <label class="config-label">Number Format</label>
            <select class="config-select" id="pageNumFormat">
              <option value="Page {n} of {total}" selected>Page {n} of {total}</option>
              <option value="{n} of {total}">{n} of {total}</option>
              <option value="{n}">Single Number ({n})</option>
              <option value="- {n} -">- {n} -</option>
            </select>
          </div>
          <div class="config-group">
            <label class="config-label">Position</label>
            <select class="config-select" id="pageNumPos">
              <option value="bottom-center" selected>Bottom Center</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="top-right">Top Right</option>
              <option value="top-center">Top Center</option>
            </select>
          </div>
          <div class="config-group">
            <label class="config-label">Font Size</label>
            <select class="config-select" id="pageNumSize">
              <option value="9">Small (9pt)</option>
              <option value="11" selected>Medium (11pt)</option>
              <option value="13">Large (13pt)</option>
            </select>
          </div>
        </div>
      `;
    } else if (tool.actionType === "split") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Split Ranges</div>
        <div class="config-group">
          <label class="config-label">Enter Page Ranges to Extract</label>
          <input type="text" class="config-input" id="splitPageRanges" value="1" placeholder="e.g. 1-2, 4, 5-8" />
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Separate ranges with commas. Example: "1-3, 5" exports pages 1, 2, 3, and 5.</span>
        </div>
      `;
    } else if (tool.actionType === "compress") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Compression Level</div>
        <div class="config-grid">
          <div class="config-group">
            <label class="config-label">Preset Mode</label>
            <select class="config-select" id="compressLevel">
              <option value="medium" selected>Recommended (Good Balance of Quality & Size)</option>
              <option value="high">High Compression (Maximum Size Reduction)</option>
              <option value="low">Low Compression (Highest Visual Quality)</option>
            </select>
          </div>
        </div>
      `;
    } else if (tool.actionType === "protect") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Security & Encryption</div>
        <div class="config-grid">
          <div class="config-group">
            <label class="config-label">Set Document Password</label>
            <input type="password" class="config-input" id="protectPassword" placeholder="Enter strong password..." />
          </div>
        </div>
      `;
    } else if (tool.actionType === "unlock") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Unlock Document</div>
        <div class="config-group">
          <label class="config-label">Document Password</label>
          <input type="password" class="config-input" id="unlockPassword" placeholder="Enter current document password..." />
        </div>
      `;
    } else if (tool.actionType === "rotate") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Rotation Angle</div>
        <div class="config-grid">
          <div class="config-group">
            <label class="config-label">Rotate Direction</label>
            <select class="config-select" id="rotateDegrees">
              <option value="90" selected>90° Clockwise</option>
              <option value="180">180° Upside Down</option>
              <option value="270">270° Counter-Clockwise</option>
            </select>
          </div>
        </div>
      `;
    } else if (tool.actionType === "sign") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Signature Studio</div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">Draw your signature in the box below using your mouse, trackpad, or touch screen:</p>
        <div class="sig-canvas-wrap">
          <canvas id="sigCanvas" width="500" height="180"></canvas>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
          <button type="button" class="btn btn-outline" id="clearSigBtn" style="padding: 6px 12px; font-size: 0.82rem;">Clear Signature</button>
        </div>
      `;

      // Set up signature canvas drawing
      setTimeout(() => {
        const canvas = document.getElementById("sigCanvas");
        const clearBtn = document.getElementById("clearSigBtn");
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          let drawing = false;
          const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
              x: (clientX - rect.left) * (canvas.width / rect.width),
              y: (clientY - rect.top) * (canvas.height / rect.height)
            };
          };

          const start = (e) => {
            drawing = true;
            const pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            e.preventDefault();
          };
          const move = (e) => {
            if (!drawing) return;
            const pos = getPos(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            e.preventDefault();
          };
          const stop = () => { drawing = false; };

          canvas.addEventListener("mousedown", start);
          canvas.addEventListener("mousemove", move);
          window.addEventListener("mouseup", stop);
          canvas.addEventListener("touchstart", start, { passive: false });
          canvas.addEventListener("touchmove", move, { passive: false });
          canvas.addEventListener("touchend", stop);

          clearBtn.onclick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          };
        }
      }, 50);
    } else if (tool.actionType === "ai-summarize" || tool.actionType === "ai-qa") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">AI Document Intelligence</div>
        <div id="aiSummaryOutput" style="display: none; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-top: 12px;"></div>
        <div id="aiQaChatBox" style="display: ${tool.actionType === 'ai-qa' ? 'block' : 'none'}; margin-top: 16px;">
          <div class="config-group">
            <label class="config-label">Ask a Question About Your Document:</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" class="config-input" id="aiQueryInput" placeholder="e.g. What are the key findings? What is the main conclusion?" style="flex-grow: 1;" />
              <button type="button" class="btn btn-primary" id="aiAskBtn" style="padding: 9px 18px;">Ask</button>
            </div>
          </div>
          <div id="aiAnswerResponse" style="margin-top: 14px; padding: 14px; background: white; border: 1px solid #c7d2fe; border-radius: 8px; font-size: 0.9rem; display: none;"></div>
        </div>
      `;
      setTimeout(() => {
        const askBtn = document.getElementById("aiAskBtn");
        if (askBtn) {
          askBtn.onclick = async () => {
            const query = document.getElementById("aiQueryInput").value;
            const respBox = document.getElementById("aiAnswerResponse");
            if (!query || selectedFiles.length === 0) {
              showToast("Please upload a document and enter a question.", "error");
              return;
            }
            respBox.style.display = "block";
            respBox.innerHTML = "<em>Analyzing document with AI...</em>";
            try {
              const fullText = await pdfEngine.extractText(selectedFiles[0]);
              const res = await fetch("/api/ai/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ document_text: fullText, question: query })
              });
              if (res.ok) {
                const data = await res.json();
                respBox.innerHTML = `<strong>Answer:</strong><br><br>${data.answer.replace(/\n/g, '<br>')}`;
              } else {
                const fallbackAns = aiEngine.answerQuestion(fullText, query);
                respBox.innerHTML = `<strong>Answer:</strong><br><br>${fallbackAns.replace(/\n/g, '<br>')}`;
              }
            } catch (e) {
              respBox.innerHTML = `<strong>Error:</strong> ${e.message}`;
            }
          };
        }
      }, 50);
    } else if (tool.actionType === "delete-pages") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Remove Pages</div>
        <div class="config-group">
          <label class="config-label">Page Numbers to Remove</label>
          <input type="text" class="config-input" id="deletePageIndices" placeholder="e.g. 2, 4, 7" />
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Separate 1-based page numbers with commas.</span>
        </div>
      `;
    } else if (tool.actionType === "extract-pages") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Extract Pages</div>
        <div class="config-group">
          <label class="config-label">Page Range to Extract</label>
          <input type="text" class="config-input" id="extractPageRanges" value="1-2" placeholder="e.g. 1-3, 5" />
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Selected pages will be extracted into a brand new PDF file.</span>
        </div>
      `;
    } else if (tool.actionType === "reorder") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Reorder Pages</div>
        <div class="config-group">
          <label class="config-label">New Page Sequence (1-based)</label>
          <input type="text" class="config-input" id="reorderSequence" placeholder="e.g. 3, 1, 2" />
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Leave blank to reverse page order automatically.</span>
        </div>
      `;
    } else if (tool.actionType === "duplicate") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Duplicate Pages</div>
        <div class="config-grid">
          <div class="config-group">
            <label class="config-label">Page Number to Clone</label>
            <input type="number" class="config-input" id="dupPageNum" value="1" min="1" />
          </div>
          <div class="config-group">
            <label class="config-label">Repetition Count</label>
            <input type="number" class="config-input" id="dupCount" value="1" min="1" max="10" />
          </div>
        </div>
      `;
    } else if (tool.actionType === "blank") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Blank PDF Configuration</div>
        <div class="config-grid">
          <div class="config-group">
            <label class="config-label">Number of Pages</label>
            <input type="number" class="config-input" id="blankPageCount" value="1" min="1" max="50" />
          </div>
          <div class="config-group">
            <label class="config-label">Paper Style</label>
            <select class="config-select" id="blankPaperStyle">
              <option value="blank" selected>Clean Blank Paper</option>
              <option value="lined">Ruled / Lined Notebook</option>
            </select>
          </div>
        </div>
      `;
    } else if (tool.actionType === "crop") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Crop Margins</div>
        <div class="config-group">
          <label class="config-label">Margin Trim Ratio</label>
          <select class="config-select" id="cropRatio">
            <option value="0.05" selected>Standard Trim (5% Margins)</option>
            <option value="0.10">Deep Trim (10% Margins)</option>
            <option value="0.15">Aggressive Trim (15% Margins)</option>
          </select>
        </div>
      `;
    } else if (tool.actionType === "redact") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Redaction Settings</div>
        <div class="config-row">
          <label class="config-label">Keywords or Terms to Redact (comma-separated)</label>
          <input type="text" class="config-input" id="redactKeywords" placeholder="e.g. Confidential, John Doe, 555-0199, SSN" />
          <p style="font-size:0.75rem;color:#64748b;margin-top:6px;">All matching text occurrences across all pages will be permanently blacked out and scrubbed.</p>
        </div>
      `;
    } else if (tool.actionType === "header-footer") {
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">Header & Footer Settings</div>
        <div class="config-row">
          <label class="config-label">Header Text (Top of Page)</label>
          <input type="text" class="config-input" id="headerTextInput" placeholder="e.g. Confidential Report • {page} of {total}" />
        </div>
        <div class="config-row" style="margin-top:10px;">
          <label class="config-label">Footer Text (Bottom of Page)</label>
          <input type="text" class="config-input" id="footerTextInput" placeholder="e.g. One PDF • All Rights Reserved" />
          <p style="font-size:0.75rem;color:#64748b;margin-top:6px;">Tip: Use {page} and {total} for automatic page numbering.</p>
        </div>
      `;
    } else if (["flatten", "remove-metadata", "repair", "pdfa", "extract-images", "extract-text", "pdf-to-word", "pdf-to-excel", "pdf-to-markdown", "word-to-pdf", "excel-to-pdf", "pptx-to-pdf", "txt-to-pdf", "html-to-pdf", "ocr"].includes(tool.actionType)) {
      const descriptions = {
        "flatten": "Flattens interactive form fields, checkboxes, and annotations permanently into base page content.",
        "remove-metadata": "Strips confidential author names, software tools, creation timestamps, and tracking tags.",
        "repair": "Rebuilds damaged cross-reference catalogs, repairs corrupt streams, and optimizes page trees.",
        "pdfa": "Converts document to PDF/A compliant format suitable for long-term legal archiving.",
        "extract-images": "Extracts all embedded photographs, diagrams, and figures into an organized ZIP bundle.",
        "extract-text": "Pulls all readable text from the document into a clean, searchable plain-text (.txt) file.",
        "pdf-to-word": "Transforms PDF text and table structure into an editable Word document (.docx).",
        "pdf-to-excel": "Extracts tables and tabular figures from PDF pages directly into an editable Excel spreadsheet (.xlsx).",
        "pdf-to-markdown": "Extracts document content and formats it into clean, structured Markdown headings and lists.",
        "word-to-pdf": "Converts Microsoft Word (.docx) document into high-fidelity PDF with headers and footers.",
        "excel-to-pdf": "Converts spreadsheet worksheets and tables (.xlsx, .csv) into clean landscape PDF pages.",
        "pptx-to-pdf": "Converts PowerPoint presentation (.pptx) slides into a clean landscape PDF presentation deck.",
        "txt-to-pdf": "Converts raw plain text files into paginated, publication-grade PDF documents.",
        "html-to-pdf": "Renders HTML code and web stylesheets into pixel-perfect PDF pages.",
        "ocr": "Runs Optical Character Recognition (OCR) to convert scanned images into selectable text."
      };
      toolConfigPanel.innerHTML = `
        <div class="config-section-title">${tool.name} Settings</div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 0.9rem; color: #475569; line-height: 1.5;">
          ${descriptions[tool.actionType] || tool.description}
        </div>
      `;
    }
  };

  // Load Sample Files
  sampleFileBtn.addEventListener("click", async () => {
    if (!currentTool) return;
    try {
      if (currentTool.actionType === "ipynb-to-pdf") {
        showToast("Loading reference notebook (IPCV PRGMS)...", "info");
        const res = await fetch("assets/samples/IPCV_PRGMS.ipynb");
        const nbJson = await res.json();
        const nbBlob = new Blob([JSON.stringify(nbJson)], { type: "application/json" });
        const sampleFile = new File([nbBlob], "IPCV PRGMS.ipynb", { type: "application/json" });
        handleFilesSelected([sampleFile]);
      } else {
        showToast("Loading sample PDF...", "info");
        const res = await fetch("assets/samples/sample.pdf");
        const pdfBlob = await res.blob();
        const sampleFile = new File([pdfBlob], "sample_document.pdf", { type: "application/pdf" });
        handleFilesSelected([sampleFile]);
      }
    } catch (e) {
      showToast(`Failed to load sample: ${e.message}`, "error");
    }
  });

  // Drag and Drop Listeners
  toolDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    toolDropzone.classList.add("dragover");
  });
  toolDropzone.addEventListener("dragleave", () => {
    toolDropzone.classList.remove("dragover");
  });
  toolDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    toolDropzone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  });
  toolDropzone.addEventListener("click", (e) => {
    if (e.target.closest("#sampleFileBtn")) return;
    toolFileInput.click();
  });
  toolFileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
    }
  });



  // Handle Uploaded Files
  const handleFilesSelected = async (files) => {
    if (!currentTool) return;

    if (currentTool.multiple) {
      selectedFiles = [...selectedFiles, ...files];
    } else {
      selectedFiles = [files[0]];
    }

    renderFileQueue();

    // Special inspection for IPYNB
    if (currentTool.actionType === "ipynb-to-pdf" && selectedFiles.length > 0) {
      try {
        const file = selectedFiles[0];
        const text = await file.text();
        const notebook = ipynbEngine.parseNotebook(text);
        currentNotebookData = notebook;

        const info = ipynbEngine.inspect(notebook);
        const inspectContainer = document.getElementById("ipynbInspectContainer");
        if (inspectContainer) {
          inspectContainer.style.display = "grid";
          inspectContainer.className = "ipynb-inspect-card";
          inspectContainer.innerHTML = `
            <div class="inspect-stat-item">
              <span class="inspect-stat-num">${info.totalCells}</span>
              <span class="inspect-stat-lbl">Total Cells</span>
            </div>
            <div class="inspect-stat-item">
              <span class="inspect-stat-num">${info.codeCells}</span>
              <span class="inspect-stat-lbl">Code Cells</span>
            </div>
            <div class="inspect-stat-item">
              <span class="inspect-stat-num">${info.markdownCells}</span>
              <span class="inspect-stat-lbl">Markdown Cells</span>
            </div>
            <div class="inspect-stat-item">
              <span class="inspect-stat-num">${info.outputsCount}</span>
              <span class="inspect-stat-lbl">Outputs & Plots</span>
            </div>
            <div class="inspect-stat-item">
              <span class="inspect-stat-num" style="font-size: 1.1rem; padding-top: 4px;">${info.language}</span>
              <span class="inspect-stat-lbl">Kernel: ${info.kernelName}</span>
            </div>
          `;
        }

        // Show and render live preview
        const previewSec = document.getElementById("ipynbPreviewSection");
        if (previewSec) {
          previewSec.style.display = "block";
          const options = {
            includeCode: document.getElementById("nbOptCode").checked,
            includeOutput: document.getElementById("nbOptOutput").checked,
            includeImages: document.getElementById("nbOptImages").checked,
            includeExecutionNumbers: document.getElementById("nbOptExecNumbers").checked,
            syntaxHighlighting: document.getElementById("nbOptHighlight").checked,
            includeToc: document.getElementById("nbOptToc").checked,
            pageSize: document.getElementById("nbOptPageSize").value,
            orientation: document.getElementById("nbOptOrientation").value,
            margins: document.getElementById("nbOptMargins").value
          };
          const previewHtml = ipynbEngine.renderPreview(notebook, options, file.name);
          document.getElementById("ipynbPreviewBox").innerHTML = previewHtml;
        }

        showToast("Jupyter Notebook parsed successfully!", "success");
      } catch (err) {
        showToast(`Notebook parsing error: ${err.message}`, "error");
      }
    }
  };

  const renderFileQueue = () => {
    if (selectedFiles.length === 0) {
      fileQueueSection.style.display = "none";
      fileQueueList.innerHTML = "";
      return;
    }

    fileQueueSection.style.display = "block";
    fileQueueList.innerHTML = "";

    selectedFiles.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "file-queue-item";
      const sizeKb = (file.size / 1024).toFixed(1);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const displaySize = file.size > 1048576 ? `${sizeMb} MB` : `${sizeKb} KB`;

      item.innerHTML = `
        <div class="file-item-left">
          <span class="file-item-icon">${getIconSvg(currentTool ? currentTool.icon : 'file-text')}</span>
          <div>
            <div class="file-item-name" title="${file.name}">${file.name}</div>
            <div class="file-item-size">${displaySize}</div>
          </div>
        </div>
        <div class="file-item-actions">
          ${currentTool && currentTool.multiple && index > 0 ? `<button type="button" class="file-btn-sm" onclick="moveFile(${index}, -1)" title="Move Up">↑</button>` : ''}
          ${currentTool && currentTool.multiple && index < selectedFiles.length - 1 ? `<button type="button" class="file-btn-sm" onclick="moveFile(${index}, 1)" title="Move Down">↓</button>` : ''}
          <button type="button" class="file-btn-sm btn-delete" onclick="removeFile(${index})" title="Remove">✕</button>
        </div>
      `;
      fileQueueList.appendChild(item);
    });
  };

  // Reordering helpers exposed to window for inline onclicks
  window.moveFile = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= selectedFiles.length) return;
    const temp = selectedFiles[index];
    selectedFiles[index] = selectedFiles[target];
    selectedFiles[target] = temp;
    renderFileQueue();
  };

  window.removeFile = (index) => {
    selectedFiles.splice(index, 1);
    renderFileQueue();
  };

  // Process Tool Execution Action
  processBtn.addEventListener("click", async () => {
    if (!currentTool) return;
    if (selectedFiles.length === 0) {
      showToast("Please upload a document first.", "error");
      return;
    }

    try {
      processBtn.disabled = true;
      progressWrap.style.display = "block";
      toolResultSection.classList.remove("active");

      const updateProgress = (pct, text) => {
        progressBar.style.width = `${pct}%`;
        progressPercent.textContent = `${Math.round(pct)}%`;
        progressStatus.textContent = text;
      };

      const primaryFile = selectedFiles[0];
      let resultBlob = null;
      if (currentTool.actionType === "ipynb-to-pdf") {
        downloadFilename = primaryFile.name.replace(/\.ipynb$/i, ".pdf");
        updateProgress(20, "Preparing notebook conversion options...");
        const executionMode = document.getElementById("nbOptMode").value;
        const options = {
          executionMode: executionMode,
          includeCode: document.getElementById("nbOptCode").checked,
          includeOutput: document.getElementById("nbOptOutput").checked,
          includeImages: document.getElementById("nbOptImages").checked,
          includeExecutionNumbers: document.getElementById("nbOptExecNumbers").checked,
          syntaxHighlighting: document.getElementById("nbOptHighlight").checked,
          includeToc: document.getElementById("nbOptToc").checked,
          pageSize: document.getElementById("nbOptPageSize").value,
          orientation: document.getElementById("nbOptOrientation").value,
          margins: document.getElementById("nbOptMargins").value,
          filename: downloadFilename
        };

        if (executionMode === "run_and_export") {
          updateProgress(35, "Running notebook code inside secure isolated sandbox...");
        } else {
          updateProgress(40, "Compiling notebook cells and outputs...");
        }

        const formData = new FormData();
        formData.append("file", primaryFile);
        formData.append("execution_mode", options.executionMode);
        formData.append("include_code", options.includeCode);
        formData.append("include_output", options.includeOutput);
        formData.append("include_execution_numbers", options.includeExecutionNumbers);
        formData.append("include_images", options.includeImages);
        formData.append("syntax_highlighting", options.syntaxHighlighting);
        formData.append("include_toc", options.includeToc);
        formData.append("page_size", options.pageSize);
        formData.append("orientation", options.orientation);
        formData.append("margins", options.margins);

        updateProgress(65, "Rendering publication-grade PDF with One PDF engine...");
        const res = await fetch("/api/ipynb/convert-pdf", { method: "POST", body: formData });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ detail: "Conversion failed" }));
          throw new Error(errData.detail || "PDF conversion failed");
        }
        updateProgress(90, "Finalizing vector document...");
        resultBlob = await res.blob();
      }
      // 2. MERGE PDF
      else if (currentTool.actionType === "merge") {
        if (selectedFiles.length < 2) {
          throw new Error("Please add at least 2 PDF files to merge.");
        }
        downloadFilename = "merged_document.pdf";
        resultBlob = await pdfEngine.mergePDFs(selectedFiles, updateProgress);
      }
      // 3. SPLIT PDF
      else if (currentTool.actionType === "split") {
        const ranges = document.getElementById("splitPageRanges").value;
        downloadFilename = `split_${primaryFile.name}`;
        resultBlob = await pdfEngine.splitPDF(primaryFile, ranges, updateProgress);
      }
      // 4. WATERMARK PDF
      else if (currentTool.actionType === "watermark") {
        const text = document.getElementById("watermarkText").value || "CONFIDENTIAL";
        const opacity = parseFloat(document.getElementById("watermarkOpacity").value);
        const fontSize = parseInt(document.getElementById("watermarkFontSize").value, 10);
        const angle = parseInt(document.getElementById("watermarkAngle").value, 10);
        downloadFilename = `watermarked_${primaryFile.name}`;
        resultBlob = await pdfEngine.addWatermark(primaryFile, { text, opacity, fontSize, angle }, updateProgress);
      }
      // 5. PAGE NUMBERING
      else if (currentTool.actionType === "page-numbers") {
        const format = document.getElementById("pageNumFormat").value;
        const position = document.getElementById("pageNumPos").value;
        const fontSize = parseInt(document.getElementById("pageNumSize").value, 10);
        downloadFilename = `numbered_${primaryFile.name}`;
        resultBlob = await pdfEngine.addPageNumbers(primaryFile, { format, position, fontSize }, updateProgress);
      }
      // 6. ROTATE PDF
      else if (currentTool.actionType === "rotate") {
        const degrees = parseInt(document.getElementById("rotateDegrees").value, 10);
        downloadFilename = `rotated_${primaryFile.name}`;
        resultBlob = await pdfEngine.rotatePDF(primaryFile, degrees, null, updateProgress);
      }
      // 7. COMPRESS PDF
      else if (currentTool.actionType === "compress") {
        const quality = document.getElementById("compressLevel").value;
        downloadFilename = `compressed_${primaryFile.name}`;
        try {
          const formData = new FormData();
          formData.append("file", primaryFile);
          formData.append("quality", quality);
          const res = await fetch("/api/pdf/compress", { method: "POST", body: formData });
          if (res.ok) {
            resultBlob = await res.blob();
          } else {
            // Client-side fallback
            resultBlob = await pdfEngine.rotatePDF(primaryFile, 0, null, updateProgress);
          }
        } catch (e) {
          resultBlob = await pdfEngine.rotatePDF(primaryFile, 0, null, updateProgress);
        }
      }
      // 8. PROTECT PDF
      else if (currentTool.actionType === "protect") {
        const pwd = document.getElementById("protectPassword").value;
        if (!pwd) throw new Error("Please provide an encryption password.");
        downloadFilename = `protected_${primaryFile.name}`;
        const formData = new FormData();
        formData.append("file", primaryFile);
        formData.append("password", pwd);
        const res = await fetch("/api/pdf/protect", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Failed to encrypt document.");
        resultBlob = await res.blob();
      }
      // 9. UNLOCK PDF
      else if (currentTool.actionType === "unlock") {
        const pwd = document.getElementById("unlockPassword").value;
        if (!pwd) throw new Error("Please enter password to unlock.");
        downloadFilename = `unlocked_${primaryFile.name}`;
        const formData = new FormData();
        formData.append("file", primaryFile);
        formData.append("password", pwd);
        const res = await fetch("/api/pdf/unlock", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Incorrect password or unlock failed.");
        resultBlob = await res.blob();
      }
      // 10. SIGN PDF
      else if (currentTool.actionType === "sign") {
        const canvas = document.getElementById("sigCanvas");
        const sigDataUrl = canvas.toDataURL("image/png");
        downloadFilename = `signed_${primaryFile.name}`;
        resultBlob = await pdfEngine.signPDF(primaryFile, sigDataUrl, { pageIndex: 0, x: 100, y: 100, width: 180, height: 70 }, updateProgress);
      }
      // 11. IMAGE TO PDF
      else if (currentTool.actionType === "image-to-pdf") {
        downloadFilename = "converted_images.pdf";
        resultBlob = await pdfEngine.imagesToPDF(selectedFiles, {}, updateProgress);
      }
      // 12. PDF TO IMAGES
      else if (currentTool.actionType === "pdf-to-images" || currentTool.actionType === "pdf-to-png") {
        updateProgress(40, "Rendering high-res page images...");
        const images = await pdfEngine.pdfToImages(primaryFile, {}, updateProgress);
        if (images.length > 0) {
          resultBlob = images[0].blob;
          downloadFilename = `page_1_${primaryFile.name.replace('.pdf', '')}.jpg`;
        }
      }
      // 13. AI SUMMARIZER
      else if (currentTool.actionType === "ai-summarize") {
        updateProgress(30, "Extracting text from PDF document...");
        const fullText = await pdfEngine.extractText(primaryFile, updateProgress);
        updateProgress(70, "Analyzing content with AI intelligence...");
        const summaryObj = aiEngine.summarizeText(fullText);

        const outBox = document.getElementById("aiSummaryOutput");
        outBox.style.display = "block";
        outBox.innerHTML = `
          <h4 style="font-weight: 800; color: var(--primary); margin-bottom: 8px;">Executive Summary</h4>
          <p style="font-size: 0.95rem; line-height: 1.6; margin-bottom: 16px;">${summaryObj.executiveSummary}</p>
          <h4 style="font-weight: 700; margin-bottom: 8px;">Key Takeaways</h4>
          <ul style="margin-left: 20px; font-size: 0.9rem; line-height: 1.5; margin-bottom: 16px;">
            ${summaryObj.bulletPoints.map(pt => `<li>${pt}</li>`).join('')}
          </ul>
          <h4 style="font-weight: 700; margin-bottom: 8px;">Core Keywords</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${summaryObj.keywords.map(kw => `<span style="background: #e0e7ff; color: #3730a3; padding: 3px 10px; border-radius: 999px; font-size: 0.8rem; font-weight: 600;">${kw}</span>`).join('')}
          </div>
        `;

        const formData = new FormData();
        formData.append("title", primaryFile.name.replace(/\.pdf$/i, ""));
        formData.append("summary", summaryObj.executiveSummary);
        formData.append("bullet_points", summaryObj.bulletPoints.join("\n"));
        formData.append("keywords", summaryObj.keywords.join(","));
        updateProgress(85, "Compiling publication-grade PDF Summary Report...");
        const res = await fetch("/api/pdf/report/summary", { method: "POST", body: formData });
        if (res.ok) {
          resultBlob = await res.blob();
        } else {
          resultBlob = new Blob([`${summaryObj.executiveSummary}\n\nKey Takeaways:\n${summaryObj.bulletPoints.join('\n')}`], { type: "text/plain" });
        }
        downloadFilename = `AI_Summary_${primaryFile.name.replace(/\.pdf$/i, '')}.pdf`;
      }
      // 14. REMOVE / DELETE PAGES
      else if (currentTool.actionType === "delete-pages") {
        const inputVal = document.getElementById("deletePageIndices")?.value || "1";
        const indices = inputVal.split(",").map(n => parseInt(n.trim(), 10) - 1).filter(n => !isNaN(n) && n >= 0);
        downloadFilename = `cleaned_${primaryFile.name}`;
        resultBlob = await pdfEngine.deletePages(primaryFile, indices, updateProgress);
      }
      // 15. EXTRACT PAGES
      else if (currentTool.actionType === "extract-pages") {
        const ranges = document.getElementById("extractPageRanges")?.value || "1";
        downloadFilename = `extracted_${primaryFile.name}`;
        resultBlob = await pdfEngine.splitPDF(primaryFile, ranges, updateProgress);
      }
      // 16. REORDER PAGES
      else if (currentTool.actionType === "reorder") {
        const seq = document.getElementById("reorderSequence")?.value || "";
        downloadFilename = `reordered_${primaryFile.name}`;
        resultBlob = await pdfEngine.reorderPages(primaryFile, seq, updateProgress);
      }
      // 17. DUPLICATE PAGES
      else if (currentTool.actionType === "duplicate") {
        const pNum = parseInt(document.getElementById("dupPageNum")?.value || "1", 10);
        const count = parseInt(document.getElementById("dupCount")?.value || "1", 10);
        downloadFilename = `duplicated_${primaryFile.name}`;
        resultBlob = await pdfEngine.duplicatePages(primaryFile, pNum, count, updateProgress);
      }
      // 18. REVERSE PAGES
      else if (currentTool.actionType === "reverse") {
        downloadFilename = `reversed_${primaryFile.name}`;
        resultBlob = await pdfEngine.reversePages(primaryFile, updateProgress);
      }
      // 19. BLANK PDF
      else if (currentTool.actionType === "blank") {
        const count = parseInt(document.getElementById("blankPageCount")?.value || "1", 10);
        const style = document.getElementById("blankPaperStyle")?.value || "blank";
        downloadFilename = `blank_document.pdf`;
        resultBlob = await pdfEngine.createBlankPDF({ count, lined: style === "lined" }, updateProgress);
      }
      // 20. CROP PDF
      else if (currentTool.actionType === "crop") {
        const ratio = parseFloat(document.getElementById("cropRatio")?.value || "0.05");
        downloadFilename = `cropped_${primaryFile.name}`;
        resultBlob = await pdfEngine.cropPDF(primaryFile, ratio, updateProgress);
      }
      // 21. FLATTEN PDF
      else if (currentTool.actionType === "flatten") {
        updateProgress(40, "Flattening forms and annotations...");
        downloadFilename = `flattened_${primaryFile.name}`;
        const formData = new FormData();
        formData.append("file", primaryFile);
        const res = await fetch("/api/pdf/flatten", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Failed to flatten PDF.");
        resultBlob = await res.blob();
      }
      // 22. REMOVE METADATA
      else if (currentTool.actionType === "remove-metadata") {
        updateProgress(40, "Stripping hidden metadata tags...");
        downloadFilename = `clean_${primaryFile.name}`;
        const formData = new FormData();
        formData.append("file", primaryFile);
        const res = await fetch("/api/pdf/remove-metadata", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Failed to sanitize metadata.");
        resultBlob = await res.blob();
      }
      // 23. REPAIR PDF
      else if (currentTool.actionType === "repair") {
        updateProgress(40, "Reconstructing PDF object tree...");
        downloadFilename = `repaired_${primaryFile.name}`;
        const formData = new FormData();
        formData.append("file", primaryFile);
        const res = await fetch("/api/pdf/repair", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Failed to repair document.");
        resultBlob = await res.blob();
      }
      // 24. PDF/A ARCHIVAL
      else if (currentTool.actionType === "pdfa") {
        updateProgress(40, "Standardizing PDF/A profiles...");
        downloadFilename = `pdfa_${primaryFile.name}`;
        const formData = new FormData();
        formData.append("file", primaryFile);
        const res = await fetch("/api/pdf/flatten", { method: "POST", body: formData });
        if (!res.ok) throw new Error("PDF/A conversion failed.");
        resultBlob = await res.blob();
      }
      // 25. EXTRACT IMAGES (COMPILED TO PDF PHOTO ALBUM)
      else if (currentTool.actionType === "extract-images") {
        updateProgress(40, "Extracting embedded graphics into Image Album PDF...");
        downloadFilename = `Images_Album_${primaryFile.name.replace(/\.pdf$/i, '')}.pdf`;
        const formData = new FormData();
        formData.append("file", primaryFile);
        const res = await fetch("/api/pdf/report/images-album", { method: "POST", body: formData });
        if (!res.ok) throw new Error("No embedded images found or extraction failed.");
        resultBlob = await res.blob();
      }
      // 26. EXTRACT TEXT (COMPILED TO SEARCHABLE PDF)
      else if (currentTool.actionType === "extract-text") {
        updateProgress(40, "Extracting document text and compiling clean PDF...");
        const textContent = await pdfEngine.extractText(primaryFile, updateProgress);
        const formData = new FormData();
        formData.append("title", primaryFile.name.replace(/\.pdf$/i, ""));
        formData.append("text_content", textContent);
        const res = await fetch("/api/pdf/report/ocr", { method: "POST", body: formData });
        resultBlob = res.ok ? await res.blob() : new Blob([textContent], { type: "text/plain" });
        downloadFilename = `Extracted_Text_${primaryFile.name.replace(/\.pdf$/i, '')}.pdf`;
      }
      // 27. PDF TO WORD (.docx)
      else if (currentTool.actionType === "pdf-to-word") {
        updateProgress(40, "Converting document to Microsoft Word (.docx)...");
        downloadFilename = `${primaryFile.name.replace('.pdf', '')}.docx`;
        const formData = new FormData();
        formData.append("file", primaryFile);
        const res = await fetch("/api/pdf/to-docx", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Failed to convert PDF to Word document.");
        resultBlob = await res.blob();
      }
      // 28. PDF TO MARKDOWN (COMPILED TO CLEAN PDF)
      else if (currentTool.actionType === "pdf-to-markdown") {
        updateProgress(40, "Formatting text as Markdown and generating PDF...");
        const textContent = await pdfEngine.extractText(primaryFile, updateProgress);
        const mdText = `# ${primaryFile.name.replace('.pdf', '')}\n\n` +
          textContent.replace(/--- \[Page (\d+)\] ---/g, "## Page $1\n");
        const formData = new FormData();
        formData.append("file", new File([mdText], `${primaryFile.name}.txt`, { type: "text/plain" }));
        const res = await fetch("/api/pdf/from-txt", { method: "POST", body: formData });
        resultBlob = res.ok ? await res.blob() : new Blob([mdText], { type: "text/markdown" });
        downloadFilename = `Markdown_${primaryFile.name.replace(/\.pdf$/i, '')}.pdf`;
      }
      // 29. WORD TO PDF (.docx -> .pdf)
      else if (currentTool.actionType === "word-to-pdf") {
        updateProgress(40, "Compiling Word document into PDF...");
        downloadFilename = `${primaryFile.name.replace(/\.docx?$/i, '')}.pdf`;
        const formData = new FormData();
        formData.append("file", primaryFile);
        const res = await fetch("/api/pdf/from-docx", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Word to PDF conversion failed.");
        resultBlob = await res.blob();
      }
      // 30. EXCEL TO PDF (.xlsx -> .pdf)
      else if (currentTool.actionType === "excel-to-pdf") {
        updateProgress(40, "Rendering spreadsheet sheets to PDF...");
        downloadFilename = `${primaryFile.name.replace(/\.(xlsx|csv)$/i, '')}.pdf`;
        const formData = new FormData();
        formData.append("file", primaryFile);
        const res = await fetch("/api/pdf/from-excel", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Excel to PDF conversion failed.");
        resultBlob = await res.blob();
      }
      // 31. TXT / MARKDOWN TO PDF
      else if (currentTool.actionType === "txt-to-pdf" || currentTool.actionType === "markdown-to-pdf") {
        updateProgress(40, "Rendering text to styled PDF...");
        downloadFilename = `${primaryFile.name.replace(/\.(txt|md|markdown)$/i, '')}.pdf`;
        const formData = new FormData();
        formData.append("file", primaryFile);
        const res = await fetch("/api/pdf/from-txt", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Text to PDF conversion failed.");
        resultBlob = await res.blob();
      }
      // 32. HTML TO PDF
      else if (currentTool.actionType === "html-to-pdf") {
        updateProgress(40, "Rendering HTML into vector PDF...");
        downloadFilename = `${primaryFile.name.replace(/\.(html|htm)$/i, '')}.pdf`;
        const formData = new FormData();
        formData.append("file", primaryFile);
        const res = await fetch("/api/pdf/from-html", { method: "POST", body: formData });
        if (!res.ok) throw new Error("HTML to PDF conversion failed.");
        resultBlob = await res.blob();
      }
      // 33. OCR PDF (COMPILED TO SEARCHABLE PDF)
      else if (currentTool.actionType === "ocr") {
        updateProgress(30, "Scanning document for optical characters...");
        const textContent = await pdfEngine.extractText(primaryFile, updateProgress);
        updateProgress(80, "Generating searchable OCR PDF document...");
        const formData = new FormData();
        formData.append("title", primaryFile.name.replace(/\.pdf$/i, ""));
        formData.append("text_content", textContent || "No optical characters recognized.");
        const res = await fetch("/api/pdf/report/ocr", { method: "POST", body: formData });
        resultBlob = res.ok ? await res.blob() : new Blob([textContent], { type: "text/plain" });
        downloadFilename = `OCR_${primaryFile.name.replace(/\.pdf$/i, '')}.pdf`;
      }
      // 34. AI QA CHAT (COMPILED TO TRANSCRIPT PDF)
      else if (currentTool.actionType === "ai-qa") {
        updateProgress(40, "Extracting content and compiling Q&A Knowledge Document...");
        const textContent = await pdfEngine.extractText(primaryFile, updateProgress);
        const formData = new FormData();
        formData.append("title", primaryFile.name.replace(/\.pdf$/i, ""));
        formData.append("text_content", textContent);
        const res = await fetch("/api/pdf/report/ocr", { method: "POST", body: formData });
        resultBlob = res.ok ? await res.blob() : new Blob([textContent], { type: "text/plain" });
        downloadFilename = `QA_Document_${primaryFile.name.replace(/\.pdf$/i, '')}.pdf`;
      }
      // 35. PDF TO EXCEL (.xlsx)
      else if (currentTool.actionType === "pdf-to-excel") {
        updateProgress(40, "Extracting table data and generating Excel spreadsheet...");
        downloadFilename = `${primaryFile.name.replace(/\.pdf$/i, '')}.xlsx`;
        const formData = new FormData();
        formData.append("file", primaryFile);
        const res = await fetch("/api/pdf/to-excel", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Failed to convert PDF to Excel spreadsheet.");
        resultBlob = await res.blob();
      }
      // 36. PPTX TO PDF (.pptx -> .pdf)
      else if (currentTool.actionType === "pptx-to-pdf") {
        updateProgress(40, "Converting PowerPoint presentation slides to PDF...");
        downloadFilename = `${primaryFile.name.replace(/\.pptx?$/i, '')}.pdf`;
        const formData = new FormData();
        formData.append("file", primaryFile);
        const res = await fetch("/api/pdf/from-pptx", { method: "POST", body: formData });
        if (!res.ok) throw new Error("PowerPoint to PDF conversion failed.");
        resultBlob = await res.blob();
      }
      // 37. REDACT PDF
      else if (currentTool.actionType === "redact") {
        updateProgress(40, "Scanning and redacting sensitive text permanently...");
        downloadFilename = `redacted_${primaryFile.name}`;
        const kwInput = document.getElementById("redactKeywords");
        const keywords = kwInput ? kwInput.value.trim() : "";
        const formData = new FormData();
        formData.append("file", primaryFile);
        formData.append("keywords", keywords);
        const res = await fetch("/api/pdf/redact", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Failed to redact PDF document.");
        resultBlob = await res.blob();
      }
      // 38. HEADER & FOOTER PDF
      else if (currentTool.actionType === "header-footer") {
        updateProgress(40, "Applying dynamic running headers and footers...");
        downloadFilename = `stamped_${primaryFile.name}`;
        const headerText = document.getElementById("headerTextInput")?.value || "";
        const footerText = document.getElementById("footerTextInput")?.value || "";
        const formData = new FormData();
        formData.append("file", primaryFile);
        formData.append("header_text", headerText);
        formData.append("footer_text", footerText);
        const res = await fetch("/api/pdf/header-footer", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Failed to apply headers/footers.");
        resultBlob = await res.blob();
      }
      // 39. DEFAULT FALLBACK
      else {
        downloadFilename = `processed_${primaryFile.name}`;
        resultBlob = await pdfEngine.rotatePDF(primaryFile, 0, null, updateProgress);
      }

      // Success Display
      processedResultBlob = resultBlob;
      processedResultUrl = URL.createObjectURL(resultBlob);

      resultDownloadBtn.onclick = () => {
        const a = document.createElement("a");
        a.href = processedResultUrl;
        a.download = downloadFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("Download started!", "success");
      };

      resultPreviewBtn.onclick = () => {
        window.open(processedResultUrl, "_blank");
      };

      updateProgress(100, "Done!");
      toolResultSection.classList.add("active");
      processBtn.disabled = false;
      showToast("File processed successfully!", "success");
    } catch (err) {
      console.error(err);
      progressWrap.style.display = "none";
      processBtn.disabled = false;
      showToast(err.message || "An error occurred during processing.", "error");
    }
  });

  // AI Q&A interactive click
  document.addEventListener("click", async (e) => {
    if (e.target && e.target.id === "aiAskBtn") {
      const qInput = document.getElementById("aiQueryInput");
      const answerBox = document.getElementById("aiAnswerResponse");
      const q = qInput ? qInput.value.trim() : "";
      if (!q) {
        showToast("Please enter a question first.", "error");
        return;
      }
      if (selectedFiles.length === 0) {
        showToast("Please upload a document first.", "error");
        return;
      }

      answerBox.style.display = "block";
      answerBox.innerHTML = `<em>Scanning document for answer...</em>`;
      try {
        const fullText = await pdfEngine.extractText(selectedFiles[0]);
        const ans = aiEngine.answerQuestion(fullText, q);
        answerBox.innerHTML = `<strong>Answer:</strong><div style="margin-top: 6px; white-space: pre-wrap;">${ans}</div>`;
      } catch (err) {
        answerBox.innerHTML = `<span style="color: red;">Error: ${err.message}</span>`;
      }
    }
  });

  // Start Again
  startAgainBtn.addEventListener("click", () => {
    selectedFiles = [];
    resetToolUI();
  });

  // Category Pills Filtering
  categoryPills.forEach(pill => {
    pill.addEventListener("click", () => {
      categoryPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentCategory = pill.dataset.category;
      searchInput.value = "";
      searchClearBtn.style.display = "none";
      renderTools();
    });
  });

  // Search Input Filter
  searchInput.addEventListener("input", () => {
    const val = searchInput.value;
    searchClearBtn.style.display = val ? "block" : "none";
    renderTools();
  });

  searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchClearBtn.style.display = "none";
    renderTools();
  });

  // Modal Close Listeners
  toolModalClose.addEventListener("click", closeTool);
  toolModalOverlay.addEventListener("click", (e) => {
    if (e.target === toolModalOverlay) closeTool();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toolModalOverlay.classList.contains("active")) {
      closeTool();
    }
  });

  // Navigation Links
  document.querySelectorAll("[data-nav-cat]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetCat = link.dataset.navCat;
      const targetPill = document.querySelector(`.cat-pill[data-category="${targetCat}"]`);
      if (targetPill) targetPill.click();
      const toolsSec = document.getElementById("toolsBrowserSection");
      if (toolsSec) toolsSec.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Quick Actions in Hero
  const exploreAllToolsBtn = document.getElementById("exploreAllToolsBtn");
  if (exploreAllToolsBtn) {
    exploreAllToolsBtn.addEventListener("click", () => {
      const toolsSec = document.getElementById("toolsBrowserSection");
      if (toolsSec) toolsSec.scrollIntoView({ behavior: "smooth" });
    });
  }

  const heroTryIpynbBtn = document.getElementById("heroTryIpynbBtn");
  if (heroTryIpynbBtn) {
    heroTryIpynbBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openTool("ipynb-to-pdf");
    });
  }

  // Header Explore Tools Button
  const headerExploreBtn = document.getElementById("headerExploreBtn");
  if (headerExploreBtn) {
    headerExploreBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const toolsSec = document.getElementById("toolsBrowserSection");
      if (toolsSec) toolsSec.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Workspace Showcase Tool Cards Click & Keyboard
  document.querySelectorAll(".w-tool-card[data-tool-id]").forEach(card => {
    const handleLaunch = () => {
      const toolId = card.dataset.toolId;
      if (toolId) {
        openTool(toolId);
      }
    };
    card.addEventListener("click", handleLaunch);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleLaunch();
      }
    });
  });

  // Workspace Category Filter Tabs
  document.querySelectorAll(".w-tag[data-filter-cat]").forEach(tab => {
    tab.addEventListener("click", () => {
      const cat = tab.dataset.filterCat;
      document.querySelectorAll(".w-tag").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const matchingPill = document.querySelector(`.cat-pill[data-category="${cat}"]`);
      if (matchingPill) matchingPill.click();

      const toolsSec = document.getElementById("toolsBrowserSection");
      if (toolsSec) toolsSec.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Hero Workspace Dynamic Tool Count
  const heroWorkspaceToolsCount = document.getElementById("heroWorkspaceToolsCount");
  if (heroWorkspaceToolsCount) {
    const count = (toolsRegistry.getAll ? toolsRegistry.getAll().length : (toolsRegistry.DATABASE ? toolsRegistry.DATABASE.length : 40));
    heroWorkspaceToolsCount.textContent = count;
  }

  // Workspace Engine Health Status Check
  const checkEngineStatus = async () => {
    const dot = document.getElementById("workspaceStatusDot");
    const text = document.getElementById("workspaceStatusText");
    if (!text) return;

    text.textContent = "Loading engines...";
    if (dot) dot.className = "pulse-indicator-dot dot-loading";

    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (res.ok) {
        text.textContent = "All Engines Active";
        if (dot) dot.className = "pulse-indicator-dot dot-active";
      } else {
        text.textContent = "Engine unavailable";
        if (dot) dot.className = "pulse-indicator-dot dot-unavailable";
      }
    } catch (err) {
      text.textContent = "Engine unavailable";
      if (dot) dot.className = "pulse-indicator-dot dot-unavailable";
    }
  };
  checkEngineStatus();

  // Mobile Navigation Menu Toggle
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mainNav = document.getElementById("mainNav");
  if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener("click", () => {
      mainNav.classList.toggle("mobile-active");
    });
    mainNav.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("mobile-active");
      });
    });
  }

  // Theme Manager (Light & Dark Mode)
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const setTheme = (theme, save = true) => {
    document.documentElement.setAttribute("data-theme", theme);
    if (save) {
      try {
        localStorage.setItem("onepdf-theme", theme);
      } catch (e) {}
    }
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
      themeToggleBtn.setAttribute("title", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
    }
  };

  const initTheme = () => {
    let activeTheme = "light";
    try {
      const savedTheme = localStorage.getItem("onepdf-theme");
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      activeTheme = savedTheme || (prefersDark ? "dark" : "light");
    } catch (e) {
      activeTheme = "light";
    }
    setTheme(activeTheme, false);

    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!localStorage.getItem("onepdf-theme")) {
          setTheme(e.matches ? "dark" : "light", false);
        }
      });
    }
  };

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      const nextTheme = current === "dark" ? "light" : "dark";
      setTheme(nextTheme, true);
      showToast(`Switched to ${nextTheme === "dark" ? "Dark" : "Light"} Mode`, "info");
    });
  }

  initTheme();


  // Initial Render
  updateCategoryPills();
  renderTools();

  // Handle direct routes like /ipynb-to-pdf or #/ipynb-to-pdf
  const checkInitialRoute = () => {
    const p = window.location.pathname.replace(/^\/+|\/+$/g, "");
    const h = window.location.hash.replace(/^#\/?/, "");
    if (p === "ipynb-to-pdf" || h === "ipynb-to-pdf") {
      openTool("ipynb-to-pdf");
    } else if (p && toolsRegistry.getToolById(p)) {
      openTool(p);
    } else if (h && toolsRegistry.getToolById(h)) {
      openTool(h);
    }
  };
  checkInitialRoute();
  window.addEventListener("popstate", checkInitialRoute);
  window.addEventListener("hashchange", checkInitialRoute);
});
