const fs = require('fs');
const path = require('path');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { canAccessComplaint, isValidId } = require('../utils/access');
const { serverError } = require('../utils/errors');
const { UPLOAD_DIR } = require('../middleware/upload');
const { notify } = require('../services/notify');

const OPEN_STATUSES = ['Pending', 'Assigned', 'In Progress'];

const removeUpload = (file) => {
  if (file) fs.unlink(file.path, () => {});
};

exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;
    if (!title || !description || !category) {
      removeUpload(req.file);
      return res.status(400).json({ message: 'Title, description and category are required' });
    }

    const complaint = await Complaint.create({
      title,
      description,
      category,
      priority: priority || 'Medium',
      attachment: req.file ? req.file.filename : null,
      userId: req.user._id,
      statusHistory: [{ status: 'Pending', changedBy: req.user._id }]
    });

    res.status(201).json({ complaint });
  } catch (err) {
    removeUpload(req.file);
    serverError(res, err);
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
    serverError(res, err);
  }
};

// @route GET /api/complaints/unassigned (AGENT) - pool of open complaints no agent has taken yet
exports.getUnassignedComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ agentId: null, status: { $in: OPEN_STATUSES } })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (err) {
    serverError(res, err);
  }
};

// @route PUT /api/complaints/:id/take (AGENT) - agent picks up an unassigned complaint
exports.takeComplaint = async (req, res) => {
  try {
    // Atomic so two agents can't take the same complaint at once
    const complaint = await Complaint.findOneAndUpdate(
      { _id: req.params.id, agentId: null, status: { $in: OPEN_STATUSES } },
      {
        agentId: req.user._id,
        status: 'Assigned',
        $push: { statusHistory: { status: 'Assigned', changedBy: req.user._id } }
      },
      { new: true }
    );

    if (!complaint) {
      const exists = await Complaint.exists({ _id: req.params.id });
      if (!exists) return res.status(404).json({ message: 'Complaint not found' });
      return res.status(400).json({ message: 'This complaint has already been taken by another agent' });
    }

    notify({
      to: [complaint.userId], actorId: req.user._id, type: 'assigned', complaint,
      title: `${req.user.name} is handling your complaint`, body: complaint.title
    });
    res.json({ complaint });
  } catch (err) {
    serverError(res, err);
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
    serverError(res, err);
  }
};

// @route GET /api/complaints (ADMIN) - all complaints, with optional filters
exports.getAllComplaints = async (req, res) => {
  try {
    const { status, category, agentId } = req.query;
    // Coerce to strings so query operators like status[$ne]= can't be injected
    const filter = {};
    if (status) filter.status = String(status);
    if (category) filter.category = String(category);
    if (agentId) {
      if (!isValidId(String(agentId))) return res.json({ complaints: [] });
      filter.agentId = String(agentId);
    }

    const complaints = await Complaint.find(filter)
      .populate('userId', 'name email phone')
      .populate('agentId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (err) {
    serverError(res, err);
  }
};

// @route GET /api/complaints/:id (USER/AGENT/ADMIN with access check)
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('agentId', 'name email')
      .populate('statusHistory.changedBy', 'name role');

    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (!canAccessComplaint(complaint, req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ complaint });
  } catch (err) {
    serverError(res, err);
  }
};

// @route GET /api/complaints/:id/attachment - only people who can see the complaint can download its file
exports.getAttachment = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint || !complaint.attachment) return res.status(404).json({ message: 'Attachment not found' });
    if (!canAccessComplaint(complaint, req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Older records stored "/uploads/<file>"; basename keeps the lookup inside the upload dir
    const filePath = path.join(UPLOAD_DIR, path.basename(complaint.attachment));
    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) res.status(404).json({ message: 'Attachment not found' });
    });
  } catch (err) {
    serverError(res, err);
  }
};

// @route PUT /api/complaints/:id/assign (ADMIN)
exports.assignAgent = async (req, res) => {
  try {
    const { agentId } = req.body;
    if (!isValidId(agentId)) return res.status(400).json({ message: 'Invalid agent' });

    const agent = await User.findOne({ _id: agentId, role: 'AGENT', isActive: true });
    if (!agent) return res.status(400).json({ message: 'Agent not found or inactive' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    complaint.agentId = agent._id;
    complaint.status = 'Assigned';
    complaint.statusHistory.push({ status: 'Assigned', changedBy: req.user._id, note: `Assigned to ${agent.name}` });
    await complaint.save();

    notify({
      to: [complaint.userId], actorId: req.user._id, type: 'assigned', complaint,
      title: `${agent.name} is handling your complaint`, body: complaint.title
    });
    notify({
      to: [agent._id], actorId: req.user._id, type: 'assigned', complaint,
      title: 'A complaint was assigned to you', body: complaint.title
    });
    res.json({ complaint });
  } catch (err) {
    serverError(res, err);
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

    // Owner check is irrelevant here (route is AGENT/ADMIN only), so this means "admin or assigned agent"
    if (!canAccessComplaint(complaint, req.user)) {
      return res.status(403).json({ message: 'You are not assigned to this complaint' });
    }

    if (complaint.status === status) return res.json({ complaint });

    complaint.status = status;
    complaint.statusHistory.push({ status, changedBy: req.user._id });
    await complaint.save();

    notify({
      to: [complaint.userId, complaint.agentId], actorId: req.user._id, type: 'status', complaint,
      title: `Status changed to ${status}`, body: complaint.title
    });
    res.json({ complaint });
  } catch (err) {
    serverError(res, err);
  }
};

// @route PUT /api/complaints/:id/reopen (USER, owner) - not fixed after all
exports.reopenComplaint = async (req, res) => {
  try {
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) return res.status(400).json({ message: 'Please say why you are reopening it' });
    if (reason.length > 500) return res.status(400).json({ message: 'Reason must be 500 characters or fewer' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (String(complaint.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!['Resolved', 'Closed'].includes(complaint.status)) {
      return res.status(400).json({ message: 'Only resolved or closed complaints can be reopened' });
    }

    // Goes back to the same agent if they're still around, otherwise back to the queue
    const agentActive = complaint.agentId && (await User.exists({ _id: complaint.agentId, isActive: true }));
    if (!agentActive) complaint.agentId = null;
    complaint.status = agentActive ? 'Assigned' : 'Pending';
    complaint.statusHistory.push({ status: complaint.status, changedBy: req.user._id, note: `Reopened: ${reason}` });
    await complaint.save();

    notify({
      to: [complaint.agentId], actorId: req.user._id, type: 'reopened', complaint,
      title: 'A complaint you resolved was reopened', body: reason
    });
    res.json({ complaint });
  } catch (err) {
    serverError(res, err);
  }
};
