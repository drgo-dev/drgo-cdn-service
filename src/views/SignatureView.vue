<!-- src/views/Signature.vue -->
<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'
import { uploadToR2 } from '@/api/upload'

const userStore = useUserStore()

// 선택한 파일 & 미리보기
const imageFile = ref(null)
const audioFile = ref(null)
const imagePreview = ref('')
const audioPreview = ref('')
const title = ref('')

// 상태
const isSaving = ref(false)
const isLoadingList = ref(false)
const error = ref('')
const toast = ref('')

// 세트 목록
const sets = ref([])

function showToast(msg) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 1500)
}

// 미리보기 URL 정리
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

// 파일 선택
function onPickImage(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  if (!f.type?.startsWith('image/')) return (error.value = '이미지 파일을 선택하세요.')
  if (f.size > 10 * 1024 * 1024) return (error.value = '이미지 최대 10MB까지 가능합니다.')
  error.value = ''
  imageFile.value = f
  setImagePreview(f)
}
function onPickAudio(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  if (!f.type?.startsWith('audio/')) return (error.value = '오디오 파일을 선택하세요.')
  if (f.size > 20 * 1024 * 1024) return (error.value = '오디오 최대 20MB까지 가능합니다.')
  error.value = ''
  audioFile.value = f
  setAudioPreview(f)
}

// 목록
async function fetchSets() {
  const uid = userStore.user?.id
  if (!uid) return (sets.value = [])
  isLoadingList.value = true
  const { data, error: err } = await supabase
      .from('signature_sets')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
  isLoadingList.value = false
  if (err) sets.value = []
  else sets.value = data || []
}
watch(() => userStore.user?.id, fetchSets, { immediate: true })

// 저장(두 파일 업로드 → 한 행 insert)
async function saveSignatureSet() {
  error.value = ''
  if (!imageFile.value || !audioFile.value) return (error.value = '이미지와 오디오를 모두 선택하세요.')
  isSaving.value = true
  try {
    const [img, aud] = await Promise.all([
      uploadToR2(imageFile.value),  // { ok, publicUrl, ... }
      uploadToR2(audioFile.value),
    ])

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) throw new Error('세션 만료: 다시 로그인 해주세요.')

    const { error: dbErr } = await supabase.from('signature_sets').insert({
      user_id: user.id,
      title: title.value.trim(),
      image_url: img.publicUrl,
      image_name: imageFile.value.name,
      image_size: imageFile.value.size,
      audio_url: aud.publicUrl,
      audio_name: audioFile.value.name,
      audio_size: audioFile.value.size,
    })
    if (dbErr) throw dbErr

    // 리셋 + 목록 갱신
    imageFile.value = null
    audioFile.value = null
    setImagePreview(null)
    setAudioPreview(null)
    await fetchSets()
    showToast('시그니처 저장 완료')
  } catch (e) {
    error.value = e?.message || '저장 실패'
  } finally {
    isSaving.value = false
  }
}

// 링크 복사 (클립보드)
async function copyLink(url) {
  try {
    await navigator.clipboard.writeText(url)
    showToast('링크 복사됨')
  } catch {
    // 폴백
    const ta = document.createElement('textarea')
    ta.value = url
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    showToast('링크 복사됨')
  }
}

// 세트 삭제 (DB 행만 삭제; R2 삭제는 별도 Functions 필요)
async function deleteSet(row) {
  const ok = confirm('세트를 목록에서 삭제할까요? (R2 파일은 남습니다)')
  if (!ok) return
  const { error: delErr } = await supabase.from('signature_sets').delete().eq('id', row.id)
  if (delErr) return alert(delErr.message)
  await fetchSets()
}
const canSave = computed(() => !!title.value && !!imageFile.value && !!audioFile.value && !isSaving.value)
</script>

<template>
  <div class="wrap">
    <h2>시그니처 세트</h2>

    <div v-if="toast" class="toast">{{ toast }}</div>
    <div v-if="error" class="alert error">{{ error }}</div>

    <!-- 업로드: 한 영역에 이미지(위) + 오디오(아래) -->
    <div class="panel">
      <div class="row">
        <div class="label">이름</div>
        <div class="control">
          <input v-model="title" type="text" placeholder="시그니처 이름 입력" class="input" />
        </div>
      </div>
      <div class="row">
        <div class="label">이미지</div>
        <div class="control">
          <div class="preview image">
            <img v-if="imagePreview" :src="imagePreview" alt="이미지 미리보기" />
            <div v-else class="placeholder">이미지 미리보기</div>
          </div>
          <div class="actions">
            <input id="img" type="file" accept="image/*" @change="onPickImage" hidden />
            <label for="img" class="btn">이미지 선택</label>
            <span v-if="imageFile" class="meta">{{ imageFile.name }} ({{ (imageFile.size/1024/1024).toFixed(2) }} MB)</span>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="label">오디오</div>
        <div class="control">
          <div class="preview audio">
            <audio v-if="audioPreview" :src="audioPreview" controls />
            <div v-else class="placeholder">오디오 미리보기</div>
          </div>
          <div class="actions">
            <input id="aud" type="file" accept="audio/*" @change="onPickAudio" hidden />
            <label for="aud" class="btn">오디오 선택</label>
            <span v-if="audioFile" class="meta">{{ audioFile.name }} ({{ (audioFile.size/1024/1024).toFixed(2) }} MB)</span>
          </div>
        </div>
      </div>

      <div class="save-row">
        <button class="btn primary" :disabled="!canSave" @click="saveSignatureSet">
          {{ isSaving ? '저장 중…' : '시그니처 저장' }}
        </button>
      </div>
    </div>

    <!-- 목록 -->
    <h3 class="list-title">시그니처 목록</h3>
    <div v-if="isLoadingList" class="muted">목록 불러오는 중…</div>
    <div v-else-if="sets.length === 0" class="muted">저장된 세트가 없습니다.</div>

    <div v-else class="list">
      <div v-for="row in sets" :key="row.id" class="set-row">
        <div class="thumb">
          <img :src="row.image_url" alt="" />
        </div>
        <div class="meta-col">
          <div class="title">
            <div class="title"><b>{{ row.title }}</b></div> <!-- 👈 이름 표시 -->
          </div>
          <small>{{ row.image_name || '이미지' }}</small> · <small>{{ row.audio_name || '오디오' }}</small>
          <div class="sub">{{ new Date(row.created_at).toLocaleString() }}</div>
          <div class="links">
          </div>
        </div>
        <div class="actions">
          <button class="btn small" @click="copyLink(row.image_url)">이미지 링크복사</button>
          <button class="btn small" @click="copyLink(row.audio_url)">오디오 링크복사</button>
          <button class="btn small danger" @click="deleteSet(row)">세트 삭제</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap { max-width: 980px; margin: 32px auto; padding: 0 16px; }
.toast {
  position: sticky; top: 8px; display:inline-block;
  background:#111; color:#fff; padding:8px 12px; border-radius:8px; margin-bottom:8px;
}
.alert.error { background:#fde8ea; color:#b1001f; padding:10px 12px; border-radius:8px; display:inline-block; margin-bottom:8px; }

.panel { border:1px solid #e5e7eb; border-radius:12px; padding:16px; background:#fff; }
.row { display:grid; grid-template-columns: 96px 1fr; gap:16px; align-items:flex-start; margin-bottom:16px; }
.label { font-weight:600; color:#374151; padding-top:6px; }
.control {}
.preview { border:1px dashed #cbd5e1; border-radius:8px; background:#f9fafb; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.preview.image { height:220px; }
.preview.audio { padding:14px; min-height:70px; }
.preview img { max-width:100%; max-height:100%; object-fit:contain; }
.placeholder { color:#6b7280; }
.actions { display:flex; align-items:center; gap:10px; margin-top:8px; }
.meta { color:#6b7280; font-size:.9rem; }

.save-row { display:flex; justify-content:flex-end; }
.btn {
  display:inline-flex; align-items:center; gap:6px; padding:10px 14px;
  border-radius:8px; border:1px solid #007bff; background:#007bff; color:#fff; cursor:pointer;
}
.btn.primary { min-width:140px; justify-content:center; }
.btn:disabled { opacity:.6; cursor:not-allowed; }
.btn.small { padding:6px 10px; font-size:.9rem; }
.btn.danger { background:#dc3545; border-color:#dc3545; }

.list-title { margin:24px 0 8px; }
.muted { color:#6b7280; }
.list { margin-top:8px; }
.set-row { display:grid; grid-template-columns: 84px 1fr auto; gap:12px; align-items:center; padding:12px 0; border-bottom:1px solid #f3f4f6; }
.thumb { width:84px; height:64px; background:#f3f4f6; border-radius:8px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.thumb img { width:100%; height:100%; object-fit:cover; }
.meta-col { min-width:0; }
.title { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sub { color:#6b7280; font-size:.9rem; margin-top:2px; }
.links { display:flex; gap:10px; margin-top:6px; }
.link-btn {
  border:none; background:transparent; color:#007bff; cursor:pointer; padding:0;
}
.actions { display:flex; gap:8px; }
.input { width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; }

</style>