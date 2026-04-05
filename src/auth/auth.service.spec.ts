import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { TenantUser } from '../tenant-users/entities/tenant-user.entity';
import { SUPABASE_AUTH_CLIENT } from '../common/supabase/supabase-auth.provider';
import { LoggerService } from '../common/logger';

const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

describe('AuthService', () => {
  let service: AuthService;
  let supabaseClient: {
    auth: { getUser: jest.Mock };
  };
  let tenantUserRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    supabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
    };
    tenantUserRepository = { findOne: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SUPABASE_AUTH_CLIENT, useValue: supabaseClient },
        { provide: getRepositoryToken(TenantUser), useValue: tenantUserRepository },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('validateToken', () => {
    it('debería retornar AuthUser con el token válido', async () => {
      supabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: { id: 'uid', email: 'a@b.com', app_metadata: {} },
        },
        error: null,
      });
      tenantUserRepository.findOne.mockResolvedValue({
        role: 'staff',
        tenantId: 'tenant-2',
      });

      const result = await service.validateToken('valid-token');

      expect(result.id).toBe('uid');
      expect(result.role).toBe('staff');
      expect(result.tenantId).toBe('tenant-2');
    });

    it('debería lanzar UnauthorizedException para token inválido', async () => {
      supabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' },
      });

      await expect(service.validateToken('expired')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debería lanzar UnauthorizedException si el usuario no tiene entrada en tenant_users', async () => {
      supabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: { id: 'uid', email: 'a@b.com', app_metadata: {} },
        },
        error: null,
      });
      tenantUserRepository.findOne.mockResolvedValue(null);

      await expect(service.validateToken('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
