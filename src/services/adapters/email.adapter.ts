/**
 * Transactional Email Provider Adapter Interface
 * Implementations: Mailpit (Local Dev), Resend / SMTP (Staging / Production).
 */

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  tags?: Record<string, string>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailAdapter {
  sendEmail(input: SendEmailInput): Promise<EmailSendResult>;
}
