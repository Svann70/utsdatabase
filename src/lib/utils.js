export function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num)
}

export function formatDateTime(iso) {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function formatDate(iso) {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(new Date(iso))
}

export function deviceTypeLabel(type) {
  const map = { ps: 'PlayStation', pc: 'PC', PS: 'PlayStation', PC: 'PC' }
  return map[type] || type
}

export function statusColor(status) {
  const map = {
    tersedia: '#10b981',
    dipakai: '#f59e0b',
    maintenance: '#ef4444',
  }
  return map[status] || '#6b7280'
}

export function statusLabel(status) {
  const map = {
    tersedia: 'Tersedia',
    dipakai: 'Sedang Dipakai',
    maintenance: 'Maintenance',
  }
  return map[status] || status
}
