import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProductService } from '../application/product.service';
import { CreateProductDto } from '../application/dto/create-product.dto';
import { UpdateProductDto, UpdateVariantDto } from '../application/dto/update-product.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '../../../shared/domain/auth.enums';

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductService) {}
  @Get() list() { return this.service.list(); }
  @Get(':id') get(@Param('id') id: string) { return this.service.getById(id); }
  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) create(@Body() dto: CreateProductDto) { return this.service.create(dto); }
  @Patch(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) update(@Param('id') id: string, @Body() dto: UpdateProductDto) { return this.service.update(id, dto); }
  @Patch('variants/:id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) updateVariant(@Param('id') id: string, @Body() dto: UpdateVariantDto) { return this.service.updateVariant(id, dto); }
}
