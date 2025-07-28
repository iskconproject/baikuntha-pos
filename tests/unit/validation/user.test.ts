import { describe, it, expect } from 'vitest';
import {
  pinSchema,
  userRoleSchema,
  createUserSchema,
  updateUserSchema,
  changePinSchema,
  userQuerySchema,
} from '@/lib/validation/user';

describe('User Validation Schemas', () => {
  describe('pinSchema', () => {
    it('should accept valid PINs', () => {
      const validPins = ['1357', '2468', '9012', '1379', '2486'];
      
      validPins.forEach(pin => {
        expect(() => pinSchema.parse(pin)).not.toThrow();
      });
    });

    it('should reject PINs that are too short', () => {
      expect(() => pinSchema.parse('123')).toThrow('PIN must be at least 4 digits');
    });

    it('should reject PINs that are too long', () => {
      expect(() => pinSchema.parse('123456789')).toThrow('PIN must not exceed 8 digits');
    });

    it('should reject non-numeric PINs', () => {
      expect(() => pinSchema.parse('12ab')).toThrow('PIN must contain only numbers');
      expect(() => pinSchema.parse('abcd')).toThrow('PIN must contain only numbers');
    });

    it('should reject sequential PINs', () => {
      const sequentialPins = ['1234', '2345', '3456', '4321', '5432'];
      
      sequentialPins.forEach(pin => {
        expect(() => pinSchema.parse(pin)).toThrow('PIN cannot be sequential numbers');
      });
    });

    it('should reject repeated digit PINs', () => {
      const repeatedPins = ['1111', '2222', '3333', '0000'];
      
      repeatedPins.forEach(pin => {
        expect(() => pinSchema.parse(pin)).toThrow('PIN cannot be all the same digit');
      });
    });
  });

  describe('userRoleSchema', () => {
    it('should accept valid roles', () => {
      const validRoles = ['admin', 'manager', 'cashier'];
      
      validRoles.forEach(role => {
        expect(() => userRoleSchema.parse(role)).not.toThrow();
      });
    });

    it('should reject invalid roles', () => {
      expect(() => userRoleSchema.parse('invalid')).toThrow();
      expect(() => userRoleSchema.parse('user')).toThrow();
      expect(() => userRoleSchema.parse('')).toThrow();
    });
  });

  describe('createUserSchema', () => {
    it('should accept valid user creation data', () => {
      const validData = {
        username: 'testuser',
        pin: '1357',
        confirmPin: '1357',
        role: 'cashier' as const,
      };

      expect(() => createUserSchema.parse(validData)).not.toThrow();
    });

    it('should convert username to lowercase', () => {
      const data = {
        username: 'TestUser',
        pin: '1357',
        confirmPin: '1357',
        role: 'cashier' as const,
      };

      const result = createUserSchema.parse(data);
      expect(result.username).toBe('testuser');
    });

    it('should reject usernames that are too short', () => {
      const data = {
        username: 'ab',
        pin: '1357',
        confirmPin: '1357',
        role: 'cashier' as const,
      };

      expect(() => createUserSchema.parse(data)).toThrow('Username must be at least 3 characters');
    });

    it('should reject usernames that are too long', () => {
      const data = {
        username: 'a'.repeat(21),
        pin: '1357',
        confirmPin: '1357',
        role: 'cashier' as const,
      };

      expect(() => createUserSchema.parse(data)).toThrow('Username must not exceed 20 characters');
    });

    it('should reject usernames with invalid characters', () => {
      const invalidUsernames = ['user@name', 'user-name', 'user name', 'user.name'];
      
      invalidUsernames.forEach(username => {
        const data = {
          username,
          pin: '1357',
          confirmPin: '1357',
          role: 'cashier' as const,
        };

        expect(() => createUserSchema.parse(data)).toThrow('Username can only contain letters, numbers, and underscores');
      });
    });

    it('should reject when PINs do not match', () => {
      const data = {
        username: 'testuser',
        pin: '1357',
        confirmPin: '2468',
        role: 'cashier' as const,
      };

      expect(() => createUserSchema.parse(data)).toThrow("PINs don't match");
    });

    it('should validate PIN complexity', () => {
      const data = {
        username: 'testuser',
        pin: '1111',
        confirmPin: '1111',
        role: 'cashier' as const,
      };

      expect(() => createUserSchema.parse(data)).toThrow('PIN cannot be all the same digit');
    });
  });

  describe('updateUserSchema', () => {
    it('should accept valid update data', () => {
      const validData = {
        username: 'newusername',
        role: 'manager' as const,
        isActive: true,
      };

      expect(() => updateUserSchema.parse(validData)).not.toThrow();
    });

    it('should accept partial update data', () => {
      const partialData = {
        role: 'admin' as const,
      };

      expect(() => updateUserSchema.parse(partialData)).not.toThrow();
    });

    it('should accept empty update data', () => {
      expect(() => updateUserSchema.parse({})).not.toThrow();
    });

    it('should validate username if provided', () => {
      const data = {
        username: 'ab',
      };

      expect(() => updateUserSchema.parse(data)).toThrow('Username must be at least 3 characters');
    });
  });

  describe('changePinSchema', () => {
    it('should accept valid PIN change data', () => {
      const validData = {
        currentPin: '1357',
        newPin: '2468',
        confirmNewPin: '2468',
      };

      expect(() => changePinSchema.parse(validData)).not.toThrow();
    });

    it('should reject when new PINs do not match', () => {
      const data = {
        currentPin: '1357',
        newPin: '2468',
        confirmNewPin: '1357',
      };

      expect(() => changePinSchema.parse(data)).toThrow("New PINs don't match");
    });

    it('should reject when new PIN is same as current PIN', () => {
      const data = {
        currentPin: '1357',
        newPin: '1357',
        confirmNewPin: '1357',
      };

      expect(() => changePinSchema.parse(data)).toThrow('New PIN must be different from current PIN');
    });

    it('should validate new PIN complexity', () => {
      const data = {
        currentPin: '1357',
        newPin: '1111',
        confirmNewPin: '1111',
      };

      expect(() => changePinSchema.parse(data)).toThrow('PIN cannot be all the same digit');
    });
  });

  describe('userQuerySchema', () => {
    it('should accept valid query parameters', () => {
      const validQuery = {
        role: 'admin',
        isActive: true,
        search: 'test',
        page: 2,
        limit: 10,
      };

      expect(() => userQuerySchema.parse(validQuery)).not.toThrow();
    });

    it('should use default values for page and limit', () => {
      const query = {};
      const result = userQuerySchema.parse(query);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should coerce string numbers to numbers', () => {
      const query = {
        page: '3',
        limit: '50',
      };

      const result = userQuerySchema.parse(query);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });

    it('should reject invalid page numbers', () => {
      const query = {
        page: 0,
      };

      expect(() => userQuerySchema.parse(query)).toThrow();
    });

    it('should reject limit that is too high', () => {
      const query = {
        limit: 101,
      };

      expect(() => userQuerySchema.parse(query)).toThrow();
    });
  });
});