const express = require('express');
const router = express.Router();
const {
  submitFeedback,
  getFeedbackForComplaint,
  getAllFeedback
} = require('../controllers/feedbackController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.post('/', restrictTo('USER'), submitFeedback);
router.get('/:complaintId', getFeedbackForComplaint);
router.get('/', restrictTo('ADMIN'), getAllFeedback);

module.exports = router;
