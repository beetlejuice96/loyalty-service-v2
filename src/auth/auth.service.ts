import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupabaseClient } from '@supabase/supabase-js';
import { TenantUser } from '../tenant-users/entities/tenant-user.entity';
import { SUPABASE_AUTH_CLIENT } from '../common/supabase/supabase-auth.provider';
import { AuthUser } from '../common/types/auth-user.type';

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_AUTH_CLIENT)
    private readonly supabase: SupabaseClient,
    @InjectRepository(TenantUser)
    private readonly tenantUserRepository: Repository<TenantUser>,
  ) {}

  async validateToken(token: string): Promise<AuthUser> {
    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const { role, tenantId } = await this.resolveRoleAndTenant(data.user);

    return {
      id: data.user.id,
      email: data.user.email!,
      role,
      tenantId,
    };
  }

  private async resolveRoleAndTenant(user: { id: string; app_metadata?: Record<string, unknown> }) {
    if (user.app_metadata?.['role'] === 'super_admin') {
      return { role: 'super_admin' as const, tenantId: null };
    }

    const tenantUser = await this.tenantUserRepository.findOne({
      where: { userId: user.id },
    });

    if (!tenantUser) {
      throw new UnauthorizedException('Usuario sin acceso a la plataforma');
    }

    return { role: tenantUser.role, tenantId: tenantUser.tenantId };
  }
}
