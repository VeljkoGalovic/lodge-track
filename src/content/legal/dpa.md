# Data Processing Agreement

Last updated: September 24, 2026

## 1. Introduction

This Data Processing Agreement ("DPA") forms part of the Terms of Service between LodgeTrack ("Controller", "we", "us") and you, the customer ("Processor", "you"), and governs the processing of personal data on your behalf in connection with the Services.

By using the Services, you acknowledge and agree to the terms of this DPA. Capitalized terms not defined herein have the meanings given in the Terms of Service.

## 2. Definitions

- **Personal Data**: Any information relating to an identified or identifiable natural person.
- **Processing**: Any operation performed on Personal Data, including collection, recording, organization, structuring, storage, adaptation, retrieval, use, disclosure, erasure, or destruction.
- **Data Subject**: The identifiable natural person to whom Personal Data relates.
- **Sub-processor**: Any third party engaged by LodgeTrack to process Personal Data on your behalf.
- **Applicable Data Protection Law**: The EU General Data Protection Regulation (GDPR) 2016/679, the UK GDPR, and any other applicable data protection laws.

## 3. Scope and Nature of Processing

### 3.1 Categories of Personal Data
The Personal Data processed under this Agreement includes:
- Contact information (name, email, phone number) of your guests, team members, and vendors
- Booking and stay data (dates, preferences, special requests)
- Payment and billing information
- Communication records (messages, notes, support tickets)
- Property and unit data associated with identifiable individuals

### 3.2 Categories of Data Subjects
- Your guests and prospective guests
- Your employees, contractors, and team members
- Vendors and service providers
- Any other individuals whose data you provide to the Services

### 3.3 Purpose of Processing
LodgeTrack processes Personal Data solely to:
- Provide the Services (booking management, property management, communications)
- Process payments and manage billing
- Provide customer support
- Comply with legal obligations
- Improve and secure the Services

### 3.4 Duration
Processing continues for the duration of your subscription, plus any retention period required by law or this Agreement.

## 4. LodgeTrack's Obligations

### 4.1 Lawful Processing
LodgeTrack shall:
- Process Personal Data only on your documented instructions
- Ensure all personnel authorized to process Personal Data are subject to confidentiality obligations
- Implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk
- Not engage Sub-processors without your prior written consent (general consent given for Sub-processors listed in Annex A)
- Assist you in responding to Data Subject rights requests
- Notify you without undue delay of any Personal Data breach
- Delete or return all Personal Data upon termination, unless retention is required by law

### 4.2 Security Measures
LodgeTrack maintains the following security measures:
- Encryption in transit (TLS 1.2+) and at rest (AES-256)
- Role-based access control and multi-factor authentication
- Regular security testing and vulnerability assessments
- Incident response procedures
- SOC 2 Type II aligned practices

### 4.3 Sub-processors
LodgeTrack engages the following categories of Sub-processors (current list in Annex A):
- Cloud hosting providers (infrastructure)
- Payment processors (Lemon Squeezy)
- Email delivery services (Resend)
- Analytics providers (if enabled by you)

You may object to new Sub-processors within 30 days of notification.

## 5. Your Obligations

### 5.1 Lawful Basis
You represent that you have a lawful basis for processing Personal Data and for instructing LodgeTrack to process it on your behalf.

### 5.2 Data Subject Rights
You are responsible for responding to Data Subject requests. LodgeTrack will provide reasonable assistance.

### 5.3 Data Accuracy
You are responsible for the accuracy and completeness of Personal Data you submit to the Services.

## 6. International Transfers

Personal Data may be processed in the United States and other jurisdictions where LodgeTrack or its Sub-processors operate. LodgeTrack relies on:
- Standard Contractual Clauses (SCCs) for transfers to third countries
- Adequacy decisions where applicable
- Your instructions regarding data residency

## 7. Data Retention and Deletion

- Booking data: Retained for 7 years after stay end (tax/legal compliance)
- Guest communications: Retained for 3 years after last interaction
- Payment data: Retained per payment processor requirements (typically 7 years)
- Account data: Deleted within 30 days of account closure, unless retention required by law

You may request earlier deletion of specific data, subject to legal hold obligations.

## 8. Audit Rights

You may audit LodgeTrack's compliance with this DPA once per calendar year, upon 30 days' written notice, during business hours, and subject to a mutually agreed scope and confidentiality terms. LodgeTrack may provide SOC 2 reports in lieu of an on-site audit.

## 9. Liability

Each party's liability under this DPA is governed by the limitation of liability provisions in the Terms of Service.

## 10. Term and Termination

This DPA remains in effect for the duration of the Terms of Service. Upon termination, LodgeTrack will delete or return Personal Data per Section 4.1.

## 11. General

This DPA is governed by the same law and jurisdiction as the Terms of Service. It may only be amended in writing signed by both parties.

---

## Annex A: Current Sub-processors

| Sub-processor | Purpose | Location | Safeguards |
|---------------|---------|----------|------------|
| Supabase (PostgreSQL, Storage) | Database & file storage | US/EU | SCCs, encryption |
| Lemon Squeezy | Payment processing | US/EU | SCCs, PCI DSS |
| Resend | Transactional email | US | SCCs |
| Vercel | Hosting & edge functions | US/EU | SCCs |

## Annex B: Technical and Organizational Measures

1. **Access Control**: Role-based access, MFA, principle of least privilege
2. **Encryption**: TLS 1.2+ in transit, AES-256 at rest
3. **Availability**: Daily backups, point-in-time recovery, multi-AZ deployment
4. **Integrity**: Checksums on file uploads, audit logs
5. **Monitoring**: 24/7 alerting, incident response < 1 hour
6. **Personnel**: Background checks, annual security training, confidentiality agreements
7. **Vendor Management**: Due diligence, contractual obligations, periodic review

---

© 2026 LodgeTrack. All rights reserved.