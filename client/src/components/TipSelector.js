import { jsx as _jsx } from "react/jsx-runtime";
const OPTIONS = [0, 10, 15, 20];
export default function TipSelector({ value, onChange }) {
    return (_jsx("div", { className: "flex gap-2", children: OPTIONS.map(pct => (_jsx("button", { onClick: () => onChange(pct), className: `flex-1 py-2.5 rounded-full text-sm font-heading font-semibold border-2 transition-colors
            ${value === pct
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 bg-white text-on-surface'}`, children: pct === 0 ? 'None' : `${pct}%` }, pct))) }));
}
