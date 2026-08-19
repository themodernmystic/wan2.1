import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { sendEmail } from '../integrations/email.js';

const router = Router();
const otpDigits = customAlphabet('0123456789', 6);
const resetTokenId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 32);

function toPublicUser(u: any) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

// POST /api/auth/register { email, password, full_name? }
// Creates the user immediately (role: "user") and also issues an OTP so the
// register page's verify-OTP step (mirrors both source apps' flow) works.
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password_hash, full_name: full_name || null, role: 'user' },
    });

    const code = otpDigits();
    await prisma.authOtp.create({
      data: { email, code, purpose: 'register', expires_at: new Date(Date.now() + 10 * 60 * 1000) },
    });
    await sendEmail({
      to: email,
      subject: 'Verify your account',
      body: `Your verification code is ${code}. It expires in 10 minutes.`,
    }).catch((e) => console.warn('sendEmail(register otp) failed:', e.message));

    res.json({ user: toPublicUser(user), otp_sent: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/resend-otp { email }
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });
    const code = otpDigits();
    await prisma.authOtp.create({
      data: { email, code, purpose: 'register', expires_at: new Date(Date.now() + 10 * 60 * 1000) },
    });
    await sendEmail({ to: email, subject: 'Your new verification code', body: `Your verification code is ${code}.` }).catch(() => {});
    res.json({ sent: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/verify-otp { email, otpCode } -> { access_token }
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otpCode } = req.body || {};
    if (!email || !otpCode) return res.status(400).json({ error: 'email and otpCode are required' });

    const otp = await prisma.authOtp.findFirst({
      where: { email, code: otpCode, purpose: 'register', consumed: false, expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' },
    });
    if (!otp) return res.status(400).json({ error: 'Invalid or expired code' });

    await prisma.authOtp.update({ where: { id: otp.id }, data: { consumed: true } });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const access_token = signToken({ sub: user.id, email: user.email, role: user.role || 'user' });
    res.json({ access_token, user: toPublicUser(user) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login { email, password } -> { access_token, user }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const access_token = signToken({ sub: user.id, email: user.email, role: user.role || 'user' });
    res.json({ access_token, user: toPublicUser(user) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.currentUser!.id } });
  res.json(toPublicUser(user));
});

// PUT /api/auth/me { full_name?, avatar_url?, ...any other self-editable fields }
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { password, password_hash, email, role, id, ...data } = req.body || {};
    const user = await prisma.user.update({ where: { id: req.currentUser!.id }, data });
    res.json(toPublicUser(user));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/logout — stateless JWT, this is a no-op the client uses for parity/telemetry.
router.post('/logout', (_req, res) => res.json({ ok: true }));

// POST /api/auth/reset-password-request { email }
router.post('/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });
    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond success even if user doesn't exist, to avoid account enumeration.
    if (user) {
      const token = resetTokenId();
      await prisma.passwordResetToken.create({
        data: { email, token, expires_at: new Date(Date.now() + 60 * 60 * 1000) },
      });
      await sendEmail({
        to: email,
        subject: 'Reset your password',
        body: `Use this token to reset your password: ${token} (expires in 1 hour).`,
      }).catch((e) => console.warn('sendEmail(reset) failed:', e.message));
    }
    res.json({ sent: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/reset-password { resetToken, newPassword }
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body || {};
    if (!resetToken || !newPassword) return res.status(400).json({ error: 'resetToken and newPassword are required' });

    const record = await prisma.passwordResetToken.findFirst({
      where: { token: resetToken, consumed: false, expires_at: { gt: new Date() } },
    });
    if (!record) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const password_hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { email: record.email }, data: { password_hash } });
    await prisma.passwordResetToken.update({ where: { id: record.id }, data: { consumed: true } });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/oauth/:provider — social login entry point (Google, matching
// base44.auth.loginWithProvider("google", redirect)). Configure GOOGLE_CLIENT_ID/
// GOOGLE_CLIENT_SECRET to enable; otherwise responds 501 so the UI can show a
// clear "not configured" message instead of a silent failure.
router.get('/oauth/:provider', async (req, res) => {
  const { env } = await import('../lib/env.js');
  if (req.params.provider === 'google' && env.GOOGLE_CLIENT_ID) {
    const redirect = String(req.query.redirect || '/');
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: `${req.protocol}://${req.get('host')}/api/auth/oauth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state: redirect,
    });
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }
  res.status(501).json({ error: `OAuth provider "${req.params.provider}" is not configured on this server` });
});

export default router;
