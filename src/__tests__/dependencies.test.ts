import { describe, expect, it } from '@jest/globals';
import deepmerge from 'deepmerge';

describe('deepmerge security patch', () => {
  const payload: Record<string, unknown> = JSON.parse(
    '{"__proto__":{"dependencySecurityRegression":true}}'
  );
  const nullPrototypeTarget: Record<string, unknown> = Object.create(null);

  it.each<[string, object, object]>([
    ['target', payload, {}],
    ['source with a null-prototype target', nullPrototypeTarget, payload],
    ['nested target', { nested: payload }, {}],
    ['array element', [payload], []],
  ])(
    'does not poison the result prototype from %s',
    (_name, target, source) => {
      const result = deepmerge<object>(target, source);
      const check = (value: unknown) => {
        expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
        expect(value).not.toHaveProperty('dependencySecurityRegression');
      };

      if (Array.isArray(result)) {
        result.forEach(check);
      } else if ('nested' in result) {
        check(result.nested);
      } else {
        check(result);
      }

      expect(Object.prototype).not.toHaveProperty(
        'dependencySecurityRegression'
      );
    }
  );

  it('preserves ordinary deep merges, arrays, and enumerable symbols', () => {
    const key = Symbol('config');
    expect(
      deepmerge(
        { nested: { first: true }, values: [1], [key]: { first: true } },
        { nested: { second: true }, values: [2], [key]: { second: true } }
      )
    ).toEqual({
      nested: { first: true, second: true },
      values: [1, 2],
      [key]: { first: true, second: true },
    });
  });
});
