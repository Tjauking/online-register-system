const Complaint = require('../models/Complaint');
const User = require('../models/User');


exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, description and category are required' });
    }

    const complaint = await Complaint.create({
      title,
      description,
      category,
      priority: priority || 'Medium',
      attachment: req.file ? `/uploads/${req.file.filename}` : null,
      userId: req.user._id,
      statusHistory: [{ status: 'Pending', changedBy: req.user._id }]
    });

    res.status(201).json({ complaint });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/complaints/mine (USER)
exports.getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.user._id })
      .populate('agentId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/complaints/unassigned (AGENT) - pool of complaints no agent has taken yet
exports.getUnassignedComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ agentId: null })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route PUT /api/complaints/:id/take (AGENT) - agent picks up an unassigned complaint
exports.takeComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (complaint.agentId) {
      return res.status(400).json({ message: 'This complaint has already been taken by another agent' });
    }

    complaint.agentId = req.user._id;
    complaint.status = 'Assigned';
    complaint.statusHistory.push({ status: 'Assigned', changedBy: req.user._id });
    await complaint.save();

    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/complaints/assigned (AGENT)
exports.getAssignedComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ agentId: req.user._id })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/complaints (ADMIN) - all complaints, with optional filters
exports.getAllComplaints = async (req, res) => {
  try {
    const { status, category, agentId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (agentId) filter.agentId = agentId;

    const complaints = await Complaint.find(filter)
      .populate('userId', 'name email phone')
      .populate('agentId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/complaints/:id (USER/AGENT/ADMIN with access check)
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('agentId', 'name email');

    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const isOwner = complaint.userId._id.toString() === req.user._id.toString();
    const isAssignedAgent = complaint.agentId && complaint.agentId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAssignedAgent && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route PUT /api/complaints/:id/assign (ADMIN)
exports.assignAgent = async (req, res) => {
  try {
    const { agentId } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    complaint.agentId = agentId;
    complaint.status = 'Assigned';
    complaint.statusHistory.push({ status: 'Assigned', changedBy: req.user._id });
    await complaint.save();

    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route PUT /api/complaints/:id/status (AGENT/ADMIN)
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const isAssignedAgent = complaint.agentId && complaint.agentId.toString() === req.user._id.toString();
    if (req.user.role === 'AGENT' && !isAssignedAgent) {
      return res.status(403).json({ message: 'You are not assigned to this complaint' });
    }

    complaint.status = status;
    complaint.statusHistory.push({ status, changedBy: req.user._id });
    await complaint.save();

    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
