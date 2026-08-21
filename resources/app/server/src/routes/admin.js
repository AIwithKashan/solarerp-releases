const express = require('express');
const { requireAuth, requireDeveloper } = require('../middleware/auth');
const {
  getUsers, createUser, updateUser, setPassword, banUser, unbanUser, deleteUser, getStats
} = require('../controllers/admin');

const router = express.Router();

// All admin routes require Developer access
router.use(requireAuth, requireDeveloper);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);
router.post('/users/:id/set-password', setPassword);
router.post('/users/:id/ban', banUser);
router.post('/users/:id/unban', unbanUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
