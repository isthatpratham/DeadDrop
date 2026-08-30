import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Download } from './Download';
import { getFileInfoAPI } from '../services/api';

vi.mock('../services/api', () => ({
  getFileInfoAPI: vi.fn(),
  downloadFileAPI: vi.fn(),
}));

const renderDownload = () =>
  render(
    <MemoryRouter initialEntries={['/download/11111111-1111-4111-8111-111111111111']}>
      <Routes>
        <Route path="/download/:id" element={<Download />} />
      </Routes>
    </MemoryRouter>
  );

describe('Download page', () => {
  beforeEach(() => {
    vi.mocked(getFileInfoAPI).mockReset();
  });

  it('shows the password form before downloading when the file is protected', async () => {
    vi.mocked(getFileInfoAPI).mockResolvedValue({
      status: 'ok',
      file: {
        id: '11111111-1111-4111-8111-111111111111',
        originalName: 'secret.txt',
        size: 128,
        expiresAt: '2026-09-01T12:00:00.000Z',
        maxDownloads: 2,
        downloadCount: 0,
        hasPassword: true,
        createdAt: '2026-08-31T12:00:00.000Z',
      },
    });

    renderDownload();

    expect(await screen.findByText(/password protected/i)).toBeInTheDocument();
    expect(screen.getByText(/secret.txt/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download file/i })).not.toBeInTheDocument();
  });

  it('shows the expired state when metadata returns 410', async () => {
    vi.mocked(getFileInfoAPI).mockResolvedValue({ status: 'expired' });

    renderDownload();

    expect(await screen.findByText(/link expired/i)).toBeInTheDocument();
  });
});
