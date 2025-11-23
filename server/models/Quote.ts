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
