import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';
import type { AuthUser } from '../auth/current-user';

class ReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  body?: string;
}

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('ranges')
  ranges() {
    return this.catalog.listRanges();
  }

  @Get('ranges/:slug')
  range(@Param('slug') slug: string) {
    return this.catalog.getRange(slug);
  }

  @Get('products')
  products(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('rangeId') rangeId?: string,
  ) {
    return this.catalog.listProducts(q, category, rangeId);
  }

  @Get('products/:id')
  product(@Param('id') id: string) {
    return this.catalog.getProduct(id);
  }

  @Get('products/:id/reviews')
  reviews(@Param('id') id: string) {
    return this.catalog.listReviews(id);
  }

  @Post('products/:id/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addReview(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReviewDto) {
    return this.catalog.addReview(user.userId, id, dto.rating, dto.body || '');
  }

  @Get('favorites')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  favorites(@CurrentUser() user: AuthUser) {
    return this.catalog.listFavorites(user.userId);
  }

  @Post('favorites/:productId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addFav(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.catalog.addFavorite(user.userId, productId);
  }

  @Delete('favorites/:productId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  delFav(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.catalog.removeFavorite(user.userId, productId);
  }
}
