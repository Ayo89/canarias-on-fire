const router = require('express').Router()
const { getImgUrlAndDecode} = require('../controllers/imgProxy.controller')

router.get('/', getImgUrlAndDecode)

module.exports = router