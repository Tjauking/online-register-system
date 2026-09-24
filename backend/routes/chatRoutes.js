const express = require('express');
const router = express.Router();
const { getChatHistory } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { validateId } = require('../utils/access');

router.get('/:complaintId', protect, validateId('complaintId'), getChatHistory);

module.exports = router;
