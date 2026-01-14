import { JSONFile } from 'lowdb/node'
import { dbFile, defaultData, initDatabase } from '../../helper/database.js'
import { Low } from 'lowdb'

class Donation {

    static async create(donationData) {
        await initDatabase()
        const adapter = new JSONFile(dbFile)
        const db = new Low(adapter, defaultData)

        if (!db.data.donations) {
            db.data.donations = []
        }

        const donation = {
            id: this.generateId(),
            donorName: donationData.donor_name || 'Anonymous',
            amount: donationData.amount_raw,
            message: donationData.message || '',
            saweriaId: donationData.id,
            email: donationData.email,
            createdAt: new Date(donationData.created_at).toISOString(),
            status: 'success' // Webhook usually receives successful payments
        }

        db.data.donations.unshift(donation) // Add to beginning
        // Keep only last 100 donations to avoid file bloat
        if (db.data.donations.length > 100) {
            db.data.donations = db.data.donations.slice(0, 100)
        }
        
        await db.write()

        return donation
    }

    static async getAll() {
        await initDatabase()
        const adapter = new JSONFile(dbFile)
        const db = new Low(adapter, defaultData)

        return db.data.donations || []
    }

    static generateId() {
        return Math.random().toString(36).substr(2, 9)
    }

    static formatPrice(price) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(price)
    }
}

export default Donation
