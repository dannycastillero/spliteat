import { jsx as _jsx } from "react/jsx-runtime";
export default function AlcoholChip({ confirmed, onConfirm, onDeny }) {
    if (confirmed) {
        return (_jsx("button", { onClick: onDeny, className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold", children: "\uD83C\uDF7A Licor" }));
    }
    return (_jsx("button", { onClick: onConfirm, className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold border border-orange-300", children: "\u00BFLicor?" }));
}
