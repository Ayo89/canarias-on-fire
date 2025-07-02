require('dotenv').config()
const connectDB = require('../config/db')
const Scraper = require('./scraperWithPuppeteer')
const { saveScrapedEvent } = require('../controllers/event.controller')
const getLocationData = require('../services/geolocation')

const ACTIVIDADES_URL = process.env.TEA_TENERIFE_URL_ACT
const CINE_URL = process.env.TEA_TENERIFE_URL_CINE

if (!ACTIVIDADES_URL || !CINE_URL) {
  throw new Error(
    '❌ TEA_TENERIFE_URL_ACT o TEA_TENERIFE_URL_CINE is not defined in .env'
  )
}

const CATEGORY_IDS = {
  actividades: '6702adf7009a63bba556a1fb',
  cine: '6702adbd009a63bba556a1f8',
}

function parseEventDates(text) {
  const monthMap = {
    ene: 0,
    feb: 1,
    mar: 2,
    abr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    ago: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dic: 11,
  }

  const regex =
    /(\d{1,2})\s+([a-zñ]+)\s+(\d{4})(?:\s*>\s*(\d{1,2})\s+([a-zñ]+)\s+(\d{4}))?/i
  const match = text.match(regex)
  if (!match) return null

  const [, day1, month1, year1, day2, month2, year2] = match

  const m1 = monthMap[month1.slice(0, 3).toLowerCase()]
  const m2 = month2 ? monthMap[month2.slice(0, 3).toLowerCase()] : null

  const from = new Date(Number(year1), m1, Number(day1))
  const to =
    day2 && year2 ? new Date(Number(year2), m2, Number(day2)) : undefined

  return { from, to }
}

const scrapeEventDetails = async (url, scraper, isCine = false) => {
  try {
    const $ = await scraper.fetchHTML(url)

    // Obtener descripción dependiendo del tipo
    let description = ''
    if (isCine) {
      description = $('.intro .text p')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((text) => text !== '')
        .join('\n\n')
    } else {
      description = $('.two-columns p')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((text) => text !== '')
        .join('\n\n')
    }

    // Obtener imagen dependiendo del tipo
    let imgUrl = ''
    if (isCine) {
      const imgSrc = $('.synopsis .image img').attr('src')
      imgUrl = imgSrc
        ? imgSrc.startsWith('http')
          ? imgSrc
          : `https://teatenerife.es${imgSrc}`
        : ''
    } else {
      // Se mantiene como estaba: la imagen ya se obtiene en el listado de actividades
      imgUrl = '' // el valor real se setea fuera
    }

    return { description, imgUrl }
  } catch (err) {
    console.error(`❌ Error fetching details from ${url}`, err)
    return { description: '', imgUrl: '' }
  }
}

const setupParser = (scraper, url, categoryId, isCine = false) => {
  scraper.addParser(url, async ($) => {
    
    const events = []
    const promises = []
    const items = $('.items .item.active')
    console.log(
      `👀 Encontrados ${items.length} items en ${isCine ? 'CINE' : 'ACTIVIDADES'}`
    )

    $('.items .item.active').each((_, el) => {
      const item = $(el)
      const dateText = item.find('.text .date').first().text().trim()
      const dateParsed = parseEventDates(dateText)
      if (!dateParsed) return

      const title = item.find('h3').first().text().trim()
      const anchor = item.find('a.more').first()
      const link = anchor.attr('href') || ''
      const fullLink = link.startsWith('http')
        ? link
        : `https://teatenerife.es${link}`

      let imgUrl = ''
      if (!isCine) {
        const imgEl = item.find('.image img')
        if (imgEl.length) {
          const rawImg = imgEl.attr('src') || ''
          imgUrl = rawImg.startsWith('http')
            ? rawImg
            : `https://teatenerife.es${rawImg}`
        }
      }

      promises.push(
        (async () => {
          const { description, imgUrl: detailImg } = await scrapeEventDetails(
            fullLink,
            scraper,
            isCine
          )
          const location = 'TEA Tenerife'
          const { postalCode, coordinates, mapImageUrl } =
            await getLocationData(location, 'Tenerife')

          events.push({
            title,
            category: categoryId,
            startYear: dateParsed.from.getFullYear(),
            lastYear: dateParsed.to
              ? dateParsed.to.getFullYear()
              : dateParsed.from.getFullYear(),
            startMonth: String(dateParsed.from.getMonth() + 1).padStart(
              2,
              '0'
            ),
            lastMonth: dateParsed.to
              ? String(dateParsed.to.getMonth() + 1).padStart(2, '0')
              : String(dateParsed.from.getMonth() + 1).padStart(2, '0'),
            startDay: String(dateParsed.from.getDate()).padStart(2, '0'),
            lastDay: dateParsed.to
              ? String(dateParsed.to.getDate()).padStart(2, '0')
              : String(dateParsed.from.getDate()).padStart(2, '0'),
            time: null,
            endTime: null,
            description,
            location,
            coordinates: coordinates || null,
            mapImageUrl: mapImageUrl || '',
            postalCode: postalCode || '',
            imgUrl: isCine ? detailImg : imgUrl,
            fullLink,
            island: 'Tenerife',
            userId: process.env.ADMIN_ID,
          })
        })()
      )
    })

    await Promise.all(promises)
    return events
  })
}

const scrapeTeaTenerife = async () => {
  const scraper = new Scraper()

  // Parsers para actividades y cine
  setupParser(scraper, ACTIVIDADES_URL, CATEGORY_IDS.actividades, false)
  setupParser(scraper, CINE_URL, CATEGORY_IDS.cine, true)

  try {
    console.log('🔎 Scraping TEA Tenerife - Actividades...')
    const eventsAct = await scraper.scrape(ACTIVIDADES_URL)
console.log('✅ Parser ACTIVIDADES configurado')
    console.log('🔎 Scraping TEA Tenerife - Cine...')
    const eventsCine = await scraper.scrape(CINE_URL)
console.log('✅ Parser CINE configurado')
    const allEvents = [...eventsAct, ...eventsCine]

    for (const event of allEvents) {
      try {
        const status = await saveScrapedEvent(event)
        if (status === 'duplicated') {
          console.log(`⚠️  Duplicated: ${event.title}`)
        } else {
          console.log(`✅ Saved: ${event.title}`)
        }
      } catch (err) {
        console.error(`❌ Failed to save: ${event.title}`, err)
      }
    }
    console.log('🎉 TEA Tenerife scraping completed!')
  } catch (err) {
    console.error('🔥 Error during TEA Tenerife scraping:', err)
  }
}

module.exports = scrapeTeaTenerife
