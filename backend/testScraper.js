require('dotenv').config()

const dbConnect = require('./api/config/db')
const slugify = require('slugify')
const User = require('./api/models/user.model.js')
const Event = require('./api/models/event.model.js')
const Company = require('./api/models/company.model.js')
const { updateSlugs, fixBrokenDates } = require('./api/utils/index.js')
const scrapperGobiernoExpo = require('./api/scraping/gobiernoCanariasExpo')
const scrapeAytoTenerife = require('./api/scraping/ayuntamientoTenerife.js')
const scrapeAytoLasPalmas = require('./api/scraping/ayuntamientoLasPalmas.js')
const scrapeCabildoGranCanaria = require('./api/scraping/culturaCabildoLasPalmas.js')
const scrapeGobCanarias = require('./api/scraping/gobiernoCanarias')
const scrapeTeaTenerife = require('./api/scraping/teaTenerife')
const scrapeLaAgenda = require('./api/scraping/laAgenda.js')
const { closePassedEvents } = require('./api/controllers/event.controller.js')
const scrapearDesdeMesActualHastaDiciembre = require('./api/scraping/calendarioeventcanaria.js')
const Scraper = require('./api/scraping/scraperWithPuppeteer.js')
const scraper = new Scraper()
const {
  removeDuplicateEvents,
} = require('./api/controllers/event.controller.js')

async function migrateMusicType() {
  const events = await Event.find({}).lean()
  let updated = 0

  for (const event of events) {
    let orig = event.musicType
    let newMusicType = null

    // Si está vacío, nulo, undefined, etc → []
    if (!orig || (Array.isArray(orig) && orig.length === 0)) {
      newMusicType = []
    }

    // Si es string → [string]
    else if (typeof orig === 'string') {
      newMusicType = [orig]
    }

    // Si es array plano de strings → OK, nada que hacer
    else if (Array.isArray(orig) && orig.every(x => typeof x === 'string')) {
      continue
    }

    // Si es array anidado u otra estructura rara
    else if (Array.isArray(orig)) {
      newMusicType = orig.flat(Infinity).filter(x => typeof x === 'string')
    }

    // Si hemos decidido una corrección, actualizar
    if (newMusicType !== null) {
      await Event.updateOne({ _id: event._id }, { $set: { musicType: newMusicType } })
      updated++
    }
  }

  console.log(`Actualizados ${updated} eventos`)
}

const normalizeTitle = (title) =>
  title
    .normalize('NFD') // elimina acentos
    .replace(/[\u0300-\u036f]/g, '') // elimina diacríticos
    .replace(/[^\w\s-]/g, '') // elimina caracteres no deseados
    .trim()

const normalizeAllEventNames = async () => {
  try {
    const events = await Event.find({})
    for (const ev of events) {
      if (ev.eventName) {
        const normalized = normalizeTitle(ev.eventName)
        if (ev.eventName !== normalized) {
          ev.eventName = normalized
          await ev.save()
          console.log(`Evento ${ev._id} actualizado a: ${normalized}`)
        }
      }
    }
    console.log('Normalización completada para todos los eventos.')
  } catch (error) {
    console.error('Error normalizando eventos:', error)
  }
}

async function checkDuplicateCifs() {
  const duplicates = await User.aggregate([
    {
      $group: {
        _id: "$cif",
        count: { $sum: 1 },
        docs: { $push: "$_id" },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
  ])

  if (duplicates.length > 0) {
    console.log("🔁 CIFs duplicados encontrados:")
    for (const dup of duplicates) {
      console.log(`- CIF "${dup._id}" tiene ${dup.count} registros`)
    }
  } else {
    console.log("✅ No hay duplicados de CIF")
  }


}

async function main() {
  try {
    await dbConnect()
    //await migrateMusicType()
   /*  await scrapeGobCanarias()
    await scrapeAytoLasPalmas()
    await scrapeAytoTenerife()
    await scrapeTeaTenerife()
    await scrapeLaAgenda()
    await scrapeCabildoGranCanaria() 
    await removeDuplicateEvents() */
    //await updateSlugs()
    //await fixBrokenDates()
    //await normalizeAllEventNames()
    //await Company.init()
    //await closePassedEvents()
    await scrapearDesdeMesActualHastaDiciembre()
    console.log('Scraping completed successfully.')
  } catch (error) {
    console.error('Error during scraping:', error)
  } finally {
    await scraper.closeBrowser()
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error in main function:', error)
    process.exit(1)
  })
