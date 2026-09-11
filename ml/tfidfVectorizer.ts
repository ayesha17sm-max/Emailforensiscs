import { cleanAndTokenize } from './preprocessing.js';

export class TfidfVectorizer {
  public vocabulary: string[] = [];
  public vocabIndex: Map<string, number> = new Map();
  public idf: number[] = [];

  constructor(vocabulary?: string[], idf?: number[]) {
    if (vocabulary && idf) {
      this.vocabulary = vocabulary;
      this.idf = idf;
      this.vocabulary.forEach((term, idx) => this.vocabIndex.set(term, idx));
    }
  }

  public fit(documents: string[], minDf: number = 2, maxDfRatio: number = 0.85): void {
    const docCount = documents.length;
    const docFrequencies: Map<string, number> = new Map();

    const tokenizedDocs = documents.map(doc => {
      const tokens = cleanAndTokenize(doc);
      const unique = new Set(tokens);
      for (const token of unique) {
        docFrequencies.set(token, (docFrequencies.get(token) || 0) + 1);
      }
      return tokens;
    });

    const filteredTerms: string[] = [];
    for (const [term, df] of docFrequencies.entries()) {
      if (df >= minDf && df <= docCount * maxDfRatio) {
        filteredTerms.push(term);
      }
    }

    filteredTerms.sort();
    this.vocabulary = filteredTerms;
    this.vocabIndex.clear();
    this.vocabulary.forEach((term, idx) => this.vocabIndex.set(term, idx));

    // Smooth IDF formula: ln((N + 1) / (df + 1)) + 1
    this.idf = this.vocabulary.map(term => {
      const df = docFrequencies.get(term) || 1;
      return Math.log((docCount + 1) / (df + 1)) + 1.0;
    });
  }

  public transform(document: string): number[] {
    const tokens = cleanAndTokenize(document);
    const tfMap: Map<number, number> = new Map();

    for (const token of tokens) {
      const idx = this.vocabIndex.get(token);
      if (idx !== undefined) {
        tfMap.set(idx, (tfMap.get(idx) || 0) + 1);
      }
    }

    const vector = new Array(this.vocabulary.length).fill(0);
    const totalTokens = tokens.length || 1;
    let sumSquares = 0;

    for (const [idx, count] of tfMap.entries()) {
      const tf = count / totalTokens;
      const weight = tf * this.idf[idx];
      vector[idx] = weight;
      sumSquares += weight * weight;
    }

    // L2 Normalization
    const norm = Math.sqrt(sumSquares);
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return vector;
  }
}
