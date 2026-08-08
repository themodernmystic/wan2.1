// Drop-in replacement for the @base44/sdk client. Same method surface as the
// original `base44` object (`base44.entities.<Name>.*`, `base44.auth.*`,
// `base44.integrations.Core.*`, `base44.functions.invoke`) so every page and
// component written against the real Base44 SDK keeps working unchanged —
// only this file talks to our self-hosted Express API instead of Base44's
// managed backend.

const TOKEN_KEY = 'auth_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(isForm ? {} : body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const err = new Error((data && data.error) || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return '';
  return `?${new URLSearchParams(entries).toString()}`;
}

function makeEntityClient(name) {
  return {
    list: (sort, limit) => request(`/entities/${name}${qs({ sort, limit })}`),
    filter: (query = {}, sort, limit) => request(`/entities/${name}${qs({ filter: JSON.stringify(query), sort, limit })}`),
    get: (id) => request(`/entities/${name}/${id}`),
    create: (data) => request(`/entities/${name}`, { method: 'POST', body: data }),
    bulkCreate: (items) => request(`/entities/${name}/bulk`, { method: 'POST', body: { items } }),
    update: (id, data) => request(`/entities/${name}/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/entities/${name}/${id}`, { method: 'DELETE' }),
  };
}

// `base44.entities.<AnyEntityName>` works for all 115 merged entities without
// hand-listing them here — the Proxy lazily builds a client per name and the
// server validates the name against the real schema.
const entities = new Proxy(
  {},
  {
    get: (_target, name) => makeEntityClient(String(name)),
  }
);

export const base44 = {
  entities,

  auth: {
    async me() {
      return request('/auth/me');
    },
    async isAuthenticated() {
      try {
        await request('/auth/me');
        return true;
      } catch {
        return false;
      }
    },
    async loginViaEmailPassword(email, password) {
      const { access_token, user } = await request('/auth/login', { method: 'POST', body: { email, password } });
      setToken(access_token);
      return user;
    },
    async register({ email, password, full_name }) {
      return request('/auth/register', { method: 'POST', body: { email, password, full_name } });
    },
    async resendOtp(email) {
      return request('/auth/resend-otp', { method: 'POST', body: { email } });
    },
    async verifyOtp({ email, otpCode }) {
      const result = await request('/auth/verify-otp', { method: 'POST', body: { email, otpCode } });
      if (result.access_token) setToken(result.access_token);
      return result;
    },
    setToken(token) {
      setToken(token);
    },
    async updateMe(data) {
      return request('/auth/me', { method: 'PUT', body: data });
    },
    async resetPasswordRequest(email) {
      return request('/auth/reset-password-request', { method: 'POST', body: { email } });
    },
    async resetPassword({ resetToken, newPassword }) {
      return request('/auth/reset-password', { method: 'POST', body: { resetToken, newPassword } });
    },
    logout(redirectUrl) {
      setToken(null);
      if (redirectUrl) window.location.href = redirectUrl;
    },
    redirectToLogin(returnTo) {
      const url = new URL('/login', window.location.origin);
      if (returnTo) url.searchParams.set('return_to', returnTo);
      window.location.href = url.toString();
    },
    loginWithProvider(provider, redirect) {
      const url = new URL(`/api/auth/oauth/${provider}`, window.location.origin);
      if (redirect) url.searchParams.set('redirect', redirect);
      window.location.href = url.toString();
    },
  },

  integrations: {
    Core: {
      InvokeLLM: (args) => request('/integrations/invoke-llm', { method: 'POST', body: args }),
      GenerateImage: (args) => request('/integrations/generate-image', { method: 'POST', body: args }),
      SendEmail: (args) => request('/integrations/send-email', { method: 'POST', body: args }),
      ExtractDataFromUploadedFile: (args) => request('/integrations/extract-data', { method: 'POST', body: args }),
      UploadFile: async ({ file }) => {
        const form = new FormData();
        form.append('file', file, file.name || 'upload');
        return request('/integrations/upload-file', { method: 'POST', body: form, isForm: true });
      },
    },
  },

  functions: {
    // Matches the axios-like `{ data, status }` shape the original pages
    // check (e.g. `res.data?.success`) even on non-2xx responses, since
    // several call sites read `res.data?.error` after a failed call rather
    // than catching a thrown exception.
    async invoke(name, payload) {
      try {
        const data = await request(`/functions/${name}`, { method: 'POST', body: payload });
        return { data, status: 200 };
      } catch (err) {
        return { data: err.data, status: err.status || 500 };
      }
    },
  },
};
