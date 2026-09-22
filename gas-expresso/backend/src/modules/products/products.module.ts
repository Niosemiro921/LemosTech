import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/application/auth.module';
import { ProductService } from './application/product.service';
import { ProductsController } from './presentation/products.controller';

@Module({ imports: [AuthModule], controllers: [ProductsController], providers: [ProductService], exports: [ProductService] })
export class ProductsModule {}
