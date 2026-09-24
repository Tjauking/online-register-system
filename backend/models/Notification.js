const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['assigned', 'status', 'message', 'reopened', 'feedback'], required: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
