const bcrypt = require('bcryptjs');
const prisma = require('../lib/db');

// Helper to log audit events
const logAudit = async (actorId, action, targetId, reason = null) => {
  await prisma.auditLog.create({
    data: { actorId, action, targetId, reason }
  });
};

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, status: true, banUntil: true,
        createdAt: true, lastLoginAt: true, notes: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const createUser = async (req, res) => {
  const { fullName, email, phone, role, password, notes } = req.body;
  
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        fullName, email, phone, role, passwordHash, notes,
        createdBy: req.user.id
      }
    });

    await logAudit(req.user.id, 'CREATE_USER', newUser.id);

    const safeUser = { ...newUser };
    delete safeUser.passwordHash;
    res.status(201).json({ user: safeUser, initialPassword: password });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { fullName, email, phone, role, notes } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { fullName, email, phone, role, notes }
    });
    
    await logAudit(req.user.id, 'UPDATE_USER', id);
    
    const safeUser = { ...updated };
    delete safeUser.passwordHash;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

const setPassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) return res.status(400).json({ error: 'Password required' });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });

    await logAudit(req.user.id, 'RESET_PASSWORD', id);

    res.json({ message: 'Password updated successfully', newPassword: password });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

const banUser = async (req, res) => {
  const { id } = req.params;
  const { mode, until, reason } = req.body; // mode: 'permanent' | 'temporary'

  if (id === req.user.id) return res.status(400).json({ error: 'Cannot ban yourself' });

  try {
    const status = mode === 'temporary' ? 'suspended' : 'banned';
    const banDate = mode === 'temporary' && until ? new Date(until) : null;

    const updated = await prisma.user.update({
      where: { id },
      data: { status, banUntil: banDate }
    });

    await logAudit(req.user.id, `BAN_USER_${mode.toUpperCase()}`, id, reason);

    const safeUser = { ...updated };
    delete safeUser.passwordHash;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to ban user' });
  }
};

const unbanUser = async (req, res) => {
  const { id } = req.params;
  
  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { status: 'active', banUntil: null }
    });

    await logAudit(req.user.id, 'UNBAN_USER', id);

    const safeUser = { ...updated };
    delete safeUser.passwordHash;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unban user' });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });

  try {
    // Prevent deleting last developer
    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (userToDelete.role === 'developer') {
      const devCount = await prisma.user.count({ where: { role: 'developer' } });
      if (devCount <= 1) return res.status(400).json({ error: 'Cannot delete the last developer' });
    }

    await prisma.user.delete({ where: { id } });
    await logAudit(req.user.id, 'DELETE_USER', id);

    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

const getStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { status: 'active' } });
    const bannedUsers = await prisma.user.count({ where: { status: { in: ['banned', 'suspended'] } } });
    
    // New this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newUsers = await prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } });

    // Recent activity
    const recentLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: {
        actor: { select: { fullName: true } },
        target: { select: { fullName: true } }
      }
    });

    res.json({
      stats: { total: totalUsers, active: activeUsers, banned: bannedUsers, newThisWeek: newUsers },
      recentActivity: recentLogs
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

module.exports = {
  getUsers, createUser, updateUser, setPassword, banUser, unbanUser, deleteUser, getStats
};
