"use client";
import React from "react";

export default function TransitionLink({ href, className, children, ...props }) {
  const onClick = (e) => {
    e.preventDefault();
    window.dispatchEvent(
      new CustomEvent("app:transition:navigate", { detail: { href } })
    );
  };

   return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      data-hover-interactive
      {...props}
    >
      {children}
    </a>
  );
}
