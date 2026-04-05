import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantUser } from '../tenant-users/entities/tenant-user.entity';
import { supabaseAuthProvider } from '../common/supabase/supabase-auth.provider';

@Module({
  imports: [TypeOrmModule.forFeature([TenantUser])],
  providers: [AuthService, JwtAuthGuard, RolesGuard, supabaseAuthProvider],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
