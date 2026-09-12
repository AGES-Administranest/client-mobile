import React from 'react';
import { Image } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { WelcomeScreen } from '../../../features/welcome';

describe('WelcomeScreen', () => {
  const defaultProps = {
    onCreateAccount: jest.fn(),
    onLogin: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderScreen = async (props = defaultProps) => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<WelcomeScreen {...props} />);
    });
    return renderer;
  };

  it('renders all branding and greeting texts', async () => {
    const renderer = await renderScreen();
    const textNodes = renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children);
    const textContent = JSON.stringify(textNodes);

    expect(textContent).toContain('ADMINISTRANEST');
    expect(textContent).toContain('Anestesia Veterinária');
    expect(textContent).toContain('Seja bem-vindo(a)');
    expect(textContent).toContain('ou');
    expect(textContent).toContain('Criar conta');
    expect(textContent).toContain('Login');
  });

  it('renders the logo image with correct resizeMode', async () => {
    const renderer = await renderScreen();
    const images = renderer.root.findAllByType(Image);

    expect(images.length).toBeGreaterThanOrEqual(1);
    expect(images[0].props.resizeMode).toBe('contain');
    expect(images[0].props.style).toEqual(
      expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number),
      }),
    );
  });

  it('renders both action buttons with accessibility roles and labels', async () => {
    const renderer = await renderScreen();

    const createAccountButton = renderer.root.find(
      node =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel === 'Criar conta',
    );

    const loginButton = renderer.root.find(
      node =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel === 'Login',
    );

    expect(createAccountButton).toBeDefined();
    expect(loginButton).toBeDefined();
  });

  it('calls onCreateAccount when "Criar conta" button is pressed', async () => {
    const onCreateAccount = jest.fn();
    const renderer = await renderScreen({
      ...defaultProps,
      onCreateAccount,
    });

    const createAccountButton = renderer.root.find(
      node =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel === 'Criar conta',
    );

    await act(async () => {
      createAccountButton.props.onPress();
    });

    expect(onCreateAccount).toHaveBeenCalledTimes(1);
  });

  it('calls onLogin when "Login" button is pressed', async () => {
    const onLogin = jest.fn();
    const renderer = await renderScreen({
      ...defaultProps,
      onLogin,
    });

    const loginButton = renderer.root.find(
      node =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel === 'Login',
    );

    await act(async () => {
      loginButton.props.onPress();
    });

    expect(onLogin).toHaveBeenCalledTimes(1);
  });
});
