import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from '../../auth/auth.service';
import { AuthUser } from '../types/auth-user.type';

const mockAuthUser: AuthUser = {
  id: 'user-id',
  email: 'a@b.com',
  role: 'admin',
  tenantId: 'tenant-id',
};

const createContext = (authHeader?: string): ExecutionContext => {
  const request = {
    headers: authHeader ? { authorization: authHeader } : {},
    user: undefined as AuthUser | undefined,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
};

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let authService: { validateToken: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    authService = { validateToken: jest.fn() };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };

    const module = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: AuthService, useValue: authService },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get(JwtAuthGuard);
  });

  it('debería permitir acceso a rutas públicas sin token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.validateToken).not.toHaveBeenCalled();
  });

  it('debería lanzar UnauthorizedException si no hay header Authorization', async () => {
    const context = createContext();
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('debería lanzar UnauthorizedException si el header no es Bearer', async () => {
    const context = createContext('Basic dXNlcjpwYXNz');
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('debería lanzar UnauthorizedException si el token es inválido', async () => {
    authService.validateToken.mockRejectedValue(new UnauthorizedException());
    const context = createContext('Bearer token-invalido');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('debería adjuntar el usuario al request y retornar true con token válido', async () => {
    authService.validateToken.mockResolvedValue(mockAuthUser);
    const context = createContext('Bearer token-valido');
    const request = context.switchToHttp().getRequest();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(mockAuthUser);
    expect(authService.validateToken).toHaveBeenCalledWith('token-valido');
  });
});
