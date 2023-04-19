import { Document } from 'mongoose';

export interface Record extends Document {
  readonly _id: string;
  projectId: string;
  projectName: string;
  moduleId: string;
  structure: string;
  actionQueue: string;
  cursorQueue: string;
  createTime: number;
}
