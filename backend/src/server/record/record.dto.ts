import { IsNotEmpty } from 'class-validator';

export class SaveRecordDTO {
  _id: number;

  @IsNotEmpty({ message: 'projectId cannot be empty' })
  readonly projectId: string;

  @IsNotEmpty({ message: 'projectName cannot be empty' })
  readonly projectName: string;

  @IsNotEmpty({ message: 'moduleId cannot be empty' })
  readonly moduleId: string;

  // @IsNotEmpty({ message: 'dom structure cannot be empty' })
  structure: string;

  timeTable: string;

  actionQueue: string;

  cursorQueue: string;

  createTime: number;
}
