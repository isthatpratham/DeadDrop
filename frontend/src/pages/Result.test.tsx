import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Result } from './Result';
import { getFileInfoAPI } from '../services/api';

vi.mock('../services/api', () => ({
  getFileInfoAPI: vi.fn(),
}));

const renderResult = () =>
  render(
    <MemoryRouter initialEntries={['/result/11111111-1111-4111-8111-111111111111']}>
      <Routes>
        <Route path="/result/:id" element={<Result />} />
      </Routes>
    </MemoryRouter>
  );

describe('Result page', () => {
  beforeEach(() => {
    vi.mocked(getFileInfoAPI).mockReset();
  });

  it('shows metadata from the file info endpoint', async () => {
    vi.mocked(getFileInfoAPI).mockResolvedValue({
      status: 'ok',
      file: {
        id: '11111111-1111-4111-8111-111111111111',
        originalName: 'notes.txt',
        size: 2 * 1024 * 1024,
        expiresAt: '2026-09-01T12:00:00.000Z',
        maxDownloads: 3,
        downloadCount: 1,
        hasPassword: false,
        createdAt: '2026-08-31T12:00:00.000Z',
      },
    });

    renderResult();

    expect(await screen.findByText(/notes.txt/)).toBeInTheDocument();
    expect(screen.getByText(/2 remaining/)).toBeInTheDocument();
    expect(screen.getByText(/private, expiring link/i)).toBeInTheDocument();
  });

  it('shows the expired state when metadata returns 410', async () => {
    vi.mocked(getFileInfoAPI).mockResolvedValue({ status: 'expired' });

    renderResult();

    expect(await screen.findByText(/link expired/i)).toBeInTheDocument();
  });
});
