import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '../logger.service';
import { PinoLogger } from 'nestjs-pino';

describe('LoggerService', () => {
  let service: LoggerService;
  let mockPinoLogger: {
    info: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };

  beforeEach(async () => {
    mockPinoLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerService,
        {
          provide: PinoLogger,
          useValue: mockPinoLogger,
        },
      ],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
  });

  describe('log', () => {
    it('should log info message with structured format', () => {
      service.log('User created', 'UsersService', {
        function: 'create',
        userId: 'user-123',
        metadata: { email: 'test@example.com' },
      });

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'UsersService',
          function: 'create',
          userId: 'user-123',
          metadata: { email: 'test@example.com' },
        }),
        'User created',
      );
    });

    it('should log without optional parameters', () => {
      service.log('Simple message', 'TestContext');

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'TestContext',
        }),
        'Simple message',
      );
    });
  });

  describe('error', () => {
    it('should log error with stack trace', () => {
      const error = new Error('Something went wrong');

      service.error('Operation failed', error.stack, 'UsersService', {
        function: 'create',
        userId: 'user-123',
        metadata: { attemptedAction: 'create-user' },
      });

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'UsersService',
          function: 'create',
          userId: 'user-123',
          stack: error.stack,
          metadata: { attemptedAction: 'create-user' },
        }),
        'Operation failed',
      );
    });

    it('should log error without stack trace', () => {
      service.error('Error message', undefined, 'TestContext');

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'TestContext',
        }),
        'Error message',
      );
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      service.warn('Deprecated feature used', 'FeatureService', {
        function: 'oldMethod',
        metadata: { feature: 'legacy-api' },
      });

      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'FeatureService',
          function: 'oldMethod',
          metadata: { feature: 'legacy-api' },
        }),
        'Deprecated feature used',
      );
    });
  });

  describe('debug', () => {
    it('should log debug message', () => {
      service.debug('Debug info', 'DebugService', {
        function: 'debugMethod',
        metadata: { debugData: 'value' },
      });

      expect(mockPinoLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'DebugService',
          function: 'debugMethod',
          metadata: { debugData: 'value' },
        }),
        'Debug info',
      );
    });
  });

  describe('verbose', () => {
    it('should log verbose message using debug level', () => {
      service.verbose('Verbose info', 'VerboseService', {
        function: 'verboseMethod',
        metadata: { verboseData: 'value' },
      });

      expect(mockPinoLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'VerboseService',
          function: 'verboseMethod',
          metadata: { verboseData: 'value' },
        }),
        'Verbose info',
      );
    });
  });

  describe('correlationId in options', () => {
    it('should include correlationId when passed in options', () => {
      service.log('Test message', 'TestContext', {
        correlationId: 'corr-123-abc',
      });

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'corr-123-abc',
        }),
        'Test message',
      );
    });
  });

  describe('sensitive data filtering', () => {
    it('should filter out password from metadata', () => {
      service.log('User login', 'AuthService', {
        function: 'login',
        metadata: { email: 'test@example.com', password: 'secret123' },
      });

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            email: 'test@example.com',
            password: '[REDACTED]',
          }) as Record<string, unknown>,
        }),
        'User login',
      );
    });

    it('should filter out token from metadata', () => {
      service.log('Token refresh', 'AuthService', {
        function: 'refresh',
        metadata: { userId: 'user-123', token: 'jwt-token-here' },
      });

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'user-123',
            token: '[REDACTED]',
          }) as Record<string, unknown>,
        }),
        'Token refresh',
      );
    });

    it('should filter out accessToken and refreshToken', () => {
      service.log('Auth tokens', 'AuthService', {
        function: 'getTokens',
        metadata: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
        },
      });

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            accessToken: '[REDACTED]',
            refreshToken: '[REDACTED]',
          }) as Record<string, unknown>,
        }),
        'Auth tokens',
      );
    });

    it('should filter out secret and apiKey', () => {
      service.log('API call', 'ExternalService', {
        function: 'call',
        metadata: {
          endpoint: '/api/test',
          secret: 'my-secret',
          apiKey: 'api-key-123',
        },
      });

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            endpoint: '/api/test',
            secret: '[REDACTED]',
            apiKey: '[REDACTED]',
          }) as Record<string, unknown>,
        }),
        'API call',
      );
    });

    it('should filter sensitive data in nested objects', () => {
      service.log('Nested data', 'TestService', {
        function: 'nested',
        metadata: {
          user: {
            email: 'test@example.com',
            credentials: {
              password: 'secret123',
              apiKey: 'key-456',
            },
          },
        },
      });

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            user: {
              email: 'test@example.com',
              credentials: {
                password: '[REDACTED]',
                apiKey: '[REDACTED]',
              },
            },
          },
        }),
        'Nested data',
      );
    });

    it('should filter sensitive data in arrays', () => {
      service.log('Array data', 'TestService', {
        function: 'array',
        metadata: {
          users: [
            { email: 'user1@example.com', password: 'pass1' },
            { email: 'user2@example.com', password: 'pass2' },
          ],
        },
      });

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            users: [
              { email: 'user1@example.com', password: '[REDACTED]' },
              { email: 'user2@example.com', password: '[REDACTED]' },
            ],
          },
        }),
        'Array data',
      );
    });

    it('should handle circular references', () => {
      const circularObj: Record<string, unknown> = { name: 'test' };
      circularObj.self = circularObj;

      service.log('Circular data', 'TestService', {
        function: 'circular',
        metadata: circularObj,
      });

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            name: 'test',
            self: '[CircularReference]',
          },
        }),
        'Circular data',
      );
    });

    it('should filter sensitive keys case-insensitively', () => {
      service.log('Case insensitive', 'TestService', {
        function: 'caseTest',
        metadata: {
          PASSWORD: 'secret1',
          Token: 'token-value',
          ApiKey: 'api-key-value',
          AUTHORIZATION: 'auth-header',
        },
      });

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            PASSWORD: '[REDACTED]',
            Token: '[REDACTED]',
            ApiKey: '[REDACTED]',
            AUTHORIZATION: '[REDACTED]',
          },
        }),
        'Case insensitive',
      );
    });

    it('should handle null and undefined values in metadata', () => {
      service.log('Null values', 'TestService', {
        function: 'nullTest',
        metadata: {
          nullValue: null,
          undefinedValue: undefined,
          normalValue: 'test',
        },
      });

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            nullValue: null,
            undefinedValue: undefined,
            normalValue: 'test',
          },
        }),
        'Null values',
      );
    });
  });
});
