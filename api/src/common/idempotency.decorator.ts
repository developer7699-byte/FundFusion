import {
  BadRequestException,
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';

const MAX_LENGTH = 255;

/**
 * The `Idempotency-Key` on a money route (PRD §5 rule 2).
 *
 * There is deliberately no fallback. Generating one when the header is
 * absent would make every retry a fresh request — which is exactly the
 * failure the header exists to prevent, and the failure would be a second
 * order rather than an error anyone sees.
 */
export function idempotencyKeyFrom(req: {
  headers: Record<string, unknown>;
}): string {
  const raw = req.headers['idempotency-key'];

  if (Array.isArray(raw)) {
    throw new BadRequestException(
      'This request carried more than one Idempotency-Key. Guessing which one was meant is how a retry becomes a second request.',
    );
  }

  const key = typeof raw === 'string' ? raw.trim() : '';
  if (!key) {
    throw new BadRequestException(
      'This operation moves money and needs an Idempotency-Key header. Send the same key to retry it safely.',
    );
  }
  if (key.length > MAX_LENGTH) {
    throw new BadRequestException(
      `An Idempotency-Key is at most ${MAX_LENGTH} characters; this one was ${key.length}.`,
    );
  }
  return key;
}

/** `@IdempotencyKey() key: string` on a handler parameter. */
export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    idempotencyKeyFrom(
      ctx.switchToHttp().getRequest<{ headers: Record<string, unknown> }>(),
    ),
);
