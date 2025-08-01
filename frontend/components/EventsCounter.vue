<template>
  <div class="flex flex-col items-center p-6">
    <hr class="w-full border-t border-gray-300 mb-4" />
    <div class="flex items-center justify-center w-full px-4">
      <p class="text-2xl font-bold text-center lg:text-3xl">
        <span class="">{{ $t('allEvents') }}</span>
      </p>
    </div>
    <hr class="w-full border-t border-gray-300 mt-4" />
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
const eventStore = useEventStore()

const { events } = storeToRefs(eventStore)

const { startOfWeek, endOfWeek } = calculatedDates()

const blah = ref([])

const activeEventsCount = computed(() => {
  return events.value.filter((event) => {
    if (event.eventType === 'promotion') return false
    const eventDate = new Date(
      event.eventDate?.year,
      parseInt(event.eventDate?.month) - 1,
      parseInt(event.eventDate?.day)
    )
    const eventEndDate = new Date(
      event.eventEndDate?.year,
      parseInt(event.eventEndDate?.month) - 1,
      event.eventEndDate?.day
    )

    return (
      event.status === 'published' &&
      event.eventType === 'event' &&
      ((event.userId?.isActive && event.userId?.isValidated) ||
        event.userId?.role === 'admin')
    )
  })
})
</script>
