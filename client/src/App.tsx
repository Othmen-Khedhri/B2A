import { BrowserRouter, Routes, Route , Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import './App.css'


function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* Your other routes */}
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
