"""CLI script to ingest travel knowledge and PDF guides into the Chroma vector store using PyMuPDF."""

import asyncio
import os
import sys
from typing import List, Dict, Any

# Ensure backend root is in python path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.vector_store.chroma import get_vector_store
from app.vector_store.collections import Collections

DEFAULT_TRAVEL_DOCS = [
    {
        "id": "kb-hunza-guide",
        "text": (
            "Hunza Valley Travel Guide: Located in Gilgit-Baltistan along the Karakoram Highway. "
            "Top destinations include Karimabad (Baltit & Altit Forts), Eagle's Nest viewpoint, Attabad Lake, "
            "Passu Cones, Hussaini Suspension Bridge, and Khunjerab Pass (China Border). "
            "Best travel months: April to October (cherry blossom in spring, lush green in summer, autumn colors in Oct). "
            "Budget guidelines: Standard trip costs Rs. 30,000-45,000 per person for 4-5 days."
        ),
        "metadata": {"destination": "Hunza", "category": "guide"},
    },
    {
        "id": "kb-skardu-guide",
        "text": (
            "Skardu & Baltistan Travel Guide: Gateway to 8,000m peaks including K2 and Broad Peak. "
            "Key attractions: Shangrila Resort (Lower Kachura Lake), Upper Kachura Lake, Kharpocho Fort, "
            "Katpana Cold Desert, and Deosai National Park (open July-September). "
            "Best travel season: June to September. Flights operate from Islamabad weather permitting."
        ),
        "metadata": {"destination": "Skardu", "category": "guide"},
    },
    {
        "id": "kb-swat-guide",
        "text": (
            "Swat Valley & Kalam Travel Guide: Located in Khyber Pakhtunkhwa, 5 hours from Islamabad via Swat Motorway. "
            "Highlights: Mingora, Saidu Sharif, Malam Jabba Ski Resort, Bahrain, Kalam Valley, Ushu Forest, and Mahodand Lake. "
            "Ideal for 3-4 day family trips with moderate budget (Rs. 20,000-30,000 per person)."
        ),
        "metadata": {"destination": "Swat", "category": "guide"},
    },
]


def extract_text_from_pdf(pdf_path: str) -> List[Dict[str, Any]]:
    """Extract text from a PDF file using PyMuPDF (fitz)."""
    docs = []
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        filename = os.path.basename(pdf_path)
        print(f"Reading PDF: {filename} ({len(doc)} pages)...")

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text().strip()
            if text:
                docs.append({
                    "id": f"pdf-{filename}-p{page_num + 1}",
                    "text": text,
                    "metadata": {
                        "source": filename,
                        "page": page_num + 1,
                        "category": "pdf_document",
                    },
                })
        print(f"Extracted {len(docs)} text pages from {filename}.")
    except Exception as e:
        print(f"PyMuPDF extraction note for {pdf_path}: {e}")
    return docs


async def main():
    print("Ingesting travel knowledge documents into ChromaDB...")
    vs = get_vector_store()

    all_docs = list(DEFAULT_TRAVEL_DOCS)

    # Check for any PDFs in data/ or docs/ directory
    pdf_dirs = ["./data", "./docs", "./backend/data"]
    for d in pdf_dirs:
        if os.path.exists(d):
            for file in os.listdir(d):
                if file.endswith(".pdf"):
                    pdf_path = os.path.join(d, file)
                    pdf_docs = extract_text_from_pdf(pdf_path)
                    all_docs.extend(pdf_docs)

    await vs.add_documents(
        collection_name=Collections.TRAVEL_KNOWLEDGE,
        documents=all_docs,
    )
    print(f"Successfully ingested {len(all_docs)} travel knowledge documents into ChromaDB!")


if __name__ == "__main__":
    asyncio.run(main())
