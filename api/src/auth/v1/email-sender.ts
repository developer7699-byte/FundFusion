import { Injectable, Logger } from '@nestjs/common';

/**
 * Sending an email. Narrow on purpose: a provider swap (Resend is the pick in
 * `docs/DEPENDENCIES.md` §1.3) touches this file and nothing else.
 */
export interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}

/**
 * Development: the code goes to the log, never to a response body.
 *
 * A development shortcut that leaks into an API response is the same shortcut
 * in production — and this one would hand an account to anyone who could call
 * the endpoint.
 */
@Injectable()
export class LoggingEmailSender implements EmailSender {
  private readonly log = new Logger('Email');

  send(to: string, subject: string, body: string): Promise<void> {
    this.log.log(`To ${to} — ${subject}: ${body}`);
    return Promise.resolve();
  }
}
