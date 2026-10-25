import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Dialog, { DialogBody, DialogFooter } from './ui/Dialog';
import Button from './ui/Button';

const DeletePersonConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  person,
  descendantCount = 0,
}) => {
  if (!person) return null;

  return (
    <Dialog open={open} onClose={onClose} labelledBy="delete-person-title" maxWidth="max-w-md">
      <DialogBody className="pt-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 h-11 w-11 rounded-2xl bg-rose-50 ring-1 ring-rose-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-rose-600" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 id="delete-person-title" className="text-[16px] font-semibold tracking-tight text-slate-900">
              Delete person
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
              This permanently removes the person and all descendants from the family tree. This cannot be undone.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Name</span>
            <span className="font-medium text-slate-900 text-end">{person.name}</span>
          </div>
          {person.arabicName && (
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Arabic name</span>
              <span className="font-medium text-slate-900 arabic-text text-end" dir="rtl">
                {person.arabicName}
              </span>
            </div>
          )}
          {descendantCount > 0 && (
            <div className="flex justify-between gap-3 pt-2 border-t border-slate-200">
              <span className="text-rose-600 font-medium">Descendants affected</span>
              <span className="font-semibold text-rose-700 tabular-nums">{descendantCount}</span>
            </div>
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" size="sm" onClick={onConfirm}>
          Delete permanently
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

export default DeletePersonConfirmDialog;
