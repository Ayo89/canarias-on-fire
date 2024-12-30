const mongoose = require('mongoose')

const EventSchema = new mongoose.Schema({
  categories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'category',
      // required: true
    },
  ],
  eventName: {
    type: String,
    // required: true
  },
  eventType: {
    type: String,
    enum: ['event', 'promotion'],
  },
  eventDate: {
    type: Object,
    // required: true
  },
  eventEndDate: {
    type: Object,
    default: null,
  },
  eventLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      // required: true,
    },
    address: {
      type: String,
      required: true,
    },
    postalCode: {
      type: Number,
      //required: true,
    },
    mapImageUrl: {
      type: String,
      // required: true,
    },
  },
  eventPrice: {
    type: Number,
  },
  isFree: {
    type: Boolean,
  },
  eventCapacity: {
    type: String,
  },
  eventDescription: {
    type: String,
  },
  startTime: {
    type: String,
  },
  endTime: {
    type: String,
  },
  externalUrl: {
    type: String,
  },
  eventImages: {
    type: Array,
  },
  eventDiscount: {
    type: String,
  },
  eventCodePromo: {
    type: String,
  },
  coverImage: {
    type: String,
  },
  selectedFile: {
    type: Object,
    deprecated: true,
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'location',
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'closed'],
    default: 'draft',
  },
  categoriesOfServices: {
    type: Array || String,
    default: '',
  },
  /*   date: {
    type: Date,
    required: true
  }, */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company',
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'payment',
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'subscription',
  },
  externalSource: {
    type: Boolean,
    default: false
  }
})
EventSchema.index({ eventLocation: '2dsphere' })

const EventModel = mongoose.model('event', EventSchema)

module.exports = EventModel
