import React from 'react';
import { AlertCircle, Lightbulb, Info } from 'lucide-react';
import Dialog, { DialogBody, DialogFooter } from './Dialog';
import Button from './Button';

const TYPE_META = {
  error: {
    Icon: AlertCircle,
    accent: 'bg-rose-50 text-rose-600 ring-rose-100',
    title: 'text-slate-900',
  },
  suggestion: {
    Icon: Lightbulb,
    accent: 'bg-teal-50 text-teal-700 ring-teal-100',
    title: 'text-slate-900',
  },
  info: {
    Icon: Info,
    accent: 'bg-sky-50 text-sky-700 ring-sky-100',
    title: 'text-slate-900',
  },
};

/**
 * Modern alert / info popup used across the app.
 */
export default function CustomPopup({
  open,
  onClose,
  title,
  message,
  type = 'info',
  actions = [],
}) {
  const meta = TYPE_META[type] || TYPE_META.info;
  const { Icon } = meta;

  return (
    <Dialog open={open} onClose={onClose} labelledBy="custom-popup-title" maxWidth="max-w-md">
      <DialogBody className="pt-6">
        <div className="flex flex-col items-center text-center sm:items-start sm:text-start sm:flex-row gap-4">
          <div
            className={`shrink-0 h-12 w-12 rounded-2xl ring-1 flex items-center justify-center ${meta.accent}`}
          >
            <Icon className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="custom-popup-title"
              className={`text-[17px] font-semibold tracking-tight ${meta.title}`}
            >
              {title}
            </h2>
            <div className="mt-2 text-sm text-slate-600 leading-relaxed">{message}</div>
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        {actions.length > 0 ? (
          actions.map((a, i) => (
            <Button
              key={i}
              variant={a.variant || (i === actions.length - 1 ? (type === 'error' ? 'danger' : 'solid') : 'outline')}
              size="sm"
              onClick={a.onClick}
            >
              {a.label}
            </Button>
          ))
        ) : (
          <Button
            variant={type === 'error' ? 'danger' : 'solid'}
            size="sm"
            onClick={onClose}
          >
            Got it
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
