import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser, UserRole } from '../types/auth-user.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser;

    if (user.role === 'super_admin') return true;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Acceso denegado');
    }

    const { tenantId } = request.params as Record<string, string>;
    if (tenantId && user.tenantId !== tenantId) {
      throw new ForbiddenException('Acceso denegado a este tenant');
    }

    return true;
  }
}
