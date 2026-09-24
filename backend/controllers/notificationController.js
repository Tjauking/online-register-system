const Notification = require('../models/Notification');
const { serverError } = require('../utils/errors');

// @route GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const [notifications, unread] = await Promise.all([
      Notification.find({ userId: req.user._id }).sort({ updatedAt: -1 }).limit(30),
      Notification.countDocuments({ userId: req.user._id, read: false })
    ]);
    res.json({ notifications, unread });
  } catch (err) {
    serverError(res, err);
  }
};

// @route PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ unread: 0 });
  } catch (err) {
    serverError(res, err);
  }
};

// @route PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    const doc = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { read: true }, { new: true });
    if (!doc) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification: doc });
  } catch (err) {
    serverError(res, err);
  }
};
