import { Module } from '@nestjs/common';
import { RecordController } from './record.controller';
import { RecordService } from './record.service';
import { MongooseModule } from '@nestjs/mongoose';
import { recordSchema } from './record.scheme';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Records', schema: recordSchema }]),
  ],
  controllers: [RecordController],
  providers: [RecordService],
})
export class RecordModule {}
