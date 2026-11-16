import io
import sys
import os
sys.path.insert(0, os.path.abspath("."))
import fitz
import docx
import openpyxl
from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

def create_dummy_pdf():
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Hello One PDF! This is a test document with multiple sentences. It contains interesting information about computer vision and image processing.", fontsize=14)
    page2 = doc.new_page()
    page2.insert_text((72, 72), "Page 2 content. Histogram equalization improves the contrast of images.", fontsize=14)
    out = io.BytesIO()
    doc.save(out)
    doc.close()
    return out.getvalue()

def test_all_backend_tools():
    pdf_bytes = create_dummy_pdf()
    
    print("Testing /api/pdf/info...")
    res = client.post("/api/pdf/info", files={"file": ("test.pdf", pdf_bytes, "application/pdf")})
    assert res.status_code == 200, res.text
    info = res.json()
    assert info["page_count"] == 2
    assert info["has_text"] is True
    print("  -> Info OK")

    print("Testing /api/pdf/protect...")
    res = client.post("/api/pdf/protect", files={"file": ("test.pdf", pdf_bytes, "application/pdf")}, data={"password": "secretpassword123"})
    assert res.status_code == 200, res.text
    protected_bytes = res.content
    print("  -> Protect OK")

    print("Testing /api/pdf/unlock...")
    res = client.post("/api/pdf/unlock", files={"file": ("protected.pdf", protected_bytes, "application/pdf")}, data={"password": "secretpassword123"})
    assert res.status_code == 200, res.text
    print("  -> Unlock OK")

    print("Testing /api/pdf/watermark...")
    res = client.post("/api/pdf/watermark", files={"file": ("test.pdf", pdf_bytes, "application/pdf")}, data={"text": "CONFIDENTIAL", "opacity": 0.5, "font_size": 36})
    assert res.status_code == 200, res.text
    print("  -> Watermark OK")

    print("Testing /api/pdf/compress...")
    res = client.post("/api/pdf/compress", files={"file": ("test.pdf", pdf_bytes, "application/pdf")}, data={"quality": "medium"})
    assert res.status_code == 200, res.text
    print("  -> Compress OK")

    print("Testing /api/pdf/extract-text...")
    res = client.post("/api/pdf/extract-text", files={"file": ("test.pdf", pdf_bytes, "application/pdf")}, data={"max_pages": 10})
    assert res.status_code == 200, res.text
    print("  -> Extract-text OK")

    print("Testing /api/pdf/flatten...")
    res = client.post("/api/pdf/flatten", files={"file": ("test.pdf", pdf_bytes, "application/pdf")})
    assert res.status_code == 200, res.text
    print("  -> Flatten OK")

    print("Testing /api/pdf/remove-metadata...")
    res = client.post("/api/pdf/remove-metadata", files={"file": ("test.pdf", pdf_bytes, "application/pdf")})
    assert res.status_code == 200, res.text
    print("  -> Remove-metadata OK")

    print("Testing /api/pdf/repair...")
    res = client.post("/api/pdf/repair", files={"file": ("test.pdf", pdf_bytes, "application/pdf")})
    assert res.status_code == 200, res.text
    print("  -> Repair OK")

    print("Testing /api/pdf/extract-images...")
    res = client.post("/api/pdf/extract-images", files={"file": ("test.pdf", pdf_bytes, "application/pdf")})
    assert res.status_code == 200, res.text
    assert res.headers["content-type"] == "application/zip"
    print("  -> Extract-images OK")

    print("Testing /api/pdf/from-txt...")
    res = client.post("/api/pdf/from-txt", files={"file": ("note.txt", b"Hello from One PDF plain text converter!\nSecond line of document.", "text/plain")})
    assert res.status_code == 200, res.text
    assert len(res.content) > 500
    print("  -> From-txt OK")

    print("Testing /api/pdf/from-html...")
    res = client.post("/api/pdf/from-html", files={"file": ("page.html", b"<html><body><h1>Sample HTML</h1><p>Converted by One PDF.</p></body></html>", "text/html")})
    assert res.status_code == 200, res.text
    assert len(res.content) > 500
    print("  -> From-html OK")

    print("Testing /api/pdf/from-docx...")
    doc = docx.Document()
    doc.add_heading("Test Docx", 0)
    doc.add_paragraph("Paragraph inside word document.")
    docx_buf = io.BytesIO()
    doc.save(docx_buf)
    res = client.post("/api/pdf/from-docx", files={"file": ("sample.docx", docx_buf.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    assert res.status_code == 200, res.text
    assert len(res.content) > 500
    print("  -> From-docx OK")

    print("Testing /api/pdf/from-excel...")
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Data"
    ws.append(["ID", "Name", "Score"])
    ws.append([1, "Alice", 95])
    excel_buf = io.BytesIO()
    wb.save(excel_buf)
    res = client.post("/api/pdf/from-excel", files={"file": ("data.xlsx", excel_buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
    assert res.status_code == 200, res.text
    assert len(res.content) > 500
    print("  -> From-excel OK")

    print("Testing /api/pdf/to-docx...")
    res = client.post("/api/pdf/to-docx", files={"file": ("test.pdf", pdf_bytes, "application/pdf")})
    assert res.status_code == 200, res.text
    assert len(res.content) > 500
    print("  -> To-docx OK")

    print("Testing /api/ai/summarize...")
    sample_text = "Histogram equalization is a technique for adjusting image intensities to enhance contrast. It accomplishes this by effectively spreading out the most frequent intensity values. This method is useful in images with backgrounds and foregrounds that are both bright or both dark."
    res = client.post("/api/ai/summarize", json={"document_text": sample_text, "summary_type": "executive"})
    assert res.status_code == 200, res.text
    print("  -> AI Summarize OK")

    print("Testing /api/ai/ask...")
    res = client.post("/api/ai/ask", json={"document_text": sample_text, "question": "What is histogram equalization?"})
    assert res.status_code == 200, res.text
    print("  -> AI Ask OK")

    print("Testing /api/pdf/report/summary...")
    res = client.post("/api/pdf/report/summary", data={
        "title": "Computer Vision",
        "summary": "Sample summary text for PDF generation.",
        "bullet_points": "Point 1\nPoint 2",
        "keywords": "AI,Vision,PDF"
    })
    assert res.status_code == 200, res.text
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000
    print("  -> Report Summary PDF OK")

    print("Testing /api/pdf/report/ocr...")
    res = client.post("/api/pdf/report/ocr", data={
        "title": "Scanned Document",
        "text_content": "Extracted OCR text from scanned document."
    })
    assert res.status_code == 200, res.text
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000
    print("  -> Report OCR PDF OK")

    print("Testing /api/pdf/report/images-album...")
    res = client.post("/api/pdf/report/images-album", files={"file": ("test.pdf", pdf_bytes, "application/pdf")})
    assert res.status_code == 200, res.text
    assert res.headers["content-type"] == "application/pdf"
    print("  -> Report Images Album PDF OK")

    print("Testing /api/pdf/from-ui...")
    res = client.post("/api/pdf/from-ui", data={"html_content": "<html><body><h1>One PDF UI Snapshot</h1><p>Exported successfully.</p></body></html>"})
    assert res.status_code == 200, res.text
    assert res.headers["content-type"] == "application/pdf"
    print("  -> Export UI to PDF OK")

    print("\nALL BACKEND TOOLS & PDF EXPORTERS VERIFIED AND PASSING 100%!")

if __name__ == "__main__":
    test_all_backend_tools()
