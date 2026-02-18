/* ===========================
   GoBlox - Tooltip System
   =========================== */

let tooltipEl = null;
let observer = null;
let cssLoaded = false;

const OFFSET = 8;

function ensureCSS() {
    if (cssLoaded) return;
    cssLoaded = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/tooltip.css';
    document.head.appendChild(link);
}

function ensureTooltipEl() {
    if (tooltipEl && document.body.contains(tooltipEl)) return;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'goblox-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(tooltipEl);
}

function positionTooltip(target) {
    if (!tooltipEl) return;

    const rect = target.getBoundingClientRect();
    const tipW = tooltipEl.offsetWidth;
    const tipH = tooltipEl.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Remove previous position classes
    tooltipEl.classList.remove('tooltip-top', 'tooltip-bottom', 'tooltip-left', 'tooltip-right');

    // Default: show above
    let top = rect.top - tipH - OFFSET;
    let left = rect.left + rect.width / 2 - tipW / 2;
    let pos = 'tooltip-top';

    // If no room above, show below
    if (top < 4) {
        top = rect.bottom + OFFSET;
        pos = 'tooltip-bottom';
    }

    // If no room below either, show to the right
    if (top + tipH > vh - 4) {
        top = rect.top + rect.height / 2 - tipH / 2;
        left = rect.right + OFFSET;
        pos = 'tooltip-right';

        // If no room right, show left
        if (left + tipW > vw - 4) {
            left = rect.left - tipW - OFFSET;
            pos = 'tooltip-left';
        }
    }

    // Clamp horizontal
    if (left < 4) left = 4;
    if (left + tipW > vw - 4) left = vw - tipW - 4;

    tooltipEl.style.top = top + 'px';
    tooltipEl.style.left = left + 'px';
    tooltipEl.classList.add(pos);
}

function showTooltip(e) {
    const target = e.currentTarget;
    const text = target.getAttribute('data-tooltip');
    if (!text) return;

    ensureTooltipEl();
    tooltipEl.textContent = text;
    tooltipEl.classList.remove('tooltip-visible');

    // Position first, then show
    requestAnimationFrame(() => {
        positionTooltip(target);
        tooltipEl.classList.add('tooltip-visible');
    });
}

function hideTooltip() {
    if (tooltipEl) {
        tooltipEl.classList.remove('tooltip-visible');
    }
}

function bindElement(el) {
    if (el._tooltipBound) return;
    el._tooltipBound = true;
    el.addEventListener('mouseenter', showTooltip);
    el.addEventListener('mouseleave', hideTooltip);
    el.addEventListener('focus', showTooltip);
    el.addEventListener('blur', hideTooltip);
}

function scanAndBind(root) {
    const elements = root.querySelectorAll('[data-tooltip]');
    elements.forEach(bindElement);
}

/**
 * Initialize the global tooltip system.
 * Uses MutationObserver to automatically bind tooltips to dynamic elements.
 */
export function initTooltips() {
    ensureCSS();

    // Bind existing elements
    scanAndBind(document.body);

    // Watch for new elements
    if (observer) observer.disconnect();
    observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                if (node.hasAttribute?.('data-tooltip')) bindElement(node);
                scanAndBind(node);
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}
