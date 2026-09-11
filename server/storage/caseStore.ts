import fs from 'fs';
import path from 'path';
import { EmailCase, CaseStatus } from '../types.js';
import { DEMO_EMAILS } from '../demoData.js';
import { processEmailForInvestigation } from '../analyzer.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const CASES_FILE = path.join(DATA_DIR, 'cases.json');

export class CaseStore {
  private cases: Map<string, EmailCase> = new Map();
  private initialized = false;

  constructor() {
    this.ensureDataDir();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    this.ensureDataDir();

    if (fs.existsSync(CASES_FILE)) {
      try {
        const raw = fs.readFileSync(CASES_FILE, 'utf-8');
        const list: EmailCase[] = JSON.parse(raw);
        for (const c of list) {
          this.cases.set(c.id, c);
        }
      } catch (err) {
        console.error('Failed to read existing cases file, re-seeding demo data:', err);
      }
    }

    // If no cases exist, pre-seed with the 7 high-fidelity demo scenarios
    if (this.cases.size === 0) {
      console.log('Seeding demo email cases for forensic dashboard...');
      for (const demo of DEMO_EMAILS) {
        try {
          const emailCase = await processEmailForInvestigation({
            rawEml: demo.rawEml,
            originalFilename: demo.filename,
            analyst: 'System (Demo Seed)',
            skipAiNetworkCall: true
          });
          // Assign recognizable tags
          emailCase.tags.push('DEMO_DATA');
          emailCase.tags.push(demo.category.toUpperCase());
          this.cases.set(emailCase.id, emailCase);
        } catch (e) {
          console.error(`Failed to ingest demo email ${demo.id}:`, e);
        }
      }
      this.saveToDisk();
    }

    this.initialized = true;
  }

  private saveToDisk(): void {
    try {
      this.ensureDataDir();
      const list = Array.from(this.cases.values());
      fs.writeFileSync(CASES_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist cases to disk:', e);
    }
  }

  public getAllCases(): EmailCase[] {
    return Array.from(this.cases.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getCaseById(id: string): EmailCase | undefined {
    return this.cases.get(id) || Array.from(this.cases.values()).find(c => c.caseId === id);
  }

  public saveCase(emailCase: EmailCase): void {
    this.cases.set(emailCase.id, emailCase);
    this.saveToDisk();
  }

  public updateCase(id: string, updates: {
    status?: CaseStatus;
    analystVerdict?: EmailCase['analystVerdict'];
    analystNotes?: string;
    analystName?: string;
  }): EmailCase | undefined {
    const existing = this.getCaseById(id);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const analyst = updates.analystName || 'SOC Analyst';

    if (updates.status && updates.status !== existing.status) {
      existing.auditLog.push({
        timestamp: now,
        action: 'STATUS_CHANGED',
        analyst,
        details: `Case status changed from ${existing.status} to ${updates.status}`
      });
      existing.status = updates.status;
    }

    if (updates.analystVerdict && updates.analystVerdict !== existing.analystVerdict) {
      existing.auditLog.push({
        timestamp: now,
        action: 'VERDICT_ASSIGNED',
        analyst,
        details: `Analyst assigned final verdict: ${updates.analystVerdict}`
      });
      existing.analystVerdict = updates.analystVerdict;
    }

    if (updates.analystNotes !== undefined) {
      existing.analystNotes = updates.analystNotes;
    }

    existing.updatedAt = now;
    this.saveCase(existing);
    return existing;
  }

  public deleteCase(id: string): boolean {
    const existing = this.getCaseById(id);
    if (!existing) return false;
    this.cases.delete(existing.id);
    this.saveToDisk();
    return true;
  }

  public generateStixBundle(emailCase: EmailCase): Record<string, any> {
    const stixId = `bundle--${emailCase.id}`;
    const indicatorId = `indicator--${emailCase.id}`;
    const emailMsgId = `email-message--${emailCase.id}`;

    return {
      type: 'bundle',
      id: stixId,
      spec_version: '2.1',
      objects: [
        {
          type: 'email-message',
          spec_version: '2.1',
          id: emailMsgId,
          is_multipart: emailCase.attachments.length > 0,
          date: emailCase.date || emailCase.createdAt,
          from_ref: emailCase.from.address,
          to_refs: emailCase.to,
          subject: emailCase.subject,
          body: emailCase.plainTextBody.slice(0, 1000)
        },
        {
          type: 'indicator',
          spec_version: '2.1',
          id: indicatorId,
          created: emailCase.createdAt,
          modified: emailCase.updatedAt,
          name: `Email Threat Indicator: ${emailCase.subject}`,
          description: emailCase.aiNarrative.executiveSummary,
          indicator_types: [emailCase.ml.predictedClass.toLowerCase()],
          pattern: `[email-message:from_ref = '${emailCase.from.address}']`,
          pattern_type: 'stix',
          valid_from: emailCase.createdAt,
          confidence: Math.round(emailCase.ml.confidence * 100)
        }
      ]
    };
  }
}

export const caseStore = new CaseStore();
