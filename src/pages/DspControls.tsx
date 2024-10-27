import { Heart, Play, Save, SaveAll, Square, Trash2 } from 'lucide'
import { Sigui } from 'sigui'
import { Button, go, Link } from 'ui'
import type { GetSoundResult } from '~/api/sounds/actions.ts'
import { icon } from '~/lib/icon.ts'
import { dspEditorUi } from '~/src/comp/DspEditorUi.tsx'
import { ICON_16, ICON_24, ICON_32 } from '~/src/constants.ts'
import { addSoundToFavorites, deleteSound, getSound, overwriteSound, publishSound, removeSoundFromFavorites } from '~/src/rpc/sounds.ts'
import { state } from '~/src/state.ts'
import { theme } from '~/src/theme.ts'

let dspControls: ReturnType<typeof DspControls>

export function getDspControls() {
  dspControls ??= DspControls()
  return dspControls
}

export function DspControls() {
  using $ = Sigui()

  const info = $({
    el: null as null | HTMLDivElement,
    get title() {
      return info.isPublished ? info.loadedSound!.sound.title : ''
    },
    get isPublished() {
      return !!info.loadedSound
    },
    get isEdited() {
      return !info.loadedSound || (info.loadedSound?.sound.code !== dspEditorUi().info.code)
    },
    isLoadingSound: false,
    loadedSound: null as null | Awaited<ReturnType<typeof getSound>>
  })

  $.fx(() => {
    const { searchParams } = state
    $().then(async () => {
      if (searchParams.has('sound')) {
        $.batch(() => {
          info.isLoadingSound = true
          // dspEditorUi().info.codeWorking = null
        })
        const { sound: soundId } = Object.fromEntries(searchParams)
        const loadedSound = await getSound(soundId)
        $.batch(() => {
          info.isLoadingSound = false
          info.loadedSound = {
            sound: $(loadedSound.sound),
            creator: $(loadedSound.creator),
            remixOf: loadedSound.remixOf ? $(loadedSound.remixOf) : loadedSound.remixOf
          }
          const { pane } = dspEditorUi().dspEditor.editor.info
          const newPane = dspEditorUi().dspEditor.editor.createPane({ rect: pane.rect, code: $(loadedSound.sound).$.code })
          dspEditorUi().info.code = loadedSound.sound.code
          dspEditorUi().dspEditor.editor.addPane(newPane)
          dspEditorUi().dspEditor.editor.removePane(pane)
          dspEditorUi().dspEditor.editor.info.pane = newPane
        })
      }
      else {
        $.batch(() => {
          // info.loadedSound = null
        })
      }
    })
  })

  const overwriteBtn = <Button bare title="Overwrite" onclick={async () => {
    if (!info.loadedSound) return
    const { sound } = info.loadedSound
    const title = prompt('Enter a title:', sound.title)
    if (!title) return
    const { pane } = dspEditorUi().dspEditor.editor.info
    await overwriteSound(sound.id, title, pane.buffer.code)
    sound.title = title
    dspEditorUi().info.code = pane.buffer.code
    go(`/${state.user!.defaultProfile}?sound=${encodeURIComponent(sound.id)}&kind=${sound.remixOf ? 'remixes' : 'sounds'}`)
  }}>{icon(SaveAll, ICON_16)}</Button>

  const publishBtn = <Button bare title={() => info.isEdited && info.isPublished ? "Save remix" : "Save"} onclick={async () => {
    const title = prompt('Enter a title:', info.title)
    if (!title) return
    const { pane } = dspEditorUi().dspEditor.editor.info
    const { id } = await publishSound(title, pane.buffer.code, info.isEdited && info.loadedSound ? info.loadedSound.sound.id : undefined)
    if (info.loadedSound) info.loadedSound.sound.title = title
    dspEditorUi().info.code = pane.buffer.code
    state.triggerReloadProfileSounds++
    go(`/${state.user!.defaultProfile}?sound=${encodeURIComponent(id)}&kind=${info.isEdited ? 'remixes' : 'sounds'}`)
  }}>{icon(Save, ICON_16)}</Button>

  const likeBtn = <Button bare title="Like" onclick={async () => {
    if (!state.user) return
    if (!info.loadedSound) return
    const { sound } = info.loadedSound
    await addSoundToFavorites(sound.id)
    state.favorites.add(sound.id)
    state.favorites = new Set(state.favorites)
    state.onNavigate.add(() => {
      state.triggerReloadProfileFavorites++
    })
  }}>{icon(Heart, ICON_16)}</Button>

  const unlikeBtn = <Button bare title="Unlike" onclick={async () => {
    if (!state.user) return
    if (!info.loadedSound) return
    const { sound } = info.loadedSound
    await removeSoundFromFavorites(sound.id)
    state.favorites.delete(sound.id)
    state.favorites = new Set(state.favorites)
    state.onNavigate.add(() => {
      state.triggerReloadProfileFavorites++
    })
  }}>{icon(Heart, { ...ICON_16, fill: theme.colors.neutral[400] })}</Button>

  const deleteBtn = <Button bare title="Delete" onclick={async () => {
    if (!info.loadedSound) return
    const { sound } = info.loadedSound
    if (!confirm('Are you sure you want to delete this sound?\nPress OK to confirm.')) return
    await deleteSound(sound.id)
    info.loadedSound = null
    state.triggerReloadProfileSounds++
    state.triggerReloadProfileFavorites++
  }}>{icon(Trash2, ICON_16)}</Button>

  const playStopBtn = <Button bare onpointerdown={() => {
    dspEditorUi().dspNode.info.isPlaying ? dspEditorUi().dspNode.stop() : dspEditorUi().dspNode.play()
  }}>{() => dspEditorUi().dspNode.info.isPlaying ? icon(Square, ICON_32) : icon(Play, ICON_32)}</Button>

  state.heading = playStopBtn

  const titleDiv = ({ sound, creator, remixOf }: GetSoundResult) => <div class="flex flex-col flex-0">
    <div class="overflow-hidden text-ellipsis whitespace-nowrap flex flex-0 gap-1 text-lg mt-[2px]">
      <Link href={`/${creator.nick}`}>{creator.displayName}</Link> - <Link href={`/${creator.nick}?sound=${sound.id}&kind=${sound.remixOf ? 'remixes' : 'sounds'}`}>{sound.title}</Link>
    </div> {remixOf && <div class="text-sm -mt-1">remix of <Link href={`/${remixOf.creator.nick}?sound=${remixOf.sound.id}&kind=${remixOf.sound.remixOf ? 'remixes' : 'sounds'}`}>
      {remixOf.creator.displayName} - {remixOf.sound.title}
    </Link></div>}
  </div>

  info.el = <div class="flex flex-row gap-2 items-center">
    <div class="flex overflow-hidden w-full">
      {() => info.isPublished && titleDiv(info.loadedSound!)}
    </div>
    <div class="flex flex-row items-center gap-2">{
      () => info.isLoadingSound ? [] : [
        (!info.isPublished || info.isEdited) && state.user?.defaultProfile === info.loadedSound?.creator?.nick && overwriteBtn,
        (!info.isPublished || info.isEdited) && state.user && publishBtn,
        !info.isEdited && info.loadedSound && (state.favorites.has(info.loadedSound.sound.id) ? unlikeBtn : likeBtn),
        (info.isPublished && !info.isEdited) && state.user?.defaultProfile === info.loadedSound?.creator?.nick && deleteBtn,
      ]}
    </div>
  </div> as HTMLDivElement

  return { el: info.el, info, dspEditorUi }
}
