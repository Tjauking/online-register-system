const Feedback = require('../models/Feedback');
const Complaint = require('../models/Complaint');
const { canAccessComplaint, isValidId } = require('../utils/access');
const { serverError } = require('../utils/errors');
const { notify } = require('../services/notify');


exports.submitFeedback = async (req, res) => {
  try {
    const { complaintId, rating, comment } = req.body;
    if (!isValidId(complaintId)) return res.status(404).json({ message: 'Complaint not found' });
    if (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (complaint.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!['Resolved', 'Closed'].includes(complaint.status)) {
      return res.status(400).json({ message: 'Feedback allowed only after resolution' });
    }

    const existing = await Feedback.findOne({ complaintId });
    if (existing) return res.status(400).json({ message: 'Feedback already submitted' });

    const feedback = await Feedback.create({
      complaintId,
      userId: req.user._id,
      rating: Number(rating),
      comment: typeof comment === 'string' ? comment.trim() : ''
    });

    notify({
      to: [complaint.agentId], actorId: req.user._id, type: 'feedback', complaint,
      title: `New ${Number(rating)}★ rating`, body: complaint.title
    });

    res.status(201).json({ feedback });
  } catch (err) {
    serverError(res, err);
  }
};

// @route GET /api/feedback/:complaintId
exports.getFeedbackForComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.complaintId);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (!canAccessComplaint(complaint, req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const feedback = await Feedback.findOne({ complaintId: req.params.complaintId });
    res.json({ feedback });
  } catch (err) {
    serverError(res, err);
  }
};

// @route GET /api/feedback (ADMIN) - all feedback
exports.getAllFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate('userId', 'name email')
      .populate('complaintId', 'title category')
      .sort({ createdAt: -1 });
    res.json({ feedback });
  } catch (err) {
    serverError(res, err);
  }
};
