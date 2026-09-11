import fs from 'fs';
import path from 'path';
import { SerializedNlpModel, SerializedTechnicalRfModel } from './types.js';

export function runEvaluationReport(modelsDir?: string) {
  const targetDir = modelsDir || path.resolve(process.cwd(), 'models');
  const nlpPath = path.join(targetDir, 'nlp_model.json');
  const techPath = path.join(targetDir, 'technical_model.json');

  if (!fs.existsSync(nlpPath) || !fs.existsSync(techPath)) {
    console.error('[ML-EVAL] Models not found. Run training first (tsx ml/train.ts).');
    process.exit(1);
  }

  const nlpModel: SerializedNlpModel = JSON.parse(fs.readFileSync(nlpPath, 'utf-8'));
  const techModel: SerializedTechnicalRfModel = JSON.parse(fs.readFileSync(techPath, 'utf-8'));

  console.log('===============================================================');
  console.log(' CYBERSECURITY ML MODEL EVALUATION AUDIT REPORT');
  console.log('===============================================================');
  console.log(`Evaluated on Held-Out Test Set (Stratified 25% Split)\n`);

  console.log(`[MODEL 1: NLP TF-IDF + Softmax Logistic Regression]`);
  console.log(`  Model Architecture: ${nlpModel.modelType}`);
  console.log(`  Vocabulary Size:    ${nlpModel.vocabulary.length} n-grams (unigrams + bigrams)`);
  console.log(`  Trained At:         ${nlpModel.trainedAt}`);
  console.log(`  Test Sample Count:  ${nlpModel.metrics.testSamplesCount}`);
  console.log(`  Train Sample Count: ${nlpModel.metrics.trainingSamplesCount}`);
  console.log(`  Accuracy:           ${(nlpModel.metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`  Precision (Macro):  ${(nlpModel.metrics.precision * 100).toFixed(2)}%`);
  console.log(`  Recall (Macro):     ${(nlpModel.metrics.recall * 100).toFixed(2)}%`);
  console.log(`  F1-Score (Macro):   ${(nlpModel.metrics.f1Score * 100).toFixed(2)}%`);

  console.log('\n  Per-Class Metrics:');
  for (const [cls, m] of Object.entries(nlpModel.metrics.classMetrics)) {
    console.log(
      `    ${cls.padEnd(12)} -> Precision: ${(m.precision * 100).toFixed(1)}% | Recall: ${(m.recall * 100).toFixed(1)}% | F1: ${(m.f1 * 100).toFixed(1)}% | Support: ${m.support}`
    );
  }

  console.log('\n  Confusion Matrix:');
  console.log('    True \\ Pred   ' + nlpModel.metrics.confusionMatrix.labels.map(l => l.slice(0, 7).padEnd(8)).join(' '));
  nlpModel.metrics.confusionMatrix.matrix.forEach((row, i) => {
    const label = nlpModel.metrics.confusionMatrix.labels[i].slice(0, 12).padEnd(14);
    const cells = row.map(v => String(v).padEnd(8)).join(' ');
    console.log(`    ${label} ${cells}`);
  });

  console.log('\n---------------------------------------------------------------');
  console.log(`[MODEL 2: Technical Feature Random Forest]`);
  console.log(`  Model Architecture: ${techModel.modelType}`);
  console.log(`  Ensemble Size:      ${techModel.trees.length} Decision Trees`);
  console.log(`  Feature Dimension:  ${techModel.featureNames.length} security indicators`);
  console.log(`  Trained At:         ${techModel.trainedAt}`);
  console.log(`  Test Sample Count:  ${techModel.metrics.testSamplesCount}`);
  console.log(`  Accuracy:           ${(techModel.metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`  Precision (Macro):  ${(techModel.metrics.precision * 100).toFixed(2)}%`);
  console.log(`  Recall (Macro):     ${(techModel.metrics.recall * 100).toFixed(2)}%`);
  console.log(`  F1-Score (Macro):   ${(techModel.metrics.f1Score * 100).toFixed(2)}%`);

  console.log('\n  Top Technical Feature Importances:');
  const sortedFeats = Object.entries(techModel.featureImportances).sort((a, b) => b[1] - a[1]);
  sortedFeats.slice(0, 8).forEach(([f, imp]) => {
    console.log(`    ${f.padEnd(30)} : ${(imp * 100).toFixed(1)}%`);
  });

  console.log('===============================================================\n');

  return {
    nlpModel,
    techModel
  };
}

// Allow direct CLI execution: tsx ml/evaluate.ts
if (process.argv[1]?.includes('evaluate.ts') || process.argv[1]?.includes('evaluate.js')) {
  runEvaluationReport();
}
