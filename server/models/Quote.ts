import mongoose, { Schema, Document } from 'mongoose';

export interface IQuote extends Document {
  text: string;
  person: mongoose.Types.ObjectId;
  sourceUrl?: string;
  date?: Date;
  tags: string[];
  context?: string;
  analysisContext?: string;
  foundBy?: string;
  improvedBy?: string;
  analyzedBy?: string;
  // Audit fields
  savedByUser?: mongoose.Types.ObjectId;
  savedByName?: string;
  savedAt?: Date;
  analyzedByUser?: mongoose.Types.ObjectId;
  analyzedByName?: string;
  analyzedByProvider?: string;
  analyzedAt?: Date;
  improvedByUser?: mongoose.Types.ObjectId;
  improvedByName?: string;
  improvedByProvider?: string;
  improvedAt?: Date;
  metadata: Record<string, any>; // Flexible schema
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema: Schema = new Schema(
  {
    text: { type: String, required: true },
    person: { type: Schema.Types.ObjectId, ref: 'Person', required: true, index: true },
    sourceUrl: { type: String },
    date: { type: Date },
    tags: { type: [String], index: true },
    context: { type: String },
    analysisContext: { type: String },
    foundBy: { type: String },
    improvedBy: { type: String },
    analyzedBy: { type: String },
    // Audit fields
    savedByUser: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    savedByName: { type: String },
    savedAt: { type: Date },
    analyzedByUser: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    analyzedByName: { type: String },
    analyzedByProvider: { type: String },
    analyzedAt: { type: Date },
    improvedByUser: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    improvedByName: { type: String },
    improvedByProvider: { type: String },
    improvedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Text index for search
QuoteSchema.index({ text: 'text', context: 'text', tags: 'text' });

const collectionName = `quotes${process.env.DB_COLLECTION_SUFFIX || ''}`;

export default (mongoose.models.Quote as mongoose.Model<IQuote>) || mongoose.model<IQuote>('Quote', QuoteSchema, collectionName);
