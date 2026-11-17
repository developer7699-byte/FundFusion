import { GoogleOauthService } from './google-oauth.service';

let service: GoogleOauthService;
const original = { ...process.env };

beforeEach(() => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  service = new GoogleOauthService();
});

afterAll(() => {
  process.env = original;
});

// The milestone must complete without credentials. The service reports itself
// unconfigured and sign-in fails with a clear message rather than crashing.
describe('GoogleOauthService config seam (PRD §9.1)', () => {
  it('reports itself unconfigured when nothing is set', () => {
    expect(service.isConfigured()).toBe(false);
  });

  it('treats an empty client id as unconfigured', () => {
    process.env.GOOGLE_CLIENT_ID = '';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    expect(service.isConfigured()).toBe(false);
  });

  it('treats a whitespace-only secret as unconfigured', () => {
    process.env.GOOGLE_CLIENT_ID = 'id';
    process.env.GOOGLE_CLIENT_SECRET = '   ';
    expect(service.isConfigured()).toBe(false);
  });

  it('requires both the id and the secret', () => {
    process.env.GOOGLE_CLIENT_ID = 'id';
    expect(service.isConfigured()).toBe(false);
  });

  it('reports itself configured once both are present', () => {
    process.env.GOOGLE_CLIENT_ID = 'id';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    expect(service.isConfigured()).toBe(true);
  });

  it('refuses sign-in with a clear message when unconfigured', async () => {
    await expect(service.verifyIdToken('anything')).rejects.toThrow(
      /not configured/i,
    );
  });

  it('names the environment variables an operator must set', async () => {
    await expect(service.verifyIdToken('x')).rejects.toThrow(
      /GOOGLE_CLIENT_ID/,
    );
  });
});
