import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import useModalA11y from './useModalA11y';

const Modal = ({ onClose }) => {
  const ref = useModalA11y({ onClose });
  return (
    <div ref={ref} data-testid="modal">
      <button>first</button>
      <input aria-label="middle" />
      <button>last</button>
    </div>
  );
};

const Harness = ({ open, onClose }) => (
  <div>
    <button>outside-before</button>
    {open && <Modal onClose={onClose} />}
    <button>outside-after</button>
  </div>
);

describe('useModalA11y', () => {
  it('moves focus into the dialog on open', () => {
    render(<Harness open onClose={() => {}} />);
    expect(screen.getByTestId('modal')).toHaveFocus();
  });

  it('wraps Tab from the last focusable back to the first', () => {
    render(<Harness open onClose={() => {}} />);
    const last = screen.getByText('last');
    last.focus();
    fireEvent.keyDown(screen.getByTestId('modal'), { key: 'Tab' });
    expect(screen.getByText('first')).toHaveFocus();
  });

  it('wraps Shift+Tab from the first focusable to the last', () => {
    render(<Harness open onClose={() => {}} />);
    screen.getByText('first').focus();
    fireEvent.keyDown(screen.getByTestId('modal'), { key: 'Tab', shiftKey: true });
    expect(screen.getByText('last')).toHaveFocus();
  });

  it('closes on Escape', () => {
    const onClose = jest.fn();
    render(<Harness open onClose={onClose} />);
    fireEvent.keyDown(screen.getByTestId('modal'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restores focus to whatever was focused before opening', () => {
    const { rerender } = render(<Harness open={false} onClose={() => {}} />);
    const trigger = screen.getByText('outside-before');
    trigger.focus();
    expect(trigger).toHaveFocus();

    rerender(<Harness open onClose={() => {}} />);
    expect(screen.getByTestId('modal')).toHaveFocus();

    rerender(<Harness open={false} onClose={() => {}} />);
    expect(trigger).toHaveFocus();
  });

  it('locks page scroll while open and releases it on close', () => {
    const { rerender } = render(<Harness open onClose={() => {}} />);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Harness open={false} onClose={() => {}} />);
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
