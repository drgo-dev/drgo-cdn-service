<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'
import { uploadToR2 } from '@/api/upload'

const userStore = useUserStore()

// 선택된 파일 & 미리보기 URL
const imageFile = ref(null)
const audioFile = ref(null)
const imagePreview = ref('')
const audioPreview = ref('')

// 상태
const isSaving = ref(false)
const error = ref('')
const success = ref('')

// 목록(세트)
const sets = ref([])
const isLoadingList = ref(false)

// ---- 유틸: 미리보기 URL 정리 ----
function setImagePreview(file) {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imagePreview.value = file ? URL.createObjectURL(file) : ''
}
function setAudioPreview(file) {
  if (audioPreview.value) URL.revokeObjectURL(audioPreview.value)
  audioPreview.value = file ? URL.createObjectURL(file) : ''
}
onBeforeUnmount(() => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  if (audioPreview.value) URL.revokeObjectURL(audioPreview.value)
})

// ---- 파일 선택 핸들러 ----
function onPickImage(e) {
  const f = e.target.files?.[0]
  e.target.value = '' // 같은 파일 재선택 가능
  if (!f) return
  // 간단 검증
  if (!f.type?.startsWith('image/')) {
    return (error.value = '이미지 파일을 선택하세요.')
  }
  if (f.size > 10 * 1024 * 1024) {
    return (error.value = '이미지 크기는 최대 10MB까지 가능합니다.')
  }
  error.value = ''
  imageFile.value = f
  setImagePreview(f)
}

function onPickAudio(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  if (!f.type?.startsWith('audio/')) {
    return (error.value = '오디오 파일을 선택하세요.')
  }
  if (f.size > 20 * 1024 * 1024) {
    return (error.value = '오디오 크기는 최대 20MB까지 가능합니다.')
  }
  error.value = ''
  audioFile.value = f
  setAudioPreview(f)
}

// ---- 목록 로딩 (signature_sets) ----
async function fetchSets() {
  const uid = userStore.user?.id
  if (!uid) { sets.value = []; return }
  isLoadingList.value = true
  const { data, error: err } = await supabase
      .from('signature_sets')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
  isLoadingList.value = false
  if (err) {
    console.warn('fetchSets:', err.message)
    sets.value = []
  } else {
    sets.value = data || []
  }
}

watch(() => userStore.user?.id, fetchSets, { immediate: true })

// ---- 세트 저장 (두 파일 업로드 후 한 행 insert) ----
async function saveSignatureSet() {
  success.value = ''
  error.value = ''
  if (!imageFile.value || !audioFile.value) {
    return (error.value = '이미지와 오디오를 모두 선택하세요.')
  }

  isSaving.value = true
  try {
    // 1) 두 파일을 병렬 업로드 (R2 업로드 API)
    const [img, aud] = await Promise.all([
      uploadToR2(imageFile.value),  // { ok, publicUrl, ... }
      uploadToR2(audioFile.value),
    ])

    // 2) DB에 한 행 insert
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) throw new Error('세션 만료: 다시 로그인 해주세요.')

    const payload = {
      user_id: user.id,
      image_url: img.publicUrl,
      image_name: imageFile.value.name,
      image_size: imageFile.value.size,
      audio_url: aud.publicUrl,
      audio_name: audioFile.value.name,
      audio_size: audioFile.value.size,
    }

    const { error: dbErr } = await supabase
        .from('signature_sets')
        .insert(payload)

    if (dbErr) throw dbErr

    // 3) 초기화 & 목록 갱신
    imageFile.value = null
    audioFile.value = null
    setImagePreview(null)
    setAudioPreview(null)

    await fetchSets()
    success.value = '시그니처 세트를 저장했습니다.'
  } catch (e) {
    error.value = e?.message || '저장에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}

// ---- 세트 삭제 (DB 행만 삭제; R2 삭제는 별도 Functions 필요) ----
async function deleteSet(row) {
  const ok = confirm('이 세트를 목록에서 삭제하시겠습니까? (R2 파일은 남습니다)')
  if (!ok) return
  const { error: delErr } = await supabase
      .from('signature_sets')
      .delete()
      .eq('id', row.id)
  if (delErr) return alert(delErr.message)
  await fetchSets()
}

const canSave = computed(() => !!imageFile.value && !!audioFile.value && !isSaving.value)
</script>

<template>
  <div class="wrap">
    <h2>시그니처 세트</h2>

    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-if="success" class="alert ok">{{ success }}</div>

    <div class="uploader">
      <div class="pick-box">
        <h3>이미지</h3>
        <div class="preview">
          <img v-if="imagePreview" :src="imagePreview" class="img" />
          <div v-else class="placeholder">이미지 미리보기</div>
        </div>
        <input id="img" type="file" accept="image/*" @change="onPickImage" hidden />
        <label class="btn" for="img">이미지 선택</label>
        <div class="meta" v-if="imageFile">
          {{ imageFile.name }} ({{ (imageFile.size/1024/1024).toFixed(2) }} MB)
        </div>
      </div>

      <div class="pick-box">
        <h3>오디오</h3>
        <div class="preview">
          <audio v-if="audioPreview" :src="audioPreview" controls />
          <div v-else class="placeholder">오디오 미리보기</div>
        </div>
        <input id="aud" type="file" accept="audio/*" @change="onPickAudio" hidden />
        <label class="btn" for="aud">오디오 선택</label>
        <div class="meta" v-if="audioFile">
          {{ audioFile.name }} ({{ (audioFile.size/1024/1024).toFixed(2) }} MB)
        </div>
      </div>
    </div>

    <button class="btn primary save" :disabled="!canSave" @click="saveSignatureSet">
      {{ isSaving ? '저장 중…' : '시그니처 저장' }}
    </button>

    <h3 class="list-title">내 세트</h3>
    <div v-if="isLoadingList" class="muted">목록 불러오는 중…</div>
    <div v-else-if="sets.length === 0" class="muted">저장된 세트가 없습니다.</div>

    <div v-else class="list">
      <div v-for="row in sets" :key="row.id" class="set-row">
        <div class="thumb">
          <img v-if="row.image_url" :src="row.image_url" />
        </div>
        <div class="meta-col">
          <div class="title">
            <b>{{ row.image_name || '이미지' }}</b> · <b>{{ row.audio_name || '오디오' }}</b>
          </div>
          <div class="sub">
            {{ new Date(row.created_at).toLocaleString() }}
          </div>
          <div class="links">
            <a :href="row.image_url" target="_blank" rel="noopener">이미지 열기</a>
            <span>•</span>
            <a :href="row.audio_url" target="_blank" rel="noopener">오디오 열기</a>
          </div>
        </div>
        <div class="actions">
          <a class="btn small" :href="row.image_url" download>이미지 다운</a>
          <a class="btn small" :href="row.audio_url" download>오디오 다운</a>
          <button class="btn small danger" @click="deleteSet(row)">세트 삭제</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap { max-width: 980px; margin: 32px auto; padding: 0 16px; }
.alert { padding:10px 12px; border-radius:8px; margin-bottom:12px; display:inline-block; }
.alert.error { background:#fde8ea; color:#b1001f; }
.alert.ok { background:#e9f7ef; color:#1b6a3a; }
.uploader { display:grid; grid-template-columns: 1fr; gap:16px; margin:16px 0; }
@media (min-width: 768px) { .uploader { grid-template-columns: 1fr 1fr; } }
.pick-box { border:1px solid #eee; border-radius:10px; padding:16px; }
.preview { height:180px; border:1px dashed #ccd; border-radius:8px; display:flex; align-items:center; justify-content:center; margin-bottom:12px; background:#fafbfc; overflow:hidden; }
.img { max-width:100%; max-height:100%; object-fit:contain; }
.placeholder { color:#888; }
.btn { display:inline-flex; align-items:center; gap:6px; padding:10px 14px; border-radius:8px; border:1px solid #007bff; background:#007bff; color:#fff; cursor:pointer; }
.btn.primary.save { margin-top: 8px; }
.btn.small { padding:6px 10px; font-size:.9rem; }
.btn.danger { background:#dc3545; border-color:#dc3545; }
.meta { color:#555; margin-top:6px; font-size:.9rem; }
.list-title { margin-top:24px; }
.muted { color:#6b7280; }
.list { margin-top:12px; }
.set-row { display:flex; gap:12px; align-items:center; padding:12px 0; border-bottom:1px solid #f4f4f4; }
.thumb { width:72px; height:56px; background:#f3f4f6; border-radius:6px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.thumb img { max-width:100%; max-height:100%; object-fit:cover; }
.meta-col { flex:1; min-width:0; }
.title { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sub { color:#6b7280; font-size:.9rem; }
.links { display:flex; gap:8px; margin-top:6px; font-size:.9rem; }
.actions { display:flex; gap:8px; }
</style>