# Email Security Ground-Truth Dataset (Safe Synthetic Demonstration Dataset)

## Dataset Provenance & Disclosure
- **Type**: Safe Synthetic Demonstration Dataset for Hackathon & Architecture Validation
- **Total Samples**: 60 labeled email scenarios across 5 threat classifications
- **Class Distribution**:
  - `Legitimate`: 15 samples (routine corporate, engineering, automated notifications, shipping, HR)
  - `Phishing`: 15 samples (credential harvesting, Microsoft 365, PayPal, DocuSign, Apple, Google Drive lures)
  - `BEC/Fraud`: 12 samples (Executive impersonation, CEO wire diversion, vendor banking updates, payroll routing changes)
  - `Spam`: 10 samples (bulk unsolicited marketing, SEO solicitation, crypto newsletters, conference invitations)
  - `Suspicious`: 8 samples (anomalous relay origin, unauthenticated forwarding, high entropy domains, unrecognized attachments)

## Why Synthetic Demonstration Data?
In accordance with ethical cybersecurity guidelines, production enterprise mailboxes contain sensitive personally identifiable information (PII), proprietary business communications, and live zero-day payloads. This demonstration dataset models realistic attack patterns and legitimate communication baselines without distributing weaponized malware or exposing real enterprise PII.

The model architecture is fully decoupled and ready to accept large public datasets (e.g., Enron Corpus, SpamAssassin, Nazario Phishing Corpus, or CEAS) simply by providing matching JSON or CSV records.

## Data Schema
Each sample contains:
- `id`: Unique identifier
- `label`: Ground-truth category (`Legitimate`, `Phishing`, `BEC/Fraud`, `Spam`, `Suspicious`)
- `subject`: Email subject line
- `body`: Email text body
- `senderDomain`: Domain extracted from From header
- `spfStatus`: `PASS` | `FAIL` | `NOT_AVAILABLE` | `NOT_VERIFIED`
- `dkimStatus`: `PASS` | `FAIL` | `NOT_AVAILABLE` | `NOT_VERIFIED`
- `dmarcStatus`: `PASS` | `FAIL` | `NOT_AVAILABLE` | `NOT_VERIFIED`
- `hasDomainMismatch`: boolean
- `hasReplyToMismatch`: boolean
- `hasSuspiciousUrl`: boolean
- `hasUrlShortener`: boolean
- `hasCredentialRequest`: boolean
- `hasFinancialRequest`: boolean
- `hasUrgency`: boolean
- `hasSuspiciousAttachment`: boolean
- `ipReputation`: `CLEAN` | `SUSPICIOUS` | `KNOWN MALICIOUS` | `NOT FOUND`
- `domainReputation`: `CLEAN` | `SUSPICIOUS` | `KNOWN MALICIOUS` | `NOT FOUND`
