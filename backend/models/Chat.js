const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['USER', 'AGENT', 'ADMIN'], required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }
);

module.exports = mongoose.model('Chat', chatSchema);
