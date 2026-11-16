"""
FastAPI Routes for Jupyter Notebook (.ipynb) to PDF Operations.
"""

import os
import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, Response, JSONResponse
from backend.services.ipynb_service import IPYNBService

router = APIRouter(prefix="/api/ipynb", tags=["ipynb"])

@router.get("/sample")
async def get_sample_notebook():
    """Returns the authentic IPCV PRGMS reference notebook as the primary sample."""
    sample_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "frontend", "assets", "samples", "IPCV_PRGMS.ipynb"
    )
    if os.path.exists(sample_path):
        with open(sample_path, "r", encoding="utf-8") as f:
            return JSONResponse(content=json.load(f))

    # Fallback to sample.ipynb
    sample_path_fallback = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "frontend", "assets", "samples", "sample.ipynb"
    )
    if os.path.exists(sample_path_fallback):
        with open(sample_path_fallback, "r", encoding="utf-8") as f:
            return JSONResponse(content=json.load(f))

    raise HTTPException(status_code=404, detail="Sample notebook asset not found.")

@router.post("/inspect")
async def inspect_notebook(file: UploadFile = File(...)):
    """Inspects an uploaded notebook and returns statistics, kernel info, and metadata."""
    if not (file.filename and file.filename.lower().endswith(".ipynb")):
        raise HTTPException(status_code=400, detail="Invalid Jupyter Notebook file. Please upload a valid .ipynb file.")

    try:
        content = await file.read()
        content_str = content.decode("utf-8", errors="replace")
        info = IPYNBService.inspect_notebook(content_str)
        info["filename"] = file.filename
        return JSONResponse(content=info)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail="Invalid Jupyter Notebook file.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Jupyter Notebook file: {str(e)}")

@router.post("/convert")
@router.post("/convert-html")
async def convert_notebook_html(
    file: UploadFile = File(...),
    include_code: bool = Form(True),
    include_output: bool = Form(True),
    include_execution_numbers: bool = Form(True),
    include_images: bool = Form(True),
    syntax_highlighting: bool = Form(True),
    include_toc: bool = Form(False),
    theme: str = Form("light"),
    font_size: str = Form("normal"),
    page_size: str = Form("A4"),
    orientation: str = Form("portrait"),
    margins: str = Form("normal")
):
    """Compiles notebook into high-fidelity One PDF HTML document for preview or embedding."""
    if not (file.filename and file.filename.lower().endswith(".ipynb")):
        raise HTTPException(status_code=400, detail="Invalid Jupyter Notebook file.")

    try:
        content = await file.read()
        content_str = content.decode("utf-8", errors="replace")
        html_output = IPYNBService.convert_to_html(
            nb_json_str=content_str,
            filename=file.filename or "notebook.ipynb",
            include_code=include_code,
            include_output=include_output,
            include_execution_numbers=include_execution_numbers,
            include_images=include_images,
            syntax_highlighting=syntax_highlighting,
            include_toc=include_toc,
            theme=theme,
            font_size=font_size,
            page_size=page_size,
            orientation=orientation,
            margins=margins
        )
        return HTMLResponse(content=html_output)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Jupyter Notebook file.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"HTML conversion error: {str(e)}")

@router.post("/convert-pdf")
async def convert_notebook_to_pdf(
    file: UploadFile = File(...),
    execution_mode: str = Form("export_existing"),
    include_code: bool = Form(True),
    include_output: bool = Form(True),
    include_execution_numbers: bool = Form(True),
    include_images: bool = Form(True),
    syntax_highlighting: bool = Form(True),
    include_toc: bool = Form(False),
    theme: str = Form("light"),
    font_size: str = Form("normal"),
    page_size: str = Form("A4"),
    orientation: str = Form("portrait"),
    margins: str = Form("normal")
):
    """
    Executes notebook (if requested) and exports to a publication-grade PDF
    matching the reference One PDF layout standard.
    """
    if not (file.filename and file.filename.lower().endswith(".ipynb")):
        raise HTTPException(status_code=400, detail="Invalid Jupyter Notebook file.")

    try:
        content = await file.read()
        content_str = content.decode("utf-8", errors="replace")

        pdf_bytes = IPYNBService.convert_to_pdf(
            nb_json_str=content_str,
            filename=file.filename or "notebook.ipynb",
            execution_mode=execution_mode,
            include_code=include_code,
            include_output=include_output,
            include_execution_numbers=include_execution_numbers,
            include_images=include_images,
            syntax_highlighting=syntax_highlighting,
            include_toc=include_toc,
            theme=theme,
            font_size=font_size,
            page_size=page_size,
            orientation=orientation,
            margins=margins
        )

        base_name = file.filename or "notebook.ipynb"
        if base_name.lower().endswith(".ipynb"):
            out_name = base_name[:-6] + ".pdf"
        else:
            out_name = base_name + ".pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Jupyter Notebook file.")
    except TimeoutError as te:
        raise HTTPException(status_code=408, detail=str(te))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF generation error: {str(e)}")
