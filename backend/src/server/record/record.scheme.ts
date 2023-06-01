import { Schema } from 'mongoose';

export const recordSchema = new Schema({
  projectId: { type: String, require: true },
  projectName: { type: String, require: true },
  moduleId: { type: String, require: true },
  structure: { type: String, require: true },
  timeTable: String,
  actionQueue: String,
  cursorQueue: String,
  createTime: Date,
});
