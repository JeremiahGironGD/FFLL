        const REDIRECT_URL = "";
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