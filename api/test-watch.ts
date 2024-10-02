import { debounce } from 'utils'

const watcher = Deno.watchFs('./api')

const run = debounce(100, async () => {
  Deno.removeSync('./coverage', { recursive: true })

  {
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        'test',
        '--coverage',
      ],
    })
    await command.output()
  }

  {
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        'coverage',
        'coverage',
      ],
    })
    const { stdout } = await command.output()
    console.log(new TextDecoder().decode(stdout))
  }

  {
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        'coverage',
        'coverage',
        '--lcov',
        '--output=coverage/lcov.info'
      ],
    })
    await command.output()
  }

  console.log('Coverage report generated')
})

for await (const _ of watcher) {
  run()
}
