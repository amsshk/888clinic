import type React from "react";

export const display = '"Cormorant Garamond", "Noto Serif Thai", Georgia, serif';
export const body = '"Karla", "Noto Sans Thai", Arial, sans-serif';

export const palette = {
  cream: "#F7F5F1",
  paper: "#FFFFFF",
  charcoal: "#1B1A18",
  ink: "#2C2A27",
  grey: "#8B877F",
  greyLight: "#DCD8D0",
  gold: "#B8935A",
  goldLight: "#E3C98F",
};

export const label: React.CSSProperties = {
  fontFamily: body,
  fontWeight: 500,
  letterSpacing: 6,
  fontSize: 26,
  textTransform: "uppercase",
};
