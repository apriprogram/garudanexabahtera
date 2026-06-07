import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App';

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders navbar element', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    // Should render something - just checking it mounts
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });
});