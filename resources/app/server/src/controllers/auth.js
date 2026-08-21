const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/db');

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check bans/suspensions
    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Account is permanently banned' });
    }
    if (user.status === 'suspended' && user.banUntil && new Date(user.banUntil) > new Date()) {
      return res.status(403).json({ error: `Account suspended until ${new Date(user.banUntil).toLocaleString()}` });
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'super_secret_jwt_key_solar_erp_2026',
      { expiresIn: '7d' }
    );

    // Remove passwordHash before sending to client
    const safeUser = { ...user };
    delete safeUser.passwordHash;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('[Auth Login]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMe = (req, res) => {
  // requireAuth middleware already attached req.user
  const safeUser = { ...req.user };
  delete safeUser.passwordHash;
  res.json({ user: safeUser });
};

module.exports = {
  login,
  getMe
};
