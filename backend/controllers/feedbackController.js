const Feedback = require('../models/Feedback');
const Complaint = require('../models/Complaint');


exports.submitFeedback = async (req, res) => {
  try {
    const { complaintId, rating, comment } = req.body;

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
      rating,
      comment
    });

    res.status(201).json({ feedback });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/feedback/:complaintId
exports.getFeedbackForComplaint = async (req, res) => {
  try {
    const feedback = await Feedback.findOne({ complaintId: req.params.complaintId });
    res.json({ feedback });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
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
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
