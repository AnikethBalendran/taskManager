/** Indian Rupees display for numeric amounts */
export function formatInr(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '₹0';
  return `₹${Number(value).toLocaleString('en-IN')}`;
}
