import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExampleComponent from '../ExampleComponent';

describe('ExampleComponent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Happy Path Tests
  describe('Happy Path', () => {
    it('renders with default props', () => {
      render(<ExampleComponent />);
      expect(screen.getByRole('status')).toHaveTextContent('Count: 0');
      expect(screen.getByRole('button', { name: 'Click me' })).toBeEnabled();
    });

    it('increments count on click', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ExampleComponent />);
      
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      expect(screen.getByRole('status')).toHaveTextContent('Loading...');
      
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Count: 1');
      });
    });

    it('calls onCountChange when count changes', async () => {
      const onCountChange = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ExampleComponent onCountChange={onCountChange} />);
      
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(onCountChange).toHaveBeenCalledWith(1);
      });
    });

    it('resets count to initial value', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ExampleComponent initialCount={5} />);
      
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Count: 6');
      });
      
      await user.click(screen.getByRole('button', { name: 'Reset' }));
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Count: 5');
      });
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    it('handles custom initial count', () => {
      render(<ExampleComponent initialCount={5} />);
      expect(screen.getByRole('status')).toHaveTextContent('Count: 5');
    });

    it('handles custom max count', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ExampleComponent maxCount={2} initialCount={1} />);
      // Click to reach max
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      // Click again to exceed max
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Count cannot exceed 2');
      });
    });

    it('handles disabled state', () => {
      render(<ExampleComponent disabled />);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeDisabled();
    });

    it('handles custom label', () => {
      render(<ExampleComponent label="Custom Label" />);
      expect(screen.getByRole('button', { name: 'Custom Label' })).toBeInTheDocument();
    });
  });

  // Error Handling
  describe('Error Handling', () => {
    it('shows loading state during async operation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ExampleComponent />);
      
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      expect(screen.getByRole('status')).toHaveTextContent('Loading...');
      
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Count: 1');
      });
    });

    it('handles async error', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ExampleComponent simulateAsyncError />);
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      jest.advanceTimersByTime(100);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to update count');
      });
    });
  });

  // Accessibility
  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<ExampleComponent />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByRole('button', { name: 'Click me' })).toHaveAttribute('aria-label', 'Click me');
    });

    it('announces errors to screen readers', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ExampleComponent maxCount={0} />);
      
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Count cannot exceed 0');
      });
    });
  });

  // State Management
  describe('State Management', () => {
    it('maintains state between renders', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const { rerender } = render(<ExampleComponent />);
      
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Count: 1');
      });
      
      rerender(<ExampleComponent />);
      expect(screen.getByRole('status')).toHaveTextContent('Count: 1');
    });

    it('resets error state when count is valid', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ExampleComponent maxCount={1} />);
      
      // Exceed max count
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      jest.advanceTimersByTime(100);
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Count cannot exceed 1');
      });
      
      // Reset to valid count
      await user.click(screen.getByRole('button', { name: 'Reset' }));
      
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  // Race Conditions
  describe('Race Conditions', () => {
    it('handles multiple rapid clicks', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ExampleComponent />);
      
      // Click multiple times rapidly
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Count: 1');
      });
    });

    it('handles reset during async operation', async () => {
      // Use real timers for this test
      jest.useRealTimers();
      const user = userEvent.setup();
      render(<ExampleComponent />);
      
      // Start async increment
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      // Immediately reset
      await user.click(screen.getByRole('button', { name: 'Reset' }));
      
      // Wait for both operations to complete
      await waitFor(() => {
        const statusText = screen.getByRole('status').textContent;
        expect(['Count: 0', 'Count: 1']).toContain(statusText);
      }, { timeout: 200 });
      
      // Switch back to fake timers for other tests
      jest.useFakeTimers();
    });

    it('handles unmount during async operation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const { unmount } = render(<ExampleComponent />);
      
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      unmount();
      jest.advanceTimersByTime(100);
      
      // No errors should be thrown
    });
  });

  // Props Changes
  describe('Props Changes', () => {
    it('handles maxCount prop change', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const { rerender } = render(<ExampleComponent maxCount={5} />);
      
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      jest.advanceTimersByTime(100);
      
      rerender(<ExampleComponent maxCount={1} />);
      
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Count cannot exceed 1');
      });
    });

    it('handles disabled prop change', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const { rerender } = render(<ExampleComponent />);
      
      rerender(<ExampleComponent disabled />);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeDisabled();
      
      rerender(<ExampleComponent disabled={false} />);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeEnabled();
    });
  });

  // Error Recovery
  describe('Error Recovery', () => {
    it('recovers from async error', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const { rerender } = render(<ExampleComponent simulateAsyncError />);
      
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to update count');
      });
      
      rerender(<ExampleComponent />);
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Count: 1');
      });
    });

    it('handles error state persistence', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const { rerender } = render(<ExampleComponent maxCount={1} />);
      
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      jest.advanceTimersByTime(100);
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Count cannot exceed 1');
      });
      
      rerender(<ExampleComponent maxCount={1} />);
      expect(screen.getByRole('alert')).toHaveTextContent('Count cannot exceed 1');
    });
  });

  // Accessibility Edge Cases
  describe('Accessibility Edge Cases', () => {
    it('handles keyboard navigation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ExampleComponent />);
      
      screen.getByRole('button', { name: 'Click me' }).focus();
      await user.keyboard('{Enter}');
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Count: 1');
      });
    });

    it('announces loading state changes', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ExampleComponent />);
      
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      expect(screen.getByRole('status')).toHaveTextContent('Loading...');
      
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Count: 1');
      });
    });
  });
}); 