import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from 'utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, LayoutDashboard, User, Flame, Dumbbell,
    Menu, X, ChevronRight
} from 'lucide-react';
import { Button } from 'components/ui/button';

const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Profile', icon: User, page: 'Profile' },
    { name: 'Calories', icon: Flame, page: 'Calories' },
    { name: 'Workouts', icon: Dumbbell, page: 'Workouts' },
];

export default function Layout({ children, currentPageName }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Desktop Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 hidden lg:block z-40">
                <div className="p-6">
                    <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">FitLife</span>
                    </Link>
                </div>

                <nav className="px-4 mt-4">
                    {navItems.map((item) => {
                        const isActive = currentPageName === item.page;
                        return (
                            <Link
                                key={item.name}
                                to={createPageUrl(item.page)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${isActive
                                    ? 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                                <span className="font-medium">{item.name}</span>
                                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-4 text-white">
                        <h4 className="font-semibold mb-1">Stay Motivated!</h4>
                        <p className="text-sm text-white/80">Every step counts towards a healthier you.</p>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-50 px-4 flex items-center justify-between">
                <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold text-gray-900">FitLife</span>
                </Link>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(true)}
                >
                    <Menu className="w-6 h-6" />
                </Button>
            </header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="fixed right-0 top-0 h-full w-72 bg-white z-50 lg:hidden"
                        >
                            <div className="p-4 flex items-center justify-between border-b border-gray-100">
                                <span className="font-semibold text-gray-900">Menu</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            <nav className="p-4">
                                {navItems.map((item) => {
                                    const isActive = currentPageName === item.page;
                                    return (
                                        <Link
                                            key={item.name}
                                            to={createPageUrl(item.page)}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${isActive
                                                ? 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-600'
                                                : 'text-gray-600'
                                                }`}
                                        >
                                            <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                                            <span className="font-medium">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
                {children}
            </main>
        </div>
    );
}