"use client";
import React from "react";

export default function TransitionLink({ href, className, children, ...props }) {
  const onClick = (e) => {
    // izinkan default utk: open in new tab, middle-click, modifier keys, target=_blank
    if (
      e.defaultPrevented ||
      e.button !== 0 || // bukan left click
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
      props.target === "_blank"
    ) {
      return; // biar browser yang handle
    }

    // left-click normal: cegah default & pakai transisi
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
