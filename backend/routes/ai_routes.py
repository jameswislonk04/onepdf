import re
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Form
from pydantic import BaseModel

router = APIRouter(prefix="/api/ai", tags=["ai"])

class QuestionRequest(BaseModel):
    document_text: str
    question: str
    api_key: Optional[str] = None

class SummarizeRequest(BaseModel):
    document_text: str
    summary_type: Optional[str] = "executive" # "executive", "key_points", "detailed"

def extract_heuristic_summary(text: str, summary_type: str = "executive") -> dict:
    clean_text = re.sub(r'--- \[Page \d+\] ---', '', text)
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', clean_text) if len(s.strip()) > 20]
    
    # Extract keywords
    words = re.findall(r'\b[A-Za-z]{4,}\b', clean_text.lower())
    stopwords = {"this", "that", "with", "from", "have", "were", "which", "there", "their", "about", "would", "these", "other", "into", "more", "first", "been", "after"}
    freq = {}
    for w in words:
        if w not in stopwords:
            freq[w] = freq.get(w, 0) + 1
    top_keywords = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:10]

    # Select key sentences
    key_sentences = sentences[:min(6, len(sentences))]
    bullet_points = [f"• {s}" for s in sentences[1:min(5, len(sentences))]] if len(sentences) > 1 else ["• Document content analyzed."]

    executive = " ".join(key_sentences[:3]) if key_sentences else "No significant text content detected in document."

    return {
        "summary": executive,
        "key_points": bullet_points,
        "keywords": [kw[0].capitalize() for kw in top_keywords],
        "word_count": len(words),
        "sentence_count": len(sentences)
    }

def answer_heuristic_question(doc_text: str, question: str) -> str:
    clean_text = re.sub(r'--- \[Page \d+\] ---', '', doc_text)
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', clean_text) if len(s.strip()) > 15]
    q_words = set(re.findall(r'\b[A-Za-z]{3,}\b', question.lower()))

    scored_sentences = []
    for s in sentences:
        s_words = set(re.findall(r'\b[A-Za-z]{3,}\b', s.lower()))
        overlap = len(q_words.intersection(s_words))
        if overlap > 0:
            scored_sentences.append((overlap, s))
    
    scored_sentences.sort(key=lambda x: x[0], reverse=True)
    if scored_sentences:
        top_answers = [item[1] for item in scored_sentences[:3]]
        return "Based on your document:\n\n" + " ".join(top_answers)
    else:
        return "I scanned the document but could not find a direct mention addressing that specific query. Try rephrasing or searching for related keywords."

@router.post("/summarize")
async def summarize_document(req: SummarizeRequest):
    try:
        if not req.document_text.strip():
            raise HTTPException(status_code=400, detail="Document text is empty")
        res = extract_heuristic_summary(req.document_text, req.summary_type)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/ask")
async def ask_document(req: QuestionRequest):
    try:
        if not req.document_text.strip():
            raise HTTPException(status_code=400, detail="Document text is empty")
        if not req.question.strip():
            raise HTTPException(status_code=400, detail="Question is empty")
        answer = answer_heuristic_question(req.document_text, req.question)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
