/**
 * One PDF - AI Intelligence & OCR Engine
 * Handles client-side text analytics, executive summarization, Q&A, and in-browser OCR.
 */

class AIEngine {
  /**
   * Run OCR on image canvas or image file using Tesseract.js
   */
  static async runOCR(imageSource, onProgress) {
    if (!window.Tesseract) {
      throw new Error("Tesseract OCR engine is not loaded.");
    }

    if (onProgress) onProgress(10, "Initializing OCR recognition models...");
    const worker = await window.Tesseract.createWorker("eng");
    
    if (onProgress) onProgress(30, "Scanning image and recognizing characters...");
    const ret = await worker.recognize(imageSource);
    
    if (onProgress) onProgress(90, "Extracting text structure...");
    await worker.terminate();
    
    if (onProgress) onProgress(100, "OCR Complete!");
    return {
      text: ret.data.text,
      confidence: ret.data.confidence,
      words: ret.data.words
    };
  }

  /**
   * Fast client-side document summarizer
   */
  static summarizeText(fullText, mode = "executive") {
    // Strip page markers
    const cleanText = fullText.replace(/--- \[Page \d+\] ---/g, "").trim();
    if (!cleanText) return null;

    // Sentence splitting
    const sentences = cleanText
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 25);

    // Words & frequency
    const words = cleanText.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const stopwords = new Set([
      "this", "that", "with", "from", "have", "were", "which", "there", "their",
      "about", "would", "these", "other", "into", "more", "first", "been", "after",
      "what", "when", "where", "should", "could", "being", "each", "under"
    ]);

    const freq = {};
    words.forEach(w => {
      if (!stopwords.has(w)) freq[w] = (freq[w] || 0) + 1;
    });

    const topKeywords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

    // Heuristic sentence scoring based on keyword overlap and position
    const scored = sentences.map((sentence, idx) => {
      let score = idx === 0 ? 5 : (idx < 5 ? 2 : 0); // lead bias
      const sWords = sentence.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      sWords.forEach(sw => {
        if (freq[sw]) score += freq[sw];
      });
      return { sentence, score: score / (sentence.length > 180 ? 1.5 : 1) };
    });

    scored.sort((a, b) => b.score - a.score);

    const keySentences = scored.slice(0, 4).map(item => item.sentence);
    const executiveSummary = keySentences.slice(0, 2).join(" ");
    const bulletPoints = scored.slice(0, 5).map(item => item.sentence);

    return {
      executiveSummary,
      bulletPoints,
      keywords: topKeywords,
      wordCount: words.length,
      estimatedReadingTimeMinutes: Math.ceil(words.length / 200)
    };
  }

  /**
   * Contextual document Question & Answering engine
   */
  static answerQuestion(fullText, question) {
    const cleanText = fullText.replace(/--- \[Page \d+\] ---/g, "").trim();
    if (!cleanText) return "The document appears to contain no readable text.";
    if (!question || !question.trim()) return "Please enter a specific question.";

    const qWords = question.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    if (qWords.length === 0) return "Please enter more descriptive search terms.";

    const sentences = cleanText
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 15);

    const scored = [];
    sentences.forEach((sentence, idx) => {
      const sLower = sentence.toLowerCase();
      let matchCount = 0;
      qWords.forEach(qw => {
        if (sLower.includes(qw)) matchCount += 1;
      });
      if (matchCount > 0) {
        // Find page number if possible
        const prefixText = cleanText.substring(0, cleanText.indexOf(sentence));
        const pageMatches = prefixText.match(/--- \[Page (\d+)\] ---/g);
        const pageNum = pageMatches ? pageMatches.length : 1;

        scored.push({
          sentence,
          score: matchCount,
          pageNum
        });
      }
    });

    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return `I analyzed the document for "${question}", but couldn't find a matching passage. Try asking about topics identified in the keywords or using different wording.`;
    }

    const topMatches = scored.slice(0, 3);
    const answerText = topMatches.map(m => `"${m.sentence}"`).join("\n\n");
    return `Found relevant excerpts:\n\n${answerText}`;
  }
}

window.OnePDF_AIEngine = AIEngine;
