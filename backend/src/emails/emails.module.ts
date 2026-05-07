import { Module, Global } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule {}
