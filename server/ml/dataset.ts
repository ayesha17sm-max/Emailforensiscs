export interface LabeledEmailSample {
  id: string;
  label: 'Legitimate' | 'Spam' | 'Phishing' | 'BEC/Fraud' | 'Suspicious';
  subject: string;
  body: string;
  senderDomain: string;
  hasAuthFailure: boolean;
  hasAttachment: boolean;
  hasMismatchedLink: boolean;
}

export const TRAINING_DATASET: LabeledEmailSample[] = [
  // Legitimate (14 samples)
  {
    id: 'legit-01',
    label: 'Legitimate',
    subject: 'Sprint Planning Meeting Agenda for Thursday',
    body: 'Hi team, please find attached the agenda for our upcoming sprint planning. Review user stories in Jira prior to the meeting. Thanks, Sarah.',
    senderDomain: 'acme-corp.internal',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'legit-02',
    label: 'Legitimate',
    subject: 'Weekly Engineering Architecture Sync Notes',
    body: 'Here are the meeting notes from yesterday architecture review regarding database migration. Code reviews are scheduled for Friday.',
    senderDomain: 'techcorp.io',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'legit-03',
    label: 'Legitimate',
    subject: 'GitHub: Pull request #402 merged into main',
    body: 'Your pull request #402 feat: add caching layer has been reviewed and approved by Alex. All automated CI test pipelines passed.',
    senderDomain: 'github.com',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'legit-04',
    label: 'Legitimate',
    subject: 'Your monthly AWS cloud billing statement',
    body: 'Your Amazon Web Services invoice for August is now available. Log in to your AWS Management Console to view breakdown and usage reports.',
    senderDomain: 'amazon.com',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'legit-05',
    label: 'Legitimate',
    subject: 'Lunch and Learn: Observability and OpenTelemetry',
    body: 'Join our internal engineering lunch and learn session this Friday in Conference Room B or via Google Meet. Lunch will be provided.',
    senderDomain: 'enterprise.com',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'legit-06',
    label: 'Legitimate',
    subject: 'Your order #89218 has been shipped via UPS',
    body: 'Thank you for your order. Your package has been dispatched and is scheduled for delivery on Monday. Tracking number: 1Z9999999999999999.',
    senderDomain: 'store-notifications.com',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'legit-07',
    label: 'Legitimate',
    subject: 'Q3 Financial Performance All-Hands Meeting',
    body: 'All employees are invited to attend our quarterly review with the leadership team. Dial-in link and presentation slides are in the company intranet calendar.',
    senderDomain: 'corporateglobal.com',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'legit-08',
    label: 'Legitimate',
    subject: 'HR Benefits Enrollment Window Closing Next Week',
    body: 'This is a gentle reminder that open enrollment for healthcare and dental plans closes on September 30. Visit the ADP employee portal to submit your elections.',
    senderDomain: 'internal-hr.org',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'legit-09',
    label: 'Legitimate',
    subject: 'Feedback on design mockups for mobile app',
    body: 'Hey Dave, I left some comments on the Figma board regarding navigation hierarchy and spacing. Let me know when you want to review together.',
    senderDomain: 'designteam.net',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'legit-10',
    label: 'Legitimate',
    subject: 'Status update: Customer onboarding project',
    body: 'The client successfully completed Phase 1 user acceptance testing today. Next week we begin data migration and API endpoint verification.',
    senderDomain: 'consultancy.com',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },

  // Phishing (12 samples)
  {
    id: 'phish-01',
    label: 'Phishing',
    subject: 'ACTION REQUIRED: Verify your Microsoft 365 account immediately',
    body: 'Your Microsoft 365 organization account session has expired. To prevent account suspension, click here to verify your login credentials and password now.',
    senderDomain: 'ms-security-portal-verify.top',
    hasAuthFailure: true,
    hasAttachment: false,
    hasMismatchedLink: true
  },
  {
    id: 'phish-02',
    label: 'Phishing',
    subject: 'URGENT: Your PayPal account has been restricted',
    body: 'We detected unauthorized access from an unrecognized IP address. Sign in immediately to confirm your identity, billing address, and credit card information.',
    senderDomain: 'service-paypa1-security.xyz',
    hasAuthFailure: true,
    hasAttachment: false,
    hasMismatchedLink: true
  },
  {
    id: 'phish-03',
    label: 'Phishing',
    subject: 'DocuSign: You have received an important document to review and sign',
    body: 'Review and sign the attached confidentiality document. Click this secure portal link to authenticate with your work email and password to proceed.',
    senderDomain: 'docusign-envelope-review.cfd',
    hasAuthFailure: true,
    hasAttachment: false,
    hasMismatchedLink: true
  },
  {
    id: 'phish-04',
    label: 'Phishing',
    subject: 'IT Helpdesk: Mandatory multi-factor authentication enrollment',
    body: 'Company IT policy requires all staff to reset their portal password and register authenticator app today. Failure will result in immediate email deactivation.',
    senderDomain: 'helpdesk-it-support.buzz',
    hasAuthFailure: true,
    hasAttachment: false,
    hasMismatchedLink: true
  },
  {
    id: 'phish-05',
    label: 'Phishing',
    subject: 'Security Alert: Bank of America suspicious transaction flagged',
    body: 'A withdrawal of $1,840 was initiated. If this was not you, verify account immediately to dispute transaction and restore online banking access.',
    senderDomain: 'bofa-online-alert.tk',
    hasAuthFailure: true,
    hasAttachment: false,
    hasMismatchedLink: true
  },
  {
    id: 'phish-06',
    label: 'Phishing',
    subject: 'Important: Google Workspace password expiration warning',
    body: 'Your Google corporate password will expire in 2 hours. Keep current password by logging in here: verify security questions and authentication credentials.',
    senderDomain: 'google-workspace-admin.site',
    hasAuthFailure: true,
    hasAttachment: false,
    hasMismatchedLink: true
  },
  {
    id: 'phish-07',
    label: 'Phishing',
    subject: 'DHL Express: Unclaimed parcel delivery pending payment',
    body: 'Your package could not be delivered due to an unpaid customs fee of $2.50. Click link to confirm personal details and update payment card info.',
    senderDomain: 'dhl-tracking-delivery.link',
    hasAuthFailure: true,
    hasAttachment: false,
    hasMismatchedLink: true
  },
  {
    id: 'phish-08',
    label: 'Phishing',
    subject: 'Dropbox: New shared financial document awaiting authorization',
    body: 'Alex shared an encrypted folder with you on Dropbox. Click view files to verify your business email credentials to decrypt files.',
    senderDomain: 'dropbox-share-cloud.club',
    hasAuthFailure: true,
    hasAttachment: false,
    hasMismatchedLink: true
  },

  // BEC/Fraud (10 samples)
  {
    id: 'bec-01',
    label: 'BEC/Fraud',
    subject: 'URGENT: Confidential Wire Transfer Request - Project Aurora',
    body: 'Are you at your desk right now? We are closing a confidential acquisition today and I need an urgent wire transfer processed before 3 PM. Reply with confirmation.',
    senderDomain: 'ceo-office-mail.com',
    hasAuthFailure: true,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'bec-02',
    label: 'BEC/Fraud',
    subject: 'Updated Banking Details for Vendor Invoice #INV-9921',
    body: 'Please note our treasury bank account has changed due to annual audit. Effective immediately, remit all outstanding wire and ACH payments to our new account.',
    senderDomain: 'supplier-billing-dept.co',
    hasAuthFailure: true,
    hasAttachment: true,
    hasMismatchedLink: false
  },
  {
    id: 'bec-03',
    label: 'BEC/Fraud',
    subject: 'Quick assistance needed - Executive task',
    body: 'I am currently tied up in an offsite executive board meeting with poor cell reception. Can you purchase 5 Apple gift cards for a client presentation right now? Reimbursement submitted today.',
    senderDomain: 'executive-board-direct.com',
    hasAuthFailure: true,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'bec-04',
    label: 'BEC/Fraud',
    subject: 'Payroll Direct Deposit Account Adjustment Request',
    body: 'Good morning HR, I have changed my primary banking institution. Please update my direct deposit routing number and account number for the upcoming biweekly payroll cycle.',
    senderDomain: 'employee-personal-relay.org',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'bec-05',
    label: 'BEC/Fraud',
    subject: 'Payment authorization required for legal settlement',
    body: 'As discussed with counsel, we must dispatch legal retainer funds of $48,500 today. Please coordinate wire transfer directly with the bank details attached.',
    senderDomain: 'legal-counsel-advisory.net',
    hasAuthFailure: true,
    hasAttachment: true,
    hasMismatchedLink: false
  },
  {
    id: 'bec-06',
    label: 'BEC/Fraud',
    subject: 'URGENT: Outstanding Statement & Immediate Remittance',
    body: 'Our accounts receivable department shows an overdue balance of $124,300. Wire payment must be completed by end of business to avoid supply chain interruption.',
    senderDomain: 'vendor-accounts-overdue.com',
    hasAuthFailure: true,
    hasAttachment: true,
    hasMismatchedLink: false
  },

  // Spam (8 samples)
  {
    id: 'spam-01',
    label: 'Spam',
    subject: 'Exclusive discount on luxury Swiss watches and jewelry',
    body: 'Save up to 85% on premium designer replica timepieces. Limited time wholesale liquidation sale with free international shipping.',
    senderDomain: 'super-discount-deals.biz',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'spam-02',
    label: 'Spam',
    subject: 'Congratulations! You have been selected for a $1,000 Walmart card',
    body: 'Claim your mystery reward voucher today by taking a 30-second customer satisfaction survey. Unsubscribe anytime.',
    senderDomain: 'rewards-promo-zone.click',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'spam-03',
    label: 'Spam',
    subject: 'Boost your website Google SEO ranking to number one guaranteed',
    body: 'We provide 500 high authority backlinks and automated traffic generation to increase your sales conversion rate immediately.',
    senderDomain: 'seo-marketing-blast.info',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },
  {
    id: 'spam-04',
    label: 'Spam',
    subject: 'Low cost health insurance plans for small business owners',
    body: 'Compare top health insurance rates in your state. No medical exam required, instant quotes starting at $99 per month.',
    senderDomain: 'health-quote-direct.online',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: false
  },

  // Suspicious (8 samples)
  {
    id: 'susp-01',
    label: 'Suspicious',
    subject: 'Scanned image from Xerox WorkCentre 7845',
    body: 'Please review the attached scanned PDF document sent from multi-function printer scanner device.',
    senderDomain: 'scanner-relay.net',
    hasAuthFailure: true,
    hasAttachment: true,
    hasMismatchedLink: false
  },
  {
    id: 'susp-02',
    label: 'Suspicious',
    subject: 'Invoice overdue - details attached',
    body: 'Kindly check attached remittance advice regarding pending payment balance.',
    senderDomain: 'finance-notice.xyz',
    hasAuthFailure: true,
    hasAttachment: true,
    hasMismatchedLink: false
  },
  {
    id: 'susp-03',
    label: 'Suspicious',
    subject: 'Your shared file is ready for download',
    body: 'A user has shared a protected file with your email address. Access the cloud link within 24 hours.',
    senderDomain: 'file-transfer-cdn.top',
    hasAuthFailure: false,
    hasAttachment: false,
    hasMismatchedLink: true
  },
  {
    id: 'susp-04',
    label: 'Suspicious',
    subject: 'Undelivered mail returned to sender: delivery notification failure',
    body: 'The message could not be delivered to the remote host. Click here to view original message headers and retry delivery.',
    senderDomain: 'mail-daemon-server.org',
    hasAuthFailure: true,
    hasAttachment: false,
    hasMismatchedLink: true
  }
];
