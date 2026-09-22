const express = require('express');
const router = express.Router();
const {
  getUsers,
  getAgents,
  createAgent,
  toggleActive,
  deleteUser,
  getAnalytics
} = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('ADMIN'));

router.get('/users', getUsers);
router.get('/agents', getAgents);
router.post('/agents', createAgent);
router.put('/users/:id/toggle-active', toggleActive);
router.delete('/users/:id', deleteUser);
router.get('/analytics', getAnalytics);

module.exports = router;
