/**
 * Update Checker Module (Commits-Based)
 * Tracks the latest commit in the ffll-app folder and notifies the user of updates.
 */

const UpdateChecker = (() => {
    const GITHUB_REPO = 'JeremiahGironGD/FFLL';
    const GITHUB_COMMITS_API = `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=1&path=ffll-app`;
    const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
    const GITHUB_CONTENTS_API = `https://api.github.com/repos/${GITHUB_REPO}/contents`;
    const LOCAL_COMMIT_KEY = 'ffll-last-known-commit';
    const LOCAL_RELEASE_KEY = 'ffll-last-known-release';
    const APP_UPDATE_SCOPE = !!(
        window.ffllAppPage ||
        window.location.pathname.includes('/ffll-app/') ||
        window.location.pathname.includes('/www/') ||
        typeof window.Capacitor !== 'undefined'
    );
    let isChecking = false;

    /**
     * Load the checking for updates module
     */
    function showLoading() {
        let overlay = document.getElementById('ffll-update-loading-overlay');
        if (!overlay) {
            // Main dark transparent container
            overlay = document.createElement('div');
            overlay.id = 'ffll-update-loading-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(15, 8, 20, 0.7);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                opacity: 0;
                transition: opacity 0.3s ease;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            `;

            // Spinner Wrapper
            const spinnerWrapper = document.createElement('div');
            spinnerWrapper.style.cssText = `
                position: relative;
                width: 64px;
                height: 64px;
            `;

            // The Spinner Ring
            const spinner = document.createElement('div');
            spinner.id = 'ffll-loading-spinner';
            spinner.style.cssText = `
                box-sizing: border-box;
                width: 100%;
                height: 100%;
                border: 5px solid rgba(184, 106, 242, 0.15);
                border-top: 5px solid #b86af2;
                border-radius: 50%;
            `;

            // Inject CSS Keyframes directly into the document for the spin animation
            if (!document.getElementById('ffll-spinner-styles')) {
                const styleSheet = document.createElement('style');
                styleSheet.id = 'ffll-spinner-styles';
                styleSheet.textContent = `
                    @keyframes ffllSpin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    #ffll-loading-spinner {
                        animation: ffllSpin 0.8s linear infinite;
                    }
                `;
                document.head.appendChild(styleSheet);
            }

            // "Loading..." Text
            const loadingText = document.createElement('div');
            loadingText.style.cssText = `
                margin-top: 20px;
                color: #eef3ff;
                font-size: 1.1rem;
                font-weight: 500;
                letter-spacing: 0.5px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.4);
            `;
            loadingText.textContent = 'Checking for updates...';

            spinnerWrapper.appendChild(spinner);
            overlay.appendChild(spinnerWrapper);
            overlay.appendChild(loadingText);
            document.body.appendChild(overlay);
        }
        
        // Trigger reflow to ensure the fade-in animation runs smoothly
        overlay.getBoundingClientRect();
        overlay.style.opacity = '1';
    }

    /**
     * Smoothly fades out and destroys the loading overlay
     */
    function hideLoading() {
        const overlay = document.getElementById('ffll-update-loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    }

    /**
     * Main Update Check Logic
     */
    async function checkForUpdates() {
        if (isChecking) return;
        isChecking = true;
        
        if (document.body) showLoading();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); 

        try {
            const minDelay = new Promise(resolve => setTimeout(resolve, 1200));

            const response = await fetch(GITHUB_COMMITS_API, {
                method: 'GET',
                cache: 'no-store',
                headers: { 'Accept': 'application/vnd.github.v3+json' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('Network response was not ok');

            const commits = await response.json();
            if (!commits || commits.length === 0) throw new Error('No commits found');

            const latestCommitSha = commits[0].sha;
            const commitMessage = commits[0].commit.message;
            const lastKnownSha = localStorage.getItem(LOCAL_COMMIT_KEY);
            // Also check latest release to see if app needs updating
            let latestRelease;
            try {
                const relResp = await fetch(GITHUB_RELEASES_API, { method: 'GET', cache: 'no-store', headers: { 'Accept': 'application/vnd.github.v3+json' } });
                if (relResp && relResp.ok) latestRelease = await relResp.json();
            } catch (e) {
                console.warn('Release check failed', e);
            }
            const lastKnownRelease = localStorage.getItem(LOCAL_RELEASE_KEY);

            await minDelay;

            if (!lastKnownSha) {
                localStorage.setItem(LOCAL_COMMIT_KEY, latestCommitSha);
                if (latestRelease && latestRelease.tag_name) localStorage.setItem(LOCAL_RELEASE_KEY, latestRelease.tag_name);
                console.log('UpdateChecker: Initialized tracking with current commit and release.');
                return;
            }

            // If commit changed, show commit-based update notification
            if (latestCommitSha !== lastKnownSha) {
                const downloadUrl = `https://github.com/${GITHUB_REPO}/tree/main/ffll-app`;
                showUpdateNotification({ type: 'commit', message: commitMessage, nextSha: latestCommitSha, downloadUrl });
            } else if (latestRelease && latestRelease.tag_name && latestRelease.tag_name !== lastKnownRelease) {
                // Release tag changed — likely a packaged release (possibly app loader/www changed)
                showUpdateNotification({ type: 'release', message: latestRelease.name || latestRelease.tag_name, nextRelease: latestRelease.tag_name, release: latestRelease });
            } else {
                console.log('UpdateChecker: App is up to date.');
            }
        } catch (error) {
            console.warn('Update check failed:', error);
        } finally {
            isChecking = false;
            hideLoading();
        }
    }

    /**
     * Create and show update notification modal
     * Accepts an info object: { type: 'commit'|'release', message, nextSha, downloadUrl, release }
     */
    function showUpdateNotification(info) {
        const { type = 'commit', message, nextSha, downloadUrl, release } = info || {};
        const existingModal = document.getElementById('ffll-update-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'ffll-update-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 16px;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, rgba(46, 24, 70, 0.98), rgba(20, 10, 26, 0.98));
            border: 2px solid rgba(184, 106, 242, 0.3);
            border-radius: 24px;
            padding: 32px 28px;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(16px);
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 20px;
        `;

        const logo = document.createElement('img');
        logo.src = 'favicon.ico';
        logo.style.cssText = `
            width: 42px;
            height: 42px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        logo.onerror = () => logo.remove();

        const title = document.createElement('h2');
        title.style.cssText = `
            margin: 0;
            color: #b86af2;
            font-size: 1.5rem;
            font-weight: 700;
        `;
        title.textContent = '🚀 New Update Available';

        header.appendChild(logo);
        header.appendChild(title);

        const message = document.createElement('p');
        message.style.cssText = `
            margin: 0 0 12px;
            color: #eef3ff;
            font-size: 0.95rem;
            line-height: 1.6;
        `;
        message.textContent = `Update Found: "${message}"`;

        const subMessage = document.createElement('p');
        subMessage.style.cssText = `
            margin: 0 0 24px;
            color: #c3cad9;
            font-size: 0.85rem;
        `;
        subMessage.textContent = type === 'release'
            ? 'A native release update is available. Open releases to download the new app loader.'
            : 'A new build is available in the repository. Tap below to fetch the latest files.';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 12px;
            margin-top: 24px;
        `;

        const updateBtn = document.createElement('button');
        updateBtn.style.cssText = `
            flex: 1;
            padding: 12px 16px;
            background: linear-gradient(135deg, #b86af2, #8c5eea);
            color: #fff;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            text-align: center;
            transition: transform 180ms, box-shadow 180ms;
        `;
        updateBtn.textContent = type === 'release' ? 'Open Releases' : 'Get Update';

        updateBtn.onclick = async () => {
            if (type === 'release' && release && release.html_url) {
                if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
                    try {
                        await window.Capacitor.Plugins.Browser.open({ url: release.html_url });
                    } catch (e) {
                        window.open(release.html_url, '_blank');
                    }
                } else {
                    window.open(release.html_url, '_blank');
                }
                modal.remove();
                return;
            }

            modal.querySelector('[data-updating]')?.remove?.();
            const updating = document.createElement('div');
            updating.setAttribute('data-updating', '1');
            updating.style.cssText = 'margin-top:12px;color:#cbd5e1;font-size:0.85rem;';
            updating.textContent = 'Downloading and applying update...';
            content.appendChild(updating);
            try {
                if (type === 'commit' && nextSha) localStorage.setItem(LOCAL_COMMIT_KEY, nextSha);
                await applyWwwUpdate();
                updating.textContent = 'Update applied — restarting app...';
                setTimeout(() => window.location.reload(), 900);
            } catch (err) {
                console.error('Apply update failed', err);
                updating.textContent = 'Failed to apply update. You can open the releases page to download manually.';
                if (release && release.html_url) {
                    const openBtn = document.createElement('button');
                    openBtn.style.cssText = `margin-top:10px;padding:8px 12px;background:transparent;border:1px solid rgba(255,255,255,0.08);color:#eef3ff;border-radius:8px;cursor:pointer;`;
                    openBtn.textContent = 'Open Releases';
                    openBtn.onclick = async () => {
                        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
                            try {
                                await window.Capacitor.Plugins.Browser.open({ url: release.html_url });
                            } catch (e) {
                                window.open(release.html_url, '_blank');
                            }
                        } else {
                            window.open(release.html_url, '_blank');
                        }
                    };
                    content.appendChild(openBtn);
                }
            }
        };
        
        updateBtn.onmouseover = () => {
            updateBtn.style.transform = 'translateY(-2px)';
            updateBtn.style.boxShadow = '0 8px 20px rgba(184, 106, 242, 0.3)';
        };
        updateBtn.onmouseout = () => {
            updateBtn.style.transform = 'translateY(0)';
            updateBtn.style.boxShadow = 'none';
        };

        const laterBtn = document.createElement('button');
        laterBtn.style.cssText = `
            flex: 1;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.1);
            color: #eef3ff;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            transition: background 180ms, transform 180ms;
        `;
        laterBtn.textContent = 'Later';
        laterBtn.onclick = () => {
            modal.remove();
        };
        laterBtn.onmouseover = () => {
            laterBtn.style.background = 'rgba(255, 255, 255, 0.15)';
            laterBtn.style.transform = 'translateY(-2px)';
        };
        laterBtn.onmouseout = () => {
            laterBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            laterBtn.style.transform = 'translateY(0)';
        };

        buttonContainer.appendChild(updateBtn);
        buttonContainer.appendChild(laterBtn);

        content.appendChild(header);
        content.appendChild(message);
        content.appendChild(subMessage);
        content.appendChild(buttonContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    /* Helper: recursively list files under a repository path using GitHub Contents API */
    async function fetchRepoContentsRecursive(path) {
        const url = `${GITHUB_CONTENTS_API}/${path}`;
        const res = await fetch(url, { cache: 'no-store', headers: { 'Accept': 'application/vnd.github.v3+json' } });
        if (!res.ok) throw new Error('Failed to list repo contents: ' + res.status);
        const items = await res.json();
        let files = [];
        for (const item of items) {
            if (item.type === 'file') {
                files.push({ path: item.path, download_url: item.download_url });
            } else if (item.type === 'dir') {
                const child = await fetchRepoContentsRecursive(item.path);
                files = files.concat(child);
            }
        }
        return files;
    }

    /* Helper: convert Blob to base64 string for Capacitor Filesystem */
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result;
                const base64 = dataUrl.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /* Helper: download list of files and write them to Capacitor Filesystem or Cache Storage */
    async function downloadAndSaveFiles(files) {
        const hasCapacitorFs = !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem);
        if (hasCapacitorFs) {
            const FS = window.Capacitor.Plugins.Filesystem;
            for (const f of files) {
                const resp = await fetch(f.download_url, { cache: 'no-store' });
                if (!resp.ok) throw new Error('Failed to download ' + f.download_url);
                const blob = await resp.blob();
                const base64 = await blobToBase64(blob);
                const relative = f.path.replace(/^ffll-app\/www\//, '');
                try {
                    await FS.writeFile({ path: `www/${relative}`, data: base64, directory: 'DATA' });
                } catch (e) {
                    console.warn('Filesystem write failed for', relative, e);
                }
            }
        } else if ('caches' in window) {
            const cache = await caches.open('ffll-www-updates');
            for (const f of files) {
                const resp = await fetch(f.download_url, { cache: 'no-store' });
                if (!resp.ok) throw new Error('Failed to download ' + f.download_url);
                const relative = '/' + f.path.replace(/^ffll-app\/www\//, '');
                await cache.put(relative, resp.clone());
            }
        } else {
            throw new Error('No supported storage available to save update files');
        }
    }

    /* Main apply routine: fetch ffll-app/www and save */
    async function applyWwwUpdate() {
        const files = await fetchRepoContentsRecursive('ffll-app/www');
        if (!files || files.length === 0) throw new Error('No www files found in repository');
        await downloadAndSaveFiles(files);
    }

    /**
     * Initialize Listeners safely
     */
    function init() {
        console.log('UpdateChecker: Initializing Commits Monitor...');
        
        const start = () => {
            if (!document.body) {
                setTimeout(start, 100);
                return;
            }
            setTimeout(checkForUpdates, 1500); 
        };

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            start();
        } else {
            window.addEventListener('DOMContentLoaded', start, { once: true });
        }

        document.addEventListener('deviceready', () => {
            document.addEventListener('resume', () => checkForUpdates());
        }, { once: true });

        document.addEventListener('resume', () => checkForUpdates());
        
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkForUpdates();
        });
    }

    return {
        init,
        checkForUpdates
    };
})();

if (typeof window !== 'undefined') {
    window.UpdateChecker = UpdateChecker;

    if (APP_UPDATE_SCOPE) {
        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', () => window.UpdateChecker.init());
        } else {
            window.UpdateChecker.init();
        }
    }
}