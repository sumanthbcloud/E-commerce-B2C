/**
 * Client router for Single-Page Application navigation
 */
const router = {
    routes: [],

    add(pattern, handler) {
        this.routes.push({ pattern, handler });
    },

    navigate(path, pushState = true) {
        if (pushState) {
            window.history.pushState({}, '', path);
        }
        this.resolve();
    },

    resolve() {
        const path = window.location.pathname;

        for (const route of this.routes) {
            const match = this.matchRoute(route.pattern, path);
            if (match) {
                route.handler(match.params);
                return;
            }
        }

        // Fallback default
        this.navigate('/', false);
    },

    matchRoute(pattern, path) {
        const paramNames = [];
        const regexStr = pattern.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
            paramNames.push(name);
            return '([^/]+)';
        });

        const regex = new RegExp(`^${regexStr}$`);
        const match = path.match(regex);
        if (!match) return null;

        const params = {};
        paramNames.forEach((name, i) => {
            params[name] = decodeURIComponent(match[i + 1]);
        });
        return { params };
    },

    init() {
        window.addEventListener('popstate', () => this.resolve());
        document.addEventListener('click', (e) => {
            const anchor = e.target.closest('a[data-link]');
            if (anchor) {
                e.preventDefault();
                const href = anchor.getAttribute('href');
                if (href) this.navigate(href);
            }
        });
        this.resolve();
    }
};

window.router = router;
