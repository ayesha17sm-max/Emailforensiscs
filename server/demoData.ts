export interface DemoEmailDefinition {
  id: string;
  category: string;
  title: string;
  filename: string;
  description: string;
  rawEml: string;
}

export const DEMO_EMAILS: DemoEmailDefinition[] = [
  {
    id: 'demo-01-legit',
    category: 'Legitimate',
    title: 'Q3 Enterprise Architecture & Sprint Review Sync',
    filename: 'legit_project_review.eml',
    description: 'Authentic corporate communication with aligned SPF/DKIM/DMARC and no suspicious indicators.',
    rawEml: `Received: from mail-relay.techcorp.io (mail-relay.techcorp.io [209.85.220.41])
    by mx.enterprise-gateway.net with ESMTPS id q19si8392182plm.12.2026.09.10.08.30.12
    for <security-team@enterprise.org>;
    Thu, 10 Sep 2026 08:30:12 -0700
Received: from workstation-14.internal.techcorp.io ([10.240.0.14])
    by mail-relay.techcorp.io with ESMTP id 82739182371;
    Thu, 10 Sep 2026 08:29:55 -0700
Authentication-Results: mx.enterprise-gateway.net;
    spf=pass (sender IP is 209.85.220.41) smtp.mailfrom=techcorp.io;
    dkim=pass header.d=techcorp.io header.s=20260901;
    dmarc=pass (p=reject sp=reject dis=none) header.from=techcorp.io
Received-SPF: pass (mx.enterprise-gateway.net: domain of techcorp.io designates 209.85.220.41 as permitted sender) client-ip=209.85.220.41;
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=techcorp.io; s=20260901;
    h=from:to:subject:date:message-id:mime-version:content-type;
    bh=w9u+o1XwT6+P4M6lP=;
    b=dJ8fN...==
From: "Alex Johnson" <alex.johnson@techcorp.io>
To: "Enterprise SecOps" <security-team@enterprise.org>
Subject: Q3 Enterprise Architecture & Sprint Review Sync
Date: Thu, 10 Sep 2026 08:29:40 -0700
Message-ID: <CABz=9382910298@mail-relay.techcorp.io>
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"

Hi Team,

I've shared the slide deck for our upcoming architecture review this Thursday at 2 PM.
Please take a look at the proposed event-driven caching schema before the meeting so we can focus our discussion on concurrency and failover targets.

Meeting link is on our Google Calendar.

Best regards,
Alex Johnson
Lead Architect, TechCorp Systems`
  },

  {
    id: 'demo-02-phishing',
    category: 'Phishing',
    title: 'ACTION REQUIRED: Microsoft 365 Account Suspension Warning',
    filename: 'm365_credential_harvest.eml',
    description: 'Microsoft 365 credential harvesting with lookalike URL, spoofed display name, and urgent account lockout threat.',
    rawEml: `Received: from mail.defense-inbound.com (mail.defense-inbound.com [198.51.100.22])
    by mx.enterprise-gateway.net with ESMTP id f823910plm;
    Thu, 10 Sep 2026 09:12:00 -0700
Received: from vps-8192.bulletproof-host.net (vps-8192.bulletproof-host.net [185.220.101.5])
    by mail.defense-inbound.com with ESMTP id 98127391;
    Thu, 10 Sep 2026 09:11:45 -0700
Authentication-Results: mx.enterprise-gateway.net;
    spf=fail (sender IP is 185.220.101.5) smtp.mailfrom=ms-security-portal-verify.top;
    dkim=fail;
    dmarc=fail (p=quarantine) header.from=ms-security-portal-verify.top
Received-SPF: fail (mx.enterprise-gateway.net: domain of ms-security-portal-verify.top does not designate 185.220.101.5 as permitted sender) client-ip=185.220.101.5;
From: "Microsoft 365 Security Team" <admin-noreply@ms-security-portal-verify.top>
Reply-To: "IT Support Recovery" <harvest-collector@attacker-dropzone.xyz>
Return-Path: <bounce@ms-security-portal-verify.top>
To: <target.employee@enterprise.org>
Subject: ACTION REQUIRED: Microsoft 365 Account Suspension Warning
Date: Thu, 10 Sep 2026 09:11:30 -0700
Message-ID: <random-9821873@attacker-generator.club>
MIME-Version: 1.0
Content-Type: text/html; charset="UTF-8"

<!DOCTYPE html>
<html>
<body>
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #d9381e;">Immediate Action Required: Microsoft 365 Session Terminated</h2>
  <p>Dear Valued User,</p>
  <p>We detected multiple failed authentication attempts and abnormal sign-in activity from an unrecognized location on your corporate Microsoft 365 account.</p>
  <p><strong>To prevent complete account lockout and loss of inbox access, you must verify your login credentials immediately today:</strong></p>
  <p style="margin: 25px 0;">
    <a href="https://ms-security-portal-verify.top/auth/login?session=9821" style="background-color: #0078d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
      https://login.microsoftonline.com/verify-identity
    </a>
  </p>
  <p>Failure to complete verification within 24 hours will result in permanent account termination under organizational security policy.</p>
  <div style="display:none; font-size:0px; color:#fff;">
    hidden token payload for filter evasion: 871239871249817234987124
  </div>
  <p style="color: #666; font-size: 12px; margin-top: 30px;">Microsoft Corporation, One Microsoft Way, Redmond, WA 98052</p>
</div>
</body>
</html>`
  },

  {
    id: 'demo-03-bec',
    category: 'BEC/Fraud',
    title: 'URGENT: Confidential Acquisition Wire Transfer (Project Horizon)',
    filename: 'bec_ceo_wire_transfer.eml',
    description: 'Executive impersonation Business Email Compromise targeting finance personnel with immediate wire transfer instructions.',
    rawEml: `Received: from mail.outbound-relay.org (mail.outbound-relay.org [194.26.29.112])
    by mx.enterprise-gateway.net with ESMTP id b71928374;
    Thu, 10 Sep 2026 09:45:10 -0700
Authentication-Results: mx.enterprise-gateway.net;
    spf=fail (sender IP 194.26.29.112 not authorized for enterprise.org);
    dkim=none;
    dmarc=fail (p=reject) header.from=ceo-office-confidential.com
From: "Robert Henderson (CEO)" <robert.henderson@ceo-office-confidential.com>
Reply-To: <ceo-private-blackberry@protonmail.com>
To: "Jane Miller (VP Finance)" <jane.miller@enterprise.org>
Subject: URGENT: Confidential Acquisition Wire Transfer (Project Horizon)
Date: Thu, 10 Sep 2026 09:44:50 -0700
Message-ID: <exec-829102-urgent@ceo-office-confidential.com>
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"

Jane,

Are you at your desk right now?

We are in the final closing hours of our confidential acquisition for Project Horizon.
Due to strict non-disclosure obligations, this cannot go through our standard ERP ticketing queue.

I need an urgent initial retainer wire transfer of $185,000 processed to outside escrow counsel before the Federal Reserve wire window closes at 3:00 PM EST today.

Please confirm you can process this immediately so I can send over the routing and account details.
Keep this strictly between us until the formal press release on Monday.

Sent from my iPhone
Robert Henderson
Chief Executive Officer`
  },

  {
    id: 'demo-04-credential',
    category: 'Credential Harvesting',
    title: 'Security Alert: Bank of America Suspicious ACH Transfer Flagged',
    filename: 'bank_credential_harvest.eml',
    description: 'Banking security alert with anchor-URL mismatch (text claims Bank of America, href routes to phishing host).',
    rawEml: `Received: from mta-out.bulletproof-servers.net (mta-out.bulletproof-servers.net [45.154.255.89])
    by mx.enterprise-gateway.net with ESMTP id a91827364;
    Thu, 10 Sep 2026 07:15:20 -0700
Authentication-Results: mx.enterprise-gateway.net;
    spf=fail; dkim=fail; dmarc=fail
From: "Bank of America Fraud Prevention" <alerts@bofa-online-alert.tk>
Reply-To: <disputes@bofa-online-alert.tk>
To: <customer@enterprise.org>
Subject: Security Alert: Bank of America Suspicious ACH Transfer Flagged
Date: Thu, 10 Sep 2026 07:14:50 -0700
Message-ID: <bofa-98237198273@alert-dispatcher.link>
MIME-Version: 1.0
Content-Type: text/html; charset="UTF-8"

<!DOCTYPE html>
<html>
<body>
<div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px;">
  <div style="background-color: #e31837; color: white; padding: 15px; font-weight: bold; font-size: 18px;">
    Bank of America &bull; Fraud Prevention Alert
  </div>
  <p style="margin-top: 20px;">Dear Account Holder,</p>
  <p>An outgoing electronic wire transfer in the amount of <strong>$4,250.00 USD</strong> was initiated from your commercial checking account on September 10, 2026.</p>
  <p>If you did not authorize this transaction, please dispute the withdrawal and re-verify your online banking authentication credentials immediately:</p>
  <p style="margin: 20px 0;">
    <a href="http://45.154.255.89/bofa-login/portal.php?id=8291" style="color: #0056b3; font-weight: bold;">
      https://www.bankofamerica.com/online-banking/dispute-claim.go
    </a>
  </p>
  <p>Failure to verify within 6 hours will authorize automatic fund settlement under federal regulation.</p>
  <p style="color: #777; font-size: 11px;">Bank of America, N.A. Member FDIC. Equal Housing Lender &copy; 2026 Bank of America Corporation.</p>
</div>
</body>
</html>`
  },

  {
    id: 'demo-05-payment-diversion',
    category: 'Payment Diversion',
    title: 'NOTICE: Updated Banking & Remittance Instructions for Invoice #INV-8910',
    filename: 'vendor_payment_diversion.eml',
    description: 'Vendor payment diversion fraud altering ACH routing numbers with urgent remittance demand.',
    rawEml: `Received: from mail.compromised-vps.com (mail.compromised-vps.com [103.145.13.22])
    by mx.enterprise-gateway.net with ESMTP id c9812739;
    Thu, 10 Sep 2026 06:40:00 -0700
Authentication-Results: mx.enterprise-gateway.net;
    spf=fail; dkim=none; dmarc=fail
From: "Accounts Receivable - Acme Industrial" <billing@supplier-billing-dept.co>
Reply-To: <accounts-remittance@supplier-billing-dept.co>
To: "Accounts Payable" <ap@enterprise.org>
Subject: NOTICE: Updated Banking & Remittance Instructions for Invoice #INV-8910
Date: Thu, 10 Sep 2026 06:39:15 -0700
Message-ID: <invoice-update-9281928@supplier-billing-dept.co>
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"

Good morning Accounts Payable Team,

Please take note that due to our mid-year banking audit and treasury restructuring, Acme Industrial has transitioned all commercial ACH and wire collections to our new depository institution effective immediately.

Our previous account at JPMorgan Chase has been closed. Please update your vendor records to remit payment for pending Invoice #INV-8910 ($64,250.00) to our updated account:

Bank Name: Coastal Horizon Commercial Bank
Routing Number: 021000021
Account Number: 9821-4820-1928
Beneficiary: Acme Strategic Collections LLC

Please confirm receipt of this update so our credit department does not place a hold on upcoming hardware shipments.

Warm regards,
Marcus Vance
Senior Director, Accounts Receivable
Acme Industrial Supply Group`
  },

  {
    id: 'demo-06-suspicious-attachment',
    category: 'Malware Lure',
    title: 'Scanned Document Delivery: Remittance_Advice_September_2026.pdf.exe',
    filename: 'malware_double_extension.eml',
    description: 'Double extension executable masquerade (.pdf.exe) originating from suspicious relay infrastructure.',
    rawEml: `Received: from mail.bulletproof-vps.ro (mail.bulletproof-vps.ro [91.240.118.15])
    by mx.enterprise-gateway.net with ESMTP id m81928371;
    Thu, 10 Sep 2026 05:22:10 -0700
Authentication-Results: mx.enterprise-gateway.net;
    spf=fail; dkim=fail; dmarc=fail
From: "Xerox WorkCentre 7845" <scanner-relay@corporate-scanner.xyz>
To: <recipient@enterprise.org>
Subject: Scanned Document Delivery: Remittance_Advice_September_2026.pdf.exe
Date: Thu, 10 Sep 2026 05:21:40 -0700
Message-ID: <scan-982187391823@corporate-scanner.xyz>
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="----=_Part_98218_8921"

------=_Part_98218_8921
Content-Type: text/plain; charset="UTF-8"

Attached is a scanned document processed by the department multi-function scanner.

Device: Xerox WorkCentre 7845
Pages: 4
Resolution: 300 DPI
Format: PDF

Please review the attached remittance confirmation.
------=_Part_98218_8921
Content-Type: application/x-msdownload; name="Remittance_Advice_September_2026.pdf.exe"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="Remittance_Advice_September_2026.pdf.exe"

TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAA2AAAAA4fug4AtAnNIbgBTM0hVGhpcyBwcm9ncmFtIGNhbm5vdCBiZSBydW4gaW4gRE9TIG1v
ZGUuDQ0KJAAAAAAAAABQRQAATAEDAAAAAAAAAAAAAAAAAAAA
------=_Part_98218_8921--`
  },

  {
    id: 'demo-07-lookalike',
    category: 'Lookalike Domain',
    title: 'Security Notification: Your PayPal payment was sent to Coinmama Ltd',
    filename: 'paypal_lookalike_domain.eml',
    description: 'PayPal brand typosquatting (service-paypa1-security.xyz) with obfuscated URLs and session hijacking triggers.',
    rawEml: `Received: from mail.fake-gateway.top (mail.fake-gateway.top [185.220.101.5])
    by mx.enterprise-gateway.net with ESMTP id p81928374;
    Thu, 10 Sep 2026 04:10:00 -0700
Authentication-Results: mx.enterprise-gateway.net;
    spf=fail; dkim=fail; dmarc=fail
From: "PayPal Customer Protection" <service@service-paypa1-security.xyz>
Reply-To: <dispute-center@service-paypa1-security.xyz>
To: <consumer@enterprise.org>
Subject: Security Notification: Your PayPal payment was sent to Coinmama Ltd
Date: Thu, 10 Sep 2026 04:09:12 -0700
Message-ID: <pp-91829182918@service-paypa1-security.xyz>
MIME-Version: 1.0
Content-Type: text/html; charset="UTF-8"

<!DOCTYPE html>
<html>
<body>
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #003087;">You sent a payment of $899.00 USD to Coinmama Cryptocurrency Ltd</h2>
  <p>Transaction ID: 9812-4820-1928</p>
  <p>If you did not authorize this payment, you have <strong>2 hours</strong> to cancel this transaction and recover your funds.</p>
  <p>
    <a href="https://service-paypa1-security.xyz/dispute?tx=981248201928" style="background-color: #0070ba; color: white; padding: 12px 20px; text-decoration: none; border-radius: 20px; font-weight: bold;">
      Cancel Transaction &amp; Refund Payment
    </a>
  </p>
  <p style="font-size: 11px; color: #888;">PayPal Pte. Ltd. is licensed by the Monetary Authority of Singapore as a Major Payment Institution.</p>
</div>
</body>
</html>`
  }
];
