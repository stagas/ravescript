import os from 'https://deno.land/x/os_paths@v7.4.0/src/mod.deno.ts'
import { parseArgs } from 'jsr:@std/cli/parse-args'
import * as path from 'jsr:@std/path'
import '~/api/chat/actions.ts'
import * as chat from '~/api/chat/routes.ts'
import { app } from '~/api/core/app.ts'
import { IS_DEV } from "~/api/core/constants.ts"
import { cors, files, logger, session, watcher } from "~/api/core/middleware.ts"
import '~/api/oauth/actions.ts'
import * as oauthCommon from '~/api/oauth/routes/common.ts'
import * as oauthGitHub from '~/api/oauth/routes/github.ts'
import * as rpc from '~/api/rpc/routes.ts'
import * as ws from '~/api/ws/routes.ts'

const dist = 'dist'
const home = os.home() ?? '~'

const args = parseArgs(Deno.args, {
  string: ['port'],
})

const options: Record<string, string> = IS_DEV
  ? {
    cert: Deno.readTextFileSync(path.join(home, '.ssl-certs', 'devito.test.pem')),
    key: Deno.readTextFileSync(path.join(home, '.ssl-certs', 'devito.test-key.pem')),
  }
  : {}

options.port = args.port ?? '8000'

Deno.serve(options, app.handler)

app.use(null, [logger])
app.use(null, [cors])
app.use(null, [session])

chat.mount(app)
oauthCommon.mount(app)
oauthGitHub.mount(app)
rpc.mount(app)
ws.mount(app)

IS_DEV && app.log('Listening: https://devito.test:' + options.port)
IS_DEV && app.get('/watcher', [watcher])
app.use(null, [files(dist)])
