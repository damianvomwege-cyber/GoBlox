export default function handler(req, res) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
        || '';

    const allowed = (process.env.ADMIN_ALLOWED_IPS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    const ok = allowed.length === 0 || allowed.includes(ip);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.status(ok ? 200 : 403).json({ allowed: ok });
}
