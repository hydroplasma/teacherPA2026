const STORAGE_KEY = 'teacherPortfolioConfig';
const STORAGE_THEME_KEY = 'teacherTheme';
const AUTH_TOKEN_KEY = 'portfolioAuthToken';
const AUTH_USER_KEY = 'portfolioUser';
const FALLBACK_PROFILE = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80';
const FALLBACK_COVER = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80';
let CONFIG = {};

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function clearAuthSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
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

function normalizeConfig(raw = {}) {
    const base = raw || {};
    const safeConfig = deepMerge({
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
            profile_image: FALLBACK_PROFILE,
            cover_image: FALLBACK_COVER,
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
    }, base);

    safeConfig.site.themeColors = { ...safeConfig.site.themeColors, ...(base.site?.themeColors || {}) };
    safeConfig.owner.profile_image = safeConfig.owner.profile_image || FALLBACK_PROFILE;
    safeConfig.owner.cover_image = safeConfig.owner.cover_image || FALLBACK_COVER;
    safeConfig.portfolioCards = Array.isArray(base.portfolioCards) ? base.portfolioCards : safeConfig.portfolioCards;
    return safeConfig;
}

function applyThemeToDocument() {
    const theme = CONFIG.site?.theme || 'aurora';
    const colors = CONFIG.site?.themeColors || {};
    document.body.dataset.theme = theme;
    const root = document.documentElement;
    root.style.setProperty('--primary', colors.primary || '#5b21b6');
    root.style.setProperty('--primary-strong', colors.primary || '#3d1b8f');
    root.style.setProperty('--secondary', colors.secondary || '#ec4899');
    root.style.setProperty('--accent', colors.accent || '#7c3aed');
    root.style.setProperty('--bg', colors.bg || '#f4f7fb');
    root.style.setProperty('--text', colors.text || '#14213d');
    localStorage.setItem(STORAGE_THEME_KEY, theme);

    document.querySelectorAll('[data-theme-btn]').forEach((button) => {
        button.classList.toggle('active', button.dataset.themeBtn === theme);
    });
}

function setLocalFallback(value) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function fetchJson(url, options = {}) {
    const token = getAuthToken();
    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(url, { ...options, headers }).then(async (response) => {
        const text = await response.text();
        const payload = text ? JSON.parse(text) : {};

        if (response.status === 401 && window.location.pathname.endsWith('admin.html')) {
            clearAuthSession();
            window.location.href = 'login.html';
        }

        if (!response.ok) {
            throw new Error(payload.message || 'Request failed');
        }

        return payload;
    });
}

async function loadConfig() {
    try {
        const response = await fetchJson('/api/config');
        CONFIG = normalizeConfig(response.data || response);
        setLocalFallback(CONFIG);
    } catch (error) {
        console.warn('Backend unavailable, using local fallback.', error);
        const savedRaw = localStorage.getItem(STORAGE_KEY);
        CONFIG = savedRaw ? normalizeConfig(JSON.parse(savedRaw)) : normalizeConfig({});
    }

    applyThemeToDocument();
    applyConfig();
    renderPortfolioCards();
    prepareAdminPage();
    bindThemeButtons();
}

async function saveConfig(nextConfig) {
    try {
        const response = await fetchJson('/api/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nextConfig)
        });

        CONFIG = normalizeConfig(response.data || nextConfig);
        setLocalFallback(CONFIG);
        applyThemeToDocument();
        applyConfig();
        renderPortfolioCards();
        return CONFIG;
    } catch (error) {
        console.error('Save config failed:', error);
        throw error;
    }
}

async function resetConfig() {
    const response = await fetchJson('/api/config/reset', { method: 'POST' });
    CONFIG = normalizeConfig(response.data || {});
    setLocalFallback(CONFIG);
    applyThemeToDocument();
    applyConfig();
    renderPortfolioCards();
    return CONFIG;
}

function bindThemeButtons() {
    document.querySelectorAll('[data-theme-btn]').forEach((button) => {
        button.addEventListener('click', async () => {
            CONFIG.site = CONFIG.site || {};
            CONFIG.site.theme = button.dataset.themeBtn || 'aurora';
            applyThemeToDocument();
            if (document.getElementById('site_theme')) {
                document.getElementById('site_theme').value = CONFIG.site.theme;
            }
            await saveConfig(CONFIG);
        });
    });
}

function renderPortfolioCards() {
    const container = document.getElementById('featured-portfolio-list');
    if (!container) return;

    const cards = Array.isArray(CONFIG.portfolioCards) && CONFIG.portfolioCards.length ? CONFIG.portfolioCards : [
        {
            id: 'fallback-1',
            title: 'ผลงานเด่น',
            category: 'Portfolio',
            description: 'พร้อมอัปเดตผลงานผ่านระบบหลังบ้าน',
            image: FALLBACK_COVER,
            layout: 'regular',
            featured: true
        }
    ];

    container.innerHTML = cards.map((card) => {
        const layoutClass = card.layout === 'tall' ? 'portfolio-card tall' : 'portfolio-card';
        const badge = card.category || 'Portfolio';
        return `
            <article class="${layoutClass}">
                <img src="${card.image || FALLBACK_COVER}" alt="${card.title || 'portfolio'}">
                <div class="portfolio-body">
                    <span class="pill ${card.category === 'รางวัล' ? 'success' : card.category === 'การสอน' ? 'primary' : card.category === 'Best Practice' ? 'warm' : 'purple'}">${badge}</span>
                    <h3>${card.title || 'ผลงานใหม่'}</h3>
                    <p>${card.description || 'อัปเดตข้อมูลผ่านระบบหลังบ้าน'}</p>
                </div>
            </article>
        `;
    }).join('');
}

function applyConfig() {
    if (!CONFIG.owner) return;

    document.querySelectorAll('[data-field="site_title"]').forEach(el => el.textContent = CONFIG.site?.title || 'แฟ้มสะสมผลงานครู');
    document.querySelectorAll('[data-field="site_subtitle"]').forEach(el => el.textContent = CONFIG.site?.subtitle || 'ผลงานและความก้าวหน้าของครูผู้สอน');
    document.querySelectorAll('[data-field="fullname"]').forEach(el => el.textContent = CONFIG.owner.fullname || '');
    document.querySelectorAll('[data-field="nickname"]').forEach(el => el.textContent = CONFIG.owner.nickname || CONFIG.owner.fullname || '');
    document.querySelectorAll('[data-field="position"]').forEach(el => el.textContent = CONFIG.owner.position || '');
    document.querySelectorAll('[data-field="position_level"]').forEach(el => el.textContent = CONFIG.owner.position_level || '');
    document.querySelectorAll('[data-field="school"]').forEach(el => el.textContent = CONFIG.owner.school || '');
    document.querySelectorAll('[data-field="area"]').forEach(el => el.textContent = CONFIG.owner.area || '');
    document.querySelectorAll('[data-field="year"]').forEach(el => el.textContent = CONFIG.owner.year || '');
    document.querySelectorAll('[data-field="subject"]').forEach(el => el.textContent = CONFIG.owner.subject || '');
    document.querySelectorAll('[data-field="grade"]').forEach(el => el.textContent = CONFIG.owner.grade_level || '');
    document.querySelectorAll('[data-field="phone"]').forEach(el => el.textContent = CONFIG.owner.phone || '');
    document.querySelectorAll('[data-field="email"]').forEach(el => el.textContent = CONFIG.owner.email || '');
    document.querySelectorAll('[data-field="bio"]').forEach(el => el.textContent = CONFIG.owner.bio || '');
    document.querySelectorAll('[data-field="quote"]').forEach(el => el.textContent = CONFIG.owner.quote || '');

    document.querySelectorAll('[data-img="profile"]').forEach(el => el.src = CONFIG.owner.profile_image || FALLBACK_PROFILE);
    document.querySelectorAll('[data-img="cover"]').forEach(el => {
        el.src = CONFIG.owner.cover_image || FALLBACK_COVER;
        el.style.objectFit = 'cover';
    });

    const heroPanel = document.querySelector('[data-cover="hero"]');
    if (heroPanel) {
        heroPanel.style.backgroundImage = `linear-gradient(135deg, rgba(91,33,182,0.87), rgba(236,72,153,0.82)), url('${CONFIG.owner.cover_image || FALLBACK_COVER}')`;
    }

    document.querySelectorAll('[data-stat="awards"]').forEach(el => el.textContent = CONFIG.stats?.awards ?? 0);
    document.querySelectorAll('[data-stat="documents"]').forEach(el => el.textContent = CONFIG.stats?.documents_pa ?? 0);
    document.querySelectorAll('[data-stat="teaching"]').forEach(el => el.textContent = CONFIG.stats?.teaching_works ?? 0);
    document.querySelectorAll('[data-stat="best"]').forEach(el => el.textContent = CONFIG.stats?.best_practice ?? 0);
    document.querySelectorAll('[data-stat="dev"]').forEach(el => el.textContent = CONFIG.stats?.dev_activities ?? 0);

    const progress = Number(CONFIG.stats?.progress_pa || 0);
    document.querySelectorAll('[data-progress="pa"]').forEach(el => {
        el.style.width = `${progress}%`;
    });
    document.querySelectorAll('[data-progress-label="pa"]').forEach(el => {
        el.textContent = `${progress}%`;
    });

    const evalScore = document.getElementById('eval-score');
    const evalTerm = document.getElementById('eval-term');
    const evalSummary = document.getElementById('eval-summary');
    if (evalScore) evalScore.textContent = CONFIG.evaluation?.latest_score || '4.50 / 5.00';
    if (evalTerm) evalTerm.textContent = CONFIG.evaluation?.latest_term || 'ภาคเรียนที่ 2 ปี 2568';
    if (evalSummary) evalSummary.textContent = CONFIG.evaluation?.summary || 'มีผลการประเมินอยู่ในระดับดีเยี่ยม';
}

function showToast(message = 'บันทึกข้อมูลสำเร็จ') {
    const toast = document.getElementById('save-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function renderCardList() {
    const list = document.getElementById('portfolio-card-list');
    const form = document.getElementById('portfolio-form');
    if (!list || !form) return;

    list.innerHTML = '';
    (CONFIG.portfolioCards || []).forEach((card) => {
        const item = document.createElement('div');
        item.className = 'portfolio-item';
        item.innerHTML = `
            <div class="portfolio-item-thumb"><img src="${card.image || FALLBACK_COVER}" alt="${card.title}"></div>
            <div class="portfolio-item-info">
                <strong>${card.title || 'ผลงานใหม่'}</strong>
                <span>${card.category || 'Portfolio'}</span>
            </div>
            <div class="portfolio-item-actions">
                <button type="button" class="mini-btn edit-card" data-card-id="${card.id}">แก้ไข</button>
                <button type="button" class="mini-btn danger delete-card" data-card-id="${card.id}">ลบ</button>
            </div>
        `;
        list.appendChild(item);
    });

    list.querySelectorAll('.edit-card').forEach((button) => {
        button.addEventListener('click', () => {
            const targetCard = (CONFIG.portfolioCards || []).find((card) => card.id === button.dataset.cardId);
            if (!targetCard) return;
            form.card_id.value = targetCard.id;
            form.card_title.value = targetCard.title || '';
            form.card_category.value = targetCard.category || 'Portfolio';
            form.card_description.value = targetCard.description || '';
            form.card_image.value = targetCard.image || '';
            form.card_layout.value = targetCard.layout || 'regular';
            form.card_featured.checked = Boolean(targetCard.featured);
            form.card_submit.textContent = 'อัปเดตผลงาน';
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    list.querySelectorAll('.delete-card').forEach((button) => {
        button.addEventListener('click', async () => {
            const filtered = (CONFIG.portfolioCards || []).filter((card) => card.id !== button.dataset.cardId);
            await saveConfig({ ...CONFIG, portfolioCards: filtered });
            showToast('ลบผลงานสำเร็จ');
        });
    });
}

function prepareAdminPage() {
    const form = document.getElementById('admin-form');
    if (!form) return;

    const siteForm = document.getElementById('site-settings-form');
    const portfolioForm = document.getElementById('portfolio-form');

    const fillForm = () => {
        form.owner_fullname.value = CONFIG.owner?.fullname || '';
        form.owner_nickname.value = CONFIG.owner?.nickname || '';
        form.owner_position.value = CONFIG.owner?.position || '';
        form.owner_position_level.value = CONFIG.owner?.position_level || '';
        form.owner_school.value = CONFIG.owner?.school || '';
        form.owner_area.value = CONFIG.owner?.area || '';
        form.owner_subject.value = CONFIG.owner?.subject || '';
        form.owner_grade_level.value = CONFIG.owner?.grade_level || '';
        form.owner_year.value = CONFIG.owner?.year || '';
        form.owner_phone.value = CONFIG.owner?.phone || '';
        form.owner_email.value = CONFIG.owner?.email || '';
        form.owner_profile_image.value = CONFIG.owner?.profile_image || FALLBACK_PROFILE;
        form.owner_cover_image.value = CONFIG.owner?.cover_image || FALLBACK_COVER;
        form.owner_bio.value = CONFIG.owner?.bio || '';
        form.owner_quote.value = CONFIG.owner?.quote || '';

        form.stats_awards.value = CONFIG.stats?.awards ?? 0;
        form.stats_documents_pa.value = CONFIG.stats?.documents_pa ?? 0;
        form.stats_teaching_works.value = CONFIG.stats?.teaching_works ?? 0;
        form.stats_best_practice.value = CONFIG.stats?.best_practice ?? 0;
        form.stats_dev_activities.value = CONFIG.stats?.dev_activities ?? 0;
        form.stats_progress_pa.value = CONFIG.stats?.progress_pa ?? 0;

        form.eval_score.value = CONFIG.evaluation?.latest_score || '4.50 / 5.00';
        form.eval_term.value = CONFIG.evaluation?.latest_term || 'ภาคเรียนที่ 2 ปี 2568';
        form.eval_summary.value = CONFIG.evaluation?.summary || '';

        if (siteForm) {
            siteForm.site_title.value = CONFIG.site?.title || 'แฟ้มสะสมผลงานครู';
            siteForm.site_subtitle.value = CONFIG.site?.subtitle || 'ผลงานและความก้าวหน้าของครูผู้สอน';
            siteForm.site_theme.value = CONFIG.site?.theme || 'aurora';
            siteForm.site_primary.value = CONFIG.site?.themeColors?.primary || '#5b21b6';
            siteForm.site_secondary.value = CONFIG.site?.themeColors?.secondary || '#ec4899';
            siteForm.site_accent.value = CONFIG.site?.themeColors?.accent || '#7c3aed';
            siteForm.site_bg.value = CONFIG.site?.themeColors?.bg || '#f4f7fb';
            siteForm.site_text.value = CONFIG.site?.themeColors?.text || '#14213d';
        }

        if (portfolioForm) {
            portfolioForm.reset();
            portfolioForm.card_id.value = '';
            portfolioForm.card_submit.textContent = 'เพิ่มผลงาน';
        }

        renderCardList();
    };

    fillForm();

    if (siteForm) {
        siteForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            CONFIG.site = CONFIG.site || {};
            CONFIG.site.title = siteForm.site_title.value;
            CONFIG.site.subtitle = siteForm.site_subtitle.value;
            CONFIG.site.theme = siteForm.site_theme.value;
            CONFIG.site.themeColors = {
                primary: siteForm.site_primary.value,
                secondary: siteForm.site_secondary.value,
                accent: siteForm.site_accent.value,
                bg: siteForm.site_bg.value,
                text: siteForm.site_text.value
            };

            await saveConfig(CONFIG);
            showToast('บันทึกธีมและหน้าแรกสำเร็จ');
        });
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const nextConfig = {
            site: CONFIG.site || {},
            owner: {
                fullname: form.owner_fullname.value,
                nickname: form.owner_nickname.value,
                position: form.owner_position.value,
                position_level: form.owner_position_level.value,
                school: form.owner_school.value,
                area: form.owner_area.value,
                subject: form.owner_subject.value,
                grade_level: form.owner_grade_level.value,
                year: form.owner_year.value,
                phone: form.owner_phone.value,
                email: form.owner_email.value,
                profile_image: form.owner_profile_image.value,
                cover_image: form.owner_cover_image.value,
                bio: form.owner_bio.value,
                quote: form.owner_quote.value
            },
            stats: {
                awards: Number(form.stats_awards.value || 0),
                documents_pa: Number(form.stats_documents_pa.value || 0),
                teaching_works: Number(form.stats_teaching_works.value || 0),
                best_practice: Number(form.stats_best_practice.value || 0),
                dev_activities: Number(form.stats_dev_activities.value || 0),
                progress_pa: Number(form.stats_progress_pa.value || 0)
            },
            evaluation: {
                latest_score: form.eval_score.value,
                latest_term: form.eval_term.value,
                summary: form.eval_summary.value
            },
            portfolioCards: CONFIG.portfolioCards || []
        };

        await saveConfig(nextConfig);
        showToast('บันทึกข้อมูลสำเร็จ');
    });

    const resetBtn = document.getElementById('reset-default');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            try {
                await resetConfig();
                fillForm();
                showToast('คืนค่าเริ่มต้นสำเร็จ');
            } catch (error) {
                console.error('Reset failed', error);
            }
        });
    }

    const exportBtn = document.getElementById('export-config');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(CONFIG, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'config.json';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    const profileUpload = document.getElementById('profile-upload');
    if (profileUpload) {
        profileUpload.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            form.owner_profile_image.value = await readFileAsDataUrl(file);
        });
    }

    const coverUpload = document.getElementById('cover-upload');
    if (coverUpload) {
        coverUpload.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            form.owner_cover_image.value = await readFileAsDataUrl(file);
        });
    }

    if (portfolioForm) {
        portfolioForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const id = portfolioForm.card_id.value || `card-${Date.now()}`;
            const payload = {
                id,
                title: portfolioForm.card_title.value,
                category: portfolioForm.card_category.value,
                description: portfolioForm.card_description.value,
                image: portfolioForm.card_image.value || FALLBACK_COVER,
                layout: portfolioForm.card_layout.value || 'regular',
                featured: portfolioForm.card_featured.checked
            };

            const current = CONFIG.portfolioCards || [];
            const index = current.findIndex((card) => card.id === id);
            if (index >= 0) {
                current[index] = payload;
            } else {
                current.push(payload);
            }

            await saveConfig({ ...CONFIG, portfolioCards: current });
            renderCardList();
            portfolioForm.reset();
            portfolioForm.card_id.value = '';
            portfolioForm.card_submit.textContent = 'เพิ่มผลงาน';
            showToast('อัปเดตผลงานในหน้าเว็บสำเร็จ');
        });

        const portfolioUpload = document.getElementById('portfolio-image-upload');
        if (portfolioUpload) {
            portfolioUpload.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                portfolioForm.card_image.value = await readFileAsDataUrl(file);
            });
        }
    }
}

loadConfig();
