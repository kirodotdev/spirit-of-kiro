import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SignInView from '../views/SignInView.vue'
import SignUpView from '../views/SignUpView.vue'
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
      path: '/signin',
      name: 'signin',
      component: SignInView,
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
      path: '/signup',
      name: 'signup',
      component: SignUpView,
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
          next('/signin')
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
  if (to.name === 'home' || to.name === 'signin' || to.name === 'signup') {
    next()
    return
  }

  // Check authentication for other routes
  if (!gameStore.isAuthenticated) {
    next('/signin')
  } else {
    next()
  }
})

// Authentication state changes are now watched in App.vue

export default router