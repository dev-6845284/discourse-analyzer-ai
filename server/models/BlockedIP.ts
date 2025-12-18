import mongoose, { Schema, Document } from 'mongoose';

export interface IBlockedIP extends Document {
  ipAddress: string;
  reason: string;
  blockedAt: Date;
  blockedBy?: mongoose.Types.ObjectId;
  blockedByName?: string;
  expiresAt?: Date;
  isAutoBlocked: boolean;
  hitCount: number;
  lastHitAt?: Date;
}

const BlockedIPSchema: Schema = new Schema(
  {
    ipAddress: { type: String, required: true, unique: true },
    reason: { type: String, required: true },
    blockedAt: { type: Date, default: Date.now },
    blockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    blockedByName: { type: String },
    expiresAt: { type: Date },
    isAutoBlocked: { type: Boolean, default: false },
    hitCount: { type: Number, default: 0 },
    lastHitAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// TTL index for automatic expiration (only one index on expiresAt)
BlockedIPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const collectionName = `blockedIPs${process.env.DB_COLLECTION_SUFFIX || ''}`;

export default (mongoose.models.BlockedIP as mongoose.Model<IBlockedIP>) || 
  mongoose.model<IBlockedIP>('BlockedIP', BlockedIPSchema, collectionName);
