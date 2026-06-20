import React, { useContext, useEffect, useRef } from 'react';
import Loader from '../common/Loader';
import anon from '~/img/anon.png';
import Dropdown, { DropdownElement } from '../common/Dropdown';
import UserLoginDialog from './UserLoginDialog';
import ErrorDialog from '../common/ErrorDialog';
import UserContext from '../../context/UserContext';
import { isVal } from '../../helper/wired-helper';

const UserDropdown = () => {
  const userContext = useContext(UserContext);
  const dropdownRef = useRef<DropdownElement | null>(null);

  const {
    user, loading, loaded, isLogin, isLogout, isLoginDialogOpen,
    whoami, logout, openLoginDialog, closeLoginDialog
  } = userContext;

  useEffect(() => {
    if (!loaded) {
      whoami();
    }
  }, [loaded]);

  const onLogin = () => {
    openLoginDialog();
    dropdownRef.current!.collapse();
  }

  const onLogout = () => {
    logout().catch(e => ErrorDialog.raise(e.toString()));
    dropdownRef.current!.collapse();
  }

  const onMenu = (event: CustomEvent) => {
    const value = event.detail.selected;
    switch (value) {
      case 'login':
        onLogin();
        break;
      case 'logout':
        onLogout();
        break;
    }
  }

  return <>
    <UserLoginDialog
        open={isVal(isLoginDialogOpen)}
        onCancel={closeLoginDialog}
    />
    <Dropdown
        ref={dropdownRef}
        className="user-dropdown"
        toggle={
          <div className="user-dropdown-icon">
            <Loader loading={loading || isLogin || isLogout}/>
            <img
                src={user.avatar || anon}
                alt={user.name || 'anon'}
            />
          </div>
        }
        content={
          <div className="user-menu">
            <wired-listbox onselected={onMenu}>
              {user.type === 'anon' ?
                  <>
                    <wired-item value="login">Login</wired-item>
                  </> :
                  <>
                    <wired-item value="logout">Logout</wired-item>
                  </>
              }
            </wired-listbox>
          </div>
        }
    />
  </>
}

export default UserDropdown;
