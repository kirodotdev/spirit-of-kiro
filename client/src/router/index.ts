import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AuthView from '../views/AuthView.vue'
import GameView from '../views/GameView.vue'
import { useGameStore } from '../stores/game'
import { watch } from 'vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthView,
      beforeEnter: (to, from, next) => {
        const gameStore = useGameStore()
        if (gameStore.isAuthenticated) {
          next('/play')
        } else {
          next()
        }
      }
    },
    {
      path: '/play',
      name: 'game',
      component: GameView,
      beforeEnter: (to, from, next) => {
        const gameStore = useGameStore()
        if (!gameStore.isAuthenticated) {
          next('/auth')
        } else {
          next()
        }
      }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// Add global navigation guard
router.beforeEach((to, from, next) => {
  const gameStore = useGameStore()

  // Always allow access to home and auth routes
  if (to.name === 'home' || to.name === 'auth') {
    next()
    return
  }

  // Check authentication for other routes
  if (!gameStore.isAuthenticated) {
    next('/auth')
  } else {
    next()
  }
})

// Authentication state changes are now watched in App.vue

export default router