import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Navbar, Nav, Button, Offcanvas } from 'react-bootstrap';
import { House, Person, HeartPulse, GraphUp, List } from 'react-bootstrap-icons';
import ThemeToggle from './components/common/ThemeToggle';

const navItems = [
    { name: 'Dashboard', page: 'Dashboard', icon: <House size={20} /> },
    { name: 'Profile', page: 'Profile', icon: <Person size={20} /> },
    { name: 'Calories', page: 'Calories', icon: <HeartPulse size={20} /> },
    { name: 'Workouts', page: 'Workouts', icon: <GraphUp size={20} /> },
];

export default function Layout({ children, currentPageName }) {
    const [showSidebar, setShowSidebar] = useState(false);

    const handleToggleSidebar = () => setShowSidebar(!showSidebar);

    const sidebarContent = (
        <div className="d-flex flex-column h-100">
            <Nav className="flex-column sidebar-nav">
                <Navbar.Brand href="#" className="sidebar-brand">
                    FitLife
                </Navbar.Brand>
                {navItems.map((item) => {
                    const isActive = currentPageName === item.page;
                    return (
                        <Nav.Item key={item.name}>
                            <Nav.Link
                                as={NavLink}
                                to={createPageUrl(item.page)}
                                className={isActive ? 'active' : ''}
                            >
                                {item.icon}
                                <span>{item.name}</span>
                            </Nav.Link>
                        </Nav.Item>
                    );
                })}
            </Nav>
            <div className="mt-auto p-3 d-flex justify-content-center">
                <ThemeToggle />
            </div>
        </div>
    );

    return (
        <div className="d-flex" style={{ minHeight: '100vh' }}>
            {/* Desktop Sidebar */}
            <div className="d-none d-lg-block sidebar">
                {sidebarContent}
            </div>

            {/* Mobile Sidebar Toggle */}
            <Button
                variant="primary"
                className="d-lg-none"
                onClick={handleToggleSidebar}
                style={{ position: 'fixed', top: 15, left: 15, zIndex: 1050 }}
            >
                <List size={24} />
            </Button>

            {/* Mobile Offcanvas Sidebar */}
            <Offcanvas show={showSidebar} onHide={() => setShowSidebar(false)} className="d-lg-none">
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>FitLife</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    {sidebarContent}
                </Offcanvas.Body>
            </Offcanvas>

            {/* Main Content */}
            <main className="flex-grow-1 p-4">
                <div key={currentPageName} className="animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
}
