import React from 'react';
import Dialog from '../common/Dialog';
import UserLoginForm from './UserLoginForm';

interface UserLoginDialogProps {
  open: boolean | undefined;
  onCancel: () => any;
}

const UserLoginDialog = ({ open, onCancel }: UserLoginDialogProps) => {

  return <Dialog className="login-dialog" open={open} onClose={onCancel}>
    <span className="hint-title">Why to log in?</span>
    <p>Login allows you to upload private data sheets, manage sheets access, and
      many many more</p>
    <UserLoginForm></UserLoginForm>
  </Dialog>
}

export default UserLoginDialog;
