import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import FeeDemand from '../models/FeeDemand.js';

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
};

const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'student', rollNumber, department, batch, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered.' });

    const user = await User.create({
      name, email, passwordHash: password, role,
      rollNumber, department, batch, phone,
    });

    const { accessToken, refreshToken } = generateTokens(user._id);
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await User.findByIdAndUpdate(user._id, { refreshTokenHash: refreshHash });

    setTokenCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      success: true,
      data: {
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        accessToken,
      },
    });
  } catch (err) { next(err); }
};

export const login = async (req, res, next) => {
  try {
    // Accept either new 'identifier' field or legacy 'email' field
    const identifier = (req.body.identifier || req.body.email || '').trim();
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'ID and password are required.' });
    }

    // Look up by rollNumber (students), employeeId (admin/superuser), or email (case-insensitive)
    const escaped = identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const idRegex = new RegExp(`^${escaped}$`, 'i');

    const user = await User.findOne({
      $or: [
        { rollNumber: idRegex },
        { employeeId: idRegex },
        { email: idRegex },
      ],
    }).select('+passwordHash').populate('department', 'name code');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid ID or password. Please check your credentials.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await User.findByIdAndUpdate(user._id, { refreshTokenHash: refreshHash, lastLogin: new Date() });

    setTokenCookies(res, accessToken, refreshToken);

    let isDefaulter = false;
    let overdueDemandsCount = 0;
    if (user.role === 'student') {
      const now = new Date();
      const overdueDemands = await FeeDemand.find({
        student: user._id,
        outstandingAmount: { $gt: 0 },
        $or: [
          { status: 'overdue' },
          { dueDate: { $lt: now } },
          { lateFeeAccrued: { $gt: 0 } },
        ],
      });
      isDefaulter = overdueDemands.length > 0;
      overdueDemandsCount = overdueDemands.length;
    }

    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.passwordHash;
    delete userObj.refreshTokenHash;

    return res.json({
      success: true,
      data: {
        user: {
          ...userObj,
          isDefaulter,
          overdueDemandsCount,
        },
        accessToken,
      },
    });
  } catch (err) { next(err); }
};

export const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshTokenHash: null });
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) { next(err); }
};

export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token.' });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshTokenHash');
    if (!user || !(await user.compareRefreshToken(token))) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const { accessToken, refreshToken: newRefresh } = generateTokens(user._id);
    const refreshHash = await bcrypt.hash(newRefresh, 10);
    await User.findByIdAndUpdate(user._id, { refreshTokenHash: refreshHash });

    setTokenCookies(res, accessToken, newRefresh);
    return res.json({ success: true, data: { accessToken } });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Refresh token expired. Please login again.' });
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // Always return 200 to prevent user enumeration
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: resetHash,
      passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
    });

    // In production: send email with resetToken
    return res.json({ success: true, message: 'Reset link sent.', _devToken: resetToken });
  } catch (err) { next(err); }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const resetHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: resetHash,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });

    user.passwordHash = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json({ success: true, message: 'Password reset successful. Please login.' });
  } catch (err) { next(err); }
};

export const getMe = async (req, res, next) => {
  try {
    let isDefaulter = false;
    let overdueDemandsCount = 0;
    if (req.user.role === 'student') {
      const now = new Date();
      const overdueDemands = await FeeDemand.find({
        student: req.user._id,
        outstandingAmount: { $gt: 0 },
        $or: [
          { status: 'overdue' },
          { dueDate: { $lt: now } },
          { lateFeeAccrued: { $gt: 0 } },
        ],
      });
      isDefaulter = overdueDemands.length > 0;
      overdueDemandsCount = overdueDemands.length;
    }

    const userObj = req.user.toObject ? req.user.toObject() : req.user;
    return res.json({
      success: true,
      data: {
        user: {
          ...userObj,
          isDefaulter,
          overdueDemandsCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
