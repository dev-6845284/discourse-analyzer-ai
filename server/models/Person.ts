import mongoose, { Schema, Document } from 'mongoose';

export interface IPerson extends Document {
  name: string;
  firstname?: string;
  surname?: string;
  aliases: string[];
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

export default mongoose.models.Person || mongoose.model<IPerson>('Person', PersonSchema, collectionName);
