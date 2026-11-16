"""
One PDF - Jupyter Notebook (.ipynb) to PDF Service
Production-grade engine matching the reference One PDF export standard.
"""

import os
import re
import sys
import json
import shutil
import tempfile
import subprocess
import html as html_lib
from typing import Dict, Any, Optional, Tuple

import nbformat
from nbformat.reader import NotJSONError
from pygments import highlight
from pygments.lexers import PythonLexer, guess_lexer
from pygments.formatters import HtmlFormatter

# Web-safe and developer monospace font stacks
FONT_BODY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
FONT_CODE = '"JetBrains Mono", "Fira Code", Consolas, Monaco, "Courier New", monospace'

class IPYNBService:
    @staticmethod
    def _find_chromium() -> Optional[str]:
        """Locates available Chrome / Chromium executable on the server."""
        candidates = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
            shutil.which("chrome"),
            shutil.which("google-chrome"),
            shutil.which("chromium"),
            shutil.which("msedge")
        ]
        for path in candidates:
            if path and os.path.exists(path):
                return path
        return None

    @staticmethod
    def validate_notebook(nb_content: str | dict) -> dict:
        """Validates notebook JSON structure and nbformat schema."""
        if isinstance(nb_content, str):
            try:
                data = json.loads(nb_content)
            except Exception as e:
                raise ValueError("Invalid Jupyter Notebook file.") from e
        elif isinstance(nb_content, dict):
            data = nb_content
        else:
            raise ValueError("Invalid Jupyter Notebook file.")

        if not isinstance(data, dict) or "cells" not in data or not isinstance(data["cells"], list):
            raise ValueError("Invalid Jupyter Notebook file.")

        try:
            nb = nbformat.from_dict(data)
            nbformat.normalize(nb)
            nbformat.validate(nb)
            return nbformat.to_dict(nb)
        except Exception:
            # If standard validate fails on minor schema deviations, ensure basic cells structure exists
            if isinstance(data.get("cells"), list):
                return data
            raise ValueError("Invalid Jupyter Notebook file.")

    @staticmethod
    def inspect_notebook(nb_content: str | dict) -> Dict[str, Any]:
        """Extracts comprehensive metadata, kernel details, and cell statistics."""
        nb_dict = IPYNBService.validate_notebook(nb_content)
        cells = nb_dict.get("cells", [])

        code_cells = [c for c in cells if c.get("cell_type") == "code"]
        md_cells = [c for c in cells if c.get("cell_type") == "markdown"]
        raw_cells = [c for c in cells if c.get("cell_type") == "raw"]
        executed_cells = [c for c in code_cells if c.get("execution_count") is not None]

        total_outputs = 0
        total_images = 0
        for c in code_cells:
            outs = c.get("outputs", [])
            total_outputs += len(outs)
            for o in outs:
                data = o.get("data", {})
                if any(k in data for k in ["image/png", "image/jpeg", "image/svg+xml"]):
                    total_images += 1

        metadata = nb_dict.get("metadata", {})
        kernelspec = metadata.get("kernelspec", {})
        language_info = metadata.get("language_info", {})

        # Extract title from first markdown H1, or fallback
        title = "Jupyter Notebook"
        for c in md_cells:
            src = "".join(c.get("source", []))
            match = re.search(r"^#\s+(.+)$", src, re.MULTILINE)
            if match:
                title = match.group(1).strip()
                break

        kernel_name = kernelspec.get("display_name", kernelspec.get("name", "Python 3 (ipykernel)"))
        lang_name = language_info.get("name", kernelspec.get("language", "python"))

        return {
            "title": title,
            "kernel_name": kernel_name,
            "language": lang_name,
            "total_cells": len(cells),
            "code_cells": len(code_cells),
            "markdown_cells": len(md_cells),
            "raw_cells": len(raw_cells),
            "executed_cells": len(executed_cells),
            "total_outputs": total_outputs,
            "total_images": total_images,
            "nbformat_version": f"{nb_dict.get('nbformat', 4)}.{nb_dict.get('nbformat_minor', 0)}"
        }

    @staticmethod
    def execute_notebook_sandboxed(nb_dict: dict, timeout_seconds: int = 45) -> dict:
        """
        Executes notebook code inside an isolated sandbox subprocess:
        - Network disabled (socket mocking)
        - Restricted environment variables (no host secrets/credentials)
        - Temporary isolated filesystem with guaranteed deletion
        - Strict execution timeout
        - Never runs in main application process
        """
        IPYNBService.validate_notebook(nb_dict)

        with tempfile.TemporaryDirectory() as sandbox_dir:
            input_nb_path = os.path.join(sandbox_dir, "input.ipynb")
            output_nb_path = os.path.join(sandbox_dir, "output.ipynb")
            runner_script_path = os.path.join(sandbox_dir, "sandbox_runner.py")

            with open(input_nb_path, "w", encoding="utf-8") as f:
                json.dump(nb_dict, f)

            # Network Isolation Hook: Write sitecustomize.py in sandbox_dir
            # Python automatically executes sitecustomize on startup for all child processes and kernels
            sitecustomize_path = os.path.join(sandbox_dir, "sitecustomize.py")
            with open(sitecustomize_path, "w", encoding="utf-8") as f:
                f.write("""import socket

_orig_connect = socket.socket.connect

def _block_external_connect(self, address, *args, **kwargs):
    host = address[0] if isinstance(address, (tuple, list)) and address else str(address)
    if host in ("127.0.0.1", "localhost", "::1"):
        return _orig_connect(self, address, *args, **kwargs)
    raise PermissionError(f"External network access to {host} is strictly disabled in One PDF sandbox.")

socket.socket.connect = _block_external_connect
""")

            # Sandbox runner script
            runner_code = """import sys
import os
import json
import asyncio

if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

import nbformat
from nbconvert.preprocessors import ExecutePreprocessor

input_path = sys.argv[1]
output_path = sys.argv[2]
timeout = int(sys.argv[3])

with open(input_path, "r", encoding="utf-8") as f:
    nb = nbformat.read(f, as_version=4)

ep = ExecutePreprocessor(timeout=timeout, kernel_name="python3", allow_errors=True)
ep.preprocess(nb, {"metadata": {"path": os.path.dirname(input_path)}})

with open(output_path, "w", encoding="utf-8") as f:
    nbformat.write(nb, f)
"""
            with open(runner_script_path, "w", encoding="utf-8") as f:
                f.write(runner_code)

            # Sanitized environment
            clean_env = {
                "SYSTEMROOT": os.environ.get("SYSTEMROOT", r"C:\Windows"),
                "WINDIR": os.environ.get("WINDIR", r"C:\Windows"),
                "SYSTEMDRIVE": os.environ.get("SYSTEMDRIVE", "C:"),
                "PROGRAMDATA": os.environ.get("PROGRAMDATA", r"C:\ProgramData"),
                "PATH": os.environ.get("PATH", ""),
                "PYTHONPATH": sandbox_dir,
                "USERPROFILE": sandbox_dir,
                "HOME": sandbox_dir,
                "HOMEDRIVE": os.environ.get("HOMEDRIVE", "C:"),
                "HOMEPATH": sandbox_dir,
                "TEMP": sandbox_dir,
                "TMP": sandbox_dir,
                "PYTHONIOENCODING": "utf-8",
                "PYTHONDONTWRITEBYTECODE": "1"
            }

            cmd = [
                sys.executable,
                runner_script_path,
                input_nb_path,
                output_nb_path,
                str(timeout_seconds)
            ]

            try:
                proc = subprocess.run(
                    cmd,
                    env=clean_env,
                    cwd=sandbox_dir,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds + 5
                )
                if proc.returncode != 0:
                    raise RuntimeError(f"Sandbox execution failed: {proc.stderr or proc.stdout}")

                if not os.path.exists(output_nb_path):
                    raise RuntimeError("Sandbox runner did not produce output notebook.")

                with open(output_nb_path, "r", encoding="utf-8") as f:
                    return json.load(f)

            except subprocess.TimeoutExpired:
                raise TimeoutError(f"Execution timed out after {timeout_seconds} seconds.")

    @staticmethod
    def _format_markdown(text: str) -> str:
        """Converts Markdown syntax into clean HTML structure with table, list and equation support."""
        if not text.strip():
            return ""

        # Normalize line endings
        lines = text.split("\n")
        out_html = []
        in_code_block = False
        code_block_lines = []
        in_table = False
        table_lines = []
        in_list = False

        for line in lines:
            stripped = line.strip()

            # Fenced code block
            if stripped.startswith("```"):
                if in_code_block:
                    code_content = html_lib.escape("\n".join(code_block_lines))
                    out_html.append(f"<pre class='md-code-block'><code>{code_content}</code></pre>")
                    code_block_lines = []
                    in_code_block = False
                else:
                    in_code_block = True
                    code_block_lines = []
                continue

            if in_code_block:
                code_block_lines.append(line)
                continue

            # Markdown Tables
            if "|" in stripped and (stripped.startswith("|") or stripped.endswith("|")):
                in_table = True
                table_lines.append(stripped)
                continue
            elif in_table:
                # Render accumulated table
                out_html.append(IPYNBService._render_markdown_table(table_lines))
                table_lines = []
                in_table = False

            # Headings
            h_match = re.match(r"^(#{1,6})\s+(.+)$", stripped)
            if h_match:
                level = len(h_match.group(1))
                h_text = IPYNBService._format_inline_markdown(h_match.group(2).strip())
                out_html.append(f"<h{level} class='md-h{level}'>{h_text}</h{level}>")
                continue

            # Blockquote
            if stripped.startswith(">"):
                bq_text = IPYNBService._format_inline_markdown(stripped.lstrip("> ").strip())
                out_html.append(f"<blockquote class='md-blockquote'>{bq_text}</blockquote>")
                continue

            # Horizontal rule
            if stripped in ["---", "***", "___"]:
                out_html.append("<hr class='md-hr' />")
                continue

            # Bullet List
            if stripped.startswith(("- ", "* ", "+ ")):
                item_text = IPYNBService._format_inline_markdown(stripped[2:].strip())
                out_html.append(f"<li class='md-li'>{item_text}</li>")
                continue

            # Numbered List
            num_match = re.match(r"^(\d+)\.\s+(.+)$", stripped)
            if num_match:
                item_text = IPYNBService._format_inline_markdown(num_match.group(2).strip())
                out_html.append(f"<li class='md-li-num' value='{num_match.group(1)}'>{item_text}</li>")
                continue

            # Paragraph or empty line
            if not stripped:
                continue

            p_text = IPYNBService._format_inline_markdown(stripped)
            out_html.append(f"<p class='md-p'>{p_text}</p>")

        if in_table and table_lines:
            out_html.append(IPYNBService._render_markdown_table(table_lines))

        return "\n".join(out_html)

    @staticmethod
    def _render_markdown_table(table_lines: list) -> str:
        """Renders GitHub-style markdown table to HTML."""
        if not table_lines:
            return ""
        html = ["<table class='dataframe md-table'>"]
        for i, row in enumerate(table_lines):
            cells = [c.strip() for c in row.split("|")]
            if cells and cells[0] == "":
                cells.pop(0)
            if cells and cells[-1] == "":
                cells.pop()
            if not cells:
                continue

            # Check if separator row (e.g. |---|---|)
            if all(re.match(r"^:?-+:?$", c) for c in cells):
                continue

            tag = "th" if i == 0 else "td"
            html.append("<tr>")
            for c in cells:
                c_formatted = IPYNBService._format_inline_markdown(c)
                html.append(f"<{tag}>{c_formatted}</{tag}>")
            html.append("</tr>")
        html.append("</table>")
        return "".join(html)

    @staticmethod
    def _format_inline_markdown(text: str) -> str:
        """Formats inline bold, italic, code, links, and LaTeX math."""
        # Math blocks: $$...$$ and $...$
        text = re.sub(r"\$\$(.+?)\$\$", r"<span class='math-display'>\1</span>", text)
        text = re.sub(r"\$([^\$]+?)\$", r"<span class='math-inline'>\1</span>", text)

        # Inline code
        text = re.sub(r"`([^`]+)`", r"<code class='md-inline-code'>\1</code>", text)

        # Bold & Italic
        text = re.sub(r"\*\*\*([^*]+)\*\*\*", r"<strong><em>\1</em></strong>", text)
        text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
        text = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", text)

        # Links
        text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"<a href='\2' target='_blank'>\1</a>", text)

        return text

    @staticmethod
    def convert_to_html(
        nb_json_str: str,
        filename: str = "notebook.ipynb",
        include_code: bool = True,
        include_output: bool = True,
        include_execution_numbers: bool = True,
        include_images: bool = True,
        syntax_highlighting: bool = True,
        include_toc: bool = False,
        theme: str = "light",
        font_size: str = "normal",
        page_size: str = "A4",
        orientation: str = "portrait",
        margins: str = "normal"
    ) -> str:
        """
        Compiles the notebook into a publication-grade HTML document matching One PDF reference standard:
        - Page 1 custom One PDF Header Card
        - Grouped cell containers (.notebook-cell-group)
        - Blue In [n] and coral Out [n] accent borders
        - Preserved Matplotlib outputs and text figure descriptions
        - Clean CSS paged media rules with native margin boxes
        """
        nb = IPYNBService.validate_notebook(nb_json_str)
        nb_info = IPYNBService.inspect_notebook(nb)

        base_title = filename
        if base_title.lower().endswith(".ipynb"):
            base_title = base_title[:-6]
        base_title = base_title.replace("_", " ").strip()
        title = base_title
        if nb_info.get("title") and nb_info.get("title") != "Jupyter Notebook":
            title = nb_info.get("title")

        # Margins setup
        if margins == "small":
            top_m, bot_m, left_m, right_m = "14mm", "14mm", "12mm", "12mm"
        elif margins == "large":
            top_m, bot_m, left_m, right_m = "24mm", "24mm", "18mm", "18mm"
        else:  # normal
            top_m, bot_m, left_m, right_m = "18mm", "18mm", "15mm", "15mm"

        # Font scale
        base_font_size = "9.5pt" if font_size == "normal" else ("8.5pt" if font_size == "small" else "10.5pt")
        code_font_size = "8pt" if font_size == "normal" else ("7.2pt" if font_size == "small" else "9pt")

        # Pygments syntax highlighting setup
        pygments_css = ""
        if syntax_highlighting:
            formatter = HtmlFormatter(style="default", nowrap=False)
            pygments_css = formatter.get_style_defs('.highlight')

        total_cells_str = f"{nb_info['total_cells']} ({nb_info['code_cells']} Code, {nb_info['markdown_cells']} Markdown)"

        toc_items = []
        html_cells = []
        cells = nb.get("cells", [])

        for idx, cell in enumerate(cells):
            cell_type = cell.get("cell_type")
            source_raw = cell.get("source", [])
            source = "".join(source_raw) if isinstance(source_raw, list) else str(source_raw)

            if cell_type == "markdown":
                if not source.strip():
                    continue

                # Collect TOC headings
                if include_toc:
                    h_match = re.search(r"^(#{1,3})\s+(.+)$", source, re.MULTILINE)
                    if h_match:
                        toc_items.append({
                            "level": len(h_match.group(1)),
                            "title": h_match.group(2).strip(),
                            "id": f"cell-heading-{idx}"
                        })

                formatted_md = IPYNBService._format_markdown(source)
                html_cells.append(f"""
                <div class="notebook-cell-group cell-type-markdown" id="cell-heading-{idx}">
                  {formatted_md}
                </div>
                """)

            elif cell_type == "code":
                if not include_code and not include_output:
                    continue

                exec_count = cell.get("execution_count")
                in_label = f"In [{exec_count}]:" if exec_count is not None else "In [ ]:"
                out_label = f"Out [{exec_count}]:" if exec_count is not None else "Out [ ]:"

                input_section = ""
                if include_code:
                    if syntax_highlighting:
                        try:
                            lexer = PythonLexer()
                            code_html = highlight(source, lexer, HtmlFormatter(nowrap=True))
                        except Exception:
                            code_html = html_lib.escape(source)
                    else:
                        code_html = html_lib.escape(source)

                    prompt_html = f'<div class="ipynb-prompt in-prompt">{in_label}</div>' if include_execution_numbers else ""
                    input_section = f"""
                    <div class="ipynb-input-group">
                      {prompt_html}
                      <div class="ipynb-code-box">
                        <pre class="highlight"><code>{code_html}</code></pre>
                      </div>
                    </div>
                    """

                output_section = ""
                if include_output and cell.get("outputs"):
                    output_elements = []
                    for out in cell["outputs"]:
                        out_type = out.get("output_type")
                        data = out.get("data", {})

                        # 1. Plain text description (such as <Figure size ...>)
                        if "text/plain" in data:
                            plain_val = data["text/plain"]
                            plain_str = "".join(plain_val) if isinstance(plain_val, list) else str(plain_val)
                            output_elements.append(f"<div class='ipynb-text-output'><pre>{html_lib.escape(plain_str)}</pre></div>")

                        # 2. HTML Table (pandas dataframe, etc.)
                        if "text/html" in data:
                            html_val = data["text/html"]
                            html_str = "".join(html_val) if isinstance(html_val, list) else str(html_val)
                            output_elements.append(f"<div class='ipynb-html-output'>{html_str}</div>")

                        # 3. Figure Images (PNG, JPEG, SVG)
                        if include_images:
                            if "image/png" in data:
                                b64 = data["image/png"]
                                b64_clean = "".join(b64) if isinstance(b64, list) else str(b64)
                                output_elements.append(f"<div class='ipynb-image-output'><img src='data:image/png;base64,{b64_clean}' alt='Figure Output' /></div>")
                            elif "image/jpeg" in data:
                                b64 = data["image/jpeg"]
                                b64_clean = "".join(b64) if isinstance(b64, list) else str(b64)
                                output_elements.append(f"<div class='ipynb-image-output'><img src='data:image/jpeg;base64,{b64_clean}' alt='Figure Output' /></div>")
                            elif "image/svg+xml" in data:
                                svg_val = data["image/svg+xml"]
                                svg_str = "".join(svg_val) if isinstance(svg_val, list) else str(svg_val)
                                output_elements.append(f"<div class='ipynb-image-output'>{svg_str}</div>")

                        # 4. Stream outputs (stdout / stderr)
                        if out_type == "stream":
                            st_text = out.get("text", [])
                            st_str = "".join(st_text) if isinstance(st_text, list) else str(st_text)
                            output_elements.append(f"<div class='ipynb-stream-output'><pre>{html_lib.escape(st_str)}</pre></div>")

                        # 5. Error output (traceback)
                        if out_type == "error":
                            traceback_list = out.get("traceback", [])
                            traceback_str = "\n".join(traceback_list) if isinstance(traceback_list, list) else str(out.get("evalue", "Error"))
                            # Strip ANSI color escapes
                            clean_trace = re.sub(r"\x1b\[[0-9;]*m", "", traceback_str)
                            output_elements.append(f"<div class='ipynb-error-output'><pre>{html_lib.escape(clean_trace)}</pre></div>")

                    if output_elements:
                        out_prompt_html = f'<div class="ipynb-prompt out-prompt">{out_label}</div>' if include_execution_numbers else ""
                        output_section = f"""
                        <div class="ipynb-output-group">
                          {out_prompt_html}
                          <div class="ipynb-output-box">
                            {"".join(output_elements)}
                          </div>
                        </div>
                        """

                html_cells.append(f"""
                <div class="notebook-cell-group cell-type-code">
                  {input_section}
                  {output_section}
                </div>
                """)

            elif cell_type == "raw":
                html_cells.append(f"""
                <div class="notebook-cell-group cell-type-raw">
                  <pre class="raw-cell"><code>{html_lib.escape(source)}</code></pre>
                </div>
                """)

        # Optional Table of Contents card
        toc_html = ""
        if include_toc and toc_items:
            toc_list = "".join([f"<li class='toc-level-{item['level']}'><a href='#{item['id']}'>{item['title']}</a></li>" for item in toc_items])
            toc_html = f"""
            <div class="ipynb-toc-card">
              <h3 class="toc-title">Table of Contents</h3>
              <ul class="toc-list">{toc_list}</ul>
            </div>
            """

        # Complete HTML document with native CSS @page rules
        full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{html_lib.escape(title)}</title>
<style>
@page {{
  size: {page_size} {orientation};
  margin-top: {top_m};
  margin-bottom: {bot_m};
  margin-left: {left_m};
  margin-right: {right_m};
  @top-left {{
    content: "{html_lib.escape(title)}";
    font-family: {FONT_BODY};
    font-size: 7.5pt;
    font-weight: 700;
    color: #6b7a8f;
    border-bottom: 0.75pt solid #dbe3ed;
    padding-bottom: 3pt;
    vertical-align: bottom;
  }}
  @top-right {{
    content: "ONE PDF";
    font-family: {FONT_BODY};
    font-size: 7.5pt;
    font-weight: 700;
    color: #2e70f2;
    border-bottom: 0.75pt solid #dbe3ed;
    padding-bottom: 3pt;
    vertical-align: bottom;
  }}
  @bottom-left {{
    content: "One PDF • Everything You Need for PDFs, in One Place";
    font-family: {FONT_BODY};
    font-size: 7.2pt;
    color: #6b7a8f;
    border-top: 0.75pt solid #dbe3ed;
    padding-top: 4pt;
    vertical-align: top;
  }}
  @bottom-right {{
    content: "Page " counter(page) " of " counter(pages);
    font-family: {FONT_BODY};
    font-size: 7.2pt;
    color: #6b7a8f;
    border-top: 0.75pt solid #dbe3ed;
    padding-top: 4pt;
    vertical-align: top;
  }}
}}

@page :first {{
  @top-left {{
    content: "";
    border-bottom: none;
  }}
  @top-right {{
    content: "";
    border-bottom: none;
  }}
}}

* {{
  box-sizing: border-box;
}}

body {{
  font-family: {FONT_BODY};
  color: #1f293d;
  background-color: #ffffff;
  margin: 0;
  padding: 0;
  font-size: {base_font_size};
  line-height: 1.5;
}}

/* One PDF Brand Header Card */
.onepdf-header-card {{
  margin-bottom: 20px;
  break-inside: avoid;
  page-break-inside: avoid;
}}

.nb-badge {{
  display: inline-block;
  padding: 3px 9px;
  background-color: #ebf2ff;
  border: 1px solid #cce0fa;
  color: #2e70f2;
  font-size: 7pt;
  font-weight: 700;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}}

.nb-title {{
  font-size: 20pt;
  font-weight: 800;
  color: #0f172a;
  margin: 8px 0 10px 0;
  letter-spacing: -0.4px;
}}

.nb-info-bar {{
  background-color: #f6f9fc;
  border: 1px solid #dbe3ed;
  border-radius: 5px;
  padding: 6px 12px;
  font-size: 7.2pt;
  color: #47546b;
  margin-bottom: 12px;
}}

.nb-divider {{
  border: none;
  border-top: 1px solid #e0e8f0;
  margin: 0 0 16px 0;
}}

/* Cell Logical Grouping */
.notebook-cell-group {{
  margin-bottom: 14px;
}}

/* Markdown Headings and Typography */
.md-h1 {{ font-size: 14pt; font-weight: 800; color: #0f172a; margin: 12px 0 6px 0; break-after: avoid; }}
.md-h2 {{ font-size: 12pt; font-weight: 700; color: #1e293b; margin: 10px 0 5px 0; break-after: avoid; }}
.md-h3 {{ font-size: 10.5pt; font-weight: 700; color: #1f293d; margin: 8px 0 4px 0; break-after: avoid; }}
.md-p {{ margin: 4px 0 8px 0; line-height: 1.55; }}
.md-li, .md-li-num {{ margin: 3px 0 3px 20px; }}
.md-blockquote {{
  border-left: 3px solid #94a3b8;
  margin: 6px 0;
  padding: 4px 12px;
  color: #475569;
  background: #f8fafc;
}}
.md-inline-code {{
  font-family: {FONT_CODE};
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.9em;
  color: #0f172a;
}}
.md-hr {{
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 12px 0;
}}

/* Code Cell Input Box (In [n]:) */
.ipynb-input-group {{
  display: flex;
  align-items: stretch;
  background: #f6f9fc;
  border: 1px solid #dbe3ed;
  border-left: 3.5px solid #2e70f2;
  border-radius: 4px;
  margin-bottom: 6px;
  overflow: hidden;
  break-inside: avoid;
  page-break-inside: avoid;
}}

.ipynb-prompt.in-prompt {{
  font-family: {FONT_CODE};
  font-size: 7pt;
  font-weight: 700;
  color: #2e70f2;
  padding: 6px 8px;
  min-width: 48px;
  user-select: none;
}}

.ipynb-code-box {{
  flex: 1;
  padding: 6px 10px;
  overflow-x: hidden;
}}

.ipynb-code-box pre {{
  margin: 0;
  font-family: {FONT_CODE};
  font-size: {code_font_size};
  line-height: 1.38;
  white-space: pre-wrap;
  word-break: break-word;
}}

/* Output Cell Box (Out [n]:) */
.ipynb-output-group {{
  display: flex;
  align-items: stretch;
  background: #fbfcfd;
  border: 1px solid #e3e8f0;
  border-left: 2.5px solid #d9474d;
  border-radius: 4px;
  margin-bottom: 8px;
}}

.ipynb-prompt.out-prompt {{
  font-family: {FONT_CODE};
  font-size: 6.8pt;
  font-weight: 700;
  color: #d9474d;
  padding: 6px 8px;
  min-width: 48px;
  user-select: none;
}}

.ipynb-output-box {{
  flex: 1;
  padding: 6px 10px;
}}

.ipynb-text-output pre, .ipynb-stream-output pre {{
  margin: 0 0 6px 0;
  font-family: {FONT_CODE};
  font-size: 7.8pt;
  color: #334052;
  white-space: pre-wrap;
  word-break: break-word;
}}

.ipynb-error-output pre {{
  margin: 0 0 6px 0;
  font-family: {FONT_CODE};
  font-size: 7.6pt;
  color: #b91c1c;
  background: #fef2f2;
  padding: 6px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}}

/* Matplotlib Image Formatting */
.ipynb-image-output img {{
  max-width: 100%;
  max-height: 290px;
  height: auto;
  display: block;
  margin: 4px auto;
  object-fit: contain;
  break-inside: avoid;
  page-break-inside: avoid;
}}

/* Pandas & Markdown Tables */
table.dataframe, table.md-table {{
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  font-size: 8pt;
  break-inside: avoid;
  page-break-inside: avoid;
}}

table.dataframe th, table.dataframe td, table.md-table th, table.md-table td {{
  border: 1px solid #cbd5e1;
  padding: 4px 8px;
  text-align: left;
}}

table.dataframe th, table.md-table th {{
  background-color: #f1f5f9;
  font-weight: 700;
}}

/* Table of Contents */
.ipynb-toc-card {{
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 20px;
  break-inside: avoid;
}}
.toc-title {{ margin: 0 0 8px 0; font-size: 11pt; color: #0f172a; }}
.toc-list {{ margin: 0; padding-left: 18px; }}
.toc-list a {{ color: #2563eb; text-decoration: none; }}
.toc-list a:hover {{ text-decoration: underline; }}

{pygments_css}
</style>
</head>
<body>

<div class="onepdf-header-card">
  <div class="nb-badge">JUPYTER NOTEBOOK EXPORT</div>
  <h1 class="nb-title">{html_lib.escape(title)}</h1>
  <div class="nb-info-bar">Kernel: {html_lib.escape(nb_info['kernel_name'])} &nbsp;&nbsp;|&nbsp;&nbsp; Total Cells: {total_cells_str} &nbsp;&nbsp;|&nbsp;&nbsp; Exported via One PDF</div>
  <hr class="nb-divider" />
</div>

{toc_html}

{"".join(html_cells)}

</body>
</html>
"""
        return full_html

    @staticmethod
    def convert_to_pdf(
        nb_json_str: str,
        filename: str = "notebook.ipynb",
        execution_mode: str = "export_existing",
        include_code: bool = True,
        include_output: bool = True,
        include_execution_numbers: bool = True,
        include_images: bool = True,
        syntax_highlighting: bool = True,
        include_toc: bool = False,
        theme: str = "light",
        font_size: str = "normal",
        page_size: str = "A4",
        orientation: str = "portrait",
        margins: str = "normal"
    ) -> bytes:
        """
        End-to-end converter executing notebook (if requested in sandboxed environment)
        and producing real, searchable vector PDF with exact One PDF formatting.
        """
        # Validate structure first
        nb_dict = IPYNBService.validate_notebook(nb_json_str)

        # Execution Mode Handling
        if execution_mode == "run_and_export":
            nb_dict = IPYNBService.execute_notebook_sandboxed(nb_dict, timeout_seconds=45)
            nb_json_str = json.dumps(nb_dict)

        # Generate Custom One PDF HTML
        html_content = IPYNBService.convert_to_html(
            nb_json_str=nb_json_str,
            filename=filename,
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

        browser_exe = IPYNBService._find_chromium()
        if not browser_exe:
            raise RuntimeError("Chromium/Chrome executable not found on server.")

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
                "--run-all-compositor-stages-before-draw",
                f"--print-to-pdf={pdf_file}",
                html_file
            ]

            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=40)
            if proc.returncode != 0 or not os.path.exists(pdf_file):
                raise RuntimeError(f"Browser PDF printing failed: {proc.stderr or proc.stdout}")

            with open(pdf_file, "rb") as f:
                pdf_bytes = f.read()

            return pdf_bytes
