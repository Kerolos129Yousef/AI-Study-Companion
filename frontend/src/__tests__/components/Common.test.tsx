import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoadingSpinner, ProgressBar, ErrorBoundary, FileUpload } from '../../components/Common';

describe('Common components', () => {
  describe('LoadingSpinner', () => {
    it('renders a spinner element', () => {
      const { container } = render(<LoadingSpinner />);

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('supports different sizes', () => {
      const { container: sm } = render(<LoadingSpinner size="sm" />);
      const { container: lg } = render(<LoadingSpinner size="lg" />);

      expect(sm.querySelector('.w-4')).toBeInTheDocument();
      expect(lg.querySelector('.w-12')).toBeInTheDocument();
    });
  });

  describe('ProgressBar', () => {
    it('shows current progress and percentage', () => {
      render(<ProgressBar current={3} total={10} />);

      expect(screen.getByText('3 of 10')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    it('renders a full bar at 100%', () => {
      render(<ProgressBar current={5} total={5} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('applies the correct width style', () => {
      const { container } = render(<ProgressBar current={1} total={4} />);

      const bar = container.querySelector('.bg-blue-600') as HTMLElement;
      expect(bar.style.width).toBe('25%');
    });
  });

  describe('ErrorBoundary', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('shows fallback UI when a window error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      act(() => {
        window.dispatchEvent(new ErrorEvent('error'));
      });

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Please try refreshing the page.')).toBeInTheDocument();
    });
  });

  describe('FileUpload', () => {
    it('calls onFileSelect when a file is chosen', async () => {
      const user = userEvent.setup();
      const onFileSelect = jest.fn();
      const file = new File(['pdf-content'], 'notes.pdf', { type: 'application/pdf' });

      render(<FileUpload onFileSelect={onFileSelect} />);

      const input = document.getElementById('file-input') as HTMLInputElement;
      await user.upload(input, file);

      expect(onFileSelect).toHaveBeenCalledWith(file);
    });

    it('calls onFileSelect when a valid file is dropped', () => {
      const onFileSelect = jest.fn();
      const file = new File(['pdf-content'], 'notes.pdf', { type: 'application/pdf' });

      const { container } = render(<FileUpload onFileSelect={onFileSelect} maxSize={50} />);
      const dropZone = container.firstChild as HTMLElement;

      fireEvent.dragOver(dropZone);
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });

      expect(onFileSelect).toHaveBeenCalledWith(file);
    });

    it('ignores files that exceed the max size on drop', () => {
      const onFileSelect = jest.fn();
      const largeFile = new File(['x'], 'large.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: 51 * 1024 * 1024 });

      const { container } = render(<FileUpload onFileSelect={onFileSelect} maxSize={50} />);
      const dropZone = container.firstChild as HTMLElement;

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [largeFile] },
      });

      expect(onFileSelect).not.toHaveBeenCalled();
    });

    it('shows dragging styles on drag over', () => {
      const { container } = render(<FileUpload onFileSelect={jest.fn()} />);
      const dropZone = container.firstChild as HTMLElement;

      fireEvent.dragOver(dropZone);
      expect(dropZone.className).toContain('border-blue-500');

      fireEvent.dragLeave(dropZone);
      expect(dropZone.className).toContain('border-gray-300');
    });
  });
});