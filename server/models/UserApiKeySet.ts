import mongoose, { Document, Schema } from 'mongoose';

export interface IUserApiKeySet extends Document {
  userId: Schema.Types.ObjectId;
  apiKeySetId: Schema.Types.ObjectId;
  assignedAt: Date;
  assignedBy?: Schema.Types.ObjectId;
  role?: string;
}

const UserApiKeySetSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    apiKeySetId: { type: Schema.Types.ObjectId, ref: 'ApiKeySet', required: true },
    assignedAt: { type: Date, default: () => new Date() },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String },
  },
  { timestamps: false }
);

UserApiKeySetSchema.index({ userId: 1, apiKeySetId: 1 }, { unique: true, name: 'user_apiKeySet_unique' });
UserApiKeySetSchema.index({ apiKeySetId: 1 });
UserApiKeySetSchema.index({ userId: 1 });

export default (mongoose.models.UserApiKeySet as mongoose.Model<IUserApiKeySet>) ||
  mongoose.model<IUserApiKeySet>('UserApiKeySet', UserApiKeySetSchema, `user_api_key_sets${process.env.DB_COLLECTION_SUFFIX || ''}`);
