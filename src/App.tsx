import { BrowserRouter, Routes, Route } from "react-router-dom";
import Drop from "./pages/drop/Drop.tsx";
import Base from "./pages/base/Base.tsx";
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
