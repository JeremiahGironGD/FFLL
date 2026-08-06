import { levels } from "./levels.js";

(function () {
    const FFLL_LOCALE_KEY = 'ffll-locale';
    const pageTranslations = {
        en: {
            pageTitle: 'FFLL Points System',
            subtitle: 'Track rewards and progress for completing challenge levels.',
            backLink: '← Back to levels'
        },
        es: {
            pageTitle: 'Sistema de Puntos FFLL',
            subtitle: 'Sigue las recompensas y el progreso al completar niveles de desafío.',
            backLink: '← Volver a niveles'
        }
    };

    const defaultLeaderboard = [
        {
            name: 'Idekan',
            points: 355,
            beaten: 'ThatOnePurpleLevel, Forever & Ever Preview, Jace Challenge, Sonic Blaster, Back On Track Full',
            created: 'Forever & Ever Preview, Back On Track Full, Jace Challenge',
            pronouns: 'they/them'
        },
        {
            name: 'no2one2noneSs',
            points: 185,
            beaten: 'ThatOnePurpleLevel, Wave 17 Remake, Jace Circles',
            created: 'ThatOnePurpleLevel, Wave 17 Remake, Jace Circles',
            pronouns: 'any'
        },
        {
            name: 'Angel',
            points: 100,
            beaten: 'Sonic Blaster, Jace Challenge',
            created: 'Sonic Blaster',
            pronouns: 'he/him'
        }
    ];

    // get data from levels.js and make a point system to show player's hardest level
    const levelPoints = levels.reduce((acc, level) => {
        const key = level.title.toLowerCase().replace(/\s*\|\s*currently broken$/, '');
        acc[key] = level.points;
        return acc;
    }, {});

    function getSavedLocale() {
        return localStorage.getItem(FFLL_LOCALE_KEY) || 'en';
    }

    function updateLocaleElements(locale) {
        const map = pageTranslations[locale] || pageTranslations.en;
        document.documentElement.lang = locale === 'es' ? 'es' : 'en';
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = map[el.dataset.i18n] || el.textContent;
        });
    }

    function getLevelPoints(levelName) {
        const normalized = levelName.trim().toLowerCase().replace(/\s*\|\s*currently broken$/, '');
        return levelPoints[normalized] || 0;
    }

    function getHardestBeatenLevel(beaten) {
        const beatenLevels = beaten.split(',').map(level => level.trim()).filter(Boolean);
        if (!beatenLevels.length) return 'null';

        return beatenLevels.reduce((hardest, current) => {
            return getLevelPoints(current) > getLevelPoints(hardest) ? current : hardest;
        });
    }

    function initializeLeaderboard() {
        const playerList = document.getElementById('player-list');
        const searchInput = document.getElementById('search-input');
        const detailCard = document.getElementById('details-card');
        const summaryCard = document.getElementById('summary-card');
        const detailName = document.getElementById('detail-name');
        const detailPoints = document.getElementById('detail-points');
        const detailBeaten = document.getElementById('detail-beaten');
        const detailCreated = document.getElementById('detail-created');
        const detailPronouns = document.getElementById('detail-pronouns');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');

        let filteredLeaderboard = [...defaultLeaderboard];
        let selectedIndex = -1;

        function renderPlayerList() {
            playerList.innerHTML = filteredLeaderboard.map((player, index) => `
                <button class="player-row" type="button" data-index="${index}">
                    <span class="rank-badge">${index + 1}</span>
                    <div class="player-meta">
                        <span class="player-name">${player.name}</span>
                        <span class="player-subtitle">${getHardestBeatenLevel(player.beaten)}</span>
                    </div>
                    <span class="player-score">${player.points} pts</span>
                </button>
            `).join('');

            const rows = playerList.querySelectorAll('.player-row');
            rows.forEach(row => row.addEventListener('click', () => {
                selectPlayer(Number(row.dataset.index));
            }));
        }

        function selectPlayer(index) {
            selectedIndex = index;
            const player = filteredLeaderboard[index];
            if (!player) return;

            detailCard.style.display = 'none';
            summaryCard.style.display = 'grid';
            detailName.textContent = player.name;
            detailPoints.textContent = `${player.points} points`;
            detailBeaten.textContent = player.beaten;
            detailCreated.textContent = player.created;
            detailPronouns.textContent = player.pronouns;

            playerList.querySelectorAll('.player-row').forEach((row, idx) => {
                row.classList.toggle('selected', idx === index);
            });
        }

        function updateSearch() {
            const query = searchInput.value.trim().toLowerCase();
            filteredLeaderboard = defaultLeaderboard.filter(player =>
                player.name.toLowerCase().includes(query) ||
                player.beaten.toLowerCase().includes(query) ||
                player.created.toLowerCase().includes(query)
            );
            selectedIndex = -1;
            detailCard.style.display = 'block';
            summaryCard.style.display = 'none';
            renderPlayerList();
        }

        function navigate(offset) {
            if (filteredLeaderboard.length === 0) return;
            selectedIndex = selectedIndex < 0 ? 0 : (selectedIndex + offset + filteredLeaderboard.length) % filteredLeaderboard.length;
            selectPlayer(selectedIndex);
        }

        searchInput.addEventListener('input', updateSearch);
        prevBtn.addEventListener('click', () => navigate(-1));
        nextBtn.addEventListener('click', () => navigate(1));

        renderPlayerList();
    }

    function initializeDevToolsRedirect() {
        const REDIRECT_URL = 'redirect.html';
        const POLL_INTERVAL_MS = 500;
        const allowBack = new URLSearchParams(window.location.search).get('allowBack') === '1';

        function kickUser() {
            window.location.href = REDIRECT_URL;
        }

        function detectDevTools() {
            if (typeof window.devtools === 'object' && window.devtools?.isOpen) {
                return true;
            }

            const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
            const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
            if (widthDiff > 160 || heightDiff > 160) {
                return true;
            }

            let open = false;
            const detector = new Image();
            Object.defineProperty(detector, 'id', {
                get() {
                    open = true;
                    return '';
                }
            });
            console.log('%c', detector);
            return open;
        }

        function checkDevTools() {
            if (allowBack) return;
            if (detectDevTools()) {
                kickUser();
            }
        }

        if (!allowBack) {
            checkDevTools();
            window.addEventListener('resize', checkDevTools);
            window.addEventListener('keydown', event => {
                const key = event.key?.toLowerCase();
                if (key === 'f12' || ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'i')) {
                    kickUser();
                }
            });
            setInterval(checkDevTools, POLL_INTERVAL_MS);
        }
    }

    updateLocaleElements(getSavedLocale());
    initializeLeaderboard();
    initializeDevToolsRedirect();
})();
