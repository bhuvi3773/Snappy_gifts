import { EmailAdapter, SendEmailInput, EmailSendResult } from '../adapters/email.adapter';
import net from 'node:net';

export class MailpitEmailService implements EmailAdapter {
  private host: string;
  private port: number;
  private from: string;
  private isProduction: boolean;

  constructor() {
    this.host = process.env.SMTP_HOST || 'localhost';
    this.port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 1025;
    this.from = process.env.EMAIL_FROM || 'orders@snappygifts.in';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  async sendEmail(input: SendEmailInput): Promise<EmailSendResult> {
    const recipients = Array.isArray(input.to) ? input.to : [input.to];

    // Security Rule: NEVER log email content or verification codes in production.
    if (!this.isProduction) {
      console.log(`\n========================================================`);
      console.log(`[TRANSACTIONAL_EMAIL: LOCAL_DEV_DISPATCH]`);
      console.log(`From: ${this.from}`);
      console.log(`To: ${recipients.join(', ')}`);
      console.log(`Subject: ${input.subject}`);
      console.log(`Body:\n${input.text || input.html}`);
      console.log(`========================================================\n`);
    }

    try {
      await this.sendViaRawSmtp(recipients, input.subject, input.html || input.text || '');
      return {
        success: true,
        messageId: `smtp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      };
    } catch (err: any) {
      // In production, MUST FAIL CLOSED if email delivery fails
      if (this.isProduction) {
        console.error('[EMAIL_SERVICE:CRITICAL] Production email delivery failed:', err?.message || err);
        return {
          success: false,
          error: 'Transactional email service is currently unavailable. Please try again later.',
        };
      }

      // In local development only, acknowledge console fallback so local offline testing is unblocked
      console.warn('[EMAIL_SERVICE:DEV] SMTP connection unreachable; simulated local delivery recorded.');
      return {
        success: true,
        messageId: `local-console-fallback-${Date.now()}`,
      };
    }
  }

  private sendViaRawSmtp(recipients: string[], subject: string, body: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(this.port, this.host);
      socket.setTimeout(2500);

      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('SMTP connection timeout'));
      });

      let step = 0;
      socket.on('data', () => {
        if (step === 0) {
          socket.write(`HELO snappygifts.local\r\n`);
          step++;
        } else if (step === 1) {
          socket.write(`MAIL FROM:<${this.from}>\r\n`);
          step++;
        } else if (step === 2) {
          socket.write(`RCPT TO:<${recipients[0]}>\r\n`);
          step++;
        } else if (step === 3) {
          socket.write(`DATA\r\n`);
          step++;
        } else if (step === 4) {
          socket.write(`Subject: ${subject}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${body}\r\n.\r\n`);
          step++;
        } else if (step === 5) {
          socket.write(`QUIT\r\n`);
          socket.end();
          resolve();
        }
      });
    });
  }
}

export const emailService = new MailpitEmailService();
