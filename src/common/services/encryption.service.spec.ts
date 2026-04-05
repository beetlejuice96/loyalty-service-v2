import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

const MOCK_KEY = 'a'.repeat(64); // 32 bytes en hex

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: { get: () => MOCK_KEY },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt / decrypt', () => {
    it('debería recuperar el texto original luego de cifrar y descifrar', () => {
      const plaintext = 'mi-credencial-secreta';
      const decrypted = service.decrypt(service.encrypt(plaintext));
      expect(decrypted).toBe(plaintext);
    });

    it('debería producir ciphertext distinto en cada llamada por el IV aleatorio', () => {
      const plaintext = 'mismo-texto';
      const cipher1 = service.encrypt(plaintext);
      const cipher2 = service.encrypt(plaintext);
      expect(cipher1).not.toBe(cipher2);
    });

    it('debería cifrar strings largos como un JSON de service account', () => {
      const json = JSON.stringify({
        type: 'service_account',
        project_id: 'my-project',
        private_key: '-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----',
        client_email: 'wallet@my-project.iam.gserviceaccount.com',
      });
      const decrypted = service.decrypt(service.encrypt(json));
      expect(decrypted).toBe(json);
    });

    it('debería lanzar un error al intentar descifrar un string inválido', () => {
      expect(() => service.decrypt('esto-no-es-un-ciphertext-valido')).toThrow();
    });

    it('debería lanzar un error si el ciphertext fue manipulado', () => {
      const encrypted = service.encrypt('dato-original');
      const tampered = encrypted.slice(0, -4) + 'xxxx';
      expect(() => service.decrypt(tampered)).toThrow();
    });
  });
});
