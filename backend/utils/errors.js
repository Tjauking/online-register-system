// Validation problems are the client's fault; everything else is logged, not leaked
const serverError = (res, err) => {
  if (err && (err.name === 'ValidationError' || err.name === 'CastError')) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  console.error(err);
  return res.status(500).json({ message: 'Server error' });
};

module.exports = { serverError };
