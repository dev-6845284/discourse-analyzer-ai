import mongoose, { Schema, Document } from 'mongoose';

export interface IApiUsage extends Document {
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  requestSize?: number;
  responseSize?: number;
  error?: string;
  isBlocked?: boolean;
  rateLimited?: boolean;
}

const ApiUsageSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    sessionId: { type: String, index: true },
    endpoint: { type: String, required: true, index: true },
    method: { type: String, required: true },
    statusCode: { type: Number, required: true, index: true },
    responseTimeMs: { type: Number, required: true },
    ipAddress: { type: String, required: true, index: true },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
    requestSize: { type: Number },
    responseSize: { type: Number },
    error: { type: String },
    isBlocked: { type: Boolean, default: false },
    rateLimited: { type: Boolean, default: false },
  },
  {
    // Expire documents after 30 days to manage storage
    expireAfterSeconds: 30 * 24 * 60 * 60,
  }
);

// Compound indexes for common queries
ApiUsageSchema.index({ timestamp: -1, endpoint: 1 });
ApiUsageSchema.index({ ipAddress: 1, timestamp: -1 });
ApiUsageSchema.index({ userId: 1, timestamp: -1 });
ApiUsageSchema.index({ statusCode: 1, timestamp: -1 });

const collectionName = `apiUsage${process.env.DB_COLLECTION_SUFFIX || ''}`;

export default (mongoose.models.ApiUsage as mongoose.Model<IApiUsage>) || 
  mongoose.model<IApiUsage>('ApiUsage', ApiUsageSchema, collectionName);
