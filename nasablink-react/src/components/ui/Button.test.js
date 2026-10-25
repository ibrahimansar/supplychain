import React from 'react';
import { render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button loading state', () => {
  it('centres the spinner rather than pinning it to one edge', () => {
    render(<Button loading>Save Changes</Button>);
    const overlay = screen.getByTestId('button-spinner');

    expect(overlay).toHaveClass('absolute', 'inset-0', 'flex', 'items-center', 'justify-center');
    // The old bug: spinner positioned against the left edge of the button.
    expect(overlay.className).not.toMatch(/left-\d/);
  });

  it('keeps the label in layout so the button does not change width', () => {
    const { rerender } = render(<Button>Save Changes</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Save Changes');

    rerender(<Button loading>Save Changes</Button>);
    // Still present (so width is unchanged) but not visible.
    expect(screen.getByRole('button')).toHaveTextContent('Save Changes');
    expect(screen.getByText('Save Changes')).toHaveClass('invisible');
  });

  it('marks itself busy and disabled while loading', () => {
    render(<Button loading>Save Changes</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
  });

  it('renders no spinner when idle', () => {
    render(<Button>Save Changes</Button>);
    expect(screen.queryByTestId('button-spinner')).toBeNull();
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
  });
});
