const mongoose = require('mongoose');

// Works whether the ref is populated or a raw ObjectId
const refId = (ref) => (ref && ref._id ? ref._id : ref);

const canAccessComplaint = (complaint, user) => {
  if (!complaint || !user) return false;
  if (user.role === 'ADMIN') return true;
  const userId = user._id.toString();
  if (refId(complaint.userId)?.toString() === userId) return true;
  return user.role === 'AGENT' && refId(complaint.agentId)?.toString() === userId;
};

const isValidId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id);

// Route middleware: 404 for malformed ids instead of a CastError 500
const validateId = (param) => (req, res, next) => {
  if (!isValidId(req.params[param])) return res.status(404).json({ message: 'Not found' });
  next();
};

module.exports = { canAccessComplaint, isValidId, validateId };
