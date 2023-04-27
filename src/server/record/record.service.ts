import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Record } from './record.interface';
import { SaveRecordDTO } from './record.dto';
import { to } from 'src/utils';

@Injectable()
export class RecordService {
  constructor(
    @InjectModel('Records') private readonly recordModel: Model<Record>,
  ) {}

  async create(body: SaveRecordDTO): Promise<ReturnType<typeof to<Record>>> {
    body.createTime = Date.now();
    return await to(this.recordModel.create(body));
  }

  async delete(_id: string): Promise<ReturnType<typeof to<void>>> {
    return await to(this.recordModel.findByIdAndDelete(_id));
  }

  async get(_id: string): Promise<ReturnType<typeof to<Record>>> {
    return await to(this.recordModel.findById(_id));
  }

  async getAll(): Promise<ReturnType<typeof to<Record[]>>> {
    return await to(this.recordModel.find());
  }

  async edit(
    _id: string,
    body: SaveRecordDTO,
  ): Promise<ReturnType<typeof to<Record>>> {
    const [err, data] = await to(this.recordModel.findById(_id));
    if (!err) {
      if (!body.structure) {
        body.structure = data.structure;
      }
      if (body.actionQueue) {
        const origin = data.actionQueue
          ? (JSON.parse(data.actionQueue) as [])
          : null;
        const actionQueue = origin
          ? origin.concat(JSON.parse(body.actionQueue))
          : JSON.parse(body.actionQueue);
        body.actionQueue = JSON.stringify(actionQueue);
      }
      if (body.cursorQueue) {
        const origin = data.cursorQueue
          ? (JSON.parse(data.cursorQueue) as [])
          : null;
        const cursorQueue = origin
          ? origin.concat(JSON.parse(body.cursorQueue))
          : JSON.parse(body.cursorQueue);
        body.cursorQueue = JSON.stringify(cursorQueue);
      }
      return await to(this.recordModel.findByIdAndUpdate(_id, body));
    }
  }
}
