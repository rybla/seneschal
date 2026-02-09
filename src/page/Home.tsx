import { app_name } from "@/constants";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./Home.css";

// -----------------------------------------------------------------------------

const elem = document.getElementById("root")!;
const app = (
    <StrictMode>
        <Home />
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

export default function Home() {
    return (
        <div className="home">
            <div className="title">{app_name}</div>
            {/* TODO: implement app */}
        </div>
    );
}
