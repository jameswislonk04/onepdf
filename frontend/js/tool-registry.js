/**
 * One PDF - Tool Registry
 * Complete directory of 40 PDF and Document transformation tools.
 * Categories and Counts:
 * - Developer & IPYNB: 2
 * - Organize: 7
 * - Optimize: 5
 * - Convert to PDF: 7
 * - Convert from PDF: 6
 * - Security: 5
 * - Edit: 5
 * - AI Intelligence: 3
 * Total: 40 tools
 */

const TOOL_CATEGORIES = [
  { id: "all", name: "All Tools", icon: "grid" },
  { id: "organize", name: "Organize", icon: "layers" },
  { id: "optimize", name: "Optimize", icon: "zap" },
  { id: "convert-to", name: "Convert to PDF", icon: "arrow-down-circle" },
  { id: "convert-from", name: "Convert from PDF", icon: "arrow-up-circle" },
  { id: "security", name: "Security", icon: "shield" },
  { id: "edit", name: "Edit", icon: "edit-3" },
  { id: "ai", name: "AI Intelligence", icon: "sparkles" },
  { id: "dev", name: "Developer & IPYNB", icon: "code" }
];

const TOOLS_DATABASE = [
  // ⭐ DEVELOPER & IPYNB (2 tools)
  {
    id: "ipynb-to-pdf",
    name: "IPYNB to PDF",
    category: "dev",
    subCategories: ["convert-to", "dev"],
    badge: "⭐ Featured",
    icon: "notebook",
    description: "Convert Jupyter Notebook files into professional, vector-sharp PDF documents.",
    accept: ".ipynb",
    multiple: false,
    featured: true,
    actionType: "ipynb-to-pdf"
  },
  {
    id: "blank-pdf",
    name: "Create Blank PDF",
    category: "dev",
    subCategories: ["organize", "dev"],
    icon: "file-plus",
    description: "Generate custom blank or lined PDF sheets with custom dimensions for development and sketching.",
    accept: "",
    multiple: false,
    actionType: "blank"
  },

  // ORGANIZE PDF (7 tools)
  {
    id: "merge-pdf",
    name: "Merge PDF",
    category: "organize",
    badge: "Popular",
    icon: "merge",
    description: "Combine multiple PDF files into one single document in any custom order you choose.",
    accept: ".pdf",
    multiple: true,
    featured: true,
    actionType: "merge"
  },
  {
    id: "split-pdf",
    name: "Split PDF",
    category: "organize",
    badge: "Popular",
    icon: "split",
    description: "Separate one page or a whole range for easy conversion into independent PDF files.",
    accept: ".pdf",
    multiple: false,
    featured: true,
    actionType: "split"
  },
  {
    id: "remove-pages",
    name: "Remove PDF Pages",
    category: "organize",
    icon: "trash-2",
    description: "Delete unwanted pages visually from your PDF document and download the cleaned version.",
    accept: ".pdf",
    multiple: false,
    actionType: "delete-pages"
  },
  {
    id: "extract-pages",
    name: "Extract PDF Pages",
    category: "organize",
    icon: "copy",
    description: "Select specific pages from your PDF file and export them into a new document.",
    accept: ".pdf",
    multiple: false,
    actionType: "extract-pages"
  },
  {
    id: "rotate-pdf",
    name: "Rotate PDF",
    category: "organize",
    badge: "Popular",
    icon: "rotate-cw",
    description: "Rotate specific pages or your entire PDF document 90, 180, or 270 degrees.",
    accept: ".pdf",
    multiple: false,
    actionType: "rotate"
  },
  {
    id: "reorder-pages",
    name: "Reorder PDF Pages",
    category: "organize",
    icon: "move",
    description: "Rearrange page ordering visually by dragging and dropping thumbnails.",
    accept: ".pdf",
    multiple: false,
    actionType: "reorder"
  },
  {
    id: "page-numbering",
    name: "PDF Page Numbering",
    category: "organize",
    icon: "hash",
    description: "Add custom page numbers with positioning, formatting, margins, and typography.",
    accept: ".pdf",
    multiple: false,
    actionType: "page-numbers"
  },

  // OPTIMIZE PDF (5 tools)
  {
    id: "compress-pdf",
    name: "Compress PDF",
    category: "optimize",
    badge: "Popular",
    icon: "minimize-2",
    description: "Reduce file size while maintaining maximum document and image fidelity.",
    accept: ".pdf",
    multiple: false,
    featured: true,
    actionType: "compress"
  },
  {
    id: "flatten-pdf",
    name: "Flatten PDF",
    category: "optimize",
    icon: "layers",
    description: "Flatten interactive forms and annotations into non-editable base page content.",
    accept: ".pdf",
    multiple: false,
    actionType: "flatten"
  },
  {
    id: "remove-metadata",
    name: "Remove Metadata",
    category: "optimize",
    icon: "eye-off",
    description: "Strip author, creation dates, camera data, and hidden privacy traces from PDFs.",
    accept: ".pdf",
    multiple: false,
    actionType: "remove-metadata"
  },
  {
    id: "repair-pdf",
    name: "Repair PDF",
    category: "optimize",
    icon: "tool",
    description: "Recover and reconstruct damaged or unreadable PDF document catalogs.",
    accept: ".pdf",
    multiple: false,
    actionType: "repair"
  },
  {
    id: "pdf-to-pdfa",
    name: "PDF/A Converter",
    category: "optimize",
    icon: "archive",
    description: "Convert PDFs into standard PDF/A format for long-term archiving and compliance.",
    accept: ".pdf",
    multiple: false,
    actionType: "pdfa"
  },

  // CONVERT TO PDF (7 tools)
  {
    id: "image-to-pdf",
    name: "Image to PDF",
    category: "convert-to",
    badge: "Popular",
    icon: "image",
    description: "Convert JPG, PNG, WEBP, and BMP images into high-quality PDF documents with custom margins.",
    accept: ".jpg,.jpeg,.png,.webp,.bmp,.gif",
    multiple: true,
    featured: true,
    actionType: "image-to-pdf"
  },
  {
    id: "word-to-pdf",
    name: "Word to PDF",
    category: "convert-to",
    badge: "Essential",
    icon: "file-text",
    description: "Convert Microsoft Word documents (.docx) into professional, high-fidelity PDFs.",
    accept: ".docx,.doc",
    multiple: false,
    featured: true,
    actionType: "word-to-pdf"
  },
  {
    id: "excel-to-pdf",
    name: "Excel to PDF",
    category: "convert-to",
    badge: "Essential",
    icon: "table",
    description: "Convert XLSX and CSV spreadsheets into formatted tables inside PDF sheets.",
    accept: ".xlsx,.csv",
    multiple: false,
    actionType: "excel-to-pdf"
  },
  {
    id: "pptx-to-pdf",
    name: "PowerPoint to PDF",
    category: "convert-to",
    badge: "Essential",
    icon: "layers",
    description: "Convert Microsoft PowerPoint presentations (.pptx) into clean landscape PDF slide decks.",
    accept: ".pptx,.ppt",
    multiple: false,
    actionType: "pptx-to-pdf"
  },
  {
    id: "markdown-to-pdf",
    name: "Markdown to PDF",
    category: "convert-to",
    icon: "code",
    description: "Convert Markdown (.md) documents with syntax code blocks and tables into styled PDFs.",
    accept: ".md,.markdown,.txt",
    multiple: false,
    actionType: "markdown-to-pdf"
  },
  {
    id: "html-to-pdf",
    name: "HTML to PDF",
    category: "convert-to",
    icon: "globe",
    description: "Convert HTML files or raw webpage code into accurately styled PDF pages.",
    accept: ".html,.htm",
    multiple: false,
    actionType: "html-to-pdf"
  },
  {
    id: "txt-to-pdf",
    name: "TXT to PDF",
    category: "convert-to",
    icon: "align-left",
    description: "Convert plain text files into clean, readable, paginated PDF documents.",
    accept: ".txt",
    multiple: false,
    actionType: "txt-to-pdf"
  },

  // CONVERT FROM PDF (6 tools)
  {
    id: "pdf-to-word",
    name: "PDF to Word",
    category: "convert-from",
    badge: "Essential",
    icon: "file-text",
    description: "Extract and convert PDF text and layouts into an editable Word document (.docx).",
    accept: ".pdf",
    multiple: false,
    featured: true,
    actionType: "pdf-to-word"
  },
  {
    id: "pdf-to-excel",
    name: "PDF to Excel",
    category: "convert-from",
    badge: "Essential",
    icon: "table",
    description: "Extract tables and tabular data from PDF files directly into editable Excel spreadsheets (.xlsx).",
    accept: ".pdf",
    multiple: false,
    featured: true,
    actionType: "pdf-to-excel"
  },
  {
    id: "pdf-to-jpg",
    name: "PDF to JPG",
    category: "convert-from",
    badge: "Popular",
    icon: "image",
    description: "Render PDF pages into high-resolution JPG images with adjustable DPI.",
    accept: ".pdf",
    multiple: false,
    featured: true,
    actionType: "pdf-to-images"
  },
  {
    id: "pdf-to-png",
    name: "PDF to PNG",
    category: "convert-from",
    icon: "image",
    description: "Extract PDF pages as lossless PNG graphics with crystal-clear fidelity.",
    accept: ".pdf",
    multiple: false,
    actionType: "pdf-to-png"
  },
  {
    id: "pdf-to-txt",
    name: "PDF to TXT",
    category: "convert-from",
    icon: "align-left",
    description: "Extract clean, unformatted plain text from any PDF document for parsing.",
    accept: ".pdf",
    multiple: false,
    actionType: "extract-text"
  },
  {
    id: "pdf-to-markdown",
    name: "PDF to Markdown",
    category: "convert-from",
    icon: "code",
    description: "Convert PDF text, headers, and bullet points into clean Markdown syntax.",
    accept: ".pdf",
    multiple: false,
    actionType: "pdf-to-markdown"
  },

  // SECURITY (5 tools)
  {
    id: "protect-pdf",
    name: "Protect PDF",
    category: "security",
    badge: "Security",
    icon: "lock",
    description: "Encrypt your PDF with strong passwords to prevent unauthorized viewing or printing.",
    accept: ".pdf",
    multiple: false,
    featured: true,
    actionType: "protect"
  },
  {
    id: "unlock-pdf",
    name: "Unlock PDF",
    category: "security",
    icon: "unlock",
    description: "Remove PDF security passwords and permissions when authorized by the owner.",
    accept: ".pdf",
    multiple: false,
    actionType: "unlock"
  },
  {
    id: "redact-pdf",
    name: "Redact PDF",
    category: "security",
    badge: "Security",
    icon: "eye-off",
    description: "Permanently black out and sanitize sensitive PII, phone numbers, and confidential text.",
    accept: ".pdf",
    multiple: false,
    actionType: "redact"
  },
  {
    id: "compare-pdf",
    name: "Compare PDF",
    category: "security",
    icon: "git-diff",
    description: "Inspect side-by-side visual and textual differences between two PDF revisions.",
    accept: ".pdf",
    multiple: true,
    actionType: "compare"
  },
  {
    id: "sign-pdf",
    name: "Sign PDF",
    category: "security",
    subCategories: ["edit", "security"],
    badge: "Popular",
    icon: "pen-tool",
    description: "Sign documents online! Draw your signature, type with cursive font, or upload a stamp.",
    accept: ".pdf",
    multiple: false,
    featured: true,
    actionType: "sign"
  },

  // EDIT (5 tools)
  {
    id: "watermark-pdf",
    name: "Watermark PDF",
    category: "edit",
    badge: "Popular",
    icon: "stamp",
    description: "Stamp customized text or confidential watermarks across all or selected pages.",
    accept: ".pdf",
    multiple: false,
    featured: true,
    actionType: "watermark"
  },
  {
    id: "header-footer-pdf",
    name: "Header & Footer",
    category: "edit",
    badge: "Popular",
    icon: "hash",
    description: "Add running headers, footers, page titles, and timestamps across document pages.",
    accept: ".pdf",
    multiple: false,
    actionType: "header-footer"
  },
  {
    id: "edit-pdf",
    name: "Annotate & Edit PDF",
    category: "edit",
    badge: "New",
    icon: "edit-2",
    description: "Add text boxes, notes, highlights, and freehand sketches directly onto PDF pages.",
    accept: ".pdf",
    multiple: false,
    actionType: "edit"
  },
  {
    id: "crop-pdf",
    name: "Crop PDF",
    category: "edit",
    icon: "crop",
    description: "Trim page margins or select custom crop boundaries on document pages.",
    accept: ".pdf",
    multiple: false,
    actionType: "crop"
  },
  {
    id: "extract-images",
    name: "Extract Images from PDF",
    category: "edit",
    subCategories: ["convert-from", "edit"],
    icon: "image",
    description: "Pull all embedded photographs, diagrams, and figures out of any PDF file.",
    accept: ".pdf",
    multiple: false,
    actionType: "extract-images"
  },

  // AI INTELLIGENCE (3 tools)
  {
    id: "ai-summarize",
    name: "AI PDF Summarizer",
    category: "ai",
    badge: "AI Powered",
    icon: "sparkles",
    description: "Generate instant executive summaries, bullet points, and key takeaways from documents.",
    accept: ".pdf",
    multiple: false,
    featured: true,
    actionType: "ai-summarize"
  },
  {
    id: "ai-qa",
    name: "Document Q&A Chat",
    category: "ai",
    badge: "AI Powered",
    icon: "message-square",
    description: "Ask questions and receive instant answers with references from your PDF contents.",
    accept: ".pdf",
    multiple: false,
    featured: true,
    actionType: "ai-qa"
  },
  {
    id: "ocr-pdf",
    name: "OCR PDF",
    category: "ai",
    badge: "Optical Text",
    icon: "search",
    description: "Convert scanned paper documents and image-only PDFs into selectable, searchable text.",
    accept: ".pdf,.png,.jpg,.jpeg",
    multiple: false,
    featured: true,
    actionType: "ocr"
  }
];

window.OnePDF_Tools = {
  CATEGORIES: TOOL_CATEGORIES,
  DATABASE: TOOLS_DATABASE,
  getAll: () => TOOLS_DATABASE,
  getToolById: (id) => TOOLS_DATABASE.find(t => t.id === id),
  getByCategory: (catId) => {
    if (!catId || catId === "all") return TOOLS_DATABASE;
    return TOOLS_DATABASE.filter(t => t.category === catId);
  },
  search: (query) => {
    if (!query) return TOOLS_DATABASE;
    const q = query.toLowerCase().trim();
    return TOOLS_DATABASE.filter(t => 
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.subCategories && t.subCategories.some(sc => sc.includes(q))) ||
      t.actionType.toLowerCase().includes(q)
    );
  }
};
