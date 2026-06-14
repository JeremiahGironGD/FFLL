/**
 * Update Checker Module (Commits-Based)
 * Tracks the latest commit on the main branch and notifies the user of updates.
 */

const UpdateChecker = (() => {
    const GITHUB_REPO = 'JeremiahGironGD/FFLL';
    // Fetches the single latest commit from the main branch
    const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=1&sha=main`;
    const LOCAL_COMMIT_KEY = 'ffll-last-known-commit';
    let isChecking = false;

    /**
     * Loading Bar Animation Logic
     */
    function showLoading() {
        let loader = document.getElementById('ffll-update-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'ffll-update-loader';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                height: 4px;
                background: linear-gradient(90deg, #b86af2, #f26ade);
                z-index: 999999;
                width: 0%;
                transition: width 0.4s cubic-bezier(0.1, 0.7, 1.0, 0.1), opacity 0.3s ease;
                box-shadow: 0 0 10px rgba(184, 106, 242, 0.8);
                pointer-events: none;
            `;
            document.body.appendChild(loader);
        }
        loader.style.opacity = '1';
        loader.style.width = '0%';
        setTimeout(() => { if (loader) loader.style.width = '45%'; }, 50);
    }

    function hideLoading() {
        const loader = document.getElementById('ffll-update-loader');
        if (loader) {
            loader.style.width = '100%';
            setTimeout(() => {
                loader.style.opacity = '0';
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
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const minDelay = new Promise(resolve => setTimeout(resolve, 1000));
            
            const response = await fetch(GITHUB_API_URL, {
                method: 'GET',
                cache: 'no-store',
                headers: { 'Accept': 'application/vnd.github.v3+json' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const loader = document.getElementById('ffll-update-loader');
            if (loader) loader.style.width = '85%';

            if (!response.ok) throw new Error('Network response was not ok');

            const commits = await response.json();
            if (!commits || commits.length === 0) throw new Error('No commits found');

            // Get the unique identifier (SHA) and message of the latest commit
            const latestCommitSha = commits[0].sha;
            const commitMessage = commits[0].commit.message;

            await minDelay;

            // Retrieve the stored commit from the user's device storage
            const currentStoredSha = localStorage.getItem(LOCAL_COMMIT_KEY);

            // FIRST TIME INITIALIZATION BOOTSTRAP:
            // If the user just installed the app and has no stored hash, lock in the current repository hash.
            if (!currentStoredSha) {
                localStorage.setItem(LOCAL_COMMIT_KEY, latestCommitSha);
                console.log('UpdateChecker: First run, initialized local hash tracking.');
                return;
            }

            // If the GitHub commit hash doesn't match the local device storage hash, an update is ready!
            if (latestCommitSha !== currentStoredSha) {
                console.log('UpdateChecker: New commit detected on main branch.');
                
                // Direct the button directly to your main repository overview page
                let downloadUrl = `https://github.com/${GITHUB_REPO}`;
                
                showUpdateNotification(commitMessage, latestCommitSha, downloadUrl);
            } else {
                console.log('UpdateChecker: App is fully synchronized with main branch.');
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
        // Displays your actual Git commit description text inside the modal window!
        message.textContent = `Change Log: "${commitMessage}"`;

        const subMessage = document.createElement('p');
        subMessage.style.cssText = `
            margin: 0 0 24px;
            color: #c3cad9;
            font-size: 0.85rem;
        `;
        subMessage.textContent = 'A new build has been pushed to the repository. Update now to sync changes.';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 12px;
            margin-top: 24px;
        `;

        const updateBtn = document.createElement('a');
        updateBtn.href = downloadUrl;
        updateBtn.target = '_blank';
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
            text-decoration: none;
            transition: transform 180ms, box-shadow 180ms;
        `;
        updateBtn.textContent = 'Get Update';
        
        // When clicked, save the new SHA so the popup doesn't reappear until the NEXT push
        updateBtn.onclick = () => {
            localStorage.setItem(LOCAL_COMMIT_KEY, nextSha);
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
}