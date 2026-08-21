const jwt = require('jsonwebtoken');
const prisma = require('../lib/db');

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_solar_erp_2026');
    
    // Fetch fresh user data to ensure they aren't banned/deleted
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User no longer exists' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Forbidden: Account is banned permanently.' });
    }
    
    if (user.status === 'suspended' && user.banUntil && new Date(user.banUntil) > new Date()) {
      return res.status(403).json({ error: `Forbidden: Account suspended until ${new Date(user.banUntil).toLocaleString()}` });
    } else if (user.status === 'suspended' && user.banUntil && new Date(user.banUntil) <= new Date()) {
      // Suspension expired, auto-unban
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'active', banUntil: null }
      });
      user.status = 'active';
      user.banUntil = null;
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

const requireDeveloper = (req, res, next) => {
  if (!req.user || req.user.role !== 'developer') {
    return res.status(403).json({ error: 'Forbidden: Developer access required' });
  }
  next();
};

module.exports = {
  requireAuth,
  requireDeveloper
};
