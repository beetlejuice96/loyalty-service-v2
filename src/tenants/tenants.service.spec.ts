import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';

describe('TenantsService', () => {
  let service: TenantsService;
  let tenantRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let loyaltyProgramRepository: { save: jest.Mock };

  beforeEach(async () => {
    tenantRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    loyaltyProgramRepository = { save: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getRepositoryToken(Tenant), useValue: tenantRepository },
        {
          provide: getRepositoryToken(LoyaltyProgram),
          useValue: loyaltyProgramRepository,
        },
      ],
    }).compile();

    service = module.get(TenantsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('debería retornar todos los tenants ordenados por fecha de creación', async () => {
      const mockTenants = [
        { id: '1', name: 'Cafe' },
        { id: '2', name: 'Resto' },
      ];
      tenantRepository.find.mockResolvedValue(mockTenants);

      const result = await service.findAll();

      expect(result).toEqual(mockTenants);
      expect(tenantRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('create', () => {
    it('debería crear un tenant y su loyalty_program con el nombre del programa', async () => {
      tenantRepository.findOne.mockResolvedValue(null);
      const savedTenant = { id: 'tenant-id', name: 'Cafe Bonafide', slug: 'cafe-bonafide' };
      tenantRepository.save.mockResolvedValue(savedTenant);
      loyaltyProgramRepository.save.mockResolvedValue({ id: 'prog-id' });

      const result = await service.create({ name: 'Cafe Bonafide', slug: 'cafe-bonafide' });

      expect(tenantRepository.save).toHaveBeenCalled();
      expect(loyaltyProgramRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-id',
          programName: 'Cafe Bonafide',
        }),
      );
      expect(result).toEqual(savedTenant);
    });

    it('debería lanzar ConflictException si el slug ya está en uso', async () => {
      tenantRepository.findOne.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.create({ name: 'Cafe', slug: 'cafe' }),
      ).rejects.toThrow(ConflictException);

      expect(tenantRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('debería actualizar los campos del tenant', async () => {
      const existing = { id: 'tid', name: 'Old Name', slug: 'old' };
      tenantRepository.findOne.mockResolvedValue(existing);
      tenantRepository.save.mockResolvedValue({ ...existing, name: 'New Name' });

      const result = await service.update('tid', { name: 'New Name' });

      expect(tenantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name' }),
      );
      expect(result.name).toBe('New Name');
    });

    it('debería lanzar NotFoundException si el tenant no existe', async () => {
      tenantRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('debería establecer isActive en false', async () => {
      const existing = { id: 'tid', name: 'Cafe', isActive: true };
      tenantRepository.findOne.mockResolvedValue(existing);
      tenantRepository.save.mockResolvedValue({ ...existing, isActive: false });

      const result = await service.deactivate('tid');

      expect(tenantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
      expect(result.isActive).toBe(false);
    });

    it('debería lanzar NotFoundException si el tenant no existe', async () => {
      tenantRepository.findOne.mockResolvedValue(null);

      await expect(service.deactivate('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
