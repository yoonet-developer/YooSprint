import mongoose, { Schema, Document } from 'mongoose';

export interface IFileDocument {
  _id?: string;
  type: string;
  typeLabel: string;
  link: string;
  title: string;
  timestamp: Date;
}

export interface IFileFolder extends Document {
  name: string;
  color: string;
  documents: IFileDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const FileDocumentSchema = new Schema<IFileDocument>({
  type: { type: String, required: true },
  typeLabel: { type: String, required: true },
  link: { type: String, required: true },
  title: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const FileFolderSchema = new Schema<IFileFolder>(
  {
    name: { type: String, required: true },
    color: { type: String, required: true },
    documents: [FileDocumentSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.FileFolder || mongoose.model<IFileFolder>('FileFolder', FileFolderSchema);
