import { noop } from '@utils/noop';

describe('noop', () => {
  it('returns undefined and does not throw', () => {
    expect(() => noop()).not.toThrow();
    expect(noop()).toBeUndefined();
  });
});
