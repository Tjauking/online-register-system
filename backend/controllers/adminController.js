const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Feedback = require('../models/Feedback');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const { serverError } = require('../utils/errors');
const { validateNewAccount } = require('../utils/validation');
const { UPLOAD_DIR } = require('../middleware/upload');

const OPEN_STATUSES = ['Pending', 'Assigned', 'In Progress'];

// Admin tools only manage users and agents; other admins are off limits
const findManagedUser = (id) => User.findOne({ _id: id, role: { $in: ['USER', 'AGENT'] } });


exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'USER' }).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    serverError(res, err);
  }
};


exports.getAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: 'AGENT' }).select('-password').sort({ createdAt: -1 });
    res.json({ agents });
  } catch (err) {
    serverError(res, err);
  }
};


exports.createAgent = async (req, res) => {
  try {
    const { error, name, email, phone, password } = validateNewAccount(req.body);
    if (error) return res.status(400).json({ message: error });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const agent = await User.create({
      name, email, phone, password: hashedPassword, role: 'AGENT'
    });

    res.status(201).json({ agent: { id: agent._id, name: agent.name, email: agent.email } });
  } catch (err) {
    serverError(res, err);
  }
};


exports.toggleActive = async (req, res) => {
  try {
    const user = await findManagedUser(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ user: { id: user._id, isActive: user.isActive } });
  } catch (err) {
    serverError(res, err);
  }
};


exports.deleteUser = async (req, res) => {
  try {
    const user = await findManagedUser(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'USER') {
      // A user's complaints, and the chat, feedback and files hanging off them, go with the user
      const complaints = await Complaint.find({ userId: user._id }).select('_id attachment');
      const complaintIds = complaints.map((c) => c._id);
      await Chat.deleteMany({ complaintId: { $in: complaintIds } });
      await Feedback.deleteMany({ complaintId: { $in: complaintIds } });
      await Notification.deleteMany({ complaintId: { $in: complaintIds } });
      await Complaint.deleteMany({ _id: { $in: complaintIds } });
      await Promise.all(complaints
        .filter((c) => c.attachment)
        .map((c) => fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(c.attachment))).catch(() => {})));
    } else {
      // An agent's open work goes back to the pool; finished work keeps its status
      await Complaint.updateMany(
        { agentId: user._id, status: { $in: OPEN_STATUSES } },
        {
          agentId: null,
          status: 'Pending',
          $push: { statusHistory: { status: 'Pending', changedBy: req.user._id } }
        }
      );
      await Complaint.updateMany({ agentId: user._id }, { agentId: null });
    }

    await Notification.deleteMany({ userId: user._id });
    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (err) {
    serverError(res, err);
  }
};


exports.getAnalytics = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const openComplaints = await Complaint.countDocuments({ status: { $in: OPEN_STATUSES } });
    const resolvedComplaints = await Complaint.countDocuments({ status: { $in: ['Resolved', 'Closed'] } });
    const totalUsers = await User.countDocuments({ role: 'USER' });
    const activeAgents = await User.countDocuments({ role: 'AGENT', isActive: true });

    const byCategory = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const byMonth = await Complaint.aggregate([
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          open: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$priority', 'High'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const unassigned = await Complaint.countDocuments({ agentId: null, status: { $in: OPEN_STATUSES } });
    const highOpen = await Complaint.countDocuments({ priority: 'High', status: { $in: OPEN_STATUSES } });
    const ratingCount = await Feedback.countDocuments();

    const agentPerformance = await Complaint.aggregate([
      { $match: { agentId: { $ne: null } } },
      {
        $group: {
          _id: '$agentId',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] } }
        }
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'agent' } },
      { $unwind: '$agent' },
      { $project: { agentName: '$agent.name', total: 1, resolved: 1 } }
    ]);

    const avgRating = await Feedback.aggregate([
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);

    res.json({
      totalComplaints,
      openComplaints,
      resolvedComplaints,
      totalUsers,
      activeAgents,
      byCategory,
      byMonth,
      agentPerformance,
      unassigned,
      highOpen,
      ratingCount,
      avgRating: avgRating[0]?.avg || 0
    });
  } catch (err) {
    serverError(res, err);
  }
};
