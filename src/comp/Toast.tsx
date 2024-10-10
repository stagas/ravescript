import { state } from '~/src/state.ts'

export function Toast() {
  return <div>
    {() => state.toastMessages.length ? <div class="absolute w-[70%] p-4 bottom-0 right-0 flex flex-col gap-2">
      {() => state.toastMessages.map(item =>
        <div class="bg-black min-w-full p-2 border border-white-500 text-sm overflow-hidden text-ellipsis whitespace-pre" onmousedown={() => {
          state.toastMessages = state.toastMessages.filter(i => i !== item)
        }}>{item.stack ?? item.message}</div>
      )}
    </div> : <div />}
  </div>
}
