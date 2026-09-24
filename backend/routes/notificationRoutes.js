const express = require('express');
const router = express.Router();
const { getNotifications, markAllRead, markRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const { validateId } = require('../utils/access');

router.use(protect);
router.param('id', validateId('id'));

router.get('/', getNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);

module.exports = router;
