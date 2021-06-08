import {memo} from 'react';
import { Button } from '@material-ui/core';
import { auth, provider, provider2 } from './firebase';
import './Login.css'

function Login() {
    const signIn = () => {
        auth.signInWithRedirect(provider).catch(e => alert(e.message))
    }
    const signIn2 = () => {
        auth.signInWithRedirect(provider2).catch(e => alert(e.message))
    }

    return (
        <div className="login">
            <div className="login__container">
                <div className="login__text">
                    <h1>Sign-in to Cloud Health Chat</h1>
                </div>

                <Button onClick={signIn}>
                    Sign in with Google
                </Button>
                <Button onClick={signIn2}>
                    Sign in with facebook
                </Button>
            </div>
        </div>
    )
}

export default memo(Login)