/**
 * Update Checker Module
 * Checks GitHub releases for new app versions and notifies user
 */

const UpdateChecker = (() => {
    const GITHUB_REPO = 'JeremiahGironGD/FFLL';
    const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
    const UPDATE_CHECK_KEY = 'ffll-last-update-check';
    const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
    const CURRENT_VERSION = '1.0.0'; // Should match package.json

    /**
     * Parse semantic version string to comparable number
     */
    function parseVersion(versionString) {
        try {
            const version = (versionString || '').replace(/^v/, '').split('.').map(Number);
            return version[0] * 10000 + (version[1] || 0) * 100 + (version[2] || 0);
        } catch {
            return 0;
        }
    }

    /**
     * Check if newer version is available
     */
    function isNewerVersion(latestVersion, currentVersion) {
        return parseVersion(latestVersion) > parseVersion(currentVersion);
    }

    /**
     * Create and show update notification modal
     */
    function showUpdateNotification(latestVersion, downloadUrl) {
        // Remove existing modal if any
        const existingModal = document.getElementById('ffll-update-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal overlay
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

        // Create modal content
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
        title.textContent = '🚀 Update Available';

        header.appendChild(logo);
        header.appendChild(title);

        const message = document.createElement('p');
        message.style.cssText = `
            margin: 0 0 8px;
            color: #eef3ff;
            font-size: 0.95rem;
            line-height: 1.6;
        `;
        message.textContent = `A new version (${latestVersion}) of FFLL is available!`;

        const subMessage = document.createElement('p');
        subMessage.style.cssText = `
            margin: 0 0 24px;
            color: #c3cad9;
            font-size: 0.85rem;
        `;
        subMessage.textContent = 'Update now to get the latest features and improvements.';

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 12px;
            margin-top: 24px;
        `;

        // Update button
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
        updateBtn.textContent = 'Update Now';
        updateBtn.onmouseover = () => {
            updateBtn.style.transform = 'translateY(-2px)';
            updateBtn.style.boxShadow = '0 8px 20px rgba(184, 106, 242, 0.3)';
        };
        updateBtn.onmouseout = () => {
            updateBtn.style.transform = 'translateY(0)';
            updateBtn.style.boxShadow = 'none';
        };

        // Later button
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
            // Don't check again for 24 hours
            localStorage.setItem(UPDATE_CHECK_KEY, Date.now().toString());
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
     * Check for updates from GitHub
     */
    async function checkForUpdates() {
        try {
            // Check if we've already checked recently
            const lastCheck = localStorage.getItem(UPDATE_CHECK_KEY);
            if (lastCheck) {
                const timeSinceCheck = Date.now() - parseInt(lastCheck, 10);
                if (timeSinceCheck < UPDATE_CHECK_INTERVAL_MS) {
                    return;
                }
            }

            // Update last check timestamp immediately to prevent spamming
            localStorage.setItem(UPDATE_CHECK_KEY, Date.now().toString());

            const response = await fetch(GITHUB_API_URL, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'FFLL-App'
                }
            });
            if (!response.ok) {
                console.warn('Failed to check for updates');
                return;
            }

            const data = await response.json();
            const latestVersion = data.tag_name;

            if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
                // Find the download URL
                let downloadUrl = null;
                
                // First, try to find an APK for Android
                if (data.assets && data.assets.length > 0) {
                    const apkAsset = data.assets.find(asset => 
                        asset.name.endsWith('.apk')
                    );
                    if (apkAsset) {
                        downloadUrl = apkAsset.browser_download_url;
                    }
                }

                // Fallback to releases page
                if (!downloadUrl) {
                    downloadUrl = data.html_url;
                }

                // Show the notification
                showUpdateNotification(latestVersion, downloadUrl);
            }
        } catch (error) {
            console.warn('Error checking for updates:', error);
        }
    }

    /**
     * Initialize update checker
     */
    function init() {
        // Check for updates when app loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkForUpdates);
        } else {
            checkForUpdates();
        }

        // Optional: Check again periodically (every hour while app is open)
        setInterval(checkForUpdates, 60 * 60 * 1000);
    }

    return {
        init,
        checkForUpdates,
        // Expose for testing
        isNewerVersion,
        parseVersion
    };
})();

// Initialize when script loads
if (typeof window !== 'undefined') {
    UpdateChecker.init();
}
