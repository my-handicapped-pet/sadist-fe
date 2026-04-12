import {
  signIn as loginGoogle,
  signOut as logoutGoogle
} from "../helper/gapi-helper";
import {
  UserAction,
  UserActionType
} from '../reducer/userContextValue-reducer';
import { User, UserContextData, UserContextValue } from "../model/user";
import { API } from '../helper/api-helper';


/**
 * Extend a user context value by methods that allow log in, log out etc.
 * This object methods will be aware of consistence of the application
 * state by dispatching needed actions
 * How to use:
 * - call {@link useReducer} to generate current user context value
 * state and dispatcher function
 * - pass current state and the dispatcher to this hook
 * - pass resulting value to the context
 * - use {@link useContext} and call user methods when needed
 * @param userContextData {UserContextData} returned by useReducer
 * @param dispatchUserContextValue {function(UserAction):void} returned by useReducer
 */
export function useUserContextValue(userContextData: UserContextData, dispatchUserContextValue: (a: UserAction) => void): UserContextValue {
  return {
    ...userContextData,
    async whoami(): Promise<User> {
      dispatchUserContextValue({ type: UserActionType.WHOAMI_START });
      try {
        const user = await whoami();
        dispatchUserContextValue({ type: UserActionType.WHOAMI_SUCCCESS, user });
        return user;
      } catch (e) {
        dispatchUserContextValue({ type: UserActionType.WHOAMI_FAIL });
        throw e;
      }
    },

    async loginGoogle(): Promise<User> {
      dispatchUserContextValue({ type: UserActionType.LOGIN_START });
      try {
        const user = await loginGoogle();
        const user_1 = await loginInternal(user);
        dispatchUserContextValue({ type: UserActionType.LOGIN_SUCCESS, user: user_1 });
        return user_1;
      } catch (e) {
        dispatchUserContextValue({ type: UserActionType.LOGIN_FAIL });
        throw e;
      }
    },

    async loginLocal(login: string, password: string): Promise<User> {
      dispatchUserContextValue({ type: UserActionType.LOGIN_START });
      try {
        const user = await loginInternal({
          type: 'local',
          extra: { login, password }
        });
        dispatchUserContextValue({ type: UserActionType.LOGIN_SUCCESS, user });
        return user;
      } catch (e) {
        dispatchUserContextValue({ type: UserActionType.LOGIN_FAIL });
        throw e;
      }
    },

    async logout(): Promise<User> {
      dispatchUserContextValue({ type: UserActionType.LOGOUT_START });
      try {
        if (userContextData.user.type === 'google') {
          await logoutGoogle();
        }
        const user = await logout();
        dispatchUserContextValue({ type: UserActionType.LOGOUT_SUCCESS, user });
        return user;
      } catch (e) {
        dispatchUserContextValue({ type: UserActionType.LOGOUT_FAIL });
        throw e;
      }
    },

    async signup(user: User & { type: "local" }): Promise<User> {
      dispatchUserContextValue({ type: UserActionType.SIGNUP_START });
      try {
        const user_1 = await signup(user);
        dispatchUserContextValue({ type: UserActionType.SIGNUP_SUCCESS });
        return user_1;
      } catch (e) {
        dispatchUserContextValue({ type: UserActionType.SIGNUP_FAIL });
        throw e;
      }
    },

    async forgotPassword(login: string): Promise<void> {
      dispatchUserContextValue({ type: UserActionType.FORGOT_PASSWORD_START });
      try {
        await forgotPassword(login);
        dispatchUserContextValue({ type: UserActionType.FORGOT_PASSWORD_SUCCESS });
      } catch (e) {
        dispatchUserContextValue({ type: UserActionType.FORGOT_PASSWORD_FAIL });
        throw e;
      }
    },

    openLoginDialog() {
      dispatchUserContextValue({ type: UserActionType.LOGIN_DIALOG_OPEN });
    },

    closeLoginDialog() {
      dispatchUserContextValue({ type: UserActionType.LOGIN_DIALOG_CANCEL });
    },
  }
}

/**
 * retrieve current user from our application
 */
function whoami(): Promise<User> {
  return API.get('/user/whoami').then(data => data.user);
}

/**
 * log in to our own application
 */
function loginInternal(user: User): Promise<User> {
  return API.post('/user/login', { user }).then(data => data.user);
}

/**
 * log out from our own application
 */
function logout(): Promise<User> {
  return API.post('/user/logout').then(data => data.user);
}

/**
 * sign up to our application
 * @param user user fields to signup
 */
function signup(user: User & { type: "local" }): Promise<User> {
  return API.post('/user/signup', { user }).then(data => data.user);
}

/**
 * trigger "forgot password" logic (sending an email with the reset link)
 * @param login login or email
 */
function forgotPassword(login: string): Promise<void> {
  return API.post('/user/forgot-password', { login });
}
