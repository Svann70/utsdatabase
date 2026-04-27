import { supabase } from './supabase'

// ─── Device Queries ───────────────────────────────────────────────

export async function getAvailableDevices() {
  const { data, error } = await supabase
    .from('device')
    .select('*')
    .eq('status_device', 'tersedia')
    .order('tipe_device', { ascending: true })

  if (error) throw error
  return data
}

export async function getAllDevices() {
  const { data, error } = await supabase
    .from('device')
    .select('*')
    .order('tipe_device', { ascending: true })

  if (error) throw error
  return data
}

export async function updateDeviceStatus(deviceId, status) {
  const { data, error } = await supabase
    .from('device')
    .update({ status_device: status })
    .eq('id_device', deviceId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Customer Queries ─────────────────────────────────────────────

export async function getOrCreatePelanggan(nama, noHp, alamat = '') {
  // Check existing first
  const { data: existing } = await supabase
    .from('pelanggan')
    .select('*')
    .eq('no_hp', noHp)
    .single()

  if (existing) {
    if (alamat && existing.alamat !== alamat) {
      await supabase.from('pelanggan').update({ alamat }).eq('id_pelanggan', existing.id_pelanggan)
    }
    return existing
  }

  const { data, error } = await supabase
    .from('pelanggan')
    .insert({ nama_pelanggan: nama, no_hp: noHp, alamat })
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Menu Queries ─────────────────────────────────────────────────

export async function getMenuItems() {
  const { data, error } = await supabase
    .from('menu')
    .select('*')
    .order('kategori', { ascending: true })

  if (error) throw error
  return data
}

// ─── Paket Sewa Queries ───────────────────────────────────────────

export async function getPaketSewa() {
  const { data, error } = await supabase
    .from('paket_sewa')
    .select('*')
    .order('harga_paket', { ascending: true })

  if (error) throw error
  return data
}

// ─── Transaction (Core) ──────────────────────────────────────────

export async function createTransaksi({ idPelanggan, idDevice, durasi, totalHarga, menuItems = [], idPaket = null }) {
  // 1. Verify device is still available (optimistic lock)
  const { data: device } = await supabase
    .from('device')
    .select('status_device')
    .eq('id_device', idDevice)
    .single()

  if (!device || device.status_device !== 'tersedia') {
    throw new Error('Device sudah tidak tersedia. Silakan pilih device lain.')
  }

  // 2. Lock device
  const { error: lockErr } = await supabase
    .from('device')
    .update({ status_device: 'dipakai' })
    .eq('id_device', idDevice)
    .eq('status_device', 'tersedia') // conditional update = poor man's optimistic lock

  if (lockErr) throw lockErr

  // 3. Create transaksi
  const waktuMulai = new Date().toISOString()
  const waktuSelesai = new Date(Date.now() + durasi * 60 * 60 * 1000).toISOString()

  const { data: transaksi, error: txErr } = await supabase
    .from('transaksi')
    .insert({
      id_pelanggan: idPelanggan,
      id_device: idDevice,
      waktu_mulai: waktuMulai,
      waktu_selesai: waktuSelesai,
      durasi_jam: durasi,
      total_harga: totalHarga,
      status_transaksi: 'aktif',
    })
    .select()
    .single()

  if (txErr) {
    // Rollback device status
    await supabase.from('device').update({ status_device: 'tersedia' }).eq('id_device', idDevice)
    throw txErr
  }

  // 4. Insert menu items if any
  if (menuItems.length > 0) {
    const details = menuItems.map((item) => ({
      id_transaksi: transaksi.id_transaksi,
      id_menu: item.id_menu,
      jumlah: item.jumlah,
      subtotal: item.subtotal,
    }))

    const { error: detailErr } = await supabase.from('detail_transaksi').insert(details)

    if (detailErr) throw detailErr
  }

  // 5. Link paket if selected
  if (idPaket) {
    const { error: paketErr } = await supabase
      .from('transaksi_paket')
      .insert({
        id_transaksi: transaksi.id_transaksi,
        id_paket: idPaket,
      })

    if (paketErr) throw paketErr
  }

  return transaksi
}

// ─── Payment ──────────────────────────────────────────────────────

export async function createPembayaran({ idTransaksi, totalBayar, metodePembayaran }) {
  const { data, error } = await supabase
    .from('pembayaran')
    .insert({
      id_transaksi: idTransaksi,
      total_bayar: totalBayar,
      metode_pembayaran: metodePembayaran,
      waktu_bayar: new Date().toISOString(),
      status_pembayaran: 'lunas',
    })
    .select()
    .single()

  if (error) throw error

  // We DO NOT mark transaksi as selesai yet or release device.
  // The user is currently playing. Admin will finish it later.
  return data
}

// ─── Admin Queries ────────────────────────────────────────────────

export async function selesaikanTransaksi(idTransaksi, idDevice) {
  // Mark as selesai
  await supabase
    .from('transaksi')
    .update({ status_transaksi: 'selesai' })
    .eq('id_transaksi', idTransaksi)

  // Release device
  await supabase
    .from('device')
    .update({ status_device: 'tersedia' })
    .eq('id_device', idDevice)
}

export async function loginAdmin(username, password) {
  const { data, error } = await supabase
    .from('pegawai')
    .select('id_pegawai, nama_pegawai, jabatan')
    .eq('username', username)
    .eq('password', password)
    .single()

  if (error || !data) throw new Error('Username atau password salah')
  return data
}

export async function getAllPelanggan() {
  const { data, error } = await supabase
    .from('pelanggan')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function toggleMenuStatus(idMenu, tersedia) {
  const { data, error } = await supabase
    .from('menu')
    .update({ tersedia })
    .eq('id_menu', idMenu)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTransaksiWithDetails() {
  const { data, error } = await supabase
    .from('transaksi')
    .select(`
      *,
      pelanggan ( nama_pelanggan, no_hp ),
      device ( nama_device, tipe_device ),
      pembayaran ( total_bayar, metode_pembayaran, status_pembayaran, waktu_bayar ),
      detail_transaksi ( jumlah, subtotal, menu ( nama_menu, harga ) )
    `)
    .order('waktu_mulai', { ascending: false })

  if (error) throw error
  return data
}

export async function getTotalRevenue() {
  const { data, error } = await supabase
    .from('pembayaran')
    .select('total_bayar')
    .eq('status_pembayaran', 'lunas')

  if (error) throw error
  return data.reduce((sum, row) => sum + (row.total_bayar || 0), 0)
}

export async function getDailyTransactionCount() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('transaksi')
    .select('id_transaksi', { count: 'exact' })
    .gte('waktu_mulai', today.toISOString())

  if (error) throw error
  return data?.length || 0
}

export async function getActiveTransactions() {
  const { data, error } = await supabase
    .from('transaksi')
    .select(`
      *,
      pelanggan ( nama_pelanggan ),
      device ( nama_device, tipe_device )
    `)
    .eq('status_transaksi', 'aktif')
    .order('waktu_mulai', { ascending: false })

  if (error) throw error
  return data
}

export async function getRevenueByDate(days = 7) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('pembayaran')
    .select('total_bayar, waktu_bayar')
    .eq('status_pembayaran', 'lunas')
    .gte('waktu_bayar', since.toISOString())
    .order('waktu_bayar', { ascending: true })

  if (error) throw error

  // Group by date
  const grouped = {}
  data.forEach((row) => {
    const date = new Date(row.waktu_bayar).toLocaleDateString('id-ID')
    grouped[date] = (grouped[date] || 0) + row.total_bayar
  })

  return Object.entries(grouped).map(([date, total]) => ({ date, total }))
}
