<template>
  <div class="p-4 sm:p-12 text-sm">
    <div v-if="userStore.selectedUser" class="text-center mb-4">
      <h2 class="text-3xl font-bold text-primary">{{ $t('paymentsOption.manageSub')}} {{ userStore.selectedUser.companyName || userStore.selectedUser.username }}</h2>
      <p class="mt-2 text-lg font-medium text-gray-300">
        {{ $t('paymentsOption.currentPlan')}} {{ getCurrentPlanName.toUpperCase() }}
      </p>
    </div>
    <div v-else class="text-center sm:mb-4">
      <h2 class="text-2xl font-bold text-primary">{{ $t('paymentsOption.choose')}}</h2>
      <p class="mt-2 text-md text-gray-500">
        {{ $t('paymentsOption.findPerfect')}}
      </p>
    </div>
    <PaymentOptions 
      :payments="paymentStore.payments"
      :stripePayment="true"
      @planSelected="handlePlanSelection"
    />
  </div>
</template>

<script setup>
const route = useRoute()
const userStore = useUserStore()
const paymentStore = usePaymentStore()
const subscriptionStore = useSubscriptionStore()

onMounted(async () => {
  const userId = route.query.userId
  if (userId) {
    userStore.selectedUser = userStore.users.find(user => user._id === userId)
  }
  await subscriptionStore.fetchSubscriptions()
})

const getCurrentPlanName = computed(() => {
  if (!userStore.selectedUser || !userStore.selectedUser.activeSubscription || !userStore.selectedUser.activeSubscription.plan) {
    return 'No plan'
  }
  const subscription = subscriptionStore.subscriptions.find(
    sub => sub._id === userStore.selectedUser.activeSubscription.plan
  )
  return subscription ? subscription.name : 'Unknown plan'
})

const handlePlanSelection = async (plan) => {
  if (userStore.selectedUser) {
    try {
      const result = await userStore.updateUserSubscription(userStore.selectedUser._id, plan._id)
      if (result.success) {
        userStore.selectedUser = result.user
        alert('Subscription updated successfully')
      } else {
        alert(result.error || 'Failed to update subscription')
      }
    } catch (error) {
      console.error('Error updating subscription:', error)
      alert('An error occurred while updating the subscription')
    }
  } else {
    subscriptionStore.setSelectedPlan(plan)
    // router.push('/register')
  }
}
</script>