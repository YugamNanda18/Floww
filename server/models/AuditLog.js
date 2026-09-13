import mongoose from 'mongoose';

/**
 * AuditLog — IMMUTABLE. No update or delete routes exist for this model.
 * Records every manual financial override by an admin/superuser.
 */

const auditLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminName: { type: String, required: true },
  adminEmail: { type: String, required: true },

  action: {
    type: String,
    required: true,
    enum: [
      'waive_late_fee',
      'apply_scholarship',
      'approve_offline_payment',
      'reject_offline_payment',
      'create_fee_structure',
      'publish_fee_structure',
      'update_fee_structure',
      'create_late_fee_rule',
      'update_late_fee_rule',
      'delete_late_fee_rule',
      'disburse_caution_money',
      'forfeit_caution_money',
      'bulk_student_upload',
      'bulk_raise_demands',
      'raise_manual_demand',
      'create_student_manual',
      'update_student_profile',
      'semester_promotion',
      'void_receipt',
      'manual_ledger_entry',
      'individual_fee_reminder_sent',
      'mass_fee_reminder_sent',
      'create_department',
      'other',
    ],
  },

  targetEntity: { type: String, required: true }, // collection name e.g. "FeeDemand"
  targetId: { type: mongoose.Schema.Types.ObjectId },

  // JSON snapshots of before/after state
  beforeState: { type: mongoose.Schema.Types.Mixed },
  afterState: { type: mongoose.Schema.Types.Mixed },

  reason: { type: String, required: true },
  amountAffected: { type: Number, default: 0 }, // paise

  ipAddress: { type: String },
  userAgent: { type: String },

  timestamp: { type: Date, default: Date.now, immutable: true },
}, {
  // No timestamps: true — we use our own immutable timestamp
  strict: true,
});

// Block all updates — AuditLog is append-only
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function () {
  throw new Error('AuditLog is immutable and cannot be modified.');
});

auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ targetId: 1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
