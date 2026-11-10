import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { vi } from 'vitest';

configure({ asyncUtilTimeout: 5000 });

Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test-image') });
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });

