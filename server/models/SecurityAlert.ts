import mongoose, { Schema, Document } from 'mongoose';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 
  | 'rate_limit_exceeded' 
  | 'suspicious_activity' 
  | 'failed_login_spike' 
  | 'ip_blocked' 
  | 'unusual_traffic'
  | 'api_abuse';

export interface ISecurityAlert extends Document {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userId?: mongoose.Types.ObjectId;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: mongoose.Types.ObjectId;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

const SecurityAlertSchema: Schema = new Schema(
  {
    type: { 
      type: String, 
      required: true, 
      enum: ['rate_limit_exceeded', 'suspicious_activity', 'failed_login_spike', 'ip_blocked', 'unusual_traffic', 'api_abuse'],
    },
    severity: { 
      type: String, 
      required: true, 
      enum: ['low', 'medium', 'high', 'critical'],
    },
    message: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    acknowledged: { type: Boolean, default: false },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
SecurityAlertSchema.index({ acknowledged: 1, severity: -1, timestamp: -1 });
SecurityAlertSchema.index({ type: 1, timestamp: -1 });
SecurityAlertSchema.index({ ipAddress: 1, timestamp: -1 });

// TTL index - keep alerts for 90 days
SecurityAlertSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const collectionName = `securityAlerts${process.env.DB_COLLECTION_SUFFIX || ''}`;

export default (mongoose.models.SecurityAlert as mongoose.Model<ISecurityAlert>) || 
  mongoose.model<ISecurityAlert>('SecurityAlert', SecurityAlertSchema, collectionName);
