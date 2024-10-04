export function Fieldset({ legend, children }: { legend: string, children?: any }) {
  return <fieldset>
    <legend>{legend}</legend>
    <div class="flex flex-col sm:items-end gap-1">
      {children}
    </div>
  </fieldset>
}
