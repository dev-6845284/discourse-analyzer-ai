import mongoose, { Document, Schema } from 'mongoose';

export interface IApiKeySet extends Document {
  alias: string;
  GEMINI_API_KEY?: string | null;
  GROK_API_KEY?: string | null;
  CHATGPT_API_KEY?: string | null;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySetSchema: Schema = new Schema(
  {
    alias: { type: String, required: true },
    GEMINI_API_KEY: { type: String },
    GROK_API_KEY: { type: String },
    CHATGPT_API_KEY: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

// Allow the reserved alias 'USERS_KEYSET' to exist per-user (createdBy),
// so make a compound unique index on (alias, createdBy). This prevents
// duplicate alias for the same creator while allowing multiple users to
// have their own 'USERS_KEYSET'. For global sets (createdBy=null),
// alias will be unique.
ApiKeySetSchema.index({ alias: 1, createdBy: 1 }, { unique: true, name: 'alias_createdBy_unique' });

export default (mongoose.models.ApiKeySet as mongoose.Model<IApiKeySet>) ||
  mongoose.model<IApiKeySet>('ApiKeySet', ApiKeySetSchema, `api_key_sets${process.env.DB_COLLECTION_SUFFIX || ''}`);
