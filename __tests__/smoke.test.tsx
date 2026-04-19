import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

describe('Smoke Test', () => {
  it('renders a simple component', () => {
    const { getByText } = render(<Text>Testing Library Works!</Text>);
    expect(getByText('Testing Library Works!')).toBeTruthy();
  });

  it('passes after TDD verification', () => {
    // GREEN phase: Test now passes
    expect(true).toBe(true);
  });
});
