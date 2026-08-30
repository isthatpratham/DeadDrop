import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Upload } from './Upload';

vi.mock('../services/api', () => ({
  uploadFileAPI: vi.fn(),
}));

const renderUpload = () =>
  render(
    <MemoryRouter>
      <Upload />
    </MemoryRouter>
  );

describe('Upload accessibility', () => {
  it('lets keyboard users activate the file picker', async () => {
    const user = userEvent.setup();
    renderUpload();

    const dropzone = screen.getByRole('button', { name: /choose a file to upload/i });
    dropzone.focus();
    expect(dropzone).toHaveFocus();

    const input = document.getElementById('file-upload') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');
    await user.keyboard('{Enter}');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('announces an oversized-file error with role=alert', async () => {
    const user = userEvent.setup();
    renderUpload();

    const input = document.getElementById('file-upload') as HTMLInputElement;
    const huge = new File(['x'], 'huge.txt', { type: 'text/plain' });
    Object.defineProperty(huge, 'size', { value: 11 * 1024 * 1024 });
    await user.upload(input, huge);

    expect(await screen.findByRole('alert')).toHaveTextContent(/10MB limit/i);
  });
});
