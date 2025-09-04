import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useUserStore = defineStore('user', () => {
    const user = ref(null)
    const profile = ref(null)
    const isLoggedIn = computed(() => !!user.value)

    async function fetchProfile() {
        if (!user.value?.id) { profile.value = null; return }
        const { data, error } = await supabase
            .from('profiles')
            .select('id, nickname, grade, storage_used')
            .eq('id', user.value.id)
            .single()
        if (error && error.code !== 'PGRST116') throw error
        profile.value = data ?? null
    }

    async function initOnce() {
        const { data } = await supabase.auth.getSession()
        user.value = data?.session?.user ?? null
        await fetchProfile()
        supabase.auth.onAuthStateChange(async (_e, session) => {
            user.value = session?.user ?? null
            await fetchProfile()
        })
    }

    async function signOut() {
        await supabase.auth.signOut()
        user.value = null
        profile.value = null
    }

    return { user, profile, isLoggedIn, fetchProfile, initOnce, signOut }
})