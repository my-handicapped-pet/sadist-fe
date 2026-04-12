import React, { KeyboardEvent, useContext, useEffect, useRef } from 'react';
import { useState } from 'react';
import Uniselector from '../common/Uniselector';
import UserContext from '../../context/UserContext';
import { WiredInput } from '/wired-elements/lib/wired-input';
import GoogleLoginButton from './GoogleLoginButton';
import Or from '../common/Or';
import Icon from '../../icon/Icon';

interface LocalLoginFormState {
  /**
   * display login, sign up, or forgot password form
   */
  form?: 'login' | 'signup' | 'forgot';
  /**
   * display an inline error
   */
  err?: string;
  /**
   * display a message on success
   */
  message?: string;
  /**
   * if user started entering his/her name, therefore it should not be guessed by email
   */
  nameChanged?: boolean;
  /**
   * if user started entering his/her login, therefore it should not be guessed by email
   */
  loginChanged?: boolean;
}

export default function UserLoginForm() {
  const SIGNUP_MESSAGE = 'An email has been ' +
      'sent to confirm your account, log in after confirmation!';

  const [state, setState] = useState<LocalLoginFormState>({ form: undefined });

  // refs to the fields in the login form
  const loginLoginRef = useRef<WiredInput | null>(null);
  const loginPasswordRef = useRef<WiredInput | null>(null);

  // refs to the fields in the sign-up form
  const signupLoginRef = useRef<WiredInput | null>(null);
  const signupPasswordRef = useRef<WiredInput | null>(null);
  const signupConfirmPasswordRef = useRef<WiredInput | null>(null);
  const signupEmailRef = useRef<WiredInput | null>(null);
  const signupDisplayNameRef = useRef<WiredInput | null>(null);
  const signupAvatarRef = useRef<WiredInput | null>(null);

  // refs to the fields in forgot password form
  const forgotPasswordRef = useRef<WiredInput | null>(null);

  const {
    loginLocal, signup, forgotPassword,
    isLogin, isSignup, isForgotPassword
  } = useContext(UserContext);

  useEffect(() => {
    switch (state.form) {
      case 'login':
        loginLoginRef.current?.focus();
        break;
      case 'signup':
        signupEmailRef.current?.focus();
        break;
      case 'forgot':
        forgotPasswordRef.current?.focus();
        break;
    }
  }, [state.form]);

  function doLogin() {
    let err = undefined;
    let login = loginLoginRef.current?.value;
    let password = loginPasswordRef.current?.value;
    if (!login) {
      err = 'Login is required';
    } else {
      if (!password) {
        err = 'Password is required';
      }
    }
    setState({ ...state, err, message: undefined });

    if (login && password && !err) {
      loginLocal(login, password)
          .catch((e: any) => {
            setState({ ...state, err: e.toString(), message: undefined });
          });
    }
  }

  function doSignUp() {
    let err = undefined;
    const email = signupEmailRef.current?.value;
    const name = signupDisplayNameRef.current?.value;
    const avatar = signupAvatarRef.current?.value;
    const login = signupLoginRef.current?.value;
    const password = signupPasswordRef.current?.value;
    const confirmPassword = signupConfirmPasswordRef.current?.value;
    if (!email) {
      err = 'Email is required';
    } else if (!login) {
      err = 'Login is required';
    } else if (!password) {
      err = 'Password is required';
    } else if (!confirmPassword) {
      err = 'Password confirmation is required';
    } else if (password !== confirmPassword) {
      err = 'Password confirmation doesn\'t match';
    }
    setState({ ...state, err, message: undefined });

    if (!err) {
      // TODO 1st step upload avatar and get URL
      signup({
        type: 'local',
        name,
        avatar,
        extra: {
          email,
          login,
          password,
        }
      })
          .then(() => {
            setState({ ...state, err: undefined, message: SIGNUP_MESSAGE,
              form: 'login' });
          })
          .catch((e: any) => {
            setState({ ...state, err: e.toString(), message: undefined });
          });
    }
  }

  function doForgotPassword() {
  // TODO
  }

  function doOnEnter(handler: () => any) {
    return function (e: KeyboardEvent) {
      if (e.keyCode === 13) {
        handler();
      }
    }
  }

  function renderLogin() {
    return <form onKeyDown={doOnEnter(doLogin)}>
      <div className="fieldset">
        <label htmlFor="login_login">Your login</label>
        <wired-input key="email" ref={loginLoginRef} id="login_login"
                     placeholder="Login"/>
        <label htmlFor="login_password">Your password</label>
        <wired-input key="password" ref={loginPasswordRef} id="login_password"
                     type="password"
                     placeholder="Password"/>
      </div>
      {renderMessages()}
      <wired-button key="login" disabled={isLogin} onClick={doLogin}>
        {isLogin && <img className="item" src={Icon.loading} alt="..."/>}Log in
      </wired-button>
    </form>;
  }

  function renderSignUp() {
    return <form onKeyDown={doOnEnter(doSignUp)}>
      <div className="fieldset">
        <label htmlFor="signup_email">Your email address</label>
        <wired-input key="email" ref={signupEmailRef} id="signup_email"
                     placeholder="Email"
                     oninput={() => {
                       const value = signupEmailRef.current?.value;
                       if (value) {
                         const namepart = value.split('@')[0];
                         if (signupLoginRef.current && !state.loginChanged) {
                           signupLoginRef.current.value = namepart;
                         }
                         if (signupDisplayNameRef.current && !state.nameChanged) {
                           signupDisplayNameRef.current.value = namepart;
                           }
                       }
        }}/>
        <label htmlFor="signup_name">Your name (to display on the site)</label>
        <wired-input key="display-name" ref={signupDisplayNameRef} id="signup_name"
                     placeholder="Name" oninput={() => {
                       setState({ ...state, nameChanged: true });
        }}/>
        <label htmlFor="signup_avatar">Your user picture</label>
        <wired-input key="avatar" ref={signupAvatarRef} id="signup_avatar"
                     placeholder="Avatar"
                     type="file"/>
        <label htmlFor="signup_login">Your login</label>
        <wired-input key="login" ref={signupLoginRef} id="signup_login"
                     placeholder="Login" oninput={() => {
                       setState({ ...state, loginChanged: true });
        }}/>
        <label htmlFor="signup_password">Your password</label>
        <wired-input key="enter-password" ref={signupPasswordRef} id="signup_password"
                     type="password" placeholder="Password"/>
        <label htmlFor="signup_confirm_password">Confirm your password</label>
        <wired-input key="cofirm-password" ref={signupConfirmPasswordRef} id="signup_confirm_password"
                     type="password" placeholder="Confirm password"/>
      </div>
      {renderMessages()}
      <wired-button key="signup" disabled={isSignup} onClick={doSignUp}>
        {isSignup && <img className="item" src={Icon.loading} alt="..."/>}
        Sign up
      </wired-button>
    </form>;
  }

  function renderForgotPassword() {
    return '--TODO--';
  }

  function renderForm() {
    switch (state.form) {
      case 'login':
        return renderLogin();
      case 'signup':
        return renderSignUp();
      case 'forgot':
        return renderForgotPassword();
      default:
        return null;
    }
  }

  function renderMessages() {
    // render error or success message depending on the outcome
    return <>
      <span key="error" className="field-error">{state.err}</span>
      <span key="message"><strong>{state.message}</strong></span>
    </>;
  }

  /*by default, we display Googl (and other provider)... buttons
  * */
  return <>
  {!state.form && <>
    {}
    <GoogleLoginButton/>
    <Or/>
  </>}
    {state.form && <Uniselector selected={false} onClick={() => {
      setState({ ...state, form: undefined, err: undefined, message: undefined });
    }}>&lt;&lt;&lt;</Uniselector>}
    <Uniselector selected={state.form === 'login'} onClick={() => {
      setState({ ...state, form: 'login', err: undefined });
    }}>
      Log in with a password
    </Uniselector>
    <Uniselector selected={state.form === 'signup'} onClick={() => {
      setState({ ...state, form: 'signup', err: undefined });
    }}>
      Sign up
    </Uniselector>
    <Uniselector selected={state.form === 'forgot'} onClick={() => {
      setState({ ...state, form: 'forgot', err: undefined });
    }}>
      Forgot password?
    </Uniselector>
    {renderForm()}
  </>;
}