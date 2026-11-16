# One PDF

> **"Everything You Need for PDFs, in One Place."**

**One PDF** is a modern, privacy-first, production-grade document workspace providing 40 specialized tools across 8 categories, powered by an isolated FastAPI backend, client-side processing, and a flagship **IPYNB to PDF** converter.

---

## 🚀 Key Features

### 1. 40 Dedicated Document Tools across 8 Categories
- **Organize (7)**: Merge PDF, Split PDF, Remove Pages, Extract Pages, Rotate, Reorder, Page Numbering.
- **Optimize (5)**: Compress PDF, Flatten PDF, Remove Metadata, Repair PDF, PDF/A Converter.
- **Convert to PDF (7)**: Image (JPG/PNG) to PDF, Word (DOCX) to PDF, Excel (XLSX) to PDF, PowerPoint (PPTX) to PDF, Markdown to PDF, HTML to PDF, TXT to PDF.
- **Convert from PDF (6)**: PDF to JPG, PDF to PNG, PDF to Word (DOCX), PDF to Excel (XLSX), PDF to TXT, PDF to Markdown.
- **Security & Privacy (5)**: Redact PDF (Permanent Text Scrubbing), Protect PDF (Password Encryption), Unlock PDF, Compare PDFs, Sign PDF (Interactive Signature Pad).
- **Edit & Annotate (5)**: Watermark PDF, Header & Footer (Dynamic Macros & Stamping), Annotate & Edit, Crop PDF, Extract Images from PDF.
- **AI Intelligence (3)**: AI PDF Summarizer, Document Q&A Chat, OCR PDF (Searchable Text Extraction).
- **Developer & IPYNB (2)**: Flagship IPYNB to PDF Converter, Create Blank PDF.

---

### 2. Flagship IPYNB → PDF Conversion Engine
- **High-Fidelity Rendering**: Leverages a headless Chromium print pipeline for publication-grade typography and selectable text.
- **Preserved Figures & Outputs**: Embedded Matplotlib graphs, plots, tables, and ANSI error traces remain 100% true to source.
- **Dark Mode Chart Safety**: Charts and figures retain a clean white canvas backing (`background: #ffffff; filter: none !important`) so plot axes and color bars are never inverted or darkened.
- **Running Headers & Footers**: Clean pagination with running document headers and `Page X of Y` footers.
- **Isolated Execution Sandbox**:
  - Optional notebook execution with a strict 45-second timeout.
  - Subprocess environment restricts external network access while preserving local loopback IPC for ZeroMQ Jupyter kernel communication.
  - Temporary workspace automatically purged immediately following conversion.

---

### 3. Privacy-First Architecture & Global 5-Minute Auto-Deletion
- **Client-Side First**: Standard operations execute directly inside the user's browser without uploading files when supported.
- **Ephemeral Server Sandboxes**: When server-side processing is necessary, files are created inside isolated system temporary directories.
- **Strict 5-Minute Purge**: A background daemon worker sweeps and permanently purges server temporary files after 300 seconds (5 minutes).
- **Client Device Isolation**: Local files on the user's computer are never modified or deleted.

---

### 4. Modern SaaS User Interface
- **Polished Hero Section**: Includes live backend engine health detection (`Loading engines...` → `All Engines Active`), dynamic tool counts, and interactive category filter tabs.
- **Interactive Workspace Showcase**: Direct launch cards for popular tools (`Merge PDF`, `Compress PDF`, `PDF to Word`, `IPYNB → PDF`).
- **Complete Light & Dark Mode**: Seamless toggle with `localStorage` persistence and instantaneous `<head>` theme initialization to prevent Flash of Unstyled Content (FOUC).
- **Accessibility & Motion Control**: Full `@media (prefers-reduced-motion: reduce)` support and accessible keyboard navigation.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, FastAPI, Uvicorn, Starlette
- **PDF & Document Processing**: PyMuPDF (`fitz`), `pdfplumber`, `reportlab`, `python-docx`, `openpyxl`, `python-pptx`, `Pillow`
- **Jupyter Notebook Engine**: `nbformat`, `nbconvert`, `jupyter_client`, Chromium Headless
- **Frontend**: Vanilla JavaScript (ES6+), Modern CSS Design Tokens, HTML5

---

## 📋 Prerequisites

- **Python 3.10+**
- **Google Chrome** or **Chromium** (for high-fidelity IPYNB and UI PDF generation)

---

## 📦 Installation & Setup

1. **Clone or Navigate to the Project Root**:
   ```bash
   cd onepdf
   ```

2. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the One PDF Server**:
   ```bash
   python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
   ```

4. **Open in Browser**:
   - **One PDF Platform**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
   - **IPYNB to PDF Tool**: [http://127.0.0.1:8000/ipynb-to-pdf](http://127.0.0.1:8000/ipynb-to-pdf)
   - **Interactive API Documentation (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - **Lifecycle Service Status**: [http://127.0.0.1:8000/api/lifecycle/status](http://127.0.0.1:8000/api/lifecycle/status)

---

## 🧪 Running Automated Tests

Run the built-in test suites to verify functionality:

1. **Verify All 21 Backend Tool Routes & Exporters**:
   ```bash
   python backend/test_all_tools.py
   ```

2. **Verify IPYNB to PDF Conversion Suite**:
   ```bash
   python backend/test_ipynb_suite.py
   ```

3. **Verify 5-Minute File Lifecycle Auto-Deletion**:
   ```bash
   python backend/test_lifecycle.py
   ```

---

## 📂 Project Structure

```
onepdf/
├── backend/
│   ├── app.py                      # FastAPI application entry point
│   ├── routes/
│   │   ├── pdf_routes.py           # Endpoints for PDF manipulation & conversion
│   │   ├── ipynb_routes.py         # Endpoints for IPYNB parsing & PDF export
│   │   ├── ai_routes.py            # Endpoints for AI summary & Q&A
│   │   └── lifecycle_routes.py     # File lifecycle tracking & manual cleanup endpoints
│   ├── services/
│   │   ├── pdf_service.py          # PyMuPDF & ReportLab PDF processing engine
│   │   ├── ipynb_service.py        # Headless Chromium notebook rendering pipeline
│   │   ├── ai_service.py           # Summarization & document extraction engine
│   │   └── lifecycle_service.py    # 5-minute background auto-deletion worker
│   ├── test_all_tools.py           # End-to-end test suite for all backend tools
│   ├── test_ipynb_suite.py         # Test suite for IPYNB vector conversion
│   └── test_lifecycle.py           # Lifecycle auto-deletion verification tests
├── frontend/
│   ├── index.html                  # Main One PDF platform single-page application
│   ├── css/
│   │   ├── main.css                # Design system, theme tokens, animations & hero styling
│   │   ├── tools.css               # Tool workspace modal, dropzones & queue styling
│   │   └── ipynb-viewer.css        # Real-time high-fidelity notebook preview styles
│   └── js/
│       ├── tool-registry.js        # Catalog of all 40 tools across 8 categories
│       ├── pdf-engine.js           # Client-side PDF helper routines
│       ├── ipynb-engine.js         # Notebook parser & live preview renderer
│       ├── ai-engine.js            # Frontend AI interface handlers
│       └── app.js                  # Application controller, routing & theme manager
├── scripts/
│   └── generate_ui_pdf.py          # Headless Chromium UI snapshot exporter
├── requirements.txt                # Python package dependencies
└── README.md                       # Project documentation
```

---

## 🔒 Security & Privacy Policy

- **No Unauthorized Deletions**: The lifecycle cleaner only deletes temporary files strictly located inside the designated system temporary directory (`.tmp_lifecycle`).
- **Sandbox Timeouts**: Notebook code execution runs in an isolated subprocess with resource limits and an enforced 45-second execution timeout.
- **Zero Persistent Data**: Files uploaded to the server are wiped automatically after 300 seconds without permanent retention.

---

## 📄 License

This project is licensed under the MIT License.

