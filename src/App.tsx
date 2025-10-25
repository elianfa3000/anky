import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Drop from "./pages/drop/Drop";
import Base from "./pages/base/Base";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/drop" element={<Drop />} />
        <Route path="/base" element={<Base />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

// --- renderizado (fuera de App) ---
const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
