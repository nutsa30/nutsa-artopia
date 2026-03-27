import React from 'react'
import styles from "./Auth.module.css"

export const Auth = () => {
  return (
    <div className={styles.container}>


        <div className={styles.glassBox}>
            <h2 className={styles.h2}>Log In</h2>
            <input className={styles.usernameInput} type="text" placeholder='Username'/>
            <input className={styles.passwordInput} type="password"  placeholder='Password'/>
            
            <button className={styles.forgotPassBtn}>Forgot Password?</button>
            <button className={styles.loginBtn}>Log in</button>
            <div className={styles.signupPage}>
               <p className={styles.p}>Don't have an Account?</p>
               <button className={styles.registerBtn}>Register</button>
            </div>
            



        </div>





    </div>
  )
}
