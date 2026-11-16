"""
One PDF - Comprehensive Test Suite for IPYNB to PDF Engine
Verifies reference reconstruction, selectable text, sandboxed security,
invalid file rejection, and stress tests (1 cell, 10 cells, 50+ cells, tables, errors, empty cells).
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
import time
import pytest
import fitz  # PyMuPDF
from backend.services.ipynb_service import IPYNBService

SAMPLE_NOTEBOOK_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "frontend", "assets", "samples", "IPCV_PRGMS.ipynb"
)

def test_reference_notebook_conversion():
    """1. Test that the reference notebook converts to real vector PDF matching IPCV PRGMS_OnePDF.pdf."""
    assert os.path.exists(SAMPLE_NOTEBOOK_PATH), f"Sample notebook missing: {SAMPLE_NOTEBOOK_PATH}"

    with open(SAMPLE_NOTEBOOK_PATH, "r", encoding="utf-8") as f:
        nb_str = f.read()

    # Inspect metadata
    info = IPYNBService.inspect_notebook(nb_str)
    assert info["total_cells"] == 4, f"Expected 4 cells, got {info['total_cells']}"
    assert info["code_cells"] == 3, f"Expected 3 code cells, got {info['code_cells']}"
    assert info["markdown_cells"] == 1, f"Expected 1 markdown cell, got {info['markdown_cells']}"
    assert "Python 3" in info["kernel_name"]

    # Convert to PDF
    pdf_bytes = IPYNBService.convert_to_pdf(
        nb_json_str=nb_str,
        filename="IPCV PRGMS.ipynb",
        execution_mode="export_existing"
    )
    assert len(pdf_bytes) > 50000, "PDF bytes should be non-empty and substantial"

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    assert len(doc) == 3, f"Expected 3 pages matching reference PDF, got {len(doc)}"

    # Check Page 1
    p1 = doc[0]
    p1_text = p1.get_text()
    assert "JUPYTER NOTEBOOK EXPORT" in p1_text, "Missing Page 1 export badge"
    assert "IPCV PRGMS" in p1_text, "Missing Page 1 title"
    assert "Kernel: Python 3" in p1_text, "Missing Page 1 kernel info"
    assert "One PDF • Everything You Need for PDFs, in One Place" in p1_text, "Missing One PDF footer"
    assert "Page 1 of 3" in p1_text, "Missing Page 1 of 3 page number"
    assert "import cv2" in p1_text, "Missing In [2] code on page 1"

    # Check Page 2
    p2 = doc[1]
    p2_text = p2.get_text()
    assert "IPCV PRGMS" in p2_text, "Missing running header on page 2"
    assert "ONE PDF" in p2_text, "Missing ONE PDF running header on page 2"
    assert "Page 2 of 3" in p2_text, "Missing Page 2 of 3"

    # Check Page 3
    p3 = doc[2]
    p3_text = p3.get_text()
    assert "IPCV PRGMS" in p3_text, "Missing running header on page 3"
    assert "ONE PDF" in p3_text, "Missing ONE PDF running header on page 3"
    assert "Page 3 of 3" in p3_text, "Missing Page 3 of 3"

    # Verify no unwanted browser URLs or file paths
    for page in doc:
        txt = page.get_text()
        assert "file:///" not in txt, "Found leaked browser temp file URL in margins"
        assert "document.html" not in txt, "Found leaked document.html in margins"

    print("✓ Reference notebook converted and verified matching IPCV PRGMS_OnePDF.pdf layout.")

def test_selectable_text_and_figures():
    """2. Verify that text, code, markdown, and figure descriptors are selectable, not flattened images."""
    with open(SAMPLE_NOTEBOOK_PATH, "r", encoding="utf-8") as f:
        nb_str = f.read()

    pdf_bytes = IPYNBService.convert_to_pdf(nb_str, filename="IPCV PRGMS.ipynb")
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    # Words check
    p1_words = doc[0].get_text("words")
    p2_words = doc[1].get_text("words")
    assert len(p1_words) > 100, "Page 1 must have rich selectable text"
    assert len(p2_words) > 100, "Page 2 must have rich selectable text"

    # Check that embedded figures are real images
    images_found = 0
    for page in doc:
        img_list = page.get_images(full=True)
        images_found += len(img_list)
    assert images_found >= 2, f"Expected at least 2 embedded figure images, found {images_found}"

    print(f"✓ Selectable text verified: Page 1 ({len(p1_words)} words), Page 2 ({len(p2_words)} words), {images_found} embedded figures.")

def test_invalid_notebook_validation():
    """3. Test that invalid notebooks trigger 'Invalid Jupyter Notebook file.'"""
    with pytest.raises(ValueError) as exc:
        IPYNBService.validate_notebook("This is clearly not a json notebook")
    assert "Invalid Jupyter Notebook file." in str(exc.value)

    with pytest.raises(ValueError) as exc:
        IPYNBService.validate_notebook(json.dumps({"some_key": "no_cells_here"}))
    assert "Invalid Jupyter Notebook file." in str(exc.value)

    print("✓ Invalid notebook validation correctly rejected invalid inputs.")

def test_sandboxed_execution():
    """4. Test that Run Notebook & Export executes code securely in an isolated sandbox."""
    calc_nb = {
        "cells": [
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "source": ["a = 10\nb = 25\nprint(f'Computed Result: {a * b}')"],
                "outputs": []
            }
        ],
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.11"}
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }

    # Execute in sandbox
    executed_nb = IPYNBService.execute_notebook_sandboxed(calc_nb, timeout_seconds=15)
    out_cell = executed_nb["cells"][0]
    assert out_cell["execution_count"] is not None
    assert len(out_cell["outputs"]) > 0
    stream_out = out_cell["outputs"][0].get("text", "")
    assert "Computed Result: 250" in "".join(stream_out)

    print("✓ Sandboxed execution successfully computed results in isolated environment.")

def test_sandboxed_network_blocking():
    """5. Test that network connections are blocked inside the sandbox."""
    net_nb = {
        "cells": [
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "source": [
                    "import urllib.request\n",
                    "try:\n",
                    "    urllib.request.urlopen('http://example.com', timeout=2)\n",
                    "    print('FAIL: Connected')\n",
                    "except Exception as e:\n",
                    "    print('BLOCKED:', type(e).__name__)\n"
                ],
                "outputs": []
            }
        ],
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }

    executed_nb = IPYNBService.execute_notebook_sandboxed(net_nb, timeout_seconds=15)
    out_text = "".join(executed_nb["cells"][0]["outputs"][0].get("text", []))
    assert "BLOCKED" in out_text, f"Expected network block, got: {out_text}"
    print("✓ Sandbox network isolation verified.")

def test_large_notebook_suite():
    """6. Stress test with 1-cell, 10-cell, 50+ cell notebooks, long code, tables, errors, and empty cells."""
    # A. 1-cell notebook
    nb_1 = {
        "cells": [{"cell_type": "markdown", "metadata": {}, "source": ["# Minimal Notebook\nSingle cell test."]}],
        "metadata": {"kernelspec": {"display_name": "Python 3"}},
        "nbformat": 4, "nbformat_minor": 5
    }
    pdf_1 = IPYNBService.convert_to_pdf(json.dumps(nb_1), filename="single_cell.ipynb")
    doc_1 = fitz.open(stream=pdf_1, filetype="pdf")
    assert len(doc_1) >= 1
    assert "Minimal Notebook" in doc_1[0].get_text()

    # B. Notebook with tables, errors, empty cells, and long code
    mixed_cells = [
        {"cell_type": "markdown", "metadata": {}, "source": ["# Comprehensive Stress Notebook\nTesting edge cases."]},
        # HTML dataframe table
        {
            "cell_type": "code",
            "execution_count": 1,
            "metadata": {},
            "source": ["import pandas as pd\ndf = pd.DataFrame({'A': [1, 2], 'B': ['Alpha', 'Beta']})\ndf"],
            "outputs": [{
                "output_type": "execute_result",
                "execution_count": 1,
                "data": {
                    "text/html": ["<table class='dataframe'><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>Alpha</td></tr></table>"],
                    "text/plain": ["   A      B\n0  1  Alpha\n1  2   Beta"]
                }
            }]
        },
        # Long code cell (50 lines)
        {
            "cell_type": "code",
            "execution_count": 2,
            "metadata": {},
            "source": [f"# Line {i}\nval_{i} = {i} * 2\n" for i in range(50)],
            "outputs": []
        },
        # Cell with error traceback
        {
            "cell_type": "code",
            "execution_count": 3,
            "metadata": {},
            "source": ["1 / 0"],
            "outputs": [{
                "output_type": "error",
                "ename": "ZeroDivisionError",
                "evalue": "division by zero",
                "traceback": ["\x1b[0;31mZeroDivisionError\x1b[0m: division by zero"]
            }]
        },
        # Empty code cell
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "source": [],
            "outputs": []
        }
    ]

    nb_mixed = {
        "cells": mixed_cells,
        "metadata": {"kernelspec": {"display_name": "Python 3"}},
        "nbformat": 4, "nbformat_minor": 5
    }
    pdf_mixed = IPYNBService.convert_to_pdf(json.dumps(nb_mixed), filename="mixed_stress.ipynb")
    doc_mixed = fitz.open(stream=pdf_mixed, filetype="pdf")
    all_mixed_text = "\n".join([p.get_text() for p in doc_mixed])
    assert "Comprehensive Stress Notebook" in all_mixed_text
    assert "ZeroDivisionError" in all_mixed_text
    assert "In [ ]:" in all_mixed_text

    # C. 50+ cells notebook
    many_cells = [{"cell_type": "markdown", "metadata": {}, "source": ["# Stress Test: 50+ Cells Notebook\nSection details and computational benchmarks."]}]
    for i in range(1, 55):
        many_cells.append({
            "cell_type": "code",
            "execution_count": i,
            "metadata": {},
            "source": [f"# Compute step {i}\nresult_{i} = {i} ** 2\nprint('Result:', result_{i})"],
            "outputs": [{
                "output_type": "stream",
                "name": "stdout",
                "text": [f"Result: {i ** 2}\n"]
            }]
        })

    nb_50 = {
        "cells": many_cells,
        "metadata": {"kernelspec": {"display_name": "Python 3 (ipykernel)"}},
        "nbformat": 4, "nbformat_minor": 5
    }
    pdf_50 = IPYNBService.convert_to_pdf(json.dumps(nb_50), filename="large_notebook_50.ipynb")
    doc_50 = fitz.open(stream=pdf_50, filetype="pdf")
    assert len(doc_50) >= 5, f"Expected multi-page pagination for 55 cells, got {len(doc_50)} pages"

    # Ensure every single page has running header (from page 2) and running footer
    for i, page in enumerate(doc_50):
        p_text = page.get_text()
        assert "One PDF • Everything You Need for PDFs, in One Place" in p_text
        assert f"Page {i + 1} of {len(doc_50)}" in p_text
        if i > 0:
            assert "ONE PDF" in p_text

    print(f"✓ Stress test passed: 1-cell, mixed-features, and 55-cell notebook ({len(doc_50)} pages) with seamless pagination.")

if __name__ == "__main__":
    print("=== Running One PDF IPYNB Test Suite ===")
    test_reference_notebook_conversion()
    test_selectable_text_and_figures()
    test_invalid_notebook_validation()
    test_sandboxed_execution()
    test_sandboxed_network_blocking()
    test_large_notebook_suite()
    print("=== ALL TESTS PASSED SUCCESSFULLY ===")
