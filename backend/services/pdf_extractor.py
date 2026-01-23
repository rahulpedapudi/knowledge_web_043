import io
import re
from typing import BinaryIO
import pdfplumber


def extract_text_from_pdf(file: BinaryIO) -> str:
    """Extract all text from a PDF file."""
    text_parts = []
    
    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    
    return "\n".join(text_parts)


def split_into_sentences(text: str) -> list[str]:
    """Split text into sentences using regex."""
    # Clean up the text
    text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
    text = text.strip()
    
    # Split on sentence-ending punctuation
    # This handles common cases like "Dr.", "Mr.", etc.
    sentence_pattern = r'(?<=[.!?])\s+(?=[A-Z])'
    sentences = re.split(sentence_pattern, text)
    
    # Clean and filter sentences
    clean_sentences = []
    for s in sentences:
        s = s.strip()
        if len(s) > 10:  # Filter out very short fragments
            clean_sentences.append(s)
    
    return clean_sentences


def extract_sentences_from_pdf(file: BinaryIO) -> list[str]:
    """Extract text and split into sentences."""
    text = extract_text_from_pdf(file)
    return split_into_sentences(text)


def extract_sentences_from_text(text: str) -> list[str]:
    """Split raw text into sentences."""
    return split_into_sentences(text)
