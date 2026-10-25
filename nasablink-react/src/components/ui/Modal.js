import React from 'react';
import Dialog, { DialogHeader, DialogBody } from './Dialog';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth={maxWidth}>
      <DialogHeader title={title} onClose={onClose}>
        {title}
      </DialogHeader>
      <DialogBody>
        {children}
      </DialogBody>
    </Dialog>
  );
};

export default Modal;