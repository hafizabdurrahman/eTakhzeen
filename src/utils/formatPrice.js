// Formats a number as Pakistani Rupees for display, e.g. formatPKR(12500) -> "Rs. 12,500"
// No decimal places — PKR isn't commonly shown with paisa in this app's UI.
export function formatPKR(amount) {
    const value = Math.round(Number(amount) || 0);
    return `Rs. ${value.toLocaleString('en-US')}`;
}