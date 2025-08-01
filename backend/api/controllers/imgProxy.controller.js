const getImgUrlAndDecode = async (req, res) => {
  try {
    const encoded = req.query.src
    const decoded = Buffer.from(decodeURIComponent(encoded), 'base64').toString('utf-8')

    const response = await fetch(decoded)
    const contentType = response.headers.get('content-type')
    const buffer = await response.arrayBuffer()

    res.setHeader('Content-Type', contentType)
    res.send(Buffer.from(buffer))
  } catch (err) {
    console.error('❌ Error al cargar imagen:', err)
    res.status(500).send('Error cargando imagen')
  }
}

module.exports = {
  getImgUrlAndDecode,
}
