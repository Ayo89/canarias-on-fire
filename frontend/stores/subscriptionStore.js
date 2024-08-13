import { defineStore } from 'pinia'

export const useSubscriptionStore = defineStore('subscriptionStore', {
  state: () => ({
    subscriptions: [],
    selectedPlan: null,
    status: null,
  }),
  actions: {
    setSelectedPlan(plan) {
      this.selectedPlan = plan
    },

    async fetchSubscriptions() {
      try {
        const data = await $fetch(`${useRuntimeConfig().public.apiBaseUrl}/subscriptions`)
        this.subscriptions = data.result
      } catch (error) {
        console.error('Error fetching subscriptions:', error)
      }
    },

    getBasicSubscription() {
      return this.subscriptions.find(sub => sub.name === 'basic')
    },

    async upgradeSubscription(userId, newPlanId) {
      try {
        const { data } = await useFetch(`${useRuntimeConfig().public.apiBaseUrl}/subscriptions/upgrade/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify({ newPlanId }),
          headers: {
            'Content-Type': 'application/json',
          },
        })
        if (data.value) {
          return { success: true, ...data.value }
        } else {
          return { success: false, error: 'No data received from server' }
        }
      } catch (error) {
        console.error('Error upgrading subscription:', error)
        return { success: false, error: 'Failed to upgrade subscription' }
      }
    },

    async cancelSubscription(companyId) {
      try {
        const response = await $fetch(`${useRuntimeConfig().public.apiBaseUrl}/subscriptions/cancel/${companyId}`, {
          method: 'POST'
        })
        if (response.success) {
          this.selectedPlan = null
          this.status = 'canceling'
          return { success: true }
        } else {
          return { success: false, message: response.message }
        }
      } catch (error) {
        console.error('Error canceling subscription:', error)
        return { success: false, message: error.message }
      }
    },

    async reactivateSubscription(companyId) {
      try {
        const response = await $fetch(`${useRuntimeConfig().public.apiBaseUrl}/subscriptions/reactivate/${companyId}`, {
          method: 'POST'
        })
        if (response.success) {
          this.selectedPlan = response.plan
          this.status = 'active'
          return { success: true }
        } else {
          return { success: false, message: response.message }
        }
      } catch (error) {
        console.error('Error reactivating subscription:', error)
        return { success: false, message: error.message }
      }
    }
  },
})