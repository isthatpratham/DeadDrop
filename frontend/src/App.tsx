import { Routes, Route } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { Home } from './pages/Home';
import { Upload } from './pages/Upload';
import { Result } from './pages/Result';
import { Download } from './pages/Download';

function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/result/:id" element={<Result />} />
        <Route path="/download/:id" element={<Download />} />
      </Route>
    </Routes>
  );
}

export default App;
