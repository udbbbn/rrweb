import { SaveRecordDTO } from './record.dto';
import { Record } from './record.interface';
import { RecordService } from './record.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

interface RecordResponse<T = unknown> {
  code: number;
  data?: T;
  message: string;
}

@Controller('record')
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  // post /record
  @Post()
  async save(@Body() body: SaveRecordDTO): Promise<RecordResponse> {
    const [err] = await this.recordService.create(body);
    return {
      code: err ? 500 : 200,
      message: err ? err?.message : 'successfully created',
    };
  }

  // delete /record/:id
  @Delete(':_id')
  async delete(@Param('_id') _id: string): Promise<RecordResponse> {
    const [err] = await this.recordService.delete(_id);
    return {
      code: err ? 500 : 200,
      message: err ? err?.message : 'successfully deleted',
    };
  }

  // get /record/all
  @Get('all')
  async getAll(): Promise<RecordResponse<Record[]>> {
    const [err, data] = await this.recordService.getAll();
    return {
      code: err ? 500 : 200,
      data,
      message: err ? err?.message : 'successfully getted',
    };
  }

  // get /record/:id
  @Get(':_id')
  async get(@Param('_id') _id: string): Promise<RecordResponse<Record>> {
    const [err, data] = await this.recordService.get(_id);
    return {
      code: err ? 500 : 200,
      data,
      message: err ? err?.message : 'successfully getted',
    };
  }

  // put /record/:id
  @Put(':_id')
  async update(
    @Param('_id') _id: string,
    @Body() body: SaveRecordDTO,
  ): Promise<RecordResponse> {
    const [err] = await this.recordService.edit(_id, body);
    return {
      code: err ? 500 : 200,
      message: err ? err?.message : 'successfully updated',
    };
  }
}
