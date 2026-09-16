const AUTH_TOKEN_KEY = 'portfolioAuthToken';
const AUTH_USER_KEY = 'portfolioUser';

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function saveAuthSession(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user || {}));
}

function clearAuthSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

async function apiFetch(url, options = {}) {
    const token = getAuthToken();
    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, { ...options, headers });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
        throw new Error(payload.message || 'Request failed');
    }

    return payload;
}

async function checkAuthStatus() {
    const token = getAuthToken();
    if (!token) {
        return { authenticated: false };
    }

    try {
        const result = await apiFetch('/api/auth/me');
        const user = result.data?.user || JSON.parse(localStorage.getItem(AUTH_USER_KEY) || '{}');
        return { authenticated: true, user };
    } catch (error) {
        clearAuthSession();
        return { authenticated: false };
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const message = document.getElementById('login-message');

            try {
                const response = await apiFetch('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                saveAuthSession(response.data?.access_token, response.data?.user);
                window.location.href = 'admin.html';
            } catch (error) {
                if (message) {
                    message.textContent = error.message || 'Login failed';
                    message.style.display = 'block';
                }
            }
        });
    }

    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await apiFetch('/api/auth/logout', { method: 'POST' });
            } catch (error) {
                console.warn('Logout request failed:', error);
            }

            clearAuthSession();
            window.location.href = 'login.html';
        });
    }

    const adminUserBadge = document.getElementById('admin-user-badge');
    if (adminUserBadge) {
        const authStatus = await checkAuthStatus();
        if (!authStatus.authenticated) {
            window.location.href = 'login.html';
            return;
        }

        adminUserBadge.textContent = authStatus.user?.email || 'Admin';
    }
});
