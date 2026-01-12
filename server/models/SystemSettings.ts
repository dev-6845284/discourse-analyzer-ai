import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
    key: string;
    value: any;
    updatedAt: Date;
    updatedBy: string;
}

const SystemSettingsSchema: Schema = new Schema(
    {
        key: { type: String, required: true, unique: true, index: true },
        value: { type: Schema.Types.Mixed, required: true },
        updatedBy: { type: String },
    },
    {
        timestamps: true,
    }
);

const collectionName = `system_settings${process.env.DB_COLLECTION_SUFFIX || ''}`;

export default mongoose.models.SystemSettings || mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema, collectionName);
