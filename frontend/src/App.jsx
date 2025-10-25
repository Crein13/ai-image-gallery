import { Routes, Route, Link, Navigate } from 'react-router-dom'
import Auth from './pages/Auth.jsx'
import Gallery from './pages/Gallery.jsx'
import Upload from './pages/Upload.jsx'

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="p-4 border-b flex gap-4">
        <Link to="/gallery">Gallery</Link>
        <Link to="/upload">Upload</Link>
        <Link to="/auth">Auth</Link>
      </header>
      <main className="p-4">
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="*" element={<Navigate to="/gallery" replace />} />
        </Routes>
      </main>
    </div>
  )
}
