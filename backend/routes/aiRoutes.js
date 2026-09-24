const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { status, triage, summary, reply, insights } = require('../controllers/aiController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateId } = require('../utils/access');

// Per-user cap so one account can't exhaust the shared NVIDIA quota
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: parseInt(process.env.AI_RATE_LIMIT || '30', 10),
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'You’ve used the AI assistant a lot recently — try again in a few minutes', code: 'AI_RATE_LIMIT' }
});

router.use(protect);
router.param('id', validateId('id'));

router.get('/status', status);
router.post('/triage', restrictTo('USER'), aiLimiter, triage);
router.post('/complaints/:id/summary', aiLimiter, summary);
router.post('/complaints/:id/reply', restrictTo('AGENT', 'ADMIN'), aiLimiter, reply);
router.get('/insights', restrictTo('ADMIN'), aiLimiter, insights);

module.exports = router;
