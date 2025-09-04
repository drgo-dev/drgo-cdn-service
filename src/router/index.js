import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const HomeView = () => import('@/views/HomeView.vue')
const LoginView = () => import('@/views/LoginView.vue')
const SignupView = () => import('@/views/SignupView.vue')
const SignatureView = () => import('@/views/SignatureView.vue') // 파일명 그대로 사용

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', name: 'home', component: HomeView },
        { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
        { path: '/signup', name: 'signup', component: SignupView, meta: { guestOnly: true } },
        { path: '/signature', name: 'signature', component: SignatureView, meta: { requiresAuth: true } },
        { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
})

// Pinia 상태만 사용하여 간단 가드
router.beforeEach((to) => {
    const store = useUserStore()
    const isAuthed = !!store.user?.id
    if (to.meta.requiresAuth && !isAuthed) return { name: 'login' }
    if (to.meta.guestOnly && isAuthed) return { name: 'home' }
    return true
})

export default router