import React from "react";
import styles from "./CartToast.module.css";

const CartToast = ({ show, message }) => {
  return (
    <div className={`${styles.toast} ${show ? styles.show : ""}`}>
      {message}
    </div>
  );
};

export default CartToast;