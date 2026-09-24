const Chat = require('../models/Chat');
const Complaint = require('../models/Complaint');
const { canAccessComplaint } = require('../utils/access');
const { serverError } = require('../utils/errors');


exports.getChatHistory = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.complaintId);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (!canAccessComplaint(complaint, req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Chat.find({ complaintId: req.params.complaintId }).sort({ timestamp: 1 });
    res.json({ messages });
  } catch (err) {
    serverError(res, err);
  }
};
