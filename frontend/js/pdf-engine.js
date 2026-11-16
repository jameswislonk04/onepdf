/**
 * One PDF - Client-side PDF Processing Engine
 * Powered by pdf-lib and pdfjs-dist for high-speed, privacy-first in-browser operations.
 */

class PDFEngine {
  constructor() {
    this.pdfLib = window.PDFLib;
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }

  static async readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  static async readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Merge multiple PDF files into one
   */
  static async mergePDFs(files, onProgress) {
    const { PDFDocument } = window.PDFLib;
    const mergedPdf = await PDFDocument.create();
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      if (onProgress) onProgress((i / totalFiles) * 80, `Merging ${files[i].name}...`);
      const fileBytes = await PDFEngine.readFileAsArrayBuffer(files[i]);
      const pdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    if (onProgress) onProgress(90, "Finalizing merged document...");
    const mergedPdfBytes = await mergedPdf.save();
    if (onProgress) onProgress(100, "Done!");
    return new Blob([mergedPdfBytes], { type: "application/pdf" });
  }

  /**
   * Split PDF by page ranges (e.g. "1-2, 3, 5-8")
   */
  static async splitPDF(file, rangeStr, onProgress) {
    const { PDFDocument } = window.PDFLib;
    if (onProgress) onProgress(20, "Loading PDF...");
    const fileBytes = await PDFEngine.readFileAsArrayBuffer(file);
    const srcDoc = await PDFDocument.load(fileBytes);
    const totalPages = srcDoc.getPageCount();

    // Parse page ranges
    let selectedIndices = [];
    if (!rangeStr || rangeStr.trim().toLowerCase() === "all") {
      selectedIndices = Array.from({ length: totalPages }, (_, i) => i);
    } else {
      const parts = rangeStr.split(",");
      parts.forEach(part => {
        const trimmed = part.trim();
        if (trimmed.includes("-")) {
          const [start, end] = trimmed.split("-").map(n => parseInt(n.trim(), 10));
          if (!isNaN(start) && !isNaN(end)) {
            for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
              selectedIndices.push(p - 1);
            }
          }
        } else {
          const p = parseInt(trimmed, 10);
          if (!isNaN(p) && p >= 1 && p <= totalPages) {
            selectedIndices.push(p - 1);
          }
        }
      });
    }

    // Deduplicate and sort
    selectedIndices = [...new Set(selectedIndices)].sort((a, b) => a - b);
    if (selectedIndices.length === 0) {
      throw new Error("No valid pages selected for split.");
    }

    if (onProgress) onProgress(60, "Extracting selected pages...");
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, selectedIndices);
    copiedPages.forEach(p => newDoc.addPage(p));

    if (onProgress) onProgress(90, "Saving split document...");
    const newBytes = await newDoc.save();
    if (onProgress) onProgress(100, "Complete!");
    return new Blob([newBytes], { type: "application/pdf" });
  }

  /**
   * Rotate pages in a PDF document
   */
  static async rotatePDF(file, degrees = 90, pageIndices = null, onProgress) {
    const { PDFDocument, degrees: deg } = window.PDFLib;
    if (onProgress) onProgress(20, "Reading document...");
    const bytes = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(bytes);
    const pages = pdfDoc.getPages();

    if (onProgress) onProgress(50, "Rotating pages...");
    pages.forEach((page, idx) => {
      if (pageIndices === null || pageIndices.includes(idx)) {
        const currentRotation = page.getRotation().angle;
        page.setRotation(deg((currentRotation + degrees) % 360));
      }
    });

    if (onProgress) onProgress(85, "Generating rotated PDF...");
    const pdfBytes = await pdfDoc.save();
    if (onProgress) onProgress(100, "Done!");
    return new Blob([pdfBytes], { type: "application/pdf" });
  }

  /**
   * Delete specific pages from PDF
   */
  static async deletePages(file, indicesToDelete, onProgress) {
    const { PDFDocument } = window.PDFLib;
    if (onProgress) onProgress(20, "Loading document...");
    const bytes = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(bytes);
    const totalPages = pdfDoc.getPageCount();

    // Sort descending so deletion doesn't shift earlier indices
    const sorted = [...new Set(indicesToDelete)].sort((a, b) => b - a);
    if (sorted.length >= totalPages) {
      throw new Error("Cannot delete all pages in document.");
    }

    if (onProgress) onProgress(50, "Removing selected pages...");
    sorted.forEach(idx => {
      if (idx >= 0 && idx < pdfDoc.getPageCount()) {
        pdfDoc.removePage(idx);
      }
    });

    if (onProgress) onProgress(85, "Saving cleaned document...");
    const pdfBytes = await pdfDoc.save();
    if (onProgress) onProgress(100, "Done!");
    return new Blob([pdfBytes], { type: "application/pdf" });
  }

  /**
   * Add text watermark to PDF
   */
  static async addWatermark(file, options = {}, onProgress) {
    const { PDFDocument, rgb, degrees, StandardFonts } = window.PDFLib;
    const {
      text = "CONFIDENTIAL",
      fontSize = 48,
      opacity = 0.25,
      color = { r: 0.5, g: 0.5, b: 0.6 },
      angle = 45
    } = options;

    if (onProgress) onProgress(20, "Loading PDF...");
    const bytes = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(bytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    if (onProgress) onProgress(50, "Applying watermark to pages...");
    pages.forEach((page) => {
      const { width, height } = page.getSize();
      const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
      const textHeight = helveticaFont.heightAtSize(fontSize);

      // Centered position
      const x = width / 2 - (textWidth / 2) * Math.cos(angle * Math.PI / 180);
      const y = height / 2 - (textHeight / 2) * Math.sin(angle * Math.PI / 180);

      page.drawText(text, {
        x: width / 2 - (textWidth / 2),
        y: height / 2,
        size: fontSize,
        font: helveticaFont,
        color: rgb(color.r, color.g, color.b),
        opacity: opacity,
        rotate: degrees(angle)
      });
    });

    if (onProgress) onProgress(85, "Writing watermarked document...");
    const pdfBytes = await pdfDoc.save();
    if (onProgress) onProgress(100, "Complete!");
    return new Blob([pdfBytes], { type: "application/pdf" });
  }

  /**
   * Add page numbering to PDF
   */
  static async addPageNumbers(file, options = {}, onProgress) {
    const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
    const {
      format = "Page {n} of {total}",
      position = "bottom-center", // bottom-right, bottom-center, bottom-left, top-right
      fontSize = 10,
      margin = 30
    } = options;

    if (onProgress) onProgress(20, "Loading PDF...");
    const bytes = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(bytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const total = pages.length;

    if (onProgress) onProgress(50, "Numbering pages...");
    pages.forEach((page, idx) => {
      const { width, height } = page.getSize();
      const numStr = format
        .replace("{n}", idx + 1)
        .replace("{total}", total);
      const textWidth = font.widthOfTextAtSize(numStr, fontSize);

      let x = width / 2 - textWidth / 2;
      let y = margin;

      if (position === "bottom-right") x = width - margin - textWidth;
      else if (position === "bottom-left") x = margin;
      else if (position === "top-right") {
        x = width - margin - textWidth;
        y = height - margin;
      } else if (position === "top-center") {
        x = width / 2 - textWidth / 2;
        y = height - margin;
      }

      page.drawText(numStr, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.3, 0.3, 0.35)
      });
    });

    if (onProgress) onProgress(85, "Saving numbered PDF...");
    const pdfBytes = await pdfDoc.save();
    if (onProgress) onProgress(100, "Complete!");
    return new Blob([pdfBytes], { type: "application/pdf" });
  }

  /**
   * Images to PDF (JPG, PNG, WebP)
   */
  static async imagesToPDF(imageFiles, options = {}, onProgress) {
    const { PDFDocument } = window.PDFLib;
    const { pageSize = "A4", orientation = "portrait", margin = 20 } = options;
    const pdfDoc = await PDFDocument.create();
    const total = imageFiles.length;

    // A4 dimensions in points: 595.28 x 841.89
    const baseW = orientation === "portrait" ? 595.28 : 841.89;
    const baseH = orientation === "portrait" ? 841.89 : 595.28;

    for (let i = 0; i < total; i++) {
      if (onProgress) onProgress((i / total) * 80, `Embedding image ${i + 1} of ${total}...`);
      const file = imageFiles[i];
      const imgBytes = await PDFEngine.readFileAsArrayBuffer(file);
      let img;

      if (file.type.includes("png")) {
        img = await pdfDoc.embedPng(imgBytes);
      } else {
        img = await pdfDoc.embedJpg(imgBytes);
      }

      const page = pdfDoc.addPage([baseW, baseH]);
      const availableW = baseW - margin * 2;
      const availableH = baseH - margin * 2;

      // Fit image proportionally
      const scale = Math.min(availableW / img.width, availableH / img.height, 1);
      const renderW = img.width * scale;
      const renderH = img.height * scale;
      const posX = margin + (availableW - renderW) / 2;
      const posY = margin + (availableH - renderH) / 2;

      page.drawImage(img, {
        x: posX,
        y: posY,
        width: renderW,
        height: renderH
      });
    }

    if (onProgress) onProgress(90, "Finalizing image document...");
    const pdfBytes = await pdfDoc.save();
    if (onProgress) onProgress(100, "Done!");
    return new Blob([pdfBytes], { type: "application/pdf" });
  }

  /**
   * Render PDF pages to image blobs using pdf.js
   */
  static async pdfToImages(file, options = {}, onProgress) {
    if (!window.pdfjsLib) throw new Error("PDF.js library is not loaded.");
    const { scale = 2.0, format = "image/jpeg", quality = 0.92 } = options;
    
    if (onProgress) onProgress(10, "Reading document...");
    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    const imageBlobs = [];

    for (let i = 1; i <= totalPages; i++) {
      if (onProgress) onProgress((i / totalPages) * 80, `Rendering page ${i} of ${totalPages}...`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise(resolve => canvas.toBlob(resolve, format, quality));
      imageBlobs.push({
        pageNumber: i,
        blob,
        dataUrl: canvas.toDataURL(format, quality),
        width: canvas.width,
        height: canvas.height
      });
    }

    if (onProgress) onProgress(100, "Complete!");
    return imageBlobs;
  }

  /**
   * Generate lightweight page thumbnail canvas for interactive grids
   */
  static async generateThumbnail(pdfDoc, pageNum, targetWidth = 160) {
    const page = await pdfDoc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = targetWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas;
  }

  /**
   * Extract full text from PDF using PDF.js
   */
  static async extractText(file, onProgress) {
    if (!window.pdfjsLib) throw new Error("PDF.js library is not loaded.");
    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      if (onProgress) onProgress((i / pdf.numPages) * 100, `Extracting page ${i}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      fullText += `--- [Page ${i}] ---\n${pageText}\n\n`;
    }

    return fullText;
  }

  /**
   * Stamp signature onto PDF page
   */
  static async signPDF(file, signatureDataUrl, options = {}, onProgress) {
    const { PDFDocument } = window.PDFLib;
    const { pageIndex = 0, x = 100, y = 100, width = 180, height = 70 } = options;

    if (onProgress) onProgress(20, "Loading document...");
    const bytes = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(bytes);
    const pages = pdfDoc.getPages();

    if (pageIndex < 0 || pageIndex >= pages.length) {
      throw new Error("Invalid page index for signature");
    }

    if (onProgress) onProgress(50, "Embedding signature...");
    const sigImage = await pdfDoc.embedPng(signatureDataUrl);
    const targetPage = pages[pageIndex];

    targetPage.drawImage(sigImage, {
      x,
      y,
      width,
      height
    });

    if (onProgress) onProgress(85, "Saving signed PDF...");
    const pdfBytes = await pdfDoc.save();
    if (onProgress) onProgress(100, "Document signed!");
    return new Blob([pdfBytes], { type: "application/pdf" });
  }

  /**
   * Reorder pages in PDF according to custom 1-based index order
   */
  static async reorderPages(file, orderStr, onProgress) {
    const { PDFDocument } = window.PDFLib;
    if (onProgress) onProgress(20, "Loading document...");
    const bytes = await PDFEngine.readFileAsArrayBuffer(file);
    const srcDoc = await PDFDocument.load(bytes);
    const totalPages = srcDoc.getPageCount();

    let order = orderStr.split(",")
      .map(s => parseInt(s.trim(), 10) - 1)
      .filter(n => !isNaN(n) && n >= 0 && n < totalPages);

    if (order.length === 0) {
      order = Array.from({ length: totalPages }, (_, i) => totalPages - 1 - i);
    }

    if (onProgress) onProgress(60, "Reordering pages...");
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, order);
    copiedPages.forEach(p => newDoc.addPage(p));

    if (onProgress) onProgress(90, "Saving reordered document...");
    const pdfBytes = await newDoc.save();
    if (onProgress) onProgress(100, "Reorder complete!");
    return new Blob([pdfBytes], { type: "application/pdf" });
  }

  /**
   * Reverse all pages from back to front
   */
  static async reversePages(file, onProgress) {
    const { PDFDocument } = window.PDFLib;
    if (onProgress) onProgress(20, "Reading document...");
    const bytes = await PDFEngine.readFileAsArrayBuffer(file);
    const srcDoc = await PDFDocument.load(bytes);
    const totalPages = srcDoc.getPageCount();

    const reverseIndices = Array.from({ length: totalPages }, (_, i) => totalPages - 1 - i);

    if (onProgress) onProgress(60, "Reversing page order...");
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, reverseIndices);
    copiedPages.forEach(p => newDoc.addPage(p));

    if (onProgress) onProgress(90, "Saving reversed document...");
    const pdfBytes = await newDoc.save();
    if (onProgress) onProgress(100, "Reversal complete!");
    return new Blob([pdfBytes], { type: "application/pdf" });
  }

  /**
   * Duplicate specific pages
   */
  static async duplicatePages(file, pageNum = 1, times = 1, onProgress) {
    const { PDFDocument } = window.PDFLib;
    if (onProgress) onProgress(20, "Loading document...");
    const bytes = await PDFEngine.readFileAsArrayBuffer(file);
    const srcDoc = await PDFDocument.load(bytes);
    const totalPages = srcDoc.getPageCount();
    const targetIdx = Math.max(0, Math.min(totalPages - 1, pageNum - 1));

    const indices = [];
    for (let i = 0; i < totalPages; i++) {
      indices.push(i);
      if (i === targetIdx) {
        for (let t = 0; t < times; t++) {
          indices.push(i);
        }
      }
    }

    if (onProgress) onProgress(60, "Cloning pages...");
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach(p => newDoc.addPage(p));

    if (onProgress) onProgress(90, "Saving document...");
    const pdfBytes = await newDoc.save();
    if (onProgress) onProgress(100, "Pages duplicated!");
    return new Blob([pdfBytes], { type: "application/pdf" });
  }

  /**
   * Create a blank PDF with N pages
   */
  static async createBlankPDF(options = {}, onProgress) {
    const { PDFDocument, rgb } = window.PDFLib;
    const { count = 1, pageSize = "A4", lined = false } = options;
    if (onProgress) onProgress(30, "Generating blank pages...");
    const pdfDoc = await PDFDocument.create();
    const w = 595.28;
    const h = 841.89;

    for (let i = 0; i < count; i++) {
      const page = pdfDoc.addPage([w, h]);
      if (lined) {
        for (let y = 60; y < h - 40; y += 24) {
          page.drawLine({
            start: { x: 40, y },
            end: { x: w - 40, y },
            thickness: 0.5,
            color: rgb(0.85, 0.88, 0.92)
          });
        }
      }
    }

    if (onProgress) onProgress(90, "Finalizing blank PDF...");
    const pdfBytes = await pdfDoc.save();
    if (onProgress) onProgress(100, "Document ready!");
    return new Blob([pdfBytes], { type: "application/pdf" });
  }

  /**
   * Crop PDF by adjusting page crop box
   */
  static async cropPDF(file, marginRatio = 0.05, onProgress) {
    const { PDFDocument } = window.PDFLib;
    if (onProgress) onProgress(20, "Loading document...");
    const bytes = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(bytes);
    const pages = pdfDoc.getPages();

    if (onProgress) onProgress(60, "Cropping margins...");
    pages.forEach(page => {
      const { width, height } = page.getSize();
      const marginX = width * marginRatio;
      const marginY = height * marginRatio;
      page.setCropBox(marginX, marginY, width - marginX * 2, height - marginY * 2);
    });

    if (onProgress) onProgress(90, "Saving cropped document...");
    const pdfBytes = await pdfDoc.save();
    if (onProgress) onProgress(100, "Done!");
    return new Blob([pdfBytes], { type: "application/pdf" });
  }
}

window.OnePDF_PDFEngine = PDFEngine;
