const Chat = require('../models/Chat');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const ai = require('../services/ai');
const { canAccessComplaint } = require('../utils/access');
const { serverError } = require('../utils/errors');

const OPEN_STATUSES = ['Pending', 'Assigned', 'In Progress'];
const INSIGHTS_TTL_MS = 10 * 60 * 1000;
let insightsCache = null;

const handle = (res, err) => {
  if (err instanceof ai.AIError) return res.status(err.status).json({ message: err.message, code: err.code });
  return serverError(res, err);
};

// Loads a complaint the current user is allowed to see, plus its conversation
const loadForAi = async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404).json({ message: 'Complaint not found' });
    return null;
  }
  if (!canAccessComplaint(complaint, req.user)) {
    res.status(403).json({ message: 'Access denied' });
    return null;
  }
  const messages = await Chat.find({ complaintId: complaint._id }).sort({ timestamp: 1 });
  return { complaint, messages };
};

// @route GET /api/ai/status
exports.status = (req, res) => {
  res.json({ enabled: ai.isEnabled(), model: ai.isEnabled() ? ai.config().model : null });
};

// @route POST /api/ai/triage (USER)
exports.triage = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    if (description.length < 15) {
      return res.status(400).json({ message: 'Describe the problem in a sentence or two first' });
    }
    res.json({ suggestion: await ai.triage({ title, description }) });
  } catch (err) {
    handle(res, err);
  }
};

// @route POST /api/ai/complaints/:id/summary
exports.summary = async (req, res) => {
  try {
    const loaded = await loadForAi(req, res);
    if (!loaded) return;
    res.json({ summary: await ai.summarize(loaded.complaint, loaded.messages) });
  } catch (err) {
    handle(res, err);
  }
};

// @route POST /api/ai/complaints/:id/reply (AGENT/ADMIN)
exports.reply = async (req, res) => {
  try {
    const loaded = await loadForAi(req, res);
    if (!loaded) return;
    res.json({ draft: await ai.draftReply(loaded.complaint, loaded.messages, req.user.name) });
  } catch (err) {
    handle(res, err);
  }
};

// @route GET /api/ai/insights (ADMIN) - cached briefly so dashboard reloads don't burn quota
exports.insights = async (req, res) => {
  try {
    const fresh = req.query.refresh === '1';
    if (!fresh && insightsCache && Date.now() - insightsCache.at < INSIGHTS_TTL_MS) {
      return res.json({ insight: insightsCache.text, generatedAt: new Date(insightsCache.at), cached: true });
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [total, open, resolved, unassigned, highOpen, newThisWeek, byCategory, avgRating, activeAgents, recent] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: { $in: OPEN_STATUSES } }),
      Complaint.countDocuments({ status: { $in: ['Resolved', 'Closed'] } }),
      Complaint.countDocuments({ agentId: null, status: { $in: OPEN_STATUSES } }),
      Complaint.countDocuments({ priority: 'High', status: { $in: OPEN_STATUSES } }),
      Complaint.countDocuments({ createdAt: { $gte: weekAgo } }),
      Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Feedback.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]),
      User.countDocuments({ role: 'AGENT', isActive: true }),
      Complaint.find().sort({ createdAt: -1 }).limit(15).select('title')
    ]);

    if (!total) return res.json({ insight: 'No complaints yet — insights will appear once complaints start coming in.', generatedAt: new Date(), cached: false });

    const text = await ai.insights({
      metrics: {
        total, open, resolved, unassigned, highPriorityOpen: highOpen, newInLast7Days: newThisWeek, activeAgents,
        resolutionRatePct: Math.round((resolved / total) * 100),
        averageRating: avgRating[0] ? Number(avgRating[0].avg.toFixed(2)) : null,
        ratingsCount: avgRating[0]?.n || 0,
        byCategory: Object.fromEntries(byCategory.map((c) => [c._id, c.count]))
      },
      recentTitles: recent.map((c) => c.title)
    });
    insightsCache = { text, at: Date.now() };
    res.json({ insight: text, generatedAt: new Date(insightsCache.at), cached: false });
  } catch (err) {
    handle(res, err);
  }
};
