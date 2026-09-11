import fs from 'fs';
import path from 'path';
import { DatasetItem, ThreatClass, SerializedNlpModel, SerializedTechnicalRfModel } from './types.js';
import { TfidfVectorizer } from './tfidfVectorizer.js';
import { SoftmaxLogisticRegression } from './logisticRegression.js';
import { RandomForestClassifier } from './randomForest.js';
import { extractTechnicalFeatureVector, TECHNICAL_FEATURE_NAMES } from './preprocessing.js';
import { calculateMetrics } from './metrics.js';

const CLASSES: ThreatClass[] = ['Legitimate', 'Phishing', 'BEC/Fraud', 'Spam', 'Suspicious'];

export function runTrainingPipeline(datasetPath?: string, modelsDir?: string) {
  const dataFile = datasetPath || path.resolve(process.cwd(), 'data', 'dataset.json');
  const targetDir = modelsDir || path.resolve(process.cwd(), 'models');

  if (!fs.existsSync(dataFile)) {
    throw new Error(`Dataset file not found at ${dataFile}`);
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const rawData = fs.readFileSync(dataFile, 'utf-8');
  const dataset: DatasetItem[] = JSON.parse(rawData);

  console.log(`[ML-TRAIN] Loaded ${dataset.length} labeled samples from ${dataFile}`);

  // Stratified train/test split: 75% train, 25% test
  const trainSet: DatasetItem[] = [];
  const testSet: DatasetItem[] = [];

  const classBuckets = new Map<ThreatClass, DatasetItem[]>();
  CLASSES.forEach(c => classBuckets.set(c, []));

  dataset.forEach(item => {
    if (classBuckets.has(item.label)) {
      classBuckets.get(item.label)!.push(item);
    }
  });

  for (const [cls, items] of classBuckets.entries()) {
    // Every 4th item goes to test set (25% held-out test)
    items.forEach((item, idx) => {
      if (idx % 4 === 3) {
        testSet.push(item);
      } else {
        trainSet.push(item);
      }
    });
  }

  console.log(`[ML-TRAIN] Train set: ${trainSet.length} samples, Test set: ${testSet.length} samples`);

  // ==========================================
  // MODEL 1: NLP TF-IDF + Logistic Regression
  // ==========================================
  console.log('[ML-TRAIN] Training Model 1: NLP (TF-IDF + Softmax Logistic Regression)...');
  const trainDocs = trainSet.map(i => `${i.subject} ${i.body}`);
  const trainLabels = trainSet.map(i => CLASSES.indexOf(i.label));

  const vectorizer = new TfidfVectorizer();
  vectorizer.fit(trainDocs, 1, 0.90);
  console.log(`[ML-TRAIN] Extracted vocabulary size: ${vectorizer.vocabulary.length} n-grams`);

  const trainX = trainDocs.map(doc => vectorizer.transform(doc));
  const logReg = new SoftmaxLogisticRegression(CLASSES);
  logReg.fit(trainX, trainLabels, { learningRate: 0.4, epochs: 250, l2Reg: 0.001 });

  // Evaluate NLP Model on Held-out Test Set
  const testDocs = testSet.map(i => `${i.subject} ${i.body}`);
  const testTrueLabels = testSet.map(i => i.label);
  const nlpTestPredLabels: ThreatClass[] = testDocs.map(doc => {
    const x = vectorizer.transform(doc);
    return logReg.predict(x).predictedClass;
  });

  const nlpMetrics = calculateMetrics(testTrueLabels, nlpTestPredLabels, CLASSES, trainSet.length);
  console.log(`[ML-TRAIN] Model 1 Held-Out Test Evaluation:
  - Accuracy:  ${(nlpMetrics.accuracy * 100).toFixed(1)}%
  - Precision: ${(nlpMetrics.precision * 100).toFixed(1)}%
  - Recall:    ${(nlpMetrics.recall * 100).toFixed(1)}%
  - F1-Score:  ${(nlpMetrics.f1Score * 100).toFixed(1)}%`);

  const serializedNlp: SerializedNlpModel = {
    modelType: 'TF-IDF + Softmax Logistic Regression',
    classes: CLASSES,
    vocabulary: vectorizer.vocabulary,
    idf: vectorizer.idf,
    weights: logReg.weights,
    bias: logReg.bias,
    trainedAt: new Date().toISOString(),
    metrics: nlpMetrics
  };

  const nlpModelPath = path.join(targetDir, 'nlp_model.json');
  fs.writeFileSync(nlpModelPath, JSON.stringify(serializedNlp, null, 2), 'utf-8');
  console.log(`[ML-TRAIN] Serialized Model 1 to ${nlpModelPath}`);

  // ==========================================
  // MODEL 2: Technical Feature Random Forest
  // ==========================================
  console.log('[ML-TRAIN] Training Model 2: Technical Feature Classifier (Random Forest)...');
  const techTrainX = trainSet.map(i => extractTechnicalFeatureVector(i));
  const techRf = new RandomForestClassifier(CLASSES, TECHNICAL_FEATURE_NAMES);
  techRf.fit(techTrainX, trainLabels, 10);

  // Evaluate Technical RF Model on Held-out Test Set
  const techTestX = testSet.map(i => extractTechnicalFeatureVector(i));
  const techTestPredLabels: ThreatClass[] = techTestX.map(x => techRf.predict(x).predictedClass);

  const techMetrics = calculateMetrics(testTrueLabels, techTestPredLabels, CLASSES, trainSet.length);
  console.log(`[ML-TRAIN] Model 2 Held-Out Test Evaluation:
  - Accuracy:  ${(techMetrics.accuracy * 100).toFixed(1)}%
  - Precision: ${(techMetrics.precision * 100).toFixed(1)}%
  - Recall:    ${(techMetrics.recall * 100).toFixed(1)}%
  - F1-Score:  ${(techMetrics.f1Score * 100).toFixed(1)}%`);

  const serializedTech: SerializedTechnicalRfModel = {
    modelType: 'Random Forest Classifier (Technical Security Signals)',
    classes: CLASSES,
    featureNames: TECHNICAL_FEATURE_NAMES,
    trees: techRf.trees,
    trainedAt: new Date().toISOString(),
    metrics: techMetrics,
    featureImportances: techRf.featureImportances
  };

  const techModelPath = path.join(targetDir, 'technical_model.json');
  fs.writeFileSync(techModelPath, JSON.stringify(serializedTech, null, 2), 'utf-8');
  console.log(`[ML-TRAIN] Serialized Model 2 to ${techModelPath}`);

  return {
    nlpMetrics,
    techMetrics,
    nlpModelPath,
    techModelPath
  };
}

// Allow direct CLI execution: tsx ml/train.ts
if (process.argv[1]?.includes('train.ts') || process.argv[1]?.includes('train.js')) {
  try {
    runTrainingPipeline();
    console.log('[ML-TRAIN] Both machine learning models successfully trained and serialized.');
  } catch (err) {
    console.error('[ML-TRAIN] Error during training:', err);
    process.exit(1);
  }
}
