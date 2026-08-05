import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { applyStoredPrimaryColor } from "./lib/theme-color";
import "./index.css";

applyStoredPrimaryColor();

createRoot(document.getElementById("root")!).render(<App />);
