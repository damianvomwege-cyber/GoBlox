import { Router } from './router.js';

const router = new Router();
const content = document.getElementById('content');

router
    .on('/', () => { content.innerHTML = '<h1 style="color: var(--text-primary)">GoBlox</h1>'; })
    .resolve();

export { router };
