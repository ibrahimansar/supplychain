import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import Dialog from './Dialog';
import Button from './Button';

const VARIANT_CONFIG = {
  danger: {
    Icon: AlertCircle,
    iconClass: 'text-rose-600',
    iconBg: 'bg-rose-50 ring-rose-100',
    confirmVariant: 'danger',
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: 'text-amber-600',
    iconBg: 'bg-amber-50 ring-amber-100',
    confirmVariant: 'solid',
  },
  info: {
    Icon: Info,
    iconClass: 'text-sky-600',
    iconBg: 'bg-sky-50 ring-sky-100',
    confirmVariant: 'solid',
  },
  success: {
    Icon: CheckCircle,
    iconClass: 'text-teal-600',
    iconBg: 'bg-teal-50 ring-teal-100',
    confirmVariant: 'solid',
  },
};

export default function ConfirmDialog({
  open,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onCancel,
  onConfirm,
  loading = false,
}) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.danger;
  const { Icon, iconClass, iconBg, confirmVariant } = config;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="max-w-md"
      closeOnBackdrop={!loading}
      labelledBy="confirm-dialog-title"
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 h-11 w-11 rounded-2xl ring-1 ${iconBg} flex items-center justify-center`}
          >
            <Icon className={`h-5 w-5 ${iconClass}`} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              id="confirm-dialog-title"
              className="text-[16px] font-semibold tracking-tight text-slate-900 leading-snug"
            >
              {title}
            </h3>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
