import React, { useState, useEffect, useCallback } from 'react'
import { Gamepad2, Monitor, Minus, Plus, ChevronRight, CheckCircle, ArrowLeft, Zap, UtensilsCrossed, Coffee, ShoppingBag, Clock, CreditCard, Lightbulb, Receipt, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAvailableDevices, getMenuItems, getPaketSewa,
  getOrCreatePelanggan, createTransaksi, createPembayaran,
} from '../lib/queries'
import { formatRupiah, deviceTypeLabel } from '../lib/utils'

const STEPS = ['Device', 'Durasi', 'Menu', 'Data', 'Bayar']


export default function BookingPage() {
  const [step, setStep] = useState(-1) // -1 is landing page
  const [devices, setDevices] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [paketList, setPaketList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const [selectedDevice, setSelectedDevice] = useState(null)
  const [durasi, setDurasi] = useState(1)
  const [selectedPaket, setSelectedPaket] = useState(null)
  const [cart, setCart] = useState({})
  const [nama, setNama] = useState('')
  const [noHp, setNoHp] = useState('')
  const [alamat, setAlamat] = useState('')
  const [metodeBayar, setMetodeBayar] = useState('cash')
  const [transaksiResult, setTransaksiResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [d, m, p] = await Promise.all([getAvailableDevices(), getMenuItems(), getPaketSewa()])
      setDevices(d || [])
      setMenuItems(m || [])
      setPaketList(p || [])
    } catch {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredDevices = filter === 'all' ? devices : devices.filter(d => d.tipe_device?.toLowerCase() === filter)

  const deviceHarga = selectedDevice?.harga_per_jam || 0
  const paketHarga = selectedPaket?.harga_paket || 0
  const rentalCost = selectedPaket ? paketHarga : deviceHarga * durasi
  const menuCost = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find(m => m.id_menu === parseInt(id))
    return sum + (item ? item.harga * qty : 0)
  }, 0)
  const totalHarga = rentalCost + menuCost
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  function updateCart(id, delta) {
    setCart(prev => {
      const next = { ...prev }
      const val = (next[id] || 0) + delta
      if (val <= 0) delete next[id]
      else next[id] = val
      return next
    })
  }

  function canNext() {
    if (step === 0) return !!selectedDevice
    if (step === 1) return durasi > 0 || !!selectedPaket
    if (step === 3) return nama.trim() && noHp.trim()
    return true
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    try {
      const pelanggan = await getOrCreatePelanggan(nama.trim(), noHp.trim(), alamat.trim())
      const menuCartItems = Object.entries(cart).map(([id, qty]) => {
        const item = menuItems.find(m => m.id_menu === parseInt(id))
        return { id_menu: parseInt(id), jumlah: qty, subtotal: item.harga * qty }
      })
      const tx = await createTransaksi({
        idPelanggan: pelanggan.id_pelanggan,
        idDevice: selectedDevice.id_device,
        durasi: selectedPaket ? selectedPaket.durasi : durasi,
        totalHarga,
        menuItems: menuCartItems,
        idPaket: selectedPaket?.id_paket || null,
      })
      setTransaksiResult(tx)
      setStep(5) // Move to Payment screen
    } catch (err) {
      toast.error(err.message || 'Gagal membuat transaksi')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePayment() {
    if (submitting) return
    setSubmitting(true)
    try {
      await createPembayaran({
        idTransaksi: transaksiResult.id_transaksi,
        totalBayar: totalHarga,
        metodePembayaran: metodeBayar,
      })
      setStep(6) // Move to Success screen
      toast.success('Pembayaran berhasil dikonfirmasi!')
    } catch (err) {
      toast.error(err.message || 'Gagal memproses pembayaran')
    } finally {
      setSubmitting(false)
    }
  }

  function resetAll() {
    setStep(-1); setSelectedDevice(null); setDurasi(1); setSelectedPaket(null)
    setCart({}); setNama(''); setNoHp(''); setAlamat(''); setMetodeBayar('cash'); setTransaksiResult(null)
    loadData()
  }

  if (loading) return <div className="spinner" />

  if (step === -1) {
    return (
      <div className="page" style={{ paddingBottom: '80px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Full-bleed Hero Illustration */}
        <div style={{ 
          margin: '-1rem -1rem 1.5rem', 
          background: 'var(--green-50)', 
          borderBottomLeftRadius: '24px', 
          borderBottomRightRadius: '24px',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem 1rem'
        }}>
          <img 
            src="/illustration.png" 
            alt="Gaming Setup Illustration" 
            style={{ width: '100%', maxWidth: '240px', objectFit: 'contain', mixBlendMode: 'multiply' }} 
          />
        </div>

        {/* Text Content */}
        <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.2 }}>
            Main PS & PC Makin Gampang!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '2rem' }}>
            Pilih konsol favoritmu, tentukan durasi main, pesan cemilan langsung dari kursi, lalu nikmati keseruannya.
          </p>
        </div>

        {/* Beautiful Steps Section */}
        <div style={{ padding: '0 0.5rem', flex: 1 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem' }}>Cara Booking</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: <Gamepad2 size={20} color="var(--green-600)" />, title: 'Pilih Device', desc: 'Tersedia PS5, PS4, dan PC Gaming spec tinggi.' },
              { icon: <Clock size={20} color="var(--green-600)" />, title: 'Pilih Durasi / Paket', desc: 'Main satuan atau pilih paket hemat yang sudah termasuk makanan.' },
              { icon: <UtensilsCrossed size={20} color="var(--green-600)" />, title: 'Tambah F&B', desc: 'Pesan Indomie, snack, dan minuman dingin tanpa harus ke kasir.' },
              { icon: <CreditCard size={20} color="var(--green-600)" />, title: 'Bayar & Main', desc: 'Gunakan QRIS, Transfer, atau bayar Cash di tempat.' }
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '2px', color: 'var(--text-primary)' }}>{item.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Bottom Action */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'white', padding: '1rem',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
          display: 'flex', justifyContent: 'center'
        }}>
          <div style={{ width: '100%', maxWidth: '600px' }}>
            <button className="btn btn-primary btn-lg btn-block" onClick={() => setStep(0)} style={{ borderRadius: '14px', fontSize: '1rem' }}>
              Mulai Booking Sekarang
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 5) {
    return (
      <div className="page" style={{ maxWidth: 500, marginTop: '1rem' }}>
        <div className="card-white" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 4 }}>Selesaikan Pembayaran</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Selesaikan pembayaranmu agar device bisa langsung dimainkan</p>
          </div>
          
          <div style={{ background: 'var(--bg)', padding: '1.5rem', borderRadius: 12, marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Total Tagihan</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--green-600)' }}>{formatRupiah(totalHarga)}</div>
          </div>

          <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>Instruksi Pembayaran ({metodeBayar.toUpperCase()})</div>
            {metodeBayar === 'cash' && (
              <div style={{ padding: '1rem', border: '1.5px dashed var(--border)', borderRadius: 8, background: 'var(--orange-50)', color: 'var(--orange-500)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: 10, alignItems: 'center' }}>
                <Lightbulb size={24} style={{ flexShrink: 0 }} />
                <span>Silakan tunjukkan layar ini dan bayar langsung ke Kasir yang berjaga.</span>
              </div>
            )}
            {metodeBayar === 'qris' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 200, height: 200, background: 'white', border: '2px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  {/* Placeholder for QR Code */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-block', padding: 8, background: 'black', color: 'white', fontSize: '0.7rem', fontWeight: 800, borderRadius: 4, marginBottom: 8 }}>QRIS</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Scan kode QR di atas<br/>menggunakan m-Banking / E-Wallet</div>
                  </div>
                </div>
              </div>
            )}
            {metodeBayar === 'transfer' && (
              <div style={{ padding: '1rem', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Bank BCA</span>
                  <span style={{ fontWeight: 700 }}>1234 5678 90</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Bank Mandiri</span>
                  <span style={{ fontWeight: 700 }}>098 7654 321</span>
                </div>
                <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>* A.n. Rental PS & PC Official</div>
              </div>
            )}
            {metodeBayar === 'ewallet' && (
              <div style={{ padding: '1rem', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>GoPay / OVO / Dana</span>
                  <span style={{ fontWeight: 700 }}>0812 3456 7890</span>
                </div>
              </div>
            )}
          </div>

          <button className="btn btn-primary btn-block btn-lg" onClick={handlePayment} disabled={submitting}>
            {submitting ? 'Memproses...' : 'Saya Sudah Bayar'}
          </button>
        </div>
      </div>
    )
  }

  if (step === 6) {
    return (
      <div className="page">
        <div className="success-screen">
          <div className="success-icon"><CheckCircle size={36} /></div>
          <h2>Pembayaran Berhasil!</h2>
          <p>Transaksi #{transaksiResult?.id_transaksi} telah lunas. Selamat bermain!</p>
        </div>
        <div className="summary-card print-area" style={{ marginBottom: '1rem', background: 'white' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px dashed var(--border)', paddingBottom: '1rem' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>RENTAL PS & PC</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Invoice #{transaksiResult?.id_transaksi}</div>
          </div>
          <div className="summary-row"><span>Nama</span><span className="val">{nama}</span></div>
          <div className="summary-row"><span>Device</span><span className="val">{selectedDevice?.nama_device}</span></div>
          <div className="summary-row"><span>Tipe</span><span className="val">{deviceTypeLabel(selectedDevice?.tipe_device)}</span></div>
          <div className="summary-row"><span>Durasi</span><span className="val">{selectedPaket ? `${selectedPaket.nama_paket}` : `${durasi} jam`}</span></div>
          
          <div className="summary-divider" style={{ margin: '8px 0' }} />
          <div className="summary-row"><span>Biaya Rental</span><span className="val">{formatRupiah(rentalCost)}</span></div>
          
          {menuCost > 0 && (
            <>
              <div className="summary-divider" style={{ margin: '8px 0' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Pesanan F&B:</div>
              {Object.entries(cart).map(([id, qty]) => {
                const item = menuItems.find(m => m.id_menu === parseInt(id))
                if (!item) return null
                return (
                  <div key={id} className="summary-row" style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{qty}x {item.nama_menu}</span>
                    <span className="val">{formatRupiah(item.harga * qty)}</span>
                  </div>
                )
              })}
            </>
          )}
          
          <div className="summary-divider" style={{ margin: '12px 0' }} />
          <div className="summary-total"><span>Total Bayar</span><span className="val">{formatRupiah(totalHarga)}</span></div>
          <div className="summary-row" style={{ marginTop: 4 }}><span>Metode</span><span className="val" style={{ textTransform: 'uppercase' }}>{metodeBayar}</span></div>
        </div>
        
        <div style={{ display: 'flex', gap: 10 }} className="no-print">
          <button className="btn btn-outline btn-block btn-lg" onClick={() => window.print()} style={{ flex: 1 }}>
            <Printer size={16} /> Cetak Struk
          </button>
          <button className="btn btn-primary btn-block btn-lg" onClick={resetAll} style={{ flex: 1, marginTop: 0 }}>Selesai</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`stepper-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
              <div className="stepper-num">{i < step ? '✓' : i + 1}</div>
              <span style={{ display: i === step ? 'inline' : 'none' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`stepper-line ${i < step ? 'done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 0: Device */}
      {step === 0 && (
        <>
          <div className="promo-banner">
            <Gamepad2 size={48} className="promo-icon" />
            <h2>Main Sepuasnya!</h2>
            <p>Pilih device favorit kamu dan mulai bermain sekarang</p>
          </div>

          <div className="chips">
            {[
              { key: 'all', label: 'Semua', icon: null },
              { key: 'ps', label: 'PlayStation', icon: <Gamepad2 size={13} /> },
              { key: 'pc', label: 'PC Gaming', icon: <Monitor size={13} /> },
            ].map(c => (
              <button key={c.key} className={`chip ${filter === c.key ? 'active' : ''}`} onClick={() => setFilter(c.key)}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          <div className="section-header">
            <div className="section-title">Device Tersedia</div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{filteredDevices.length} unit</span>
          </div>

          {filteredDevices.length === 0 ? (
            <div className="empty-state"><p>Tidak ada device tersedia</p></div>
          ) : (
            <div className="device-grid">
              {filteredDevices.map(d => (
                <div
                  key={d.id_device}
                  className={`device-card ${selectedDevice?.id_device === d.id_device ? 'selected' : ''}`}
                  onClick={() => setSelectedDevice(d)}
                >
                  <span className={`type-tag ${d.tipe_device?.toLowerCase()}`}>
                    {d.tipe_device?.toUpperCase() === 'PS' ? <Gamepad2 size={10} /> : <Monitor size={10} />}
                    &nbsp;{d.tipe_device}
                  </span>
                  <div className="device-name">{d.nama_device}</div>
                  {d.spesifikasi && <div className="device-spec">{d.spesifikasi}</div>}
                  <div className="device-price">{formatRupiah(d.harga_per_jam)} <span>/jam</span></div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Step 1: Duration */}
      {step === 1 && (
        <>
          <div className="section">
            <div className="section-title" style={{ marginBottom: 12 }}>Pilih Durasi</div>
            <div className="duration-picker">
              <button className="duration-btn" onClick={() => setDurasi(Math.max(1, durasi - 1))} disabled={!!selectedPaket}><Minus size={16} /></button>
              <div className="duration-value">
                {selectedPaket ? selectedPaket.durasi : durasi}
                <span>jam</span>
              </div>
              <button className="duration-btn" onClick={() => setDurasi(durasi + 1)} disabled={!!selectedPaket}><Plus size={16} /></button>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Subtotal</div>
                <div style={{ fontWeight: 800, color: 'var(--green-600)' }}>{formatRupiah(rentalCost)}</div>
              </div>
            </div>
          </div>

          {paketList.length > 0 && (
            <div className="section">
              <div className="section-header">
                <div className="section-title"><Zap size={16} /> Paket Hemat</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {paketList.map((p, i) => (
                  <div
                    key={p.id_paket}
                    className={`paket-card ${selectedPaket?.id_paket === p.id_paket ? 'selected' : ''}`}
                    onClick={() => { setSelectedPaket(selectedPaket?.id_paket === p.id_paket ? null : p); if (selectedPaket?.id_paket !== p.id_paket) setDurasi(p.durasi) }}
                  >
                    {i === 1 && <div className="paket-badge">Best Deal</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="paket-name">{p.nama_paket}</div>
                        <div className="paket-desc">{p.deskripsi}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="paket-price">{formatRupiah(p.harga_paket)}</div>
                        <div className="paket-duration">{p.durasi} jam</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 2: Menu */}
      {step === 2 && (
        <div className="section">
          <div className="section-header">
            <div className="section-title"><ShoppingBag size={16} /> Tambah Menu</div>
            {cartCount > 0 && <span className="badge badge-green">{cartCount} item</span>}
          </div>

          <div className="menu-list">
            {menuItems.map(m => (
              <div key={m.id_menu} className="menu-item">
                <div className={`menu-item-icon ${m.kategori}`}>
                  {m.kategori === 'minuman' ? <Coffee size={20} /> : <UtensilsCrossed size={20} />}
                </div>
                <div className="menu-item-info">
                  <div className="menu-item-name">{m.nama_menu}</div>
                  <div className="menu-item-price">{formatRupiah(m.harga)}</div>
                </div>
                <div className="qty-control">
                  {cart[m.id_menu] ? (
                    <>
                      <button className="qty-btn" onClick={() => updateCart(m.id_menu, -1)}><Minus size={12} /></button>
                      <span className="qty-value">{cart[m.id_menu]}</span>
                      <button className="qty-btn add" onClick={() => updateCart(m.id_menu, 1)}><Plus size={12} /></button>
                    </>
                  ) : (
                    <button className="btn btn-outline btn-sm" onClick={() => updateCart(m.id_menu, 1)}>
                      <Plus size={12} /> Tambah
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Customer Data */}
      {step === 3 && (
        <div className="section">
          <div className="section-title" style={{ marginBottom: 16 }}>Data Pelanggan</div>
          <div className="card-white">
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input className="form-input" value={nama} onChange={e => setNama(e.target.value)} placeholder="Masukkan nama" />
            </div>
            <div className="form-group">
              <label className="form-label">Nomor HP</label>
              <input className="form-input" value={noHp} onChange={e => setNoHp(e.target.value)} placeholder="08xxxxxxxxxx" type="tel" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Alamat Lengkap (Opsional)</label>
              <textarea className="form-input" value={alamat} onChange={e => setAlamat(e.target.value)} placeholder="Masukkan alamat lengkap (jika perlu)" style={{ minHeight: 80, resize: 'vertical' }} />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Payment Summary */}
      {step === 4 && (
        <div className="section">
          <div className="section-title" style={{ marginBottom: 12 }}>Ringkasan Pembayaran</div>
          <div className="summary-card" style={{ marginBottom: 12 }}>
            <div className="summary-row"><span>Device</span><span className="val">{selectedDevice?.nama_device}</span></div>
            <div className="summary-row"><span>Tipe</span><span className="val">{deviceTypeLabel(selectedDevice?.tipe_device)}</span></div>
            <div className="summary-row"><span>Durasi</span><span className="val">{selectedPaket ? `${selectedPaket.nama_paket}` : `${durasi} jam`}</span></div>
            <div className="summary-row"><span>Biaya Rental</span><span className="val">{formatRupiah(rentalCost)}</span></div>
            {menuCost > 0 && <div className="summary-row"><span>Menu ({cartCount} item)</span><span className="val">{formatRupiah(menuCost)}</span></div>}
            <div className="summary-divider" />
            <div className="summary-total"><span>Total</span><span className="val">{formatRupiah(totalHarga)}</span></div>
          </div>
          <div className="card-white">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Metode Pembayaran</label>
              <select className="form-select" value={metodeBayar} onChange={e => setMetodeBayar(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="transfer">Transfer Bank</option>
                <option value="ewallet">E-Wallet (OVO/GoPay/Dana)</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Navigation */}
      {step >= 0 && step < 5 && (
        <div className="sticky-bottom">
          <div className="sticky-bottom-inner">
            {step > 0 ? (
              <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={16} /> Kembali
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={() => setStep(-1)}>
                <ArrowLeft size={16} /> Batal
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <div className="total-label">Total Harga</div>
                <div className="total-value">{formatRupiah(totalHarga)}</div>
              </div>
              {step < 4 ? (
                <button className="btn btn-primary btn-lg" onClick={() => setStep(step + 1)} disabled={!canNext()}>
                  Lanjut <ChevronRight size={16} />
                </button>
              ) : (
                <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Memproses...' : 'Buat Pesanan'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

