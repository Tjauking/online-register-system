const Chat = require('../models/Chat');
const Complaint = require('../models/Complaint');


exports.getChatHistory = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.complaintId);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const isOwner = complaint.userId.toString() === req.user._id.toString();
    const isAssignedAgent = complaint.agentId && complaint.agentId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAssignedAgent && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Chat.find({ complaintId: req.params.complaintId }).sort({ timestamp: 1 });
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Used internally by socket.io handler too
exports.saveMessage = async ({ complaintId, senderId, senderRole, message }) => {
  return Chat.create({ complaintId, senderId, senderRole, message });
};
