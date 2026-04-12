export type UserType = 'anon' | 'local' | 'google';

export interface User {
    type: UserType;
    name?: string;
    avatar?: string;
    extra?: any;
}

export interface UserContextData {
    /**
     * current user of the app
     */
    user: User;

    /**
     * if loading of the current user in progress
     */
    loading: boolean;

    /**
     * if loading of the current user is finished
     */
    loaded: boolean;

    /**
     * if login in progress
     */
    isLogin: boolean;

    /**
     * if logout in progress
     */
    isLogout: boolean;

    /**
     * if signup is in progress
     */
    isSignup: boolean;

    /**
     * if forgot password is in progress
     */
    isForgotPassword: boolean;

    /**
     * if login dialog is shown to the user
     */
    isLoginDialogOpen: boolean;
}

export interface UserContextValue extends UserContextData {
    whoami(): Promise<User>;
    loginGoogle(): Promise<User>;
    loginLocal(login: string, password: string): Promise<User>;
    logout(): Promise<User>;
    signup(user: User & { type: 'local' }): Promise<User>;
    forgotPassword(login: string): Promise<void>;
    openLoginDialog(): void;
    closeLoginDialog(): void;
}