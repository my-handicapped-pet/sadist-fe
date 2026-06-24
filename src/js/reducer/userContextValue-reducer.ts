import { User, UserContextData } from "../model/user";

export const defaultUserContextData: UserContextData = {
  user: { type: 'anon', },
  loading: false,
  loaded: false,
  isLogin: false,
  isLogout: false,
  isSignup: false,
  isForgotPassword: false,
  isLoginDialogOpen: false,
}

export function reduceUserContextData(data: UserContextData, action: UserAction): UserContextData {
  switch (action.type) {
    case UserActionType.WHOAMI_START:
      return { ...data, loading: true };
    case UserActionType.WHOAMI_SUCCCESS:
      return { ...data, user: action.user!, loading: false, loaded: true };
    case UserActionType.WHOAMI_FAIL:
      return { ...data, loading: false };
    case UserActionType.LOGIN_DIALOG_OPEN:
      return { ...data, isLoginDialogOpen: true };
    case UserActionType.LOGIN_DIALOG_CANCEL:
      return { ...data, isLoginDialogOpen: false };
    case UserActionType.LOGIN_START:
      return { ...data, isLogin: true };
    case UserActionType.LOGIN_SUCCESS:
      return { ...data, user: action.user!, isLogin: false, isLoginDialogOpen: false };
    case UserActionType.LOGIN_FAIL:
      return { ...data, isLogin: false };
    case UserActionType.LOGOUT_START:
      return { ...data, isLogout: true };
    case UserActionType.LOGOUT_SUCCESS:
      return { ...data, user: action.user!, isLogout: false };
    case UserActionType.LOGOUT_FAIL:
      return { ...data, isLogout: false };
    case UserActionType.SIGNUP_START:
      return { ...data, isSignup: true };
    case UserActionType.SIGNUP_SUCCESS:
    case UserActionType.SIGNUP_FAIL:
      return { ...data, isSignup: false };
    case UserActionType.FORGOT_PASSWORD_START:
      return { ...data, isForgotPassword: true };
    case UserActionType.FORGOT_PASSWORD_SUCCESS:
    case UserActionType.FORGOT_PASSWORD_FAIL:
      return { ...data, isForgotPassword: false };
  }
  console.log(`The action ${action.type} cannot be dispatched, stay with the same state`);
  return data;
}

export enum UserActionType {
  WHOAMI_START,
  WHOAMI_SUCCCESS,
  WHOAMI_FAIL,
  LOGIN_DIALOG_OPEN,
  LOGIN_DIALOG_CANCEL,
  LOGIN_START,
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  LOGOUT_START,
  LOGOUT_SUCCESS,
  LOGOUT_FAIL,
  SIGNUP_START,
  SIGNUP_SUCCESS,
  SIGNUP_FAIL,
  FORGOT_PASSWORD_START,
  FORGOT_PASSWORD_SUCCESS,
  FORGOT_PASSWORD_FAIL,
}

export interface UserAction {
  type: UserActionType,
  user?: User,
}