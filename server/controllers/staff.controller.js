import User from '../models/User.js';
import Department from '../models/Department.js';
import bcrypt from 'bcryptjs';

/**
 * Check if the requester is the Main Admin (ADM001)
 */
const isMainAdminUser = (user) => {
  return user && (user.employeeId === 'ADM001' || user.email === 'admin@demo.com');
};

/**
 * createAdmin — Only Main Admin (ADM001) can add another Admin.
 */
export const createAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only an Admin can access this resource.' });
    }

    if (!isMainAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the Main Admin (ADM001) has authority to onboard new Finance Admins.',
      });
    }

    const { name, email, employeeId, phone, password = 'admin123' } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check existing
    const existing = await User.findOne({
      $or: [
        { email: cleanEmail },
        ...(employeeId ? [{ employeeId: employeeId.trim().toUpperCase() }] : []),
      ],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Admin with email '${cleanEmail}' or ID '${employeeId}' already exists.`,
      });
    }

    // Auto-generate employeeId if not provided
    let finalEmpId = employeeId ? employeeId.trim().toUpperCase() : null;
    if (!finalEmpId) {
      const adminCount = await User.countDocuments({ role: 'admin' });
      finalEmpId = `ADM${String(adminCount + 1).padStart(3, '0')}`;
    }

    const passwordHash = await bcrypt.hash(password.trim() || 'admin123', 10);

    const newAdmin = await User.create({
      name: name.trim(),
      email: cleanEmail,
      employeeId: finalEmpId,
      passwordHash,
      role: 'admin',
      phone: phone || '',
      department: null, // Admin is common for all departments
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: `Admin ${newAdmin.name} (${finalEmpId}) created successfully!`,
      data: {
        admin: {
          _id: newAdmin._id,
          name: newAdmin.name,
          email: newAdmin.email,
          employeeId: newAdmin.employeeId,
          role: newAdmin.role,
          phone: newAdmin.phone,
          isActive: newAdmin.isActive,
          scope: 'Institutional (All Departments)',
          createdAt: newAdmin.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * updateAdmin — Only Main Admin (ADM001) can update or change another Admin.
 */
export const updateAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only an Admin can access this resource.' });
    }

    if (!isMainAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the Main Admin (ADM001) has authority to modify Finance Admins.',
      });
    }

    const { id } = req.params;
    const { name, email, phone, password, isActive } = req.body;

    const targetAdmin = await User.findOne({ _id: id, role: 'admin' });
    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    // Protect Main Admin from deactivation
    if (targetAdmin.employeeId === 'ADM001' && isActive === false) {
      return res.status(400).json({ success: false, message: 'Main Admin (ADM001) cannot be deactivated.' });
    }

    if (name) targetAdmin.name = name.trim();
    if (email) targetAdmin.email = email.toLowerCase().trim();
    if (phone !== undefined) targetAdmin.phone = phone.trim();
    if (isActive !== undefined && targetAdmin.employeeId !== 'ADM001') {
      targetAdmin.isActive = Boolean(isActive);
    }
    if (password && password.trim().length > 0) {
      targetAdmin.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    await targetAdmin.save();

    return res.json({
      success: true,
      message: `Admin ${targetAdmin.name} (${targetAdmin.employeeId}) updated successfully.`,
      data: {
        admin: {
          _id: targetAdmin._id,
          name: targetAdmin.name,
          email: targetAdmin.email,
          employeeId: targetAdmin.employeeId,
          role: targetAdmin.role,
          phone: targetAdmin.phone,
          isActive: targetAdmin.isActive,
          scope: 'Institutional (All Departments)',
          createdAt: targetAdmin.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * deleteAdmin — Only Main Admin (ADM001) can delete an Admin. ADM001 is protected.
 */
export const deleteAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only an Admin can access this resource.' });
    }

    if (!isMainAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the Main Admin (ADM001) has authority to delete Finance Admins.',
      });
    }

    const { id } = req.params;
    const targetAdmin = await User.findOne({ _id: id, role: 'admin' });
    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    if (targetAdmin.employeeId === 'ADM001') {
      return res.status(400).json({
        success: false,
        message: 'Security Violation: Main Admin (ADM001) is the master system anchor and cannot be deleted.',
      });
    }

    await User.deleteOne({ _id: targetAdmin._id });

    return res.json({
      success: true,
      message: `Admin ${targetAdmin.name} (${targetAdmin.employeeId}) has been deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * getAdmins — List all Admins.
 */
export const getAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: 'admin' })
      .select('name email employeeId role phone isActive createdAt lastLogin')
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      success: true,
      data: {
        admins: admins.map((a) => ({
          ...a,
          isMainAdmin: a.employeeId === 'ADM001',
          scope: 'Institutional (All Departments)',
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

const isCentralSuperuser = (user) => {
  if (!user) return false;
  const empId = (user.employeeId || '').toUpperCase();
  const email = (user.email || '').toLowerCase();
  return empId === 'SUP001' || email === 'super@demo.com' || (!user.department && user.role === 'superuser');
};

/**
 * createSuperuser — ONLY Main Superuser (Institutional Dean) can add another Superuser.
 * Main Superuser can create branch-wise superusers by selecting departmentId.
 */
export const createSuperuser = async (req, res, next) => {
  try {
    if (req.user.role !== 'superuser') {
      return res.status(403).json({ success: false, message: 'Only a Superuser can access this resource.' });
    }

    // Strictly enforce: Only the Main Superuser (Institutional Dean) can create superusers
    if (!isCentralSuperuser(req.user) || req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the Main Superuser (Institutional Dean SUP001) has the authority to create academic superusers. Branch superusers cannot create other superusers.',
      });
    }

    const { name, email, employeeId, departmentId, phone, password = 'admin123' } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check existing
    const existing = await User.findOne({
      $or: [
        { email: cleanEmail },
        ...(employeeId ? [{ employeeId: employeeId.trim().toUpperCase() }] : []),
      ],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Superuser with email '${cleanEmail}' or ID '${employeeId}' already exists.`,
      });
    }

    // Main Superuser selects the branch/department to provision branch-wise
    let dept = null;
    if (departmentId && departmentId !== 'all') {
      dept = await Department.findById(departmentId);
    }

    // Auto-generate employeeId if not provided
    let finalEmpId = employeeId ? employeeId.trim().toUpperCase() : null;
    if (!finalEmpId) {
      if (dept) {
        let count = (await User.countDocuments({ role: 'superuser', department: dept._id })) + 1;
        finalEmpId = `SUP-${dept.code.toUpperCase()}`;
        if (await User.findOne({ employeeId: finalEmpId })) {
          finalEmpId = `SUP-${dept.code.toUpperCase()}${count}`;
          while (await User.findOne({ employeeId: finalEmpId })) {
            count++;
            finalEmpId = `SUP-${dept.code.toUpperCase()}${count}`;
          }
        }
      } else {
        let superCount = (await User.countDocuments({ role: 'superuser' })) + 1;
        finalEmpId = `SUP${String(superCount).padStart(3, '0')}`;
        while (await User.findOne({ employeeId: finalEmpId })) {
          superCount++;
          finalEmpId = `SUP${String(superCount).padStart(3, '0')}`;
        }
      }
    }

    const passwordHash = await bcrypt.hash(password.trim() || 'admin123', 10);

    const newSuper = await User.create({
      name: name.trim(),
      email: cleanEmail,
      employeeId: finalEmpId,
      passwordHash,
      role: 'superuser',
      phone: phone || '',
      department: dept ? dept._id : null,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: `Superuser ${newSuper.name} (${finalEmpId}) created successfully for ${dept ? dept.name : 'All Departments'}!`,
      data: {
        superuser: {
          _id: newSuper._id,
          name: newSuper.name,
          email: newSuper.email,
          employeeId: newSuper.employeeId,
          role: newSuper.role,
          phone: newSuper.phone,
          department: dept ? { _id: dept._id, name: dept.name, code: dept.code } : null,
          scope: dept ? `${dept.name} (${dept.code}) Department` : 'Master Superuser (All Departments)',
          createdAt: newSuper.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * getSuperusers — List Superusers. If branch superuser, filter to their department.
 */
export const getSuperusers = async (req, res, next) => {
  try {
    const filter = { role: 'superuser' };
    if (req.user.department && !isCentralSuperuser(req.user)) {
      filter.department = req.user.department;
    }

    const superusers = await User.find(filter)
      .populate('department', 'name code')
      .select('name email employeeId role phone department isActive createdAt lastLogin')
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      success: true,
      data: {
        superusers: superusers.map((s) => ({
          ...s,
          isCentralized: s.employeeId === 'SUP001' || !s.department,
          scope: s.department ? `${s.department.name} (${s.department.code}) Department` : 'Centralized Superuser (All Departments)',
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * updateSuperuser — ONLY Main SUP001 can update a superuser.
 */
export const updateSuperuser = async (req, res, next) => {
  try {
    if (req.user.role !== 'superuser') {
      return res.status(403).json({ success: false, message: 'Only a Superuser can access this resource.' });
    }

    // Strictly enforce: Only Main Superuser can update superusers
    if (!isCentralSuperuser(req.user) || req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the Main Superuser (Institutional Dean SUP001) has authority to manage or modify superusers.',
      });
    }

    const { id } = req.params;
    const { name, email, phone, password, isActive, departmentId } = req.body;

    const targetSuper = await User.findOne({ _id: id, role: 'superuser' });
    if (!targetSuper) {
      return res.status(404).json({ success: false, message: 'Superuser not found.' });
    }

    // Protect SUP001 from deactivation
    if (targetSuper.employeeId === 'SUP001' && isActive === false) {
      return res.status(400).json({ success: false, message: 'Centralized Dean (SUP001) cannot be deactivated.' });
    }

    if (name) targetSuper.name = name.trim();
    if (email) targetSuper.email = email.toLowerCase().trim();
    if (phone !== undefined) targetSuper.phone = phone.trim();
    if (isActive !== undefined && targetSuper.employeeId !== 'SUP001') {
      targetSuper.isActive = Boolean(isActive);
    }
    if (password && password.trim().length > 0) {
      targetSuper.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    if (departmentId !== undefined) {
      targetSuper.department = departmentId && departmentId !== 'all' ? departmentId : null;
    }

    await targetSuper.save();
    const updated = await User.findById(targetSuper._id).populate('department', 'name code');

    return res.json({
      success: true,
      message: `Superuser ${updated.name} (${updated.employeeId}) updated successfully.`,
      data: {
        superuser: {
          _id: updated._id,
          name: updated.name,
          email: updated.email,
          employeeId: updated.employeeId,
          role: updated.role,
          phone: updated.phone,
          department: updated.department,
          isActive: updated.isActive,
          scope: updated.department ? `${updated.department.name} (${updated.department.code})` : 'Centralized Dean (All Departments)',
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * deleteSuperuser — ONLY Main SUP001 can delete a superuser.
 */
export const deleteSuperuser = async (req, res, next) => {
  try {
    if (req.user.role !== 'superuser') {
      return res.status(403).json({ success: false, message: 'Only a Superuser can access this resource.' });
    }

    // Strictly enforce: Only Main Superuser can delete superusers
    if (!isCentralSuperuser(req.user) || req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the Main Superuser (Institutional Dean SUP001) has authority to delete superusers.',
      });
    }

    const { id } = req.params;
    const targetSuper = await User.findOne({ _id: id, role: 'superuser' });
    if (!targetSuper) {
      return res.status(404).json({ success: false, message: 'Superuser not found.' });
    }

    // Master SUP001 can never be deleted
    if (targetSuper.employeeId === 'SUP001') {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: Centralized Dean (SUP001) is the master academic anchor and cannot be deleted.',
      });
    }

    await User.findByIdAndDelete(targetSuper._id);

    return res.json({
      success: true,
      message: `Superuser ${targetSuper.name} (${targetSuper.employeeId}) has been removed.`,
    });
  } catch (err) {
    next(err);
  }
};

