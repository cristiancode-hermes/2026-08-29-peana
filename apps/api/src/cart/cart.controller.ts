import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';
import type { AuthUser } from '../auth/current-user';

class AddCartDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  qty!: number;
}

class PatchCartDto {
  @IsInt()
  qty!: number;
}

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.cart.getCart(user.userId);
  }

  @Post('items')
  add(@CurrentUser() user: AuthUser, @Body() dto: AddCartDto) {
    return this.cart.addItem(user.userId, dto.productId, dto.qty);
  }

  @Patch('items/:id')
  patch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: PatchCartDto) {
    return this.cart.patchItem(user.userId, id, dto.qty);
  }

  @Delete('items/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cart.removeItem(user.userId, id);
  }
}
