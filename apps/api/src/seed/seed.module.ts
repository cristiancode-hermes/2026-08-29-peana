import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KitBom, Order, OrderLine, Product, Range, Review, User } from '../entities/entities';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Range, Product, KitBom, Order, OrderLine, Review])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
