/**
 * Global test setup — runs before every test file.
 * Mocks the Prisma client and Redis cache so tests are fully isolated.
 */
import { vi } from 'vitest';

// Ensure test environment
process.env.NODE_ENV = 'test';

// Silence logger output during tests
vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
