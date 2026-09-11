import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { caseStore } from './server/storage/caseStore.js';
import { processEmailForInvestigation } from './server/analyzer.js';
import { threatClassifier } from './server/ml/model.js';
import { buildCaseGraph } from './server/correlation/graphBuilder.js';
import { DEMO_EMAILS } from './server/demoData.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for .eml files and email body analysis
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(express.text({ limit: '50mb', type: ['message/rfc822', 'text/plain'] }));

  // Initialize Case Store (seeds demo cases if empty)
  await caseStore.initialize();

  // ==========================================
  // REST API ROUTES
  // ==========================================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Email Threat Detection & Forensic Intelligence Platform',
      version: '1.0.0',
      time: new Date().toISOString()
    });
  });

  // 1. Analyze Email (text or JSON)
  app.post('/api/analyze-email', async (req, res) => {
    try {
      let rawEml = '';
      let originalFilename = 'email_inspection.eml';
      let analyst = 'SOC Analyst';

      if (typeof req.body === 'string') {
        rawEml = req.body;
      } else if (req.body && typeof req.body.rawEml === 'string') {
        rawEml = req.body.rawEml;
        if (req.body.originalFilename) originalFilename = req.body.originalFilename;
        if (req.body.analyst) analyst = req.body.analyst;
      } else {
        return res.status(400).json({ error: 'Missing raw .eml email string content in body' });
      }

      if (!rawEml.trim()) {
        return res.status(400).json({ error: 'Provided email content is empty' });
      }

      const emailCase = await processEmailForInvestigation({
        rawEml,
        originalFilename,
        analyst
      });

      caseStore.saveCase(emailCase);
      res.status(201).json({ success: true, case: emailCase });
    } catch (err: any) {
      console.error('Error analyzing email:', err);
      res.status(500).json({ error: err?.message || 'Failed to process and analyze email' });
    }
  });

  // 2. Upload email alias
  app.post('/api/upload-email', async (req, res) => {
    try {
      const rawEml = typeof req.body === 'string' ? req.body : req.body.rawEml;
      const originalFilename = req.body?.originalFilename || 'uploaded_email.eml';
      const analyst = req.body?.analyst || 'SOC Ingest';

      if (!rawEml) {
        return res.status(400).json({ error: 'No raw email content provided' });
      }

      const emailCase = await processEmailForInvestigation({
        rawEml,
        originalFilename,
        analyst
      });

      caseStore.saveCase(emailCase);
      res.status(201).json({ success: true, case: emailCase });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to upload email' });
    }
  });

  // 3. Get all cases
  app.get('/api/cases', (req, res) => {
    const cases = caseStore.getAllCases();
    res.json(cases);
  });

  // 3b. Summary stats
  app.get('/api/stats', (req, res) => {
    const cases = caseStore.getAllCases();
    const stats = {
      total: cases.length,
      critical: cases.filter(c => c.risk.category === 'Critical').length,
      high: cases.filter(c => c.risk.category === 'High').length,
      moderate: cases.filter(c => c.risk.category === 'Moderate').length,
      low: cases.filter(c => c.risk.category === 'Low').length,
      phishingCount: cases.filter(c => c.ml.predictedClass === 'Phishing').length,
      becCount: cases.filter(c => c.ml.predictedClass === 'BEC/Fraud').length,
      suspiciousCount: cases.filter(c => c.ml.predictedClass === 'Suspicious').length,
      legitimateCount: cases.filter(c => c.ml.predictedClass === 'Legitimate').length,
      spamCount: cases.filter(c => c.ml.predictedClass === 'Spam').length,
      openCases: cases.filter(c => c.status === 'NEW' || c.status === 'UNDER_INVESTIGATION').length
    };
    res.json(stats);
  });

  // 4. Get specific case
  app.get('/api/cases/:id', (req, res) => {
    const emailCase = caseStore.getCaseById(req.params.id);
    if (!emailCase) {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.json(emailCase);
  });

  // 5. Update case (status, notes, verdict)
  app.patch('/api/cases/:id', (req, res) => {
    const { status, analystVerdict, analystNotes, analystName } = req.body;
    const updated = caseStore.updateCase(req.params.id, {
      status,
      analystVerdict,
      analystNotes,
      analystName
    });

    if (!updated) {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.json({ success: true, case: updated });
  });

  // 6. Delete case
  app.delete('/api/cases/:id', (req, res) => {
    const ok = caseStore.deleteCase(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.json({ success: true });
  });

  // 7. Get Evidence & Chain of custody
  app.get('/api/cases/:id/evidence', (req, res) => {
    const emailCase = caseStore.getCaseById(req.params.id);
    if (!emailCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json({
      caseId: emailCase.caseId,
      evidenceId: emailCase.evidenceId,
      sha256: emailCase.sha256,
      originalFilename: emailCase.originalFilename,
      fileSizeBytes: emailCase.fileSizeBytes,
      uploadTimestamp: emailCase.createdAt,
      lastModified: emailCase.updatedAt,
      auditLog: emailCase.auditLog,
      rawEmlContent: emailCase.rawEmlContent
    });
  });

  // 8. Download raw .eml file
  app.get('/api/cases/:id/download-eml', (req, res) => {
    const emailCase = caseStore.getCaseById(req.params.id);
    if (!emailCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.setHeader('Content-Type', 'message/rfc822');
    res.setHeader('Content-Disposition', `attachment; filename="${emailCase.originalFilename || 'email.eml'}"`);
    res.send(emailCase.rawEmlContent);
  });

  // 9. Get graph correlation data
  app.get('/api/cases/:id/graph', (req, res) => {
    const emailCase = caseStore.getCaseById(req.params.id);
    if (!emailCase) {
      return res.status(404).json({ error: 'Case not found' });
    }
    const allCases = caseStore.getAllCases();
    const graph = buildCaseGraph(emailCase, allCases);
    res.json(graph);
  });

  // 10. Get full forensic report & STIX bundle
  app.get('/api/cases/:id/report', (req, res) => {
    const emailCase = caseStore.getCaseById(req.params.id);
    if (!emailCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const stixBundle = caseStore.generateStixBundle(emailCase);
    res.json({
      case: emailCase,
      stixBundle
    });
  });

  // 11. Analyst feedback & model retraining
  app.post('/api/cases/:id/feedback', (req, res) => {
    const emailCase = caseStore.getCaseById(req.params.id);
    if (!emailCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const { feedbackLabel, analystName, comment } = req.body;
    if (!feedbackLabel) {
      return res.status(400).json({ error: 'Missing feedbackLabel' });
    }

    const validLabels = ['Legitimate', 'Spam', 'Phishing', 'BEC/Fraud', 'Suspicious'];
    if (!validLabels.includes(feedbackLabel)) {
      return res.status(400).json({ error: `feedbackLabel must be one of: ${validLabels.join(', ')}` });
    }

    // Add audit log to case
    caseStore.updateCase(emailCase.id, {
      analystName,
      analystVerdict: feedbackLabel === 'Legitimate' ? 'LEGITIMATE' : (feedbackLabel === 'BEC/Fraud' ? 'CONFIRMED_BEC' : 'CONFIRMED_PHISHING'),
      analystNotes: comment ? `${emailCase.analystNotes}\n[Analyst Feedback]: ${comment}` : emailCase.analystNotes
    });

    // Feed to ML classifier
    const updatedMetrics = threatClassifier.addAnalystFeedback({
      id: `feedback-${emailCase.id}`,
      label: feedbackLabel as any,
      subject: emailCase.subject,
      body: emailCase.normalizedText,
      senderDomain: emailCase.from.domain,
      hasAuthFailure: emailCase.authentication.spf.status === 'FAIL' || emailCase.authentication.dmarc.status === 'FAIL',
      hasAttachment: emailCase.attachments.length > 0,
      hasMismatchedLink: emailCase.urls.some(u => u.anchorMismatch)
    });

    res.json({
      success: true,
      message: `Feedback recorded and model retrained on ${updatedMetrics.trainingSamplesCount} training samples.`,
      metrics: updatedMetrics
    });
  });

  // 12. Model metrics
  app.get('/api/model/metrics', (req, res) => {
    const metrics = threatClassifier.getMetrics();
    res.json(metrics);
  });

  // 13. Trigger model retraining
  app.post('/api/model/retrain', (req, res) => {
    const metrics = threatClassifier.trainAndEvaluate();
    res.json({ success: true, metrics });
  });

  // 14. Demo emails list
  app.get('/api/demo-emails', (req, res) => {
    res.json(DEMO_EMAILS.map(d => ({
      id: d.id,
      category: d.category,
      title: d.title,
      filename: d.filename,
      description: d.description,
      rawEml: d.rawEml
    })));
  });

  // ==========================================
  // VITE / STATIC SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Email Threat Forensics Platform] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
