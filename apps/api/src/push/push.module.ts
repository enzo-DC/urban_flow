import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PushController } from './push.controller';
import { PushListener } from './push.listener';
import { PushPurgeService } from './push-purge.service';
import { PushService } from './push.service';

@Module({
  imports: [AuthModule],
  controllers: [PushController],
  providers: [PushService, PushListener, PushPurgeService],
})
export class PushModule {}
