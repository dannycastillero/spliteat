import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLocation, useNavigate } from 'react-router-dom';
const tabs = [
    { path: '/', label: 'Upload', icon: '↑' },
    { path: '/review', label: 'Review', icon: '☰' },
    { path: '/assign', label: 'Assign', icon: '👤' },
    { path: '/summary', label: 'Summary', icon: '💰' },
];
export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    return (_jsx("nav", { className: "fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 flex", children: tabs.map(tab => {
            const active = location.pathname === tab.path;
            return (_jsxs("button", { onClick: () => navigate(tab.path), className: `flex-1 flex flex-col items-center py-3 text-xs font-heading font-semibold transition-colors
              ${active ? 'text-primary' : 'text-gray-400'}`, children: [active ? (_jsx("span", { className: "w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-lg mb-1", children: tab.icon })) : (_jsx("span", { className: "text-xl mb-1", children: tab.icon })), tab.label] }, tab.path));
        }) }));
}
