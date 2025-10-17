import axios from 'axios'

const EXPEDITIONS = [
  { slug: 'shopee-express', label: 'Shopee Express (SPX)' },
  { slug: 'ninja', label: 'Ninja' },
  { slug: 'lion-parcel', label: 'Lion Parcel' },
  { slug: 'pos-indonesia', label: 'Pos Indonesia' },
  { slug: 'tiki', label: 'TIKI' },
  { slug: 'acommerce', label: 'aCommerce' },
  { slug: 'gtl-goto-logistics', label: 'GTL (GoTo Logistics)' },
  { slug: 'paxel', label: 'Paxel' },
  { slug: 'sap-express', label: 'SAP Express' },
  { slug: 'indah-logistik-cargo', label: 'Indah Logistik Cargo' },
  { slug: 'lazada-express-lex', label: 'Lazada Express (LEX)' },
  { slug: 'lazada-logistics', label: 'Lazada Logistics' },
  { slug: 'janio-asia', label: 'Janio Asia' },
  { slug: 'jet-express', label: 'JET Express' },
  { slug: 'pcp-express', label: 'PCP Express' },
  { slug: 'pt-ncs', label: 'NCS' },
  { slug: 'nss-express', label: 'NSS Express' },
  { slug: 'grab-express', label: 'Grab Express' },
  { slug: 'rcl-red-carpet-logistics', label: 'RCL (Red Carpet Logistics)' },
  { slug: 'qrim-express', label: 'QRIM Express' },
  { slug: 'ark-xpress', label: 'ARK Xpress' },
  { slug: 'standard-express-lwe', label: 'Standard Express (LWE)' },
  { slug: 'luar-negeri-beacukai', label: 'Luar Negeri (Bea Cukai)' },
]

function buildExpeditionMenu(resi, prefix = '.') {
  let txt = 'Pilih ekspedisi untuk nomor resi berikut:\n'
  txt += `- Resi: ${resi}\n\n`
  txt += 'Ketik salah satu format di bawah ini:\n'
  txt += `- ${prefix}cekresi ${resi} <nomor>\n`
  txt += `- ${prefix}cekresi ${resi} <slug-ekspedisi>\n\n`
  txt += 'Daftar ekspedisi:\n'
  EXPEDITIONS.forEach((e, i) => {
    txt += `${i + 1}. ${e.label}  (${e.slug})\n`
  })
  return txt
}

function parseExpedition(arg) {
  if (!arg) return null
  const n = Number(arg)
  if (Number.isInteger(n) && n >= 1 && n <= EXPEDITIONS.length) {
    return EXPEDITIONS[n - 1].slug
  }
  const lower = String(arg).toLowerCase()
  const found = EXPEDITIONS.find(e => e.slug === lower)
  return found?.slug || null
}

export const handler = {
  command: ['cekresi'],
  category: 'tools',
  help: 'Cek status resi pengiriman.\n\nFormat:\n- .cekresi <resi> → tampilkan pilihan ekspedisi\n- .cekresi <resi> <nomor|slug-ekspedisi> → cek langsung',
  exec: async ({ sock, m, args }) => {
    try {
      const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').trim()
      if (!input) {
        await m.reply('Masukkan nomor resi.\nContoh: .cekresi SPXID05092355472A')
        return
      }

      const parts = input.split(/\s+/)
      const resi = parts[0]
      const expeditionArg = parts[1] || ''

      if (!expeditionArg) {
        // Kirim daftar ekspedisi untuk dipilih
        const menu = buildExpeditionMenu(resi, '.')
        await m.reply(menu)
        return
      }

      const expedition = parseExpedition(expeditionArg)
      if (!expedition) {
        await m.reply('Ekspedisi tidak valid. Pilih menggunakan nomor pada daftar atau masukkan slug valid.\n' + buildExpeditionMenu(resi, '.'))
        return
      }

      await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

      const url = `https://api.nekolabs.my.id/tools/cekresi?receipt_num=${encodeURIComponent(resi)}&expedition=${encodeURIComponent(expedition)}`
      const { data } = await axios.get(url, { timeout: 120000 })

      if (!data?.success || !data?.result) {
        throw new Error('Response API tidak valid')
      }

      const result = data.result
      const ok = !!result.success
      if (!ok) {
        throw new Error(result?.message || 'Gagal cek resi')
      }

      const d = result.data || {}
      let msg = '📦 Hasil Cek Resi\n'
      msg += `- Resi: ${d.resi || resi}\n`
      msg += `- Ekspedisi: ${d.ekspedisi || '-'}\n`
      msg += `- Kode: ${d.ekspedisiCode || '-'}\n`
      msg += `- Status: ${d.status || '-'}\n`
      msg += `- Tgl Kirim: ${d.tanggalKirim || '-'}\n`
      msg += `- CS: ${d.customerService || '-'}\n`
      msg += `- Posisi Terakhir: ${d.lastPosition || '-'}\n`
      if (d.shareLink) msg += `- Link: ${d.shareLink}\n`
      if (Array.isArray(d.history) && d.history.length) {
        msg += '\nRiwayat:\n'
        for (const h of d.history) {
          msg += `- ${h.tanggal || '-'} — ${h.keterangan || '-'}\n`
        }
      }

      await m.reply(msg)
      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch (error) {
      console.error('Error in cekresi:', error)
      await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      await m.reply('❌ Gagal cek resi: ' + (error?.message || 'Unknown error'))
    }
  }
}

export default handler

