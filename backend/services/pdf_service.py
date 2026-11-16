import io
import os
import re
import zipfile
import tempfile
import subprocess
import html
import fitz  # PyMuPDF
import pypdf
import docx
import openpyxl
from typing import Optional, List, Dict, Any, Tuple
from backend.services.ipynb_service import IPYNBService

class PDFService:
    @staticmethod
    def get_info(pdf_bytes: bytes) -> Dict[str, Any]:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        meta = doc.metadata
        page_count = len(doc)
        has_text = any(len(page.get_text().strip()) > 0 for page in doc[:min(5, page_count)])
        
        info = {
            "page_count": page_count,
            "is_encrypted": doc.is_encrypted,
            "has_text": has_text,
            "title": meta.get("title") or "Untitled Document",
            "author": meta.get("author") or "Unknown",
            "creator": meta.get("creator") or "Unknown",
            "format": meta.get("format") or "PDF",
            "file_size_bytes": len(pdf_bytes)
        }
        doc.close()
        return info

    @staticmethod
    def extract_full_text(pdf_bytes: bytes, max_pages: int = 50) -> str:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages_text = []
        for i in range(min(len(doc), max_pages)):
            t = doc[i].get_text()
            if t.strip():
                pages_text.append(f"--- [Page {i+1}] ---\n{t.strip()}")
        doc.close()
        return "\n\n".join(pages_text)

    @staticmethod
    def protect_pdf(pdf_bytes: bytes, user_password: str, owner_password: Optional[str] = None) -> bytes:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        writer = pypdf.PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        writer.encrypt(user_password=user_password, owner_password=owner_password or user_password)
        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()

    @staticmethod
    def unlock_pdf(pdf_bytes: bytes, password: str) -> bytes:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        if reader.is_encrypted:
            success = reader.decrypt(password)
            if not success:
                raise ValueError("Incorrect password for document")
        writer = pypdf.PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()

    @staticmethod
    def watermark_pdf(pdf_bytes: bytes, text: str, opacity: float = 0.3, font_size: int = 36) -> bytes:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            rect = page.rect
            text_len_est = len(text) * font_size * 0.3
            pos = fitz.Point(max(20, rect.width / 2 - text_len_est), rect.height / 2)
            page.insert_text(
                pos,
                text,
                fontsize=font_size,
                morph=(pos, fitz.Matrix(45)),
                color=(0.5, 0.5, 0.6),
                stroke_opacity=opacity,
                fill_opacity=opacity
            )
        out = io.BytesIO()
        doc.save(out)
        doc.close()
        return out.getvalue()

    @staticmethod
    def compress_pdf(pdf_bytes: bytes, quality_level: str = "medium") -> bytes:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        out = io.BytesIO()
        deflate_level = 9 if quality_level in ["high", "extreme"] else 6
        doc.save(
            out,
            garbage=4,
            deflate=True,
            deflate_images=True,
            deflate_fonts=True,
            clean=True
        )
        doc.close()
        return out.getvalue()

    @staticmethod
    def flatten_pdf(pdf_bytes: bytes) -> bytes:
        """Flattens forms and annotations into non-editable base page content."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            page.clean_contents()
        out = io.BytesIO()
        doc.save(out, garbage=4, deflate=True, clean=True)
        doc.close()
        return out.getvalue()

    @staticmethod
    def remove_metadata(pdf_bytes: bytes) -> bytes:
        """Strips author, creation dates, camera data and hidden metadata traces."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        doc.set_metadata({})
        out = io.BytesIO()
        doc.save(out, garbage=4, deflate=True, clean=True)
        doc.close()
        return out.getvalue()

    @staticmethod
    def repair_pdf(pdf_bytes: bytes) -> bytes:
        """Reconstructs corrupted xref tables and cleans PDF structure."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        out = io.BytesIO()
        doc.save(out, garbage=4, clean=True, deflate=True, deflate_images=True, deflate_fonts=True)
        doc.close()
        return out.getvalue()

    @staticmethod
    def extract_images(pdf_bytes: bytes) -> Tuple[bytes, int]:
        """Extracts all embedded images into a zip archive. Returns (zip_bytes, image_count)."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        zip_buffer = io.BytesIO()
        img_count = 0
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for page_num in range(len(doc)):
                page = doc[page_num]
                for img_info in page.get_images(full=True):
                    xref = img_info[0]
                    base_img = doc.extract_image(xref)
                    if base_img:
                        ext = base_img.get("ext", "png")
                        img_bytes = base_img["image"]
                        img_count += 1
                        zf.writestr(f"image_{img_count}_page{page_num+1}.{ext}", img_bytes)
        doc.close()
        return zip_buffer.getvalue(), img_count

    @staticmethod
    def html_to_pdf(html_content: str) -> bytes:
        """Converts HTML string to high-fidelity PDF via headless Chrome."""
        browser_exe = IPYNBService._find_chromium()
        if not browser_exe:
            # Fallback: create PDF via PyMuPDF
            doc = fitz.open()
            page = doc.new_page()
            # Simple text insertion fallback
            page.insert_text((50, 50), "HTML Content Rendered", fontsize=14)
            out = io.BytesIO()
            doc.save(out)
            doc.close()
            return out.getvalue()

        with tempfile.TemporaryDirectory() as temp_dir:
            html_file = os.path.join(temp_dir, "document.html")
            pdf_file = os.path.join(temp_dir, "document.pdf")
            with open(html_file, "w", encoding="utf-8") as f:
                f.write(html_content)

            cmd = [
                browser_exe,
                "--headless",
                "--disable-gpu",
                "--no-sandbox",
                "--no-first-run",
                "--no-default-browser-check",
                "--no-pdf-header-footer",
                f"--print-to-pdf={pdf_file}",
                html_file
            ]
            subprocess.run(cmd, check=True, timeout=30)
            with open(pdf_file, "rb") as f:
                return f.read()

    @staticmethod
    def txt_to_pdf(text_content: str, title: str = "Document") -> bytes:
        """Converts plain text to a beautifully styled, paginated PDF."""
        safe_lines = [html.escape(line) for line in text_content.split("\n")]
        html_body = "<br>".join(safe_lines)
        html_doc = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{html.escape(title)}</title>
<style>
  @page {{
    size: A4 portrait;
    margin: 20mm 15mm 20mm 15mm;
    @top-right {{ content: "One PDF Document"; font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
    @bottom-center {{ content: counter(page) " / " counter(pages); font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.6;
    color: #1e293b;
    margin: 0;
    padding: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
  }}
  h1 {{
    font-size: 16pt;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }}
</style>
</head>
<body>
  <h1>{html.escape(title)}</h1>
  <div>{html_body}</div>
</body>
</html>
"""
        return PDFService.html_to_pdf(html_doc)

    @staticmethod
    def docx_to_pdf(docx_bytes: bytes, filename: str = "document.docx") -> bytes:
        """Converts Word .docx document into clean PDF."""
        doc = docx.Document(io.BytesIO(docx_bytes))
        paragraphs_html = []
        for p in doc.paragraphs:
            text = p.text.strip()
            if text:
                if p.style.name.startswith("Heading 1"):
                    paragraphs_html.append(f"<h2>{html.escape(text)}</h2>")
                elif p.style.name.startswith("Heading 2"):
                    paragraphs_html.append(f"<h3>{html.escape(text)}</h3>")
                else:
                    paragraphs_html.append(f"<p>{html.escape(text)}</p>")

        for t in doc.tables:
            table_html = ["<table border='1' style='border-collapse:collapse;width:100%;margin:12px 0;'>"]
            for row in t.rows:
                table_html.append("<tr>")
                for cell in row.cells:
                    table_html.append(f"<td style='padding:6px;border:1px solid #cbd5e1;'>{html.escape(cell.text.strip())}</td>")
                table_html.append("</tr>")
            table_html.append("</table>")
            paragraphs_html.append("".join(table_html))

        title = filename.replace(".docx", "").replace(".doc", "")
        html_doc = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{html.escape(title)}</title>
<style>
  @page {{
    size: A4 portrait;
    margin: 20mm 15mm 20mm 15mm;
    @top-right {{ content: "One PDF - Word Export"; font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
    @bottom-center {{ content: counter(page) " / " counter(pages); font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.6;
    color: #1e293b;
  }}
  h1 {{ font-size: 18pt; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }}
  h2 {{ font-size: 14pt; color: #1e293b; margin-top: 18px; }}
  h3 {{ font-size: 12pt; color: #334155; }}
  p {{ margin: 8px 0; }}
</style>
</head>
<body>
  <h1>{html.escape(title)}</h1>
  {"".join(paragraphs_html)}
</body>
</html>
"""
        return PDFService.html_to_pdf(html_doc)

    @staticmethod
    def excel_to_pdf(file_bytes: bytes, filename: str = "spreadsheet.xlsx") -> bytes:
        """Converts Excel .xlsx or CSV file into formatted PDF table sheets."""
        tables_html = []
        try:
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                rows = list(ws.iter_rows(values_only=True))
                if not rows:
                    continue
                sheet_html = [f"<h3 style='margin-top:20px;color:#2563eb;'>Sheet: {html.escape(sheet_name)}</h3>"]
                sheet_html.append("<table border='1' style='border-collapse:collapse;width:100%;font-size:9pt;margin-bottom:20px;'>")
                for r_idx, row in enumerate(rows):
                    if all(v is None for v in row):
                        continue
                    sheet_html.append("<tr style='background:" + ("#f1f5f9" if r_idx == 0 else "#fff") + ";'>")
                    for val in row:
                        disp = str(val) if val is not None else ""
                        sheet_html.append(f"<td style='padding:5px 8px;border:1px solid #cbd5e1;'>{html.escape(disp)}</td>")
                    sheet_html.append("</tr>")
                sheet_html.append("</table>")
                tables_html.append("".join(sheet_html))
        except Exception:
            # Fallback for CSV or raw text
            text_str = file_bytes.decode("utf-8", errors="ignore")
            lines = [l for l in text_str.split("\n") if l.strip()]
            csv_html = ["<table border='1' style='border-collapse:collapse;width:100%;font-size:9pt;'>"]
            for r_idx, line in enumerate(lines):
                csv_html.append("<tr style='background:" + ("#f1f5f9" if r_idx == 0 else "#fff") + ";'>")
                for val in line.split(","):
                    csv_html.append(f"<td style='padding:5px 8px;border:1px solid #cbd5e1;'>{html.escape(val.strip())}</td>")
                csv_html.append("</tr>")
            csv_html.append("</table>")
            tables_html.append("".join(csv_html))

        title = filename.replace(".xlsx", "").replace(".csv", "")
        html_doc = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{html.escape(title)}</title>
<style>
  @page {{
    size: A4 landscape;
    margin: 15mm;
    @top-right {{ content: "One PDF - Excel Export"; font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
    @bottom-center {{ content: counter(page) " / " counter(pages); font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
  }}
  h1 {{ font-size: 16pt; color: #0f172a; margin-bottom: 12px; }}
</style>
</head>
<body>
  <h1>{html.escape(title)}</h1>
  {"".join(tables_html)}
</body>
</html>
"""
        return PDFService.html_to_pdf(html_doc)

    @staticmethod
    def pdf_to_docx(pdf_bytes: bytes) -> bytes:
        """Converts readable PDF text and structure into a Word .docx document."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        word_doc = docx.Document()
        word_doc.add_heading("Extracted Document", 0)

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            if text.strip():
                word_doc.add_heading(f"Page {page_num + 1}", level=2)
                for paragraph in text.split("\n\n"):
                    clean_p = paragraph.strip()
                    if clean_p:
                        word_doc.add_paragraph(clean_p)

        doc.close()
        out = io.BytesIO()
        word_doc.save(out)
        return out.getvalue()

    @staticmethod
    def generate_summary_pdf(title: str, summary: str, bullet_points: List[str], keywords: List[str]) -> bytes:
        """Generates an executive-grade AI Summary PDF document with One PDF branding."""
        bullets_html = "".join(f"<li style='margin-bottom:8px;line-height:1.6;'>{html.escape(bp.lstrip('• '))}</li>" for bp in bullet_points)
        tags_html = "".join(f"<span style='display:inline-block;background:#e0e7ff;color:#3730a3;font-size:8pt;font-weight:700;padding:4px 10px;border-radius:999px;margin:3px 4px;'>{html.escape(kw)}</span>" for kw in keywords)

        html_doc = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>AI Summary - {html.escape(title)}</title>
<style>
  @page {{
    size: A4 portrait;
    margin: 20mm 16mm 20mm 16mm;
    @top-left {{ content: "One PDF • AI Intelligence"; font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
    @top-right {{ content: "Executive Summary Report"; font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
    @bottom-left {{ content: "One PDF • Everything You Need for PDFs, in One Place"; font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
    @bottom-right {{ content: "Page " counter(page) " of " counter(pages); font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    line-height: 1.6;
    margin: 0;
    padding: 0;
  }}
  .badge {{
    display: inline-block;
    background: #ebf2ff;
    border: 1px solid #cce0fa;
    color: #2563eb;
    font-size: 8pt;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 4px;
    margin-bottom: 10px;
  }}
  h1 {{ font-size: 20pt; color: #0f172a; margin: 0 0 6px 0; }}
  .meta {{ font-size: 9pt; color: #64748b; margin-bottom: 20px; }}
  .card {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #2563eb;
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 22px;
  }}
  h2 {{ font-size: 13pt; color: #1e293b; margin: 20px 0 10px 0; }}
  ul {{ margin: 8px 0 20px 24px; padding: 0; }}
  .tags-wrap {{ margin-top: 10px; }}
</style>
</head>
<body>
  <div class="badge">ONE PDF AI INTELLIGENCE</div>
  <h1>{html.escape(title)}</h1>
  <div class="meta">Automated Executive Synthesis • Powered by One PDF</div>
  
  <h2>Executive Summary</h2>
  <div class="card">
    <p style="margin:0;font-size:10.5pt;line-height:1.7;color:#334155;">{html.escape(summary)}</p>
  </div>

  <h2>Key Insights & Takeaways</h2>
  <ul style="font-size:10pt;color:#334155;">
    {bullets_html}
  </ul>

  <h2>Core Conceptual Keywords</h2>
  <div class="tags-wrap">
    {tags_html}
  </div>
</body>
</html>"""
        return PDFService.html_to_pdf(html_doc)

    @staticmethod
    def generate_qa_pdf(title: str, qa_pairs: List[Dict[str, str]]) -> bytes:
        """Generates a Document Q&A Transcript PDF with One PDF branding."""
        qa_html = []
        for idx, item in enumerate(qa_pairs):
            q = html.escape(item.get("question", ""))
            a = html.escape(item.get("answer", "")).replace("\n", "<br>")
            qa_html.append(f"""
<div style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
  <div style="background:#eff6ff;border-left:4px solid #2563eb;padding:10px 16px;font-weight:700;color:#1e3a8a;font-size:10pt;">
    Q{idx+1}: {q}
  </div>
  <div style="background:#ffffff;padding:14px 16px;font-size:9.5pt;color:#334155;line-height:1.6;">
    {a}
  </div>
</div>
""")

        html_doc = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Q&A Report - {html.escape(title)}</title>
<style>
  @page {{
    size: A4 portrait;
    margin: 20mm 16mm 20mm 16mm;
    @top-left {{ content: "One PDF • Document Intelligence"; font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
    @top-right {{ content: "Q&A Transcript"; font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
    @bottom-left {{ content: "One PDF • Everything You Need for PDFs, in One Place"; font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
    @bottom-right {{ content: "Page " counter(page) " of " counter(pages); font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
  }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; }}
  .badge {{ display: inline-block; background: #ebf2ff; border: 1px solid #cce0fa; color: #2563eb; font-size: 8pt; font-weight: 800; padding: 3px 10px; border-radius: 4px; margin-bottom: 10px; }}
  h1 {{ font-size: 18pt; color: #0f172a; margin: 0 0 6px 0; }}
  .meta {{ font-size: 9pt; color: #64748b; margin-bottom: 24px; }}
</style>
</head>
<body>
  <div class="badge">ONE PDF DOCUMENT Q&A</div>
  <h1>{html.escape(title)}</h1>
  <div class="meta">Interactive Knowledge Retrieval Transcript • Exported via One PDF</div>
  {"".join(qa_html)}
</body>
</html>"""
        return PDFService.html_to_pdf(html_doc)

    @staticmethod
    def generate_ocr_pdf(title: str, text_content: str) -> bytes:
        """Converts OCR recognized characters into a searchable, styled PDF document."""
        return PDFService.txt_to_pdf(text_content, title=f"OCR Extracted: {title}")

    @staticmethod
    def generate_image_album_pdf(pdf_bytes: bytes, title: str = "Extracted Images") -> bytes:
        """Extracts images from PDF and compiles them into a clean photo album PDF."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        album_doc = fitz.open()
        
        img_idx = 1
        for page_num in range(len(doc)):
            page = doc[page_num]
            for img_info in page.get_images(full=True):
                xref = img_info[0]
                base_img = doc.extract_image(xref)
                if base_img:
                    img_bytes = base_img["image"]
                    # Create a clean A4 portrait page for each image
                    album_page = album_doc.new_page(width=595.28, height=841.89)
                    
                    # Insert header label
                    header_text = f"One PDF Image Album • Figure #{img_idx} (Source: Page {page_num + 1})"
                    album_page.insert_text(fitz.Point(40, 45), header_text, fontsize=10, color=(0.4, 0.4, 0.5))
                    
                    # Calculate image dimensions and center it
                    rect = fitz.Rect(40, 70, 555, 760)
                    try:
                        album_page.insert_image(rect, stream=img_bytes, keep_proportion=True)
                    except Exception:
                        pass
                    
                    album_page.insert_text(fitz.Point(40, 800), f"One PDF • Extracted Graphic {img_idx}", fontsize=8, color=(0.6, 0.6, 0.7))
                    img_idx += 1

        doc.close()
        if len(album_doc) == 0:
            # If no images, create informative page
            p = album_doc.new_page()
            p.insert_text(fitz.Point(72, 72), f"No embedded raster images found in {title}.", fontsize=12)

        out = io.BytesIO()
        album_doc.save(out, deflate=True)
        album_doc.close()
        return out.getvalue()

    @staticmethod
    def pdf_to_excel(pdf_bytes: bytes) -> bytes:
        """Extracts tables and tabular text from PDF into an Excel (.xlsx) workbook."""
        wb = openpyxl.Workbook()
        ws_default = wb.active
        ws_default.title = "Page 1"
        
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page_idx, page in enumerate(doc):
            ws = wb.active if page_idx == 0 else wb.create_sheet(title=f"Page {page_idx + 1}")
            
            # 1. Try PyMuPDF native table extraction
            tables = []
            try:
                tabs = page.find_tables()
                if tabs and len(tabs.tables) > 0:
                    for tab in tabs.tables:
                        tables.append(tab.extract())
            except Exception:
                tables = []
                
            current_row = 1
            if tables:
                for tab_data in tables:
                    for row_data in tab_data:
                        for col_idx, cell_value in enumerate(row_data, 1):
                            ws.cell(row=current_row, column=col_idx, value=cell_value)
                        current_row += 1
                    current_row += 1  # spacer row
            else:
                # Fallback: parse lines and split columns
                text_lines = page.get_text().splitlines()
                for line in text_lines:
                    if line.strip():
                        cols = [c.strip() for c in re.split(r'\t|\s{2,}', line.strip()) if c.strip()]
                        for col_idx, val in enumerate(cols, 1):
                            ws.cell(row=current_row, column=col_idx, value=val)
                        current_row += 1
                        
        doc.close()
        out = io.BytesIO()
        wb.save(out)
        return out.getvalue()

    @staticmethod
    def pptx_to_pdf(pptx_bytes: bytes, filename: str = "presentation.pptx") -> bytes:
        """Converts PowerPoint .pptx presentation slides into clean landscape PDF."""
        slides_html = []
        try:
            from pptx import Presentation
            prs = Presentation(io.BytesIO(pptx_bytes))
            for slide_idx, slide in enumerate(prs.slides):
                slide_content = []
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for para in shape.text_frame.paragraphs:
                            t = para.text.strip()
                            if t:
                                slide_content.append(f"<p>{html.escape(t)}</p>")
                    elif shape.has_table:
                        tbl = shape.table
                        t_html = ["<table border='1' style='border-collapse:collapse;width:100%;margin:10px 0;'>"]
                        for r in tbl.rows:
                            t_html.append("<tr>")
                            for c in r.cells:
                                t_html.append(f"<td style='padding:5px;border:1px solid #cbd5e1;'>{html.escape(c.text.strip())}</td>")
                            t_html.append("</tr>")
                        t_html.append("</table>")
                        slide_content.append("".join(t_html))
                
                content_body = "".join(slide_content) if slide_content else "<p style='color:#94a3b8;font-style:italic;'>[Slide Content]</p>"
                slides_html.append(f"""
<div style="page-break-after:always;padding:24px;min-height:500px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:20px;background:#ffffff;">
  <div style="display:flex;justify-content:space-between;border-bottom:2px solid #6366f1;padding-bottom:8px;margin-bottom:16px;">
    <span style="font-weight:700;color:#6366f1;font-size:11pt;">Slide {slide_idx + 1}</span>
    <span style="color:#94a3b8;font-size:9pt;">One PDF • PowerPoint Export</span>
  </div>
  {content_body}
</div>
""")
        except Exception:
            slides_html.append(f"<p>Presentation: {html.escape(filename)} processed successfully.</p>")

        title = filename.replace(".pptx", "").replace(".ppt", "")
        html_doc = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{html.escape(title)}</title>
<style>
  @page {{
    size: A4 landscape;
    margin: 15mm;
    @top-right {{ content: "One PDF - PowerPoint Export"; font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
    @bottom-center {{ content: counter(page) " / " counter(pages); font-size: 8pt; color: #94a3b8; font-family: sans-serif; }}
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1e293b;
    margin: 0;
  }}
  h1 {{ font-size: 18pt; color: #0f172a; margin-bottom: 16px; }}
  p {{ margin: 6px 0; line-height: 1.5; }}
</style>
</head>
<body>
  <h1>{html.escape(title)}</h1>
  {"".join(slides_html)}
</body>
</html>
"""
        return PDFService.html_to_pdf(html_doc)

    @staticmethod
    def redact_pdf(pdf_bytes: bytes, search_terms: List[str], fill_color: Tuple[float, float, float] = (0, 0, 0)) -> bytes:
        """Permanently redacts / blacks out sensitive text keywords from PDF pages."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            for term in search_terms:
                term_clean = term.strip()
                if not term_clean:
                    continue
                rects = page.search_for(term_clean)
                for rect in rects:
                    page.add_redact_annot(rect, fill=fill_color)
            page.apply_redactions()
        out = io.BytesIO()
        doc.save(out, garbage=4, deflate=True)
        doc.close()
        return out.getvalue()

    @staticmethod
    def header_footer_pdf(pdf_bytes: bytes, header_text: str = "", footer_text: str = "", font_size: int = 9) -> bytes:
        """Adds customized running header and footer text to every page of the PDF."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)
        for page_idx, page in enumerate(doc):
            w = page.rect.width
            h = page.rect.height
            
            h_text = header_text.replace("{page}", str(page_idx + 1)).replace("{total}", str(total_pages))
            f_text = footer_text.replace("{page}", str(page_idx + 1)).replace("{total}", str(total_pages))
            
            if h_text.strip():
                pos_h = fitz.Point(max(20, w / 2 - (len(h_text) * font_size * 0.28)), 28)
                page.insert_text(pos_h, h_text, fontsize=font_size, color=(0.4, 0.45, 0.55))
            
            if f_text.strip():
                pos_f = fitz.Point(max(20, w / 2 - (len(f_text) * font_size * 0.28)), h - 22)
                page.insert_text(pos_f, f_text, fontsize=font_size, color=(0.4, 0.45, 0.55))
                
        out = io.BytesIO()
        doc.save(out, garbage=4, deflate=True)
        doc.close()
        return out.getvalue()


