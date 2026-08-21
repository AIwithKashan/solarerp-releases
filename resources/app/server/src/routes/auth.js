const express = require('express');
const { login, getMe } = require('../controllers/auth');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.get('/me', requireAuth, getMe);

module.exports = router;
