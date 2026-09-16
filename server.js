const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const DEFAULT_CONFIG_PATH = path.join(DATA_DIR, 'default-config.json');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

function looksLikePlaceholderValue(value) {
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return true;

    return [
        'your_project_ref',
        'your-service-role-key',
        'your-anon-key',
        'your_project_ref.supabase.co',
        'your-project-ref',
        'replace-me',
        'changeme',
        'placeholder',
        'example.com'
    ].some((placeholder) => normalized.includes(placeholder));
}

function hasRealSupabaseConfig(url, serviceRoleKey) {
    if (!url || !serviceRoleKey) return false;
    if (!/^https?:\/\//i.test(url)) return false;
    if (looksLikePlaceholderValue(url) || looksLikePlaceholderValue(serviceRoleKey)) return false;
    return true;
}

const HAS_SUPABASE_CONFIG = hasRealSupabaseConfig(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const DEMO_MODE = !HAS_SUPABASE_CONFIG;
const supabase = HAS_SUPABASE_CONFIG
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    })
    : null;

const DEMO_ADMIN_EMAIL = 'admin@demo.local';
const DEMO_ADMIN_PASSWORD = 'AdminTest123!';
const DEMO_TOKENS = new Map();

function isDemoLogin(email, password) {
    return email === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD;
}

function createDemoToken(email) {
    const token = Buffer.from(`${email}:${Date.now()}:${Math.random().toString(36).slice(2)}`).toString('base64url');
    DEMO_TOKENS.set(token, { email, role: 'admin' });
    return token;
}

function getDemoUserFromToken(token) {
    const user = DEMO_TOKENS.get(token);
    return user ? { id: `demo-${user.email.replace(/[^a-z0-9]/gi, '')}`, email: user.email, role: user.role } : null;
}

function deepMerge(base, incoming) {
    const output = Array.isArray(base) ? [...base] : { ...(base || {}) };

    for (const key of Object.keys(incoming || {})) {
        const current = output[key];
        const nextValue = incoming[key];

        if (current && typeof current === 'object' && !Array.isArray(current) && nextValue && typeof nextValue === 'object' && !Array.isArray(nextValue)) {
            output[key] = deepMerge(current, nextValue);
        } else {
            output[key] = nextValue;
        }
    }

    return output;
}

function readJson(filePath, fallback = {}) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        if (fallback && typeof fallback === 'object') {
            return fallback;
        }
        return {};
    }
}

function ensureFiles() {
    fs.mkdirSync(DATA_DIR, { recursive: true });

    if (!fs.existsSync(DEFAULT_CONFIG_PATH)) {
        const fallback = readJson(CONFIG_PATH, {
            site: {
                title: 'แฟ้มสะสมผลงานครู',
                subtitle: 'ผลงานและความก้าวหน้าของครูผู้สอน',
                welcome: 'สวัสดีครับ/ค่ะ',
                theme: 'aurora',
                themeColors: {
                    primary: '#5b21b6',
                    secondary: '#ec4899',
                    accent: '#7c3aed',
                    bg: '#f4f7fb',
                    text: '#14213d'
                }
            },
            owner: {
                fullname: 'นางสาวภาวดี ชูสกุล',
                nickname: 'อาจารย์ภาวดี',
                position: 'ครูวิทยาศาสตร์',
                position_level: 'ครูชำนาญการพิเศษ',
                school: 'โรงเรียนสตรีศรีน่าน',
                area: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษา เขต 1',
                subject: 'วิทยาศาสตร์',
                grade_level: 'มัธยมศึกษาปีที่ 1–6',
                year: '2569',
                phone: '081-234-5678',
                email: 'pavadee.teacher@school.ac.th',
                profile_image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80',
                cover_image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80',
                bio: 'ครูวิทยาศาสตร์ที่ให้ความสำคัญกับการจัดการเรียนรู้เชิงรุก',
                quote: 'เรียนรู้เพื่อสร้างคนเก่งและมีคุณค่า'
            },
            stats: {
                awards: 9,
                documents_pa: 6,
                teaching_works: 32,
                best_practice: 3,
                dev_activities: 14,
                progress_pa: 76
            },
            evaluation: {
                latest_score: '4.70 / 5.00',
                latest_term: 'ภาคเรียนที่ 2 ปี 2568',
                summary: 'มีผลการประเมินอยู่ในระดับดีเยี่ยม'
            },
            portfolioCards: []
        });

        fs.writeFileSync(DEFAULT_CONFIG_PATH, JSON.stringify(fallback, null, 2) + '\n');
    }

    if (!fs.existsSync(CONFIG_PATH)) {
        fs.copyFileSync(DEFAULT_CONFIG_PATH, CONFIG_PATH);
    }
}

function normalizeConfig(raw = {}) {
    const defaultConfig = readJson(DEFAULT_CONFIG_PATH, {});
    const merged = deepMerge(defaultConfig, raw);

    if (!merged.site) merged.site = {};
    if (!merged.owner) merged.owner = {};
    if (!merged.stats) merged.stats = {};
    if (!merged.evaluation) merged.evaluation = {};
    if (!Array.isArray(merged.portfolioCards)) {
        merged.portfolioCards = Array.isArray(defaultConfig.portfolioCards) ? defaultConfig.portfolioCards : [];
    }

    return merged;
}

function readConfig() {
    ensureFiles();
    return normalizeConfig(readJson(CONFIG_PATH, {}));
}

function writeConfig(payload) {
    ensureFiles();
    const nextData = normalizeConfig(payload);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(nextData, null, 2) + '\n');
    return nextData;
}

async function getAuthUser(req) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return null;
    }

    if (DEMO_MODE) {
        const demoUser = getDemoUserFromToken(token);
        if (demoUser) {
            return demoUser;
        }
        return null;
    }

    if (!supabase) {
        return null;
    }

    try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data?.user) {
            return null;
        }

        return data.user;
    } catch (error) {
        return null;
    }
}

async function getConfigFromSupabase() {
    if (!supabase) {
        return readConfig();
    }

    try {
        const { data, error } = await supabase
            .from('portfolio_settings')
            .select('*')
            .eq('key', 'config')
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (!data) {
            const defaults = readConfig();
            await saveConfigToSupabase(defaults);
            return defaults;
        }

        try {
            return JSON.parse(data.value || '{}');
        } catch (parseError) {
            console.warn('Invalid config payload in Supabase, falling back to default configuration.', parseError);
            return readConfig();
        }
    } catch (error) {
        console.warn('Supabase config read failed, using JSON fallback:', error.message || error);
        return readConfig();
    }
}

async function saveConfigToSupabase(payload) {
    if (!supabase) {
        return writeConfig(payload);
    }

    const nextData = normalizeConfig(payload);

    try {
        const { data, error } = await supabase
            .from('portfolio_settings')
            .upsert({ key: 'config', value: nextData }, { onConflict: 'key' })
            .select()
            .single();

        if (error) {
            throw error;
        }

        const savedValue = data?.value && typeof data.value === 'object' ? data.value : nextData;
        writeConfig(savedValue);
        return savedValue;
    } catch (error) {
        console.warn('Supabase config write failed, falling back to JSON:', error.message || error);
        return writeConfig(nextData);
    }
}

async function requireAuth(req, res, next) {
    const user = await getAuthUser(req);
    if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    req.user = user;
    next();
}

app.use(express.json({ limit: '10mb' }));
app.use(express.static(ROOT_DIR));

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        message: 'Portfolio backend is running.',
        mode: DEMO_MODE ? 'demo' : 'supabase',
        database: DEMO_MODE ? 'json-fallback-demo' : 'supabase'
    });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    if (DEMO_MODE && isDemoLogin(email, password)) {
        const token = createDemoToken(email);
        return res.json({
            success: true,
            data: {
                user: { id: `demo-${DEMO_ADMIN_EMAIL.replace(/[^a-z0-9]/gi, '')}`, email: DEMO_ADMIN_EMAIL, role: 'admin' },
                access_token: token,
                refresh_token: token
            }
        });
    }

    if (DEMO_MODE) {
        return res.status(401).json({
            success: false,
            message: 'ทดสอบระบบ: admin@demo.local / AdminTest123!'
        });
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error || !data?.session || !data?.user) {
            return res.status(401).json({ success: false, message: error?.message || 'Login failed.' });
        }

        return res.json({
            success: true,
            data: {
                user: data.user,
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
            }
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Supabase authentication failed. Use the demo admin account: admin@demo.local / AdminTest123!'
        });
    }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ success: true, data: { user: req.user } });
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (supabase) {
        await supabase.auth.signOut();
    } else if (token) {
        DEMO_TOKENS.delete(token);
    }

    res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/config', async (req, res) => {
    try {
        const data = await getConfigFromSupabase();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Failed to read config:', error);
        res.status(500).json({ success: false, message: 'Unable to load config.' });
    }
});

app.put('/api/config', requireAuth, async (req, res) => {
    try {
        const payload = req.body || {};
        const saved = await saveConfigToSupabase(payload);
        res.json({ success: true, data: saved });
    } catch (error) {
        console.error('Failed to save config:', error);
        res.status(500).json({ success: false, message: 'Unable to save config.' });
    }
});

app.post('/api/config/reset', requireAuth, async (req, res) => {
    try {
        const defaults = readJson(DEFAULT_CONFIG_PATH, {});
        const saved = await saveConfigToSupabase(defaults);
        res.json({ success: true, data: saved });
    } catch (error) {
        console.error('Failed to reset config:', error);
        res.status(500).json({ success: false, message: 'Unable to reset config.' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'API route not found.' });
    }
    const requested = path.join(ROOT_DIR, req.path);
    if (requested.startsWith(ROOT_DIR) && fs.existsSync(requested) && fs.statSync(requested).isFile()) {
        return res.sendFile(requested);
    }
    return res.status(404).send('Not found');
});

ensureFiles();

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Portfolio backend listening on http://localhost:${PORT}`);
    });
}

module.exports = {
    app,
    hasRealSupabaseConfig,
    looksLikePlaceholderValue,
    DEMO_MODE,
    HAS_SUPABASE_CONFIG,
    createDemoToken,
    getDemoUserFromToken
};
