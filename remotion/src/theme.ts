import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadKarla } from "@remotion/google-fonts/Karla";
import { loadFont as loadSerifThai } from "@remotion/google-fonts/NotoSerifThai";
import { loadFont as loadSansThai } from "@remotion/google-fonts/NotoSansThai";

const c = loadCormorant("normal", { weights: ["300", "400", "600"], subsets: ["latin"] });
const k = loadKarla("normal", { weights: ["300", "400", "500"], subsets: ["latin"] });
const st = loadSerifThai("normal", { weights: ["300", "400", "600"], subsets: ["thai", "latin"] });
const sn = loadSansThai("normal", { weights: ["300", "400", "500"], subsets: ["thai", "latin"] });

export const display = `${c.fontFamily}, ${st.fontFamily}`;
export const body = `${k.fontFamily}, ${sn.fontFamily}`;

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
