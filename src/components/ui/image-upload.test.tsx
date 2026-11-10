import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImageUpload } from './image-upload';

describe('ImageUpload', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('selects, previews and clears an image', async () => {
    const user = userEvent.setup();
    const onFileChange = vi.fn();
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    const view = render(<ImageUpload file={null} onFileChange={onFileChange} />);
    await user.upload(screen.getByLabelText('Image'), file);
    expect(onFileChange).toHaveBeenCalledWith(file);
    view.rerender(<ImageUpload file={file} onFileChange={onFileChange} />);
    expect(await screen.findByAltText('Uploaded image preview')).toHaveAttribute('src', 'blob:test-image');
    await user.click(screen.getByRole('button', { name: 'Remove selection' }));
    expect(onFileChange).toHaveBeenLastCalledWith(null);
    view.rerender(<ImageUpload file={null} onFileChange={onFileChange} />);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-image');
    await user.upload(screen.getByLabelText('Image'), file);
    expect(onFileChange).toHaveBeenCalledTimes(3);
  });

  it('opens the file picker from the drop area without reopening it for actions or while disabled', async () => {
    const user = userEvent.setup();
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    const onFileChange = vi.fn();
    const view = render(<ImageUpload file={file} onFileChange={onFileChange} />);
    const input = screen.getByLabelText('Image');
    const open = vi.spyOn(input, 'click');
    await user.click(screen.getByText('Selected: photo.png'));
    expect(open).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Change image' }));
    expect(open).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: 'Remove selection' }));
    expect(open).toHaveBeenCalledTimes(2);
    expect(onFileChange).toHaveBeenCalledWith(null);
    view.rerender(<ImageUpload file={file} onFileChange={onFileChange} isUploading />);
    await user.click(screen.getByText('Selected: photo.png'));
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('rejects unsupported dropped files and disables actions while uploading', () => {
    const onFileChange = vi.fn();
    const onUpload = vi.fn();
    const view = render(<ImageUpload onFileChange={onFileChange} onUpload={onUpload} />);
    fireEvent.drop(screen.getByText(/Drag and drop/).parentElement!.parentElement!, {
      dataTransfer: { files: [new File(['x'], 'bad.gif', { type: 'image/gif' })] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Unsupported file type');
    expect(onFileChange).toHaveBeenCalledWith(null);
    view.rerender(<ImageUpload onFileChange={onFileChange} onUpload={onUpload} isUploading progress={42} />);
    expect(screen.getByRole('progressbar', { name: 'Uploading image: 42%' })).toHaveValue(42);
    expect(screen.getByRole('button', { name: 'Uploading 42%…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Browse files' })).toBeDisabled();
  });
});
