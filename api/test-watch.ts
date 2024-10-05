import { debounce } from 'utils'

const watcher = Deno.watchFs('./api')

const run = debounce(100, async () => {
  try {
    Deno.removeSync('./coverage/deno', { recursive: true })
  }
  catch {
    //
  }

  {
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        'test',
        '~/api',
        '--no-lock',
        '--coverage=coverage/deno',
      ],
    })
    await command.output()
  }

  {
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        'coverage',
        'coverage/deno',
      ],
    })
    const { stdout } = await command.output()
    console.log(new TextDecoder().decode(stdout))
  }

  {
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        'coverage',
        'coverage/deno',
        '--lcov',
        '--output=coverage/lcov-deno.info'
      ],
    })
    await command.output()
  }

  console.log('Coverage report generated')
})

run()
for await (const _ of watcher) {
  run()
}
