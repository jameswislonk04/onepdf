/**
 * One PDF - IPYNB Engine
 * Fast parsing, lightweight responsive preview, and vector PDF export.
 */

class IPYNBEngine {
  constructor() {
    this.currentNotebook = null;
    this.currentFilename = "notebook.ipynb";
  }

  static parseNotebook(jsonString) {
    try {
      const data = typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString;
      if (!data.cells || !Array.isArray(data.cells)) {
        throw new Error("Invalid notebook format: missing 'cells' array.");
      }
      return data;
    } catch (e) {
      throw new Error(`Invalid Jupyter Notebook file.`);
    }
  }

  static inspect(notebook) {
    const cells = notebook.cells || [];
    const codeCells = cells.filter(c => c.cell_type === "code");
    const markdownCells = cells.filter(c => c.cell_type === "markdown");
    const rawCells = cells.filter(c => c.cell_type === "raw");
    const executedCells = codeCells.filter(c => c.execution_count != null);
    
    let outputsCount = 0;
    let imagesCount = 0;
    codeCells.forEach(c => {
      const outs = c.outputs || [];
      outputsCount += outs.length;
      outs.forEach(o => {
        if (o.data && (o.data["image/png"] || o.data["image/jpeg"] || o.data["image/svg+xml"])) {
          imagesCount++;
        }
      });
    });

    const meta = notebook.metadata || {};
    const kernelspec = meta.kernelspec || {};
    const lang = meta.language_info ? meta.language_info.name : (kernelspec.language || "python");

    let title = "Jupyter Notebook";
    for (const c of markdownCells) {
      const src = Array.isArray(c.source) ? c.source.join("") : (c.source || "");
      const match = src.match(/^#\s+(.+)$/m);
      if (match) {
        title = match[1].trim();
        break;
      }
    }

    return {
      title,
      totalCells: cells.length,
      codeCells: codeCells.length,
      markdownCells: markdownCells.length,
      rawCells: rawCells.length,
      executedCells: executedCells.length,
      outputsCount,
      imagesCount,
      kernelName: kernelspec.display_name || kernelspec.name || "Python 3 (ipykernel)",
      language: lang,
      nbformat: `${notebook.nbformat || 4}.${notebook.nbformat_minor || 0}`
    };
  }

  /**
   * Fast, responsive preview rendering matching the reference One PDF standard.
   */
  static renderPreview(notebook, options = {}, filename = "notebook.ipynb") {
    const {
      includeCode = true,
      includeOutput = true,
      includeImages = true,
      includeExecutionNumbers = true,
      includeToc = false,
      syntaxHighlighting = true,
      theme = "light",
      fontSize = "normal"
    } = options;

    const info = IPYNBEngine.inspect(notebook);
    let docTitle = filename ? filename.replace(".ipynb", "").replace(/_/g, " ") : "Jupyter Notebook";
    if (info.title && info.title !== "Jupyter Notebook") {
      docTitle = info.title;
    }

    let tocItems = [];
    let cellsHtml = "";
    const cells = notebook.cells || [];

    cells.forEach((cell, index) => {
      if (cell.cell_type === "markdown") {
        const rawSource = Array.isArray(cell.source) ? cell.source.join("") : (cell.source || "");
        if (!rawSource.trim()) return;
        
        const headingMatch = rawSource.match(/^(#{1,3})\s+(.+)$/m);
        if (headingMatch && includeToc) {
          tocItems.push({
            level: headingMatch[1].length,
            title: headingMatch[2].trim(),
            id: `nb-heading-${index}`
          });
        }

        let parsedMd = rawSource;
        if (window.marked && window.marked.parse) {
          parsedMd = window.marked.parse(rawSource);
        } else {
          parsedMd = IPYNBEngine.escapeHtml(rawSource).replace(/\n/g, "<br>");
        }

        cellsHtml += `
          <div class="notebook-cell-group cell-type-markdown" id="nb-heading-${index}">
            <div class="ipynb-markdown-content">${parsedMd}</div>
          </div>
        `;
      } else if (cell.cell_type === "code") {
        if (!includeCode && !includeOutput) return;

        const rawCode = Array.isArray(cell.source) ? cell.source.join("") : (cell.source || "");
        const execNum = cell.execution_count != null ? cell.execution_count : " ";

        let codeSection = "";
        if (includeCode && rawCode.trim()) {
          let highlighted = IPYNBEngine.escapeHtml(rawCode);
          if (syntaxHighlighting && window.Prism && window.Prism.languages.python) {
            try {
              highlighted = window.Prism.highlight(rawCode, window.Prism.languages.python, 'python');
            } catch (e) {
              highlighted = IPYNBEngine.escapeHtml(rawCode);
            }
          }

          codeSection = `
            <div class="ipynb-input-group">
              ${includeExecutionNumbers ? `<div class="ipynb-prompt in-prompt">In [${execNum}]:</div>` : ""}
              <div class="ipynb-code-box">
                <pre class="highlight"><code>${highlighted}</code></pre>
              </div>
            </div>
          `;
        }

        let outputSection = "";
        if (includeOutput && cell.outputs && cell.outputs.length > 0) {
          let outputsInner = "";
          cell.outputs.forEach(output => {
            const hasImage = output.data && (output.data["image/png"] || output.data["image/jpeg"] || output.data["image/svg+xml"]);

            // Image outputs (PNG, JPEG, SVG) - Rendered first and prominently
            if (output.data && includeImages) {
              if (output.data["image/png"]) {
                const b64 = Array.isArray(output.data["image/png"]) ? output.data["image/png"].join("") : output.data["image/png"];
                outputsInner += `<div class="ipynb-image-output"><img src="data:image/png;base64,${b64}" class="ipynb-output-image" alt="Figure Output" style="max-width: 100%; height: auto; object-fit: contain; display: block; margin: 6px auto; border-radius: 4px;" /></div>`;
              } else if (output.data["image/jpeg"]) {
                const b64 = Array.isArray(output.data["image/jpeg"]) ? output.data["image/jpeg"].join("") : output.data["image/jpeg"];
                outputsInner += `<div class="ipynb-image-output"><img src="data:image/jpeg;base64,${b64}" class="ipynb-output-image" alt="Figure Output" style="max-width: 100%; height: auto; object-fit: contain; display: block; margin: 6px auto; border-radius: 4px;" /></div>`;
              } else if (output.data["image/svg+xml"]) {
                const svgStr = Array.isArray(output.data["image/svg+xml"]) ? output.data["image/svg+xml"].join("") : output.data["image/svg+xml"];
                outputsInner += `<div class="ipynb-image-output" style="max-width: 100%; overflow: hidden; display: block; margin: 6px auto;">${svgStr}</div>`;
              }
            }

            // Text description (<Figure size ...> or plain values)
            if (output.data && output.data["text/plain"]) {
              const plainText = Array.isArray(output.data["text/plain"]) ? output.data["text/plain"].join("") : output.data["text/plain"];
              // If it's just a Figure size description and image was rendered, render as subtle meta note
              if (hasImage && includeImages && plainText.trim().startsWith("<Figure size")) {
                outputsInner += `<div class="ipynb-text-output ipynb-figure-caption" style="font-size: 0.72rem; color: #64748b; margin-top: 2px; text-align: center;"><small>${IPYNBEngine.escapeHtml(plainText.trim())}</small></div>`;
              } else {
                outputsInner += `<div class="ipynb-text-output"><pre>${IPYNBEngine.escapeHtml(plainText)}</pre></div>`;
              }
            }

            // Stream (stdout / stderr)
            if (output.output_type === "stream") {
              const streamText = Array.isArray(output.text) ? output.text.join("") : (output.text || "");
              outputsInner += `<div class="ipynb-stream-output"><pre>${IPYNBEngine.escapeHtml(streamText)}</pre></div>`;
            } 
            
            // HTML / Table output
            if (output.data && output.data["text/html"]) {
              const htmlContent = Array.isArray(output.data["text/html"]) ? output.data["text/html"].join("") : output.data["text/html"];
              outputsInner += `<div class="ipynb-html-output">${htmlContent}</div>`;
            }
          });

            // Error traceback
            if (output.output_type === "error") {
              const traceback = Array.isArray(output.traceback) ? output.traceback.join("\n") : (output.evalue || "Error");
              const cleanTrace = traceback.replace(/\u001b\[\d+m/g, "");
              outputsInner += `<div class="ipynb-error-output"><pre>${IPYNBEngine.escapeHtml(cleanTrace)}</pre></div>`;
            }
          });

          if (outputsInner) {
            outputSection = `
              <div class="ipynb-output-group">
                ${includeExecutionNumbers ? `<div class="ipynb-prompt out-prompt">Out [${execNum}]:</div>` : ""}
                <div class="ipynb-output-box">${outputsInner}</div>
              </div>
            `;
          }
        }

        cellsHtml += `
          <div class="notebook-cell-group cell-type-code">
            ${codeSection}
            ${outputSection}
          </div>
        `;
      }
    });

    let tocHtml = "";
    if (includeToc && tocItems.length > 0) {
      tocHtml = `
        <div class="ipynb-toc-card">
          <h3 class="toc-title">Table of Contents</h3>
          <ul class="toc-list">
            ${tocItems.map(item => `
              <li class="toc-level-${item.level}">
                <a href="#${item.id}">${IPYNBEngine.escapeHtml(item.title)}</a>
              </li>
            `).join("")}
          </ul>
        </div>
      `;
    }

    const totalCellsStr = `${info.totalCells} (${info.codeCells} Code, ${info.markdownCells} Markdown)`;

    return `
      <div class="ipynb-notebook-container theme-${theme} font-${fontSize}">
        <div class="onepdf-header-card">
          <div class="nb-badge">JUPYTER NOTEBOOK EXPORT</div>
          <h1 class="nb-title">${IPYNBEngine.escapeHtml(docTitle)}</h1>
          <div class="nb-info-bar">Kernel: ${IPYNBEngine.escapeHtml(info.kernelName)} &nbsp;&nbsp;|&nbsp;&nbsp; Total Cells: ${totalCellsStr} &nbsp;&nbsp;|&nbsp;&nbsp; Exported via One PDF</div>
          <hr class="nb-divider" />
        </div>

        ${tocHtml}
        <div class="ipynb-cells-wrapper">
          ${cellsHtml}
        </div>
      </div>
    `;
  }

  static escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

window.OnePDF_IPYNBEngine = IPYNBEngine;
