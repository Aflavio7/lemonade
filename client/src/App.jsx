import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Configuration from './pages/Configuration';
import Logs from './pages/Logs';

function App() {
    return (
        <Router>
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/configuration" element={<Configuration />} />
                        <Route path="/logs" element={<Logs />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
