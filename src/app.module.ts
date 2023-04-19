import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RecordModule } from './server/record/record.module';

/**
 * i try to use typeorm to make column mapping.
 * like userName -> user_name.
 * but typeorm-naming-strategies not support mongo
 * https://github.com/typeorm/typeorm/issues/7410.
 * So i still use mongoose
 */

@Module({
  imports: [MongooseModule.forRoot('mongodb://localhost/rrweb'), RecordModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
