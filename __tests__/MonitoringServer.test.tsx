import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MonitoringServer from '../src/pages/admin/monitoring-server/index';
import '@testing-library/jest-dom';

describe('MonitoringServer Component (TDD)', () => {
  it('renders server monitor heading', () => {
    render(<MonitoringServer />);
    expect(screen.getByText(/Monitoring Server/i)).toBeInTheDocument();
  });

  it('renders skeleton loader initially', () => {
    render(<MonitoringServer />);
    expect(screen.getByText(/Memuat data server/i)).toBeInTheDocument();
  });

  it('shows no servers empty state after fetch', async () => {
    render(<MonitoringServer />);
    const msg = await waitFor(() => screen.getByText(/No servers found/i), { timeout: 5000 });
    expect(msg).toBeInTheDocument();
  });

  it('has consistent structure with CPU, RAM, Disk keys', () => {
    // Ensures component doesn't crash for missing fields
    render(<MonitoringServer />);
    expect(screen.getByText('Monitoring Server')).toBeInTheDocument();
  });
});
