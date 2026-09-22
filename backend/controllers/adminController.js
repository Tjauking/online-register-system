const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Feedback = require('../models/Feedback');


exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'USER' }).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.getAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: 'AGENT' }).select('-password').sort({ createdAt: -1 });
    res.json({ agents });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.createAgent = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const agent = await User.create({
      name, email: email.toLowerCase(), phone, password: hashedPassword, role: 'AGENT'
    });

    res.status(201).json({ agent: { id: agent._id, name: agent.name, email: agent.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.toggleActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ user: { id: user._id, isActive: user.isActive } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.getAnalytics = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const openComplaints = await Complaint.countDocuments({ status: { $in: ['Pending', 'Assigned', 'In Progress'] } });
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
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

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
      avgRating: avgRating[0]?.avg || 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
