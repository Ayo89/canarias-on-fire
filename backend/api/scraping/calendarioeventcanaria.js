require('dotenv').config()
const puppeteer = require('puppeteer')
const Scraper = require('./scraperWithPuppeteer')
const { saveScrapedEvent } = require('../controllers/event.controller')
const { getMusicGenre } = require('../utils/index')
const waitForTimeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const calendarioUrl = process.env.CALENDARIO_EVENTOS_URL
if (!calendarioUrl) {
  throw new Error(
    'CALENDARIO_EVENTOS_URL is not defined in environment variables'
  )
}

const CATEGORY_KEYWORDS = {
  '6702ad06009a63bba556a1f3': [
    // music
    'música',
    'musica',
    'concierto',
    'banda',
    'dj',
    'recital',
    'festival',
    'rock',
    'pop',
    'jazz',
    'electrónica',
    'rap',
    'trap',
  ],
  '6702ae1e009a63bba556a1fd': [
    // cine
    'cine',
    'película',
    'film',
    'documental',
    'proyección',
    'cortometraje',
    'largometraje',
  ],
  '6702adbd009a63bba556a1f8': [
    // arts
    'arte',
    'pintura',
    'escultura',
    'exposición',
    'galería',
    'literatura',
    'teatro',
    'poesía',
    'dramaturgia',
    'artista',
    'dibujo',
    'obra',
  ],
  '6702ae2d009a63bba556a1fe': [
    // museo
    'museo',
    'historia',
    'arqueología',
    'cultura',
    'colección',
    'visita museo',
  ],
  '6702adf7009a63bba556a1fb': [
    // actividades
    'actividades',
    'visita guiada',
    'ruta',
    'tour',
    'paseo',
    'charla',
    'encuentro',
    'jornada',
    'evento',
    'experiencia',
    'evento especial',
  ],
  '6702ae68009a63bba556a201': [
    // taller
    'taller',
    'workshop',
    'clase',
    'curso',
    'formación',
    'aprendizaje',
    'seminario',
    'manualidades',
  ],
  '6702ae0c009a63bba556a1fc': [
    // baile
    'baile',
    'danza',
    'clase de baile',
    'coreografía',
    'salsa',
    'tango',
    'folklore',
    'bailar',
  ],
  '6702ad49009a63bba556a1f4': [
    // kids
    'niños',
    'infantil',
    'familia',
    'cuentos',
    'juegos',
    'títeres',
    'payasos',
    'taller infantil',
    'actividad para niños',
  ],
  '6702ad82009a63bba556a1f5': [
    // food & drinks
    'comida',
    'gastronomía',
    'bebidas',
    'vino',
    'degustación',
    'cata',
    'cerveza',
    'café',
    'foodtruck',
    'tapas',
  ],
  '6702ad9e009a63bba556a1f6': [
    // nightlife
    'fiesta',
    'discoteca',
    'bar',
    'pub',
    'copas',
    'noche',
    'after',
    'nocturno',
    'club',
    'dj set',
  ],
  '6702adb0009a63bba556a1f7': [
    // services
    'servicio',
    'reparación',
    'soporte',
    'asesoría',
    'técnico',
    'profesional',
    'consultoría',
  ],
}

const DEFAULT_CATEGORY = '6702adf7009a63bba556a1fb' // actividades

const checkCategory = (text) => {
  const txt = text.toLowerCase()
  for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (txt.includes(keyword)) return categoryId
    }
  }
  return DEFAULT_CATEGORY
}

const meses = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

const abrirCalendario = async (page) => {
  const selectorBoton = '.tribe-events-c-top-bar__datepicker-button'
  console.log('🔍 Buscando botón para abrir el calendario...')

  // Espera a que el botón esté presente y visible en el DOM
  await page.waitForSelector(selectorBoton, { visible: true })
  console.log('✅ Botón del calendario visible')

  // Asegura que el botón esté dentro del viewport para evitar errores de click
  await page.evaluate((selector) => {
    const el = document.querySelector(selector)
    if (el) el.scrollIntoView()
  }, selectorBoton)
  console.log('📦 Botón desplazado al viewport')

  // Hace clic sobre el botón del calendario
  console.log('🖱️ Haciendo clic en el botón del calendario...')
  await page.click(selectorBoton)

  // Espera a que el calendario se abra, verificando que aparezca alguna señal visual
  try {
    console.log('⏳ Esperando a que el calendario se abra...')
    await Promise.any([
      page.waitForSelector('.tribe-events-c-top-bar__datepicker-button--open', {
        timeout: 20000,
      }),
      page.waitForSelector('.datepicker-months', { timeout: 20000 }),
    ])
    console.log('📅 Calendario abierto correctamente')
  } catch (e) {
    throw new Error('❌ No se pudo abrir el calendario (¿cambió el HTML?)')
  }
}

const seleccionarMes = async (page, mesTexto) => {
  console.log(`➡️ Seleccionando mes: ${mesTexto}`)

  // Ejecuta código dentro del contexto del navegador (DOM)
  await page.evaluate((mesTexto) => {
    // Obtiene todos los elementos que representan meses dentro del calendario
    const meses = Array.from(
      document.querySelectorAll('.datepicker-months span.month')
    )

    // Busca el mes que coincida con el texto recibido
    const mes = meses.find(
      (el) => el.textContent.trim().toLowerCase() === mesTexto.toLowerCase()
    )

    // Muestra en la consola del navegador si se encontró el mes
    console.log('🧭 Mes encontrado en el DOM:', mes)

    // Si encontró el elemento del mes, hace clic sobre él
    if (mes) mes.click()
  }, mesTexto)

  console.log('🕒 Esperando a que se cierre el calendario...')

  // Espera a que el botón del calendario pierda la clase --open
  await page.waitForFunction(
    () => {
      const btn = document.querySelector(
        '.tribe-events-c-top-bar__datepicker-button'
      )
      return (
        btn &&
        !btn.classList.contains(
          'tribe-events-c-top-bar__datepicker-button--open'
        )
      )
    },
    { timeout: 20000 }
  )

  console.log('✅ Calendario cerrado correctamente tras seleccionar el mes')

  // Espera breve para asegurar que los eventos se carguen visualmente
  await page.waitForSelector(
    'a.tribe-events-calendar-month__calendar-event-title-link.tribe-common-anchor-thin.tooltipstered',
    { timeout: 20000 }
  )
  await waitForTimeout(1500)
  console.log(`📅 Mes "${mesTexto}" seleccionado y cargado completamente`)
}

const extraerEventos = async (page, mesTexto) => {
  try {
    await page.waitForSelector(
      'a.tribe-events-calendar-month__calendar-event-title-link',
      { timeout: 20000 }
    )
    console.log('✅ Eventos detectados en el DOM')
  } catch (e) {
    console.warn(
      `⚠️ No se encontraron eventos visibles para el mes ${mesTexto}`
    )
    return []
  }

  const eventos = await page.evaluate((mesTexto) => {
    const result = []
    const daysWithMore = new Set()

    const linksMore = document.querySelectorAll(
      '.tribe-events-calendar-month__day:not(.tribe-events-calendar-month__day--past) a.tribe-events-calendar-month__more-events-link'
    )
    console.log(
      '[🧪 evaluate] Número de enlaces "más eventos":',
      linksMore.length
    )

    linksMore.forEach((link) => {
      const dayElement = link.closest('.tribe-events-calendar-month__day')
      const date = dayElement?.dataset?.tribeDate
      if (date) daysWithMore.add(date)
    })

    const links = document.querySelectorAll(
      '.tribe-events-calendar-month__day:not(.tribe-events-calendar-month__day--past) a.tribe-events-calendar-month__calendar-event-title-link'
    )
    console.log(
      '[🧪 evaluate] Número de eventos individuales visibles:',
      links.length
    )

    links.forEach((link) => {
      const dayElement = link.closest('.tribe-events-calendar-month__day')
      const date = dayElement?.dataset?.tribeDate
      if (!daysWithMore.has(date)) {
        const titulo =
          link.querySelector('h3')?.textContent?.trim() ||
          link.textContent.trim()
        const url = link.href
        if (titulo && url) {
          result.push({ mes: mesTexto, titulo, url, esMultiple: false })
        }
      }
    })

    const linksMoreArray = Array.from(linksMore).map((link) => link.href)
    console.log('[🧪 evaluate] Links "más eventos" extraídos:', linksMoreArray)
    return { eventos: result, linksMore: linksMoreArray }
  }, mesTexto)

  console.log(
    `[ℹ️] Eventos únicos encontrados en mes ${mesTexto}:`,
    eventos.eventos.length
  )
  console.log(`[ℹ️] Enlaces a páginas con más eventos:`, eventos.linksMore)

  const eventosFinales = [...eventos.eventos]

  for (const urlMultipleEvents of eventos.linksMore.slice(0, 2)) {
    try {
      console.log(
        `➡️ Navegando a página de eventos múltiples: ${urlMultipleEvents}`
      )
      await page.goto(urlMultipleEvents, { waitUntil: 'networkidle0' })
      console.log(`✅ Página cargada correctamente: ${urlMultipleEvents}`)

      await page.waitForSelector(
        '.tribe-events-calendar-day__event-featured-image-link',
        { timeout: 10000 }
      )
      console.log('✅ Selector de eventos múltiples encontrado.')

      const nuevosEventos = await page.evaluate((mesTexto) => {
        const result = []
        const links = document.querySelectorAll(
          '.tribe-events-calendar-day__event-featured-image-link'
        )
        const titulo = document.querySelectorAll('.tribe-events-calendar-day__event-details h3')
        for (const link of links) {
          const url = link.href
          if (url) {
            result.push({
              mes: mesTexto,
              titulo,
              url,
              esMultiple: true,
            })
          }
        }

        return result
      }, mesTexto)
      await waitForTimeout(Math.floor(Math.random() * 3001) + 5000)

      console.log(`[📥] Eventos múltiples extraídos: ${nuevosEventos.length}`)
      nuevosEventos.forEach((ev) =>
        console.log(`🔗 [Múltiple] ${ev.titulo} - ${ev.url}`)
      )

      eventosFinales.push(...nuevosEventos)
    } catch (e) {
      console.warn(
        `⚠️ Error al procesar eventos múltiples en ${urlMultipleEvents}:`,
        e.message
      )
    }
  }

  console.log(`📆 Eventos encontrados en ${mesTexto}: ${eventosFinales.length}`)
  eventosFinales.forEach((ev) => console.log(`🔗 ${ev.titulo} - ${ev.url}`))
  await page.goto(calendarioUrl)
  await page.waitForSelector('.tribe-events-c-top-bar__datepicker-button')
  return eventosFinales
}

const extraerDetalles = async (page, url) => {
  await page.goto(url, { waitUntil: 'networkidle0' })

  const {
    titulo,
    imagenOriginal,
    descripcion,
    startTime,
    endTime,
    startDateISO,
    externalUrl,
    address,
  } = await page.evaluate(() => {
    const titulo = document.querySelector('h1')?.textContent?.trim() || ''

    const imagenOriginal =
      document.querySelector('img.wp-post-image')?.src || ''

    const descripcion =
      document.querySelector('div.epta-content-area')?.innerText.trim() || ''

    // Enlace externo (solo si es Instagram)
    const anchor = document.querySelector('.tribe-events-event-url a')
    const href = anchor?.href || ''
    const externalUrl = href.startsWith('https://www.instagram.com/')
      ? href
      : ''

    // Horas y fecha
    const timeDiv = document.querySelector(
      '.tribe-events-abbr.tribe-events-start-time.published.dtstart'
    )
    let startTime = null
    let endTime = null
    let startDateISO = null

    if (timeDiv) {
      startDateISO = timeDiv.getAttribute('title') || null
      const text = timeDiv.textContent || ''
      const match = text.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)
      if (match) {
        startTime = match[1]
        endTime = match[2]
      }
    }

    const address =
      document.querySelector('.tribe-street-address')?.innerText.trim() || ''

    return {
      titulo,
      imagenOriginal,
      descripcion,
      startTime,
      endTime,
      externalUrl,
      address,
      startDateISO,
    }
  })

  // Procesar fecha si existe
  let year = ''
  let month = ''
  let day = ''
  if (startDateISO) {
    const date = new Date(startDateISO)
    year = date.getFullYear().toString()
    month = (date.getMonth() + 1).toString()
    day = date.getDate().toString().padStart(2, '0')
  }

  // Codificar imagen (protegida)
  const imagen = encodeURIComponent(
    Buffer.from(imagenOriginal).toString('base64')
  )

  // Categoría a partir del título
  const category = checkCategory(titulo)

  // Resultado final
  return {
    titulo,
    descripcion,
    imagen,
    category,
    startTime,
    endTime,
    year,
    month,
    day,
    externalUrl,
    address,
    isProxied: true,
  }
}

const scrapearDesdeMesActualHastaDiciembre = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--disable-features=TranslateUI', '--window-size=1280,800'],
  })
  const page = await browser.newPage()
  await page.setViewport({
    width: 1280,
    height: 800,
  })
  const resultados = []

  await page.goto(calendarioUrl, { waitUntil: 'networkidle0' })

  try {
    await page.waitForSelector('.cmplz-deny', { timeout: 20000 })
    await page.click('.cmplz-deny')
    console.log('🍪 Cookies rechazadas')
    await waitForTimeout(1500) // espera breve para que se cierre
  } catch (err) {
    console.log('✅ No apareció el banner de cookies')
  }

  const mesActualIndex = new Date().getMonth() // 0 = Ene, ..., 11 = Dic
  const mesesDesdeActual = meses.slice(mesActualIndex) // Ej: ['Ago', 'Sep', ..., 'Dic']

  for (const mes of mesesDesdeActual.slice(0, 2)) {
    console.log(`📆 Scrapeando mes: ${mes}`)
    await abrirCalendario(page)
    await seleccionarMes(page, mes)

    const eventos = await extraerEventos(page, mes)
    resultados.push(...eventos)
  }

  for (const evento of resultados.slice(0, 2)) {
    // puedes quitar slice para hacerlo con todos
    console.log(`🔍 Extrayendo detalles para: ${evento.titulo}`)
    const detalles = await extraerDetalles(page, evento.url)
    Object.assign(evento, detalles)
    await waitForTimeout(Math.floor(Math.random() * 3001) + 5000)
  }
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1 // ¡Cuidado! getMonth() va de 0 (enero) a 11 (diciembre)

  // Crear una fecha con el día 0 del mes siguiente => da el último día del mes actual
  const lastDay = new Date(year, month, 0).getDate()
  /*   for (const event of resultados) {
    const eventToSave = {
      description: event.descripcion,
      imgUrl: event.imagen,
      link: event.externalUrl,
      startTime: event.startTime,
      lastDay: event.lastDay,
      lastMonth: event.month ? eventLastDay.lastMonth : event.startMonth,
      lastYear: eventLastDay?.lastYear
        ? eventLastDay.lastYear
        : event.startYear,
      category: event.category,
      musicType: musicGenre || null,
      location: event.location || null,
      island: 'Tenerife',
      userId: process.env.ADMIN_ID,
    }
  } */
  resultados.forEach((item) => console.log(item))
  await browser.close()
  console.log('✅ Scraping completo. Resultados guardados en eventos.json')
}

module.exports = scrapearDesdeMesActualHastaDiciembre
