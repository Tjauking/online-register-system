const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getMyComplaints,
  getAssignedComplaints,
  getUnassignedComplaints,
  takeComplaint,
  getAllComplaints,
  getComplaintById,
  assignAgent,
  updateStatus
} = require('../controllers/complaintController');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.post('/', restrictTo('USER'), upload.single('attachment'), createComplaint);
router.get('/mine', restrictTo('USER'), getMyComplaints);
router.get('/assigned', restrictTo('AGENT'), getAssignedComplaints);
router.get('/unassigned', restrictTo('AGENT', 'ADMIN'), getUnassignedComplaints);
router.put('/:id/take', restrictTo('AGENT'), takeComplaint);
router.get('/', restrictTo('ADMIN'), getAllComplaints);
router.get('/:id', getComplaintById);
router.put('/:id/assign', restrictTo('ADMIN'), assignAgent);
router.put('/:id/status', restrictTo('AGENT', 'ADMIN'), updateStatus);

module.exports = router;
