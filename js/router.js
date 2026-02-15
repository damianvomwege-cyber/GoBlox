export class Router {
    constructor() {
        this.routes = {};
        window.addEventListener('hashchange', () => this.resolve());
    }

    on(path, handler) {
        this.routes[path] = handler;
        return this;
    }

    resolve() {
        const hash = window.location.hash.slice(1) || '/';
        const [path, ...params] = hash.split('/').filter(Boolean);
        const route = '/' + (path || '');
        const handler = this.routes[route] || this.routes['/'];
        if (handler) handler(...params);
    }

    navigate(path) {
        window.location.hash = path;
    }
}
