require('dotenv').config()
const mongoose = require('mongoose')

// Conexión específica para clientes
let clienteDB

async function initializeClientDB() {
  if (clienteDB) return clienteDB // Evitar reconexión si ya existe
  clienteDB = mongoose.createConnection(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME_CLIENTS,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  })

  clienteDB.on('connected', () =>
    console.log('Conectado a la base de datos de clientes')
  )
  clienteDB.on('error', (error) =>
    console.error('Error al conectar a clientes:', error)
  )

  return clienteDB
}

const clientSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    nombre: String,
    tipo: String,
    correo: String,
    subscribed: {
      type: Boolean,
      default: true, // Por defecto, todos están suscritos
    },
    unsubscribeToken: {
      type: String,
      select: false, // No se incluye por defecto en las respuestas
    },
  },
  { _id: false }
)

let ClientModel

async function getClientModel() {
  const db = await initializeClientDB()
  if (!ClientModel) {
    ClientModel = db.model('Client', clientSchema, 'clientes')
  }
  return ClientModel
}

async function getTiposClients() {
   try {
     const ClientModel = await getClientModel()
     const tiposUnicos = await ClientModel.distinct('tipo')
     console.log(tiposUnicos)
    return tiposUnicos
   } catch (error) {
    console.error('Error al obtener tipos de clientes:', error)
    throw error
   } finally {
     if (clienteDB) {
       await clienteDB.close()
       console.log('Conexión a la base de datos de clientes cerrada')
     }
   }
 }

module.exports = { getTiposClients, getClientModel }
