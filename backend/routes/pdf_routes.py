from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, JSONResponse
from backend.services.pdf_service import PDFService

router = APIRouter(prefix="/api/pdf", tags=["pdf"])

@router.post("/info")
async def get_pdf_info(file: UploadFile = File(...)):
    try:
        content = await file.read()
        info = PDFService.get_info(content)
        info["filename"] = file.filename
        return JSONResponse(content=info)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error inspecting PDF: {str(e)}")

@router.post("/protect")
async def protect_pdf(file: UploadFile = File(...), password: str = Form(...)):
    try:
        content = await file.read()
        protected_bytes = PDFService.protect_pdf(content, password)
        return Response(
            content=protected_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=protected_{file.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error protecting PDF: {str(e)}")

@router.post("/unlock")
async def unlock_pdf(file: UploadFile = File(...), password: str = Form(...)):
    try:
        content = await file.read()
        unlocked_bytes = PDFService.unlock_pdf(content, password)
        return Response(
            content=unlocked_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=unlocked_{file.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error unlocking PDF: {str(e)}")

@router.post("/watermark")
async def watermark_pdf(
    file: UploadFile = File(...),
    text: str = Form(...),
    opacity: float = Form(0.3),
    font_size: int = Form(36)
):
    try:
        content = await file.read()
        watermarked_bytes = PDFService.watermark_pdf(content, text, opacity, font_size)
        return Response(
            content=watermarked_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=watermarked_{file.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error watermarking PDF: {str(e)}")

@router.post("/compress")
async def compress_pdf(file: UploadFile = File(...), quality: str = Form("medium")):
    try:
        content = await file.read()
        original_size = len(content)
        compressed_bytes = PDFService.compress_pdf(content, quality)
        new_size = len(compressed_bytes)
        return Response(
            content=compressed_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=compressed_{file.filename}",
                "X-Original-Size": str(original_size),
                "X-Compressed-Size": str(new_size)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error compressing PDF: {str(e)}")

@router.post("/extract-text")
async def extract_pdf_text(file: UploadFile = File(...), max_pages: int = Form(50)):
    try:
        content = await file.read()
        text = PDFService.extract_full_text(content, max_pages)
        return JSONResponse(content={"text": text, "filename": file.filename})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error extracting text: {str(e)}")

@router.post("/flatten")
async def flatten_pdf_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        flattened = PDFService.flatten_pdf(content)
        return Response(
            content=flattened,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=flattened_{file.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error flattening PDF: {str(e)}")

@router.post("/remove-metadata")
async def remove_metadata_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        cleaned = PDFService.remove_metadata(content)
        return Response(
            content=cleaned,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=clean_{file.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error removing metadata: {str(e)}")

@router.post("/repair")
async def repair_pdf_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        repaired = PDFService.repair_pdf(content)
        return Response(
            content=repaired,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=repaired_{file.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error repairing PDF: {str(e)}")

@router.post("/extract-images")
async def extract_images_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        zip_bytes, count = PDFService.extract_images(content)
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=images_{file.filename.replace('.pdf', '')}.zip",
                "X-Image-Count": str(count)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error extracting images: {str(e)}")

@router.post("/from-txt")
async def from_txt_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        text = content.decode("utf-8", errors="ignore")
        pdf_bytes = PDFService.txt_to_pdf(text, title=file.filename)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={file.filename}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error converting text to PDF: {str(e)}")

@router.post("/from-html")
async def from_html_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        html_str = content.decode("utf-8", errors="ignore")
        pdf_bytes = PDFService.html_to_pdf(html_str)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={file.filename}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error converting HTML to PDF: {str(e)}")

@router.post("/from-docx")
async def from_docx_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        pdf_bytes = PDFService.docx_to_pdf(content, filename=file.filename)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={file.filename.replace('.docx', '').replace('.doc', '')}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error converting Word to PDF: {str(e)}")

@router.post("/from-excel")
async def from_excel_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        pdf_bytes = PDFService.excel_to_pdf(content, filename=file.filename)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={file.filename.replace('.xlsx', '').replace('.csv', '')}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error converting Excel to PDF: {str(e)}")

@router.post("/to-docx")
async def to_docx_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        docx_bytes = PDFService.pdf_to_docx(content)
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={file.filename.replace('.pdf', '')}.docx"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error converting PDF to Word: {str(e)}")

@router.post("/report/summary")
async def report_summary_endpoint(
    title: str = Form("Document"),
    summary: str = Form(""),
    bullet_points: str = Form(""),
    keywords: str = Form("")
):
    try:
        bullets = [b.strip() for b in bullet_points.split("\n") if b.strip()]
        kw_list = [k.strip() for k in keywords.split(",") if k.strip()]
        pdf_bytes = PDFService.generate_summary_pdf(title, summary, bullets, kw_list)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=AI_Summary_{title}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error generating summary PDF: {str(e)}")

@router.post("/report/ocr")
async def report_ocr_endpoint(
    title: str = Form("Document"),
    text_content: str = Form("")
):
    try:
        pdf_bytes = PDFService.generate_ocr_pdf(title, text_content)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=OCR_{title}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error generating OCR PDF: {str(e)}")

@router.post("/report/images-album")
async def report_images_album_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        album_bytes = PDFService.generate_image_album_pdf(content, title=file.filename)
        return Response(
            content=album_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=Images_Album_{file.filename.replace('.pdf', '')}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error generating images album PDF: {str(e)}")

@router.post("/to-excel")
async def to_excel_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        xlsx_bytes = PDFService.pdf_to_excel(content)
        return Response(
            content=xlsx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={file.filename.replace('.pdf', '')}.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error converting PDF to Excel: {str(e)}")

@router.post("/from-pptx")
async def from_pptx_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        pdf_bytes = PDFService.pptx_to_pdf(content, filename=file.filename)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={file.filename.replace('.pptx', '').replace('.ppt', '')}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error converting PowerPoint to PDF: {str(e)}")

@router.post("/redact")
async def redact_pdf_endpoint(
    file: UploadFile = File(...),
    keywords: str = Form(...)
):
    try:
        content = await file.read()
        terms = [k.strip() for k in keywords.split(",") if k.strip()]
        redacted_bytes = PDFService.redact_pdf(content, terms)
        return Response(
            content=redacted_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=redacted_{file.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error redacting PDF: {str(e)}")

@router.post("/header-footer")
async def header_footer_endpoint(
    file: UploadFile = File(...),
    header_text: str = Form(""),
    footer_text: str = Form("")
):
    try:
        content = await file.read()
        stamped_bytes = PDFService.header_footer_pdf(content, header_text=header_text, footer_text=footer_text)
        return Response(
            content=stamped_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=header_footer_{file.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error adding header and footer: {str(e)}")


