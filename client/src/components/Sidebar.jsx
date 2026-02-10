import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Settings,
    FileText,
    Zap,
    Power,
    Mail
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { settingsAPI, healthAPI } from '../services/api';

function Sidebar() {
    const location = useLocation();
    const [automationEnabled, setAutomationEnabled] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAutomationStatus();
    }, []);

    const loadAutomationStatus = async () => {
        try {
            const res = await settingsAPI.getAll();
            setAutomationEnabled(res.data.automation_enabled === 'true');
        } catch (error) {
            console.error('Failed to load automation status:', error);
        }
    };

    const toggleAutomation = async () => {
        setLoading(true);
        try {
            const newValue = !automationEnabled;
            await settingsAPI.update({ automation_enabled: String(newValue) });
            setAutomationEnabled(newValue);
        } catch (error) {
            console.error('Failed to toggle automation:', error);
        } finally {
            setLoading(false);
        }
    };

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/configuration', label: 'Configuration', icon: Settings },
        { path: '/logs', label: 'Activity Logs', icon: FileText },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo">
                    <div className="logo-icon">
                        <Zap />
                    </div>
                    <div className="logo-text">
                        <h1>Email Lead Capture</h1>
                        <span>Automation</span>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(({ path, label, icon: Icon }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Icon />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Power size={18} style={{ color: automationEnabled ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Automation</span>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={automationEnabled}
                                onChange={toggleAutomation}
                                disabled={loading}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                    <div className={`status-badge ${automationEnabled ? 'success' : 'warning'}`}>
                        <span className="status-dot"></span>
                        {automationEnabled ? 'Running' : 'Paused'}
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
