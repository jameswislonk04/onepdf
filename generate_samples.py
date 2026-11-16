import json
import fitz

sample_nb = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# 📊 Financial Growth & Model Performance\n",
                "### One PDF Executive Demonstration\n",
                "This document was generated directly from a Jupyter Notebook using **One PDF**.\n",
                "\n",
                "Key highlights:\n",
                "- Seamless markdown & syntax highlighting\n",
                "- Preserved visual outputs, statistics, and tables\n",
                "- Publication-ready PDF formatting"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": 1,
            "metadata": {},
            "source": [
                "import numpy as np\n",
                "import pandas as pd\n",
                "\n",
                "# Generate regional performance matrix\n",
                "df = pd.DataFrame({\n",
                "    'Division': ['Enterprise Cloud', 'AI Solutions', 'Cybersecurity', 'Mobile Apps'],\n",
                "    'Q1_Revenue_M': [48.5, 32.1, 27.4, 19.8],\n",
                "    'YoY_Growth': ['+34%', '+82%', '+19%', '+12%'],\n",
                "    'Margin': ['31.5%', '42.0%', '28.4%', '22.1%']\n",
                "})\n",
                "df"
            ],
            "outputs": [
                {
                    "data": {
                        "text/html": [
                            "<table border=\"1\" class=\"dataframe\"><thead><tr><th></th><th>Division</th><th>Q1_Revenue_M</th><th>YoY_Growth</th><th>Margin</th></tr></thead><tbody><tr><th>0</th><td>Enterprise Cloud</td><td>$48.5M</td><td>+34%</td><td>31.5%</td></tr><tr><th>1</th><td>AI Solutions</td><td>$32.1M</td><td>+82%</td><td>42.0%</td></tr><tr><th>2</th><td>Cybersecurity</td><td>$27.4M</td><td>+19%</td><td>28.4%</td></tr><tr><th>3</th><td>Mobile Apps</td><td>$19.8M</td><td>+12%</td><td>22.1%</td></tr></tbody></table>"
                        ],
                        "text/plain": [
                            "            Division  Q1_Revenue_M YoY_Growth Margin\n0   Enterprise Cloud          48.5       +34%  31.5%\n1       AI Solutions          32.1       +82%  42.0%\n2      Cybersecurity          27.4       +19%  28.4%\n3        Mobile Apps          19.8       +12%  22.1%"
                        ]
                    },
                    "execution_count": 1,
                    "metadata": {},
                    "output_type": "execute_result"
                }
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 💡 Strategic Takeaways\n",
                "1. **AI Solutions** is our fastest growing division with **+82% YoY**.\n",
                "2. Gross margins on cloud products remain healthy above 30%.\n",
                "3. Expanding enterprise cross-sell initiatives will unlock further margin gains."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": 2,
            "metadata": {},
            "source": [
                "# Compute aggregate portfolio revenue\n",
                "total_rev = df['Q1_Revenue_M'].sum()\n",
                "print(f'Total Q1 Consolidated Revenue: ${total_rev:.1f}M')\n"
            ],
            "outputs": [
                {
                    "name": "stdout",
                    "output_type": "stream",
                    "text": ["Total Q1 Consolidated Revenue: $127.8M\n"]
                }
            ]
        }
    ],
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.11"}
    },
    "nbformat": 4,
    "nbformat_minor": 5
}

with open("frontend/assets/samples/sample.ipynb", "w", encoding="utf-8") as f:
    json.dump(sample_nb, f, indent=2)

# Create sample PDF
doc = fitz.open()
page1 = doc.new_page(width=595, height=842)
page1.insert_text((50, 80), "One PDF Sample Document", fontsize=24, color=(0.25, 0.25, 0.8))
page1.insert_text((50, 115), "Page 1: Project Overview & Executive Summary", fontsize=15, color=(0.3, 0.3, 0.4))
page1.insert_text((50, 160), "Welcome to One PDF - Everything You Need for PDFs, in One Place.", fontsize=12)
page1.insert_text((50, 190), "This sample document is provided to test merging, splitting, compressing,", fontsize=12)
page1.insert_text((50, 210), "rotating, watermarking, page numbering, and AI summarization features.", fontsize=12)
page1.insert_text((50, 250), "Feature Highlights:", fontsize=14, color=(0.2, 0.2, 0.2))
page1.insert_text((70, 280), "- Fast client-side manipulation using WebAssembly and modern JavaScript", fontsize=11)
page1.insert_text((70, 305), "- Seamless IPYNB to PDF notebook rendering with syntax highlighting", fontsize=11)
page1.insert_text((70, 330), "- Zero unnecessary data uploads for strictly privacy-first workflows", fontsize=11)

page2 = doc.new_page(width=595, height=842)
page2.insert_text((50, 80), "One PDF Sample Document - Section 2", fontsize=22, color=(0.25, 0.25, 0.8))
page2.insert_text((50, 115), "Page 2: Technical Specifications & Data Sheet", fontsize=15, color=(0.3, 0.3, 0.4))
page2.insert_text((50, 160), "Key metrics and operational performance details are summarized below.", fontsize=12)
page2.insert_text((50, 190), "All PDF transformation routines adhere to ISO 32000-1 specifications.", fontsize=12)

doc.save("frontend/assets/samples/sample.pdf")
doc.close()
print("Sample assets successfully generated!")
