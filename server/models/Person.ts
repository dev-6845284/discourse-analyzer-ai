import mongoose, { Schema, Document } from 'mongoose';

export interface IPerson extends Document {
  name: string;
  firstname?: string;
  surname?: string;
  aliases: string[];
  links?: Array<{
    url: string;
    type: 'facebook' | 'tiktok' | 'instagram' | 'custom';
    isVisible: boolean;
  }>;
  description?: string;
  metadata: Record<string, any>; // Flexible schema for extra data
  createdAt: Date;
  updatedAt: Date;
}

const PersonSchema: Schema = new Schema(
  {
    name: { type: String, required: true, index: true },
    firstname: { type: String },
    surname: { type: String },
    aliases: { type: [String], index: true },
    links: {
      type: [{
        url: { type: String, required: true },
        type: { type: String, enum: ['facebook', 'tiktok', 'instagram', 'custom'], required: true },
        isVisible: { type: Boolean, default: false }
      }],
      default: []
    },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} }, // Allows any structure
  },
  {
    timestamps: true,
  }
);

// Text index for search
PersonSchema.index({ name: 'text', aliases: 'text', description: 'text' });

const collectionName = `people${process.env.DB_COLLECTION_SUFFIX || ''}`;

export default (mongoose.models.Person as mongoose.Model<IPerson>) || mongoose.model<IPerson>('Person', PersonSchema, collectionName);
