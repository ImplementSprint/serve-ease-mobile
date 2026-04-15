import { Children, isValidElement } from 'react';

import { HomeScreen } from '../../src/features/home/screens/HomeScreen';

jest.mock('@config/appConfig', () => ({
  getAppConfig: jest.fn(() => ({
    appName: 'Template Repo Mobile Single',
    environment: 'development',
    apiBaseUrl: 'https://api.example.com',
  })),
}));

describe('HomeScreen', () => {
  it('renders expected root and text content', () => {
    const element = HomeScreen();

    expect(isValidElement(element)).toBe(true);
    expect(element.props.testID).toBe('home-screen-root');

    const children = Children.toArray(element.props.children).filter(isValidElement);
    expect(children).toHaveLength(4);

    const title = children[0];
    const subtitle = children[1];
    const badge = children[2];
    const smokeMarker = children[3];

    expect(title.props.testID).toBe('home-title');
    expect(title.props.children).toBe('Template Repo Mobile Single');
    expect(subtitle.props.children).toBe('Single-root Expo boilerplate (TypeScript-first)');

    const badgeChildren = Children.toArray(badge.props.children).filter(isValidElement);
    expect(badgeChildren).toHaveLength(1);
    expect(badgeChildren[0].props.children).toEqual(['Environment: ', 'development']);

    expect(smokeMarker.props.testID).toBe('maestro-smoke-ready');
    expect(smokeMarker.props.children).toBe('MAESTRO_SMOKE_READY');
  });
});
