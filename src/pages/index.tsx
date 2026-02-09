import { app_name } from "@/constants";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// -----------------------------------------------------------------------------

const elem = document.getElementById("root")!;
const app = (
    <StrictMode>
        <App />
    </StrictMode>
);

if (import.meta.hot) {
    // With hot module reloading, `import.meta.hot.data` is persisted.
    const root = (import.meta.hot.data.root ??= createRoot(elem));
    root.render(app);
} else {
    // The hot module reloading API is not available in production.
    createRoot(elem).render(app);
}

// -----------------------------------------------------------------------------

export default function App() {
    return (
        <div className="app">
            <div className="app-title">{app_name}</div>
            {/* TODO: implement app */}
        </div>
    );
}
