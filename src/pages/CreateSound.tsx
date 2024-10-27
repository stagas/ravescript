import { Sigui } from 'sigui'
import { H2 } from 'ui'
import { dspEditorUi } from '~/src/comp/DspEditorUi.tsx'
import { getDspControls } from '~/src/pages/DspControls.tsx'

export function CreateSound() {
  using $ = Sigui()

  const info = $({
    code: '[sin 300] [exp 1] *'
  })

  $.fx(() => {
    $()
    const { info: controlsInfo, dspEditorUi } = getDspControls()
    controlsInfo.loadedSound = null
    controlsInfo.isLoadingSound = false
    const { pane } = dspEditorUi().dspEditor.editor.info
    const newPane = dspEditorUi().dspEditor.editor.createPane({ rect: pane.rect, code: info.$.code })
    dspEditorUi().info.code = info.code
    dspEditorUi().dspEditor.editor.addPane(newPane)
    dspEditorUi().dspEditor.editor.removePane(pane)
    dspEditorUi().dspEditor.editor.info.pane = newPane
  })

  return <div>
    <H2 class="flex h-16 relative">
      <span>Create Sound</span>
      <div>
        <div class="self-center">{() => getDspControls().el}</div>
      </div>
    </H2>
    <div class="flex flex-1 w-full h-full">{() => dspEditorUi().el}</div>
  </div> as HTMLDivElement
}
