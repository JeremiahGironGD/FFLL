/**
 * Update Checker Module (Commits-Based)
 * Tracks the latest commit in the ffll-app folder and notifies the user of updates.
 */

const UpdateChecker = (() => {
    const GITHUB_REPO = 'JeremiahGironGD/FFLL';
    const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=1&path=ffll-app`;
    const LOCAL_COMMIT_KEY = 'ffll-last-known-commit';
    let isChecking = false;

    /**
     * Creates and displays the custom Purple & Black full-screen loading overlay
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

            const response = await fetch(GITHUB_API_URL, {
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

            await minDelay;

            if (!lastKnownSha) {
                localStorage.setItem(LOCAL_COMMIT_KEY, latestCommitSha);
                console.log('UpdateChecker: Initialized tracking with current commit.');
                return;
            }

            if (latestCommitSha !== lastKnownSha) {
                const downloadUrl = `https://github.com/${GITHUB_REPO}/tree/main/ffll-app`;
                showUpdateNotification(commitMessage, latestCommitSha, downloadUrl);
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
     */
    function showUpdateNotification(commitMessage, nextSha, downloadUrl) {
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
        message.textContent = `Update Found: "${commitMessage}"`;

        const subMessage = document.createElement('p');
        subMessage.style.cssText = `
            margin: 0 0 24px;
            color: #c3cad9;
            font-size: 0.85rem;
        `;
        subMessage.textContent = 'A new build is available in the repository. Tap below to see the latest files.';

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
        updateBtn.textContent = 'Get Update';
        
        updateBtn.onclick = async () => {
            localStorage.setItem(LOCAL_COMMIT_KEY, nextSha);
            
            // Native Browser View Integration using Capacitor Plugins
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
                try {
                    await window.Capacitor.Plugins.Browser.open({ 
                        url: downloadUrl,
                        presentationStyle: 'fullscreen'
                    });
                } catch (err) {
                    console.error('Capacitor Browser error, falling back:', err);
                    window.open(downloadUrl, '_blank');
                }
            } else {
                window.open(downloadUrl, '_blank');
            }
            modal.remove();
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

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => window.UpdateChecker.init());
    } else {
        window.UpdateChecker.init();
    }
    // Inside sync-html.js
const sourcePath = path.join(__dirname, 'dist', 'js', 'updateChecker.js'); // Read compiled production assets
const targetPath = path.join(__dirname, 'www', 'js', 'updateChecker.js');  // Transfer to native bundle path
}