import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { AuthUser } from '../types/auth-user.type';

const createContext = (
  user: Partial<AuthUser>,
  params: Record<string, string> = {},
): ExecutionContext => {
  const request = { user, params };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
};

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get(RolesGuard);
  });

  it('debería permitir acceso cuando no se requieren roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createContext({ role: 'staff' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debería permitir acceso cuando el rol del usuario coincide', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = createContext(
      { role: 'admin', tenantId: 'tenant-1' },
      { tenantId: 'tenant-1' },
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debería lanzar ForbiddenException cuando el rol no coincide', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = createContext(
      { role: 'staff', tenantId: 'tenant-1' },
      { tenantId: 'tenant-1' },
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debería permitir acceso a super_admin sin importar el rol requerido', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = createContext({ role: 'super_admin', tenantId: null });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debería lanzar ForbiddenException cuando el tenantId del param no coincide con el del usuario', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = createContext(
      { role: 'admin', tenantId: 'tenant-1' },
      { tenantId: 'tenant-2' },
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debería permitir a super_admin acceder a cualquier tenant', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = createContext(
      { role: 'super_admin', tenantId: null },
      { tenantId: 'cualquier-tenant' },
    );

    expect(guard.canActivate(context)).toBe(true);
  });
});
