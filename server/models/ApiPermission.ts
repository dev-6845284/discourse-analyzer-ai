import mongoose, { Document, Schema } from 'mongoose';

export interface IApiPermission extends Document {
  method: string; // HTTP method (GET, POST, PUT, DELETE)
  path: string; // Express-style path (e.g. /api/quotes/:id)
  requiredRole: string; // Minimum role required (admin/editor/moderator/viewer)
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApiPermissionSchema: Schema = new Schema(
  {
    method: { type: String, required: true },
    path: { type: String, required: true, index: true },
    requiredRole: { type: String, required: true, default: 'admin' },
    description: { type: String },
  },
  {
    timestamps: true,
  }
);

ApiPermissionSchema.index({ method: 1, path: 1 }, { unique: true });

export default (mongoose.models.ApiPermission as mongoose.Model<IApiPermission>) ||
  mongoose.model<IApiPermission>('ApiPermission', ApiPermissionSchema, `api_permissions${process.env.DB_COLLECTION_SUFFIX || ''}`);
