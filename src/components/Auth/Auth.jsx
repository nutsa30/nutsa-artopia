import React from "react";
import styles from "./Auth.module.css";

export const Auth = () => {
  return (
    <div className={styles.container}>
      <div className={styles.glassBox}>
        <h2 className={styles.h2}>შესვლა</h2>

        <input
          className={styles.usernameInput}
          type="text"
          placeholder="ელფოსტა ან მომხმარებლის სახელი"
        />

        <input
          className={styles.passwordInput}
          type="password"
          placeholder="პაროლი"
        />

        <button className={styles.forgotPassBtn}>დაგავიწყდა პაროლი?</button>
        <button className={styles.loginBtn}>შესვლა</button>

        <div className={styles.signupPage}>
          <p className={styles.p}>ანგარიში არ გაქვს?</p>
          <button className={styles.registerBtn}>რეგისტრაცია</button>
        </div>
      </div>
    </div>
  );
};