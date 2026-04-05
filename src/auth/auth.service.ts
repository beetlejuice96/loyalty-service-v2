import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupabaseClient } from '@supabase/supabase-js';
import { TenantUser } from '../tenant-users/entities/tenant-user.entity';
import { SUPABASE_AUTH_CLIENT } from '../common/supabase/supabase-auth.provider';
import { AuthUser } from '../common/types/auth-user.type';
import { LoggerService } from '../common/logger';

const CTX = 'AuthService';

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_AUTH_CLIENT)
    private readonly supabase: SupabaseClient,
    @InjectRepository(TenantUser)
    private readonly tenantUserRepository: Repository<TenantUser>,
    private readonly logger: LoggerService,
  ) {}

  async validateToken(token: string): Promise<AuthUser> {
    this.logger.log('Validating token', CTX, { function: 'validateToken' });

    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      this.logger.warn('Token inválido o expirado', CTX, { function: 'validateToken' });
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const { role, tenantId } = await this.resolveRoleAndTenant(data.user);

    this.logger.log('Token validated', CTX, {
      function: 'validateToken',
      userId: data.user.id,
      metadata: { role, tenantId },
    });

    return {
      id: data.user.id,
      email: data.user.email!,
      role,
      tenantId,
    };
  }

  private async resolveRoleAndTenant(user: { id: string; app_metadata?: Record<string, unknown> }) {
    if (user.app_metadata?.['role'] === 'super_admin') {
      this.logger.log('User is super_admin', CTX, { function: 'resolveRoleAndTenant', userId: user.id });
      return { role: 'super_admin' as const, tenantId: null };
    }

    const tenantUser = await this.tenantUserRepository.findOne({
      where: { userId: user.id },
    });

    if (!tenantUser) {
      this.logger.warn('User has no tenant_users entry', CTX, { function: 'resolveRoleAndTenant', userId: user.id });
      throw new UnauthorizedException('Usuario sin acceso a la plataforma');
    }

    return { role: tenantUser.role, tenantId: tenantUser.tenantId };
  }
}
