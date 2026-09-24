const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { serverError } = require('../utils/errors');
const { validateNewAccount, MIN_PASSWORD } = require('../utils/validation');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};


exports.register = async (req, res) => {
  try {
    const { role, signupCode } = req.body;
    const { error, name, email, phone, password } = validateNewAccount(req.body);
    if (error) return res.status(400).json({ message: error });

    const existing = await User.findOne({ email });
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
      email,
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
    serverError(res, err);
  }
};

// @route POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
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
    serverError(res, err);
  }
};

// @route GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};

// @route PUT /api/auth/me - update your own name and phone
exports.updateMe = async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
    if (!name || !phone) return res.status(400).json({ message: 'Name and phone are required' });
    if (name.length > 80 || phone.length > 30) return res.status(400).json({ message: 'Name or phone is too long' });

    const user = await User.findByIdAndUpdate(req.user._id, { name, phone }, { new: true }).select('-password');
    res.json({ user });
  } catch (err) {
    serverError(res, err);
  }
};

// @route PUT /api/auth/password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < MIN_PASSWORD) {
      return res.status(400).json({ message: `New password must be at least ${MIN_PASSWORD} characters` });
    }

    const user = await User.findById(req.user._id);
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    serverError(res, err);
  }
};
