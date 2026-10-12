import { describe, it, expect } from 'vitest';
import {
  computeChecksum,
  serializeStateToHash,
  deserializeHashWithVerification,
} from '../codec';
import { DatabaseState } from '../../types/database';

describe('Codec & Checksum Engine', () => {
  const sampleState: DatabaseState = {
    version: 1,
    id: 'ws_test_123',
    title: 'Testing Engine',
    tables: [
      {
        id: 't_main',
        name: 'Customers',
        fields: [
          { id: 'f1', name: 'Name', type: 'text' },
          { id: 'f2', name: 'Score', type: 'number' },
          { id: 'f3', name: 'Verified', type: 'checkbox' },
          { id: 'f4', name: 'Tag', type: 'select', options: ['A', 'B'] },
        ],
        rows: [
          { id: 'r1', f1: 'Alice', f2: 95, f3: true, f4: 'A' },
          { id: 'r2', f1: 'Bob', f2: 80, f3: false, f4: 'B' },
        ],
      },
    ],
    views: [
      {
        id: 'v_grid',
        tableId: 't_main',
        name: 'All Customers',
        type: 'table',
      },
    ],
    activeViewId: 'v_grid',
    updatedAt: 1728000000000,
  };

  it('computes deterministic 8-char hex checksums', () => {
    const cs1 = computeChecksum('hello world');
    const cs2 = computeChecksum('hello world');
    const cs3 = computeChecksum('hello world!');

    expect(cs1).toHaveLength(8);
    expect(cs1).toBe(cs2);
    expect(cs1).not.toBe(cs3);
  });

  it('serializes and deserializes state with full fidelity', async () => {
    const hash = await serializeStateToHash(sampleState);
    expect(hash).toContain('.k:');

    const result = await deserializeHashWithVerification(hash);
    expect(result.isValidChecksum).toBe(true);
    expect(result.isTruncated).toBe(false);
    expect(result.state).not.toBeNull();
    expect(result.state?.title).toBe('Testing Engine');
    expect(result.state?.tables[0].rows).toHaveLength(2);
    expect(result.state?.tables[0].rows[0].f1).toBe('Alice');
  });

  it('detects tampering or corruption via checksum mismatch', async () => {
    const hash = await serializeStateToHash(sampleState);
    // Tamper with the payload part before .k:
    const tampered = hash.slice(0, 10) + 'X' + hash.slice(11);

    const result = await deserializeHashWithVerification(tampered);
    expect(result.isValidChecksum).toBe(false);
    expect(result.isTruncated).toBe(true);
    expect(result.state).toBeNull();
  });

  it('detects truncated URLs when trailing characters are missing', async () => {
    const hash = await serializeStateToHash(sampleState);
    // Chop off the last 5 characters
    const chopped = hash.slice(0, -5);

    const result = await deserializeHashWithVerification(chopped);
    expect(result.isValidChecksum).toBe(false);
    expect(result.isTruncated).toBe(true);
    expect(result.state).toBeNull();
  });

  it('handles invalid or empty hash strings gracefully', async () => {
    const emptyResult = await deserializeHashWithVerification('');
    expect(emptyResult.state).toBeNull();

    const garbageResult = await deserializeHashWithVerification('invalid_string_without_data');
    expect(garbageResult.state).toBeNull();
  });
});
