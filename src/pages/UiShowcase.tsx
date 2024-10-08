import { Button, Fieldset, H1, H2, H3, Input, Label, Link } from '~/src/ui/index.ts'

function UiGroup({ name, children }: { name: string, children?: any }) {
  return <div class="mb-10">
    <H2>{name}</H2>
    {children}
  </div>
}

export function UiShowcase() {
  return (
    <div class="w-[400px]">

      <H1>UI Showcase</H1>

      <UiGroup name="Heading">
        <H1>Heading 1</H1>
        <H2>Heading 2</H2>
        <H3>Heading 3</H3>
      </UiGroup>

      <UiGroup name="Input">
        <Input placeholder="some input..." />
      </UiGroup>

      <UiGroup name="Fieldset">
        <Fieldset legend="Fieldset Legend">
          <Label text="Login"><Input /></Label>
          <Label text="Password"><Input type="password" /></Label>
        </Fieldset>
      </UiGroup>

      <UiGroup name="Button">
        <Button>Click me</Button>
      </UiGroup>

      <UiGroup name="Link">
        <Link href="#">About</Link>
      </UiGroup>
    </div>
  )
}
