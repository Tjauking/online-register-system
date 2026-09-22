const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};


exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, signupCode } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Determine final role - defaults to USER if not specified
    let finalRole = 'USER';

    if (role === 'AGENT') {
      if (!signupCode || signupCode !== process.env.AGENT_SIGNUP_CODE) {
        return res.status(403).json({ message: 'Invalid agent signup code' });
      }
      finalRole = 'AGENT';
    } else if (role === 'ADMIN') {
      if (!signupCode || signupCode !== process.env.ADMIN_SIGNUP_CODE) {
        return res.status(403).json({ message: 'Invalid admin signup code' });
      }
      const maxAdmins = parseInt(process.env.MAX_ADMIN_ACCOUNTS || '2', 10);
      const adminCount = await User.countDocuments({ role: 'ADMIN' });
      if (adminCount >= maxAdmins) {
        return res.status(403).json({ message: 'Maximum number of admin accounts already registered' });
      }
      finalRole = 'ADMIN';
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      role: finalRole
    });

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};
