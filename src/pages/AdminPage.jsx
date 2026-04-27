import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, Monitor, Wallet, Activity, RefreshCw,
  Wrench, CheckCircle, BarChart3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAllDevices, getTransaksiWithDetails, getTotalRevenue,
  getDailyTransactionCount, getActiveTransactions,
  updateDeviceStatus, getRevenueByDate, loginAdmin,
  getAllPelanggan, getMenuItems, getPaketSewa, selesaikanTransaksi
} from '../lib/queries'
import { formatRupiah, formatDateTime, deviceTypeLabel, statusLabel } from '../lib/utils'

export default function AdminPage() {
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const [tab, setTab] = useState('overview')
  const [devices, setDevices] = useState([])
  const [transactions, setTransactions] = useState([])
  const [activeCount, setActiveCount] = useState(0)
  const [revenue, setRevenue] = useState(0)
  const [dailyCount, setDailyCount] = useState(0)
  const [revenueChart, setRevenueChart] = useState([])
  const [menus, setMenus] = useState([])
  const [pakets, setPakets] = useState([])
  const [pelanggans, setPelanggans] = useState([])
  const [loading, setLoading] = useState(false) // Initially false, loaded after login

  const loadAll = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const [d, tx, rev, daily, active, chart, m, p, cust] = await Promise.all([
        getAllDevices(), getTransaksiWithDetails(), getTotalRevenue(),
        getDailyTransactionCount(), getActiveTransactions(), getRevenueByDate(7),
        getMenuItems(), getPaketSewa(), getAllPelanggan(),
      ])
      setDevices(d || [])
      setTransactions(tx || [])
      setRevenue(rev || 0)
      setDailyCount(daily || 0)
      setActiveCount(active?.length || 0)
      setRevenueChart(chart || [])
      setMenus(m || [])
      setPakets(p || [])
      setPelanggans(cust || [])
    } catch {
      toast.error('Gagal memuat data admin')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadAll() }, [loadAll])

  async function handleLogin(e) {
    e.preventDefault()
    setIsLoggingIn(true)
    try {
      const data = await loginAdmin(username, password)
      setUser(data)
      toast.success(`Selamat datang, ${data.nama_pegawai}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function handleDeviceStatus(id, status) {
    try {
      await updateDeviceStatus(id, status)
      toast.success('Status diperbarui')
      loadAll()
    } catch {
      toast.error('Gagal update status')
    }
  }

  async function handleSelesaikanTx(idTx, idDev) {
    try {
      await selesaikanTransaksi(idTx, idDev)
      toast.success('Transaksi selesai, device kembali tersedia')
      loadAll()
    } catch {
      toast.error('Gagal menyelesaikan transaksi')
    }
  }

  const dc = {
    total: devices.length,
    tersedia: devices.filter(d => d.status_device === 'tersedia').length,
    dipakai: devices.filter(d => d.status_device === 'dipakai').length,
    maintenance: devices.filter(d => d.status_device === 'maintenance').length,
  }

  if (!user) {
    return (
      <div className="page" style={{ maxWidth: 400, marginTop: '2rem' }}>
        <div className="card-white">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', textAlign: 'center' }}>Admin Login</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={isLoggingIn}>
              {isLoggingIn ? 'Memeriksa...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) return <div className="spinner" />

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Overview bisnis rental kamu</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={loadAll}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><Wallet size={18} /></div>
          <div className="stat-value">{formatRupiah(revenue)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><TrendingUp size={18} /></div>
          <div className="stat-value">{dailyCount}</div>
          <div className="stat-label">Transaksi Hari Ini</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><Activity size={18} /></div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-label">Sedang Bermain</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Monitor size={18} /></div>
          <div className="stat-value">{dc.tersedia}/{dc.total}</div>
          <div className="stat-label">Device Tersedia</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {[
          { key: 'overview', label: 'Revenue' },
          { key: 'devices', label: 'Devices' },
          { key: 'transactions', label: 'Transaksi' },
          { key: 'menu', label: 'Menu F&B' },
          { key: 'paket', label: 'Paket Sewa' },
          { key: 'pelanggan', label: 'Pelanggan' },
        ].map(t => (
          <button key={t.key} className={`tab-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)} style={{ display: 'inline-block', flex: 'none', padding: '9px 16px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Revenue Tab */}
      {tab === 'overview' && (
        <div className="section">
          <div className="card-white">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={16} /> Revenue 7 Hari</div>
            </div>
            {revenueChart.length === 0 ? (
              <div className="empty-state"><p>Belum ada data revenue</p></div>
            ) : (
              <div className="chart-bars">
                {revenueChart.map((r, i) => {
                  const max = Math.max(...revenueChart.map(x => x.total), 1)
                  const h = (r.total / max) * 100
                  return (
                    <div key={i} className="chart-bar-col">
                      <span className="chart-bar-value">{formatRupiah(r.total)}</span>
                      <div className="chart-bar" style={{ height: `${h}%` }} />
                      <span className="chart-bar-label">{r.date}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card-white" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>Status Device</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Tersedia', count: dc.tersedia, color: 'green' },
                { label: 'Dipakai', count: dc.dipakai, color: 'orange' },
                { label: 'Maintenance', count: dc.maintenance, color: 'red' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '12px 0', background: 'var(--bg)', borderRadius: 8 }}>
                  <div className="device-status-row" style={{ justifyContent: 'center', marginBottom: 4 }}>
                    <span className={`status-dot ${s.color}`} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{s.count}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Devices Tab */}
      {tab === 'devices' && (
        <div className="section">
          <div className="table-card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Tipe</th>
                  <th>Harga/Jam</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(d => {
                  const dotColor = d.status_device === 'tersedia' ? 'green' : d.status_device === 'dipakai' ? 'orange' : 'red'
                  const badgeClass = d.status_device === 'tersedia' ? 'badge-green' : d.status_device === 'dipakai' ? 'badge-orange' : 'badge-red'
                  return (
                    <tr key={d.id_device}>
                      <td style={{ fontWeight: 600 }}>{d.nama_device}</td>
                      <td><span className={`type-tag ${d.tipe_device?.toLowerCase()}`}>{deviceTypeLabel(d.tipe_device)}</span></td>
                      <td>{formatRupiah(d.harga_per_jam)}</td>
                      <td>
                        <span className={`badge ${badgeClass}`}>
                          <span className={`status-dot ${dotColor}`} style={{ width: 6, height: 6 }} />
                          {statusLabel(d.status_device)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {d.status_device !== 'tersedia' && (
                            <button className="btn btn-primary btn-sm" onClick={() => handleDeviceStatus(d.id_device, 'tersedia')}>
                              <CheckCircle size={12} /> Aktifkan
                            </button>
                          )}
                          {d.status_device !== 'maintenance' && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeviceStatus(d.id_device, 'maintenance')}>
                              <Wrench size={12} /> Maintenance
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        <div className="section">
          {transactions.length === 0 ? (
            <div className="empty-state"><p>Belum ada transaksi</p></div>
          ) : (
            <div className="table-card" style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Pelanggan</th>
                    <th>Device</th>
                    <th>Waktu</th>
                    <th>Durasi</th>
                    <th>Total</th>
                    <th>Bayar</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => {
                    const statusBadge = tx.status_transaksi === 'selesai' ? 'badge-green'
                      : tx.status_transaksi === 'aktif' ? 'badge-blue' : 'badge-orange'
                    return (
                      <tr key={tx.id_transaksi}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>#{tx.id_transaksi}</td>
                        <td style={{ fontWeight: 600 }}>{tx.pelanggan?.nama_pelanggan || '-'}</td>
                        <td>
                          <span className={`type-tag ${tx.device?.tipe_device?.toLowerCase()}`} style={{ fontSize: '0.62rem' }}>
                            {tx.device?.nama_device}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem' }}>{formatDateTime(tx.waktu_mulai)}</td>
                        <td>{tx.durasi_jam}j</td>
                        <td style={{ fontWeight: 700 }}>{formatRupiah(tx.total_harga)}</td>
                        <td>
                          {tx.pembayaran?.length > 0
                            ? <span className="badge badge-green">{tx.pembayaran[0].metode_pembayaran}</span>
                            : <span className="badge badge-orange">Pending</span>
                          }
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span className={`badge ${statusBadge}`}>{tx.status_transaksi}</span>
                            {tx.status_transaksi === 'aktif' && (
                              <button className="btn btn-primary btn-sm" onClick={() => handleSelesaikanTx(tx.id_transaksi, tx.id_device)} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>
                                Selesai
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Menu Tab */}
      {tab === 'menu' && (
        <div className="section">
          <div className="table-card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Nama Menu</th>
                  <th>Kategori</th>
                  <th>Harga</th>
                </tr>
              </thead>
              <tbody>
                {menus.map(m => (
                  <tr key={m.id_menu}>
                    <td style={{ fontWeight: 600 }}>{m.nama_menu}</td>
                    <td><span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{m.kategori}</span></td>
                    <td>{formatRupiah(m.harga)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paket Tab */}
      {tab === 'paket' && (
        <div className="section">
          <div className="table-card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Nama Paket</th>
                  <th>Durasi</th>
                  <th>Harga</th>
                  <th>Deskripsi</th>
                </tr>
              </thead>
              <tbody>
                {pakets.map(p => (
                  <tr key={p.id_paket}>
                    <td style={{ fontWeight: 600 }}>{p.nama_paket}</td>
                    <td>{p.durasi} Jam</td>
                    <td>{formatRupiah(p.harga_paket)}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.deskripsi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pelanggan Tab */}
      {tab === 'pelanggan' && (
        <div className="section">
          <div className="table-card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Pelanggan</th>
                  <th>No HP</th>
                  <th>Terdaftar</th>
                </tr>
              </thead>
              <tbody>
                {pelanggans.map(p => (
                  <tr key={p.id_pelanggan}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>#{p.id_pelanggan}</td>
                    <td style={{ fontWeight: 600 }}>{p.nama_pelanggan}</td>
                    <td>{p.no_hp}</td>
                    <td style={{ fontSize: '0.78rem' }}>{formatDateTime(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
