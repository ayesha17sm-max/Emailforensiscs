import fs from 'fs';
import path from 'path';
import { ThreatClass, SerializedNlpModel, SerializedTechnicalRfModel } from './types.js';
import { TfidfVectorizer } from './tfidfVectorizer.js';
import { SoftmaxLogisticRegression } from './logisticRegression.js';
import { RandomForestClassifier } from './randomForest.js';
import { extractTechnicalFeatureVector, TECHNICAL_FEATURE_NAMES } from './preprocessing.js';
import { runTrainingPipeline } from './train.js';

let cachedNlpModel: SerializedNlpModel | null = null;
let cachedTechModel: SerializedTechnicalRfModel | null = null;

let vectorizerInstance: TfidfVectorizer | null = null;
let logRegInstance: SoftmaxLogisticRegression | null = null;
let rfInstance: RandomForestClassifier | null = null;

export function ensureModelsLoaded(): {
  nlpModel: SerializedNlpModel;
  techModel: SerializedTechnicalRfModel;
} {
  const modelsDir = path.resolve(process.cwd(), 'models');
  const nlpPath = path.join(modelsDir, 'nlp_model.json');
  const techPath = path.join(modelsDir, 'technical_model.json');

  if (!fs.existsSync(nlpPath) || !fs.existsSync(techPath)) {
    console.log('[ML-INFERENCE] Models not found on disk. Initiating automated training pipeline...');
    runTrainingPipeline();
  }

  if (!cachedNlpModel || !vectorizerInstance || !logRegInstance) {
    cachedNlpModel = JSON.parse(fs.readFileSync(nlpPath, 'utf-8'));
    vectorizerInstance = new TfidfVectorizer(cachedNlpModel!.vocabulary, cachedNlpModel!.idf);
    logRegInstance = new SoftmaxLogisticRegression(
      cachedNlpModel!.classes,
      cachedNlpModel!.weights,
      cachedNlpModel!.bias
    );
  }

  if (!cachedTechModel || !rfInstance) {
    cachedTechModel = JSON.parse(fs.readFileSync(techPath, 'utf-8'));
    rfInstance = new RandomForestClassifier(
      cachedTechModel!.classes,
      cachedTechModel!.featureNames,
      cachedTechModel!.trees
    );
    rfInstance.featureImportances = cachedTechModel!.featureImportances;
  }

  return {
    nlpModel: cachedNlpModel!,
    techModel: cachedTechModel!
  };
}

export interface NlpPredictionResult {
  predictedClass: ThreatClass;
  confidence: number;
  probabilities: Record<ThreatClass, number>;
  contributingFeatures: Array<{ feature: string; contribution: number }>;
}

export function predictNlp(subject: string, body: string): NlpPredictionResult {
  const { nlpModel } = ensureModelsLoaded();
  const text = `${subject || ''} ${body || ''}`;
  const x = vectorizerInstance!.transform(text);
  const rawPred = logRegInstance!.predict(x);

  // Compute top positive contributing features for the predicted class
  const classIdx = nlpModel.classes.indexOf(rawPred.predictedClass);
  const weights = nlpModel.weights[classIdx] || [];
  const contributions: Array<{ feature: string; contribution: number }> = [];

  for (let i = 0; i < x.length; i++) {
    if (x[i] > 0) {
      const score = x[i] * (weights[i] || 0);
      if (score > 0.005) {
        contributions.push({
          feature: nlpModel.vocabulary[i],
          contribution: Number(score.toFixed(4))
        });
      }
    }
  }

  contributions.sort((a, b) => b.contribution - a.contribution);

  return {
    predictedClass: rawPred.predictedClass,
    confidence: rawPred.confidence,
    probabilities: rawPred.probabilities,
    contributingFeatures: contributions.slice(0, 8)
  };
}

export interface TechnicalFeatureInput {
  spfStatus: string;
  dkimStatus: string;
  dmarcStatus: string;
  hasDomainMismatch: boolean;
  hasReplyToMismatch: boolean;
  hasSuspiciousUrl: boolean;
  hasUrlShortener: boolean;
  hasCredentialRequest: boolean;
  hasFinancialRequest: boolean;
  hasUrgency: boolean;
  hasSuspiciousAttachment: boolean;
  ipReputation?: string;
  domainReputation?: string;
}

export interface TechnicalPredictionResult {
  predictedClass: ThreatClass;
  confidence: number;
  probabilities: Record<ThreatClass, number>;
  activeSignals: string[];
}

export function predictTechnical(input: TechnicalFeatureInput): TechnicalPredictionResult {
  ensureModelsLoaded();
  const x = extractTechnicalFeatureVector(input);
  const rawPred = rfInstance!.predict(x);

  const activeSignals: string[] = [];
  x.forEach((val, idx) => {
    if (val > 0) {
      activeSignals.push(TECHNICAL_FEATURE_NAMES[idx]);
    }
  });

  return {
    predictedClass: rawPred.predictedClass,
    confidence: rawPred.confidence,
    probabilities: rawPred.probabilities,
    activeSignals
  };
}

export function getLoadedModelTelemetry() {
  const { nlpModel, techModel } = ensureModelsLoaded();
  return {
    nlp: {
      modelType: nlpModel.modelType,
      vocabularySize: nlpModel.vocabulary.length,
      classes: nlpModel.classes,
      trainedAt: nlpModel.trainedAt,
      metrics: nlpModel.metrics
    },
    technical: {
      modelType: techModel.modelType,
      treeCount: techModel.trees.length,
      classes: techModel.classes,
      featureNames: techModel.featureNames,
      featureImportances: techModel.featureImportances,
      trainedAt: techModel.trainedAt,
      metrics: techModel.metrics
    }
  };
}

export function reloadModels() {
  cachedNlpModel = null;
  cachedTechModel = null;
  vectorizerInstance = null;
  logRegInstance = null;
  rfInstance = null;
  return ensureModelsLoaded();
}
