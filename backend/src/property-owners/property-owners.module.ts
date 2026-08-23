import { Module } from '@nestjs/common';
import { PropertyOwnersController } from './property-owners.controller';
import { PropertyOwnersService } from './property-owners.service';

@Module({
  controllers: [PropertyOwnersController],
  providers: [PropertyOwnersService],
  exports: [PropertyOwnersService],
})
export class PropertyOwnersModule {}
