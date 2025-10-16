import { useState, useEffect, useRef } from 'react';

interface Props {
  initialCount?: number;
  maxCount?: number;
  onCountChange?: (count: number) => void;
  disabled?: boolean;
  label?: string;
  // For testing only
  simulateAsyncError?: boolean;
}

export default function ExampleComponent({
  initialCount = 0,
  maxCount = 10,
  onCountChange,
  disabled = false,
  label = 'Click me',
  simulateAsyncError = false
}: Props) {
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [asyncError, setAsyncError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // Derived error state - always correct
  const error = asyncError || (count >= maxCount ? `Count cannot exceed ${maxCount}` : null);

  const handleClick = async () => {
    if (disabled || isLoading) return;
    if (count >= maxCount) {
      setAsyncError(`Count cannot exceed ${maxCount}`);
      return;
    }

    // Cancel any pending operation
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setAsyncError(null);
    setIsLoading(true);

    try {
      await new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject(new Error('Operation aborted'));
          return;
        }

        // Use microtask to ensure abort is processed
        queueMicrotask(() => {
          if (signal.aborted) {
            reject(new Error('Operation aborted'));
            return;
          }

          const timeoutId = setTimeout(() => {
            if (signal.aborted) {
              reject(new Error('Operation aborted'));
              return;
            }
            if (simulateAsyncError) {
              reject(new Error('Failed to update count'));
            } else {
              resolve(true);
            }
          }, 100);

          signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Operation aborted'));
          });
        });
      });

      if (!mountedRef.current || signal.aborted) return;

      setCount(prev => {
        if (signal.aborted) return prev;
        const updated = prev + 1;
        onCountChange?.(updated);
        return updated;
      });
      setAsyncError(null);
    } catch (err) {
      if (!mountedRef.current || signal.aborted) return;
      setAsyncError(err instanceof Error ? err.message : 'Failed to update count');
    } finally {
      if (!mountedRef.current || signal.aborted) return;
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    abortControllerRef.current?.abort();
    setCount(initialCount);
    setAsyncError(null);
    setIsLoading(false);
    onCountChange?.(initialCount);
  };

  return (
    <div data-testid="example-component">
      <h1>Example Component</h1>
      <div role="status" aria-live="polite">
        {isLoading ? 'Loading...' : `Count: ${count}`}
      </div>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        aria-label={label}
      >
        {label}
      </button>
      <button
        onClick={handleReset}
        disabled={disabled || isLoading}
        aria-label="Reset"
      >
        Reset
      </button>
    </div>
  );
} 