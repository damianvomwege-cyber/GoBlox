export class Router {
    constructor() {
        this.routes = {};
        this.fallback = null;
        window.addEventListener('hashchange', () => this.resolve());
    }

    on(path, handler) {
        if (path === '*') {
            this.fallback = handler;
        } else {
            this.routes[path] = handler;
        }
        return this;
    }

    resolve() {
        const hash = window.location.hash.slice(1) || '/';
        const [path, ...params] = hash.split('/').filter(Boolean);
        const route = '/' + (path || '');
        const handler = this.routes[route];
        if (handler) {
            handler(...params);
        } else if (this.fallback) {
            this.fallback();
        } else if (this.routes['/']) {
            this.routes['/']();
        }
    }

    navigate(path) {
        window.location.hash = path;
    }
}
