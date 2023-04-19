import { IsNotEmpty } from 'class-validator';

export class SaveRecordDTO {
  @IsNotEmpty({ message: 'projectId cannot be empty' })
  readonly projectId: string;

  @IsNotEmpty({ message: 'projectName cannot be empty' })
  readonly projectName: string;

  @IsNotEmpty({ message: 'moduleId cannot be empty' })
  readonly moduleId: string;

  @IsNotEmpty({ message: 'dom structure cannot be empty' })
  readonly structure: string;

  readonly actionQueue: string;

  readonly cursorQueue: string;

  createTime: number;
}
