import { parseArgs } from "jsr:@std/cli/parse-args"
import os from 'https://deno.land/x/os_paths@v7.4.0/src/mod.deno.ts'
import * as path from 'jsr:@std/path'
import '../actions/chat.ts'
import '../actions/oauth.ts'
import * as chat from '../routes/chat.ts'
import * as oauthCommon from '../routes/oauth/common.ts'
import * as oauthGitHub from '../routes/oauth/github.ts'
import * as rpc from '../routes/rpc.ts'
import { app } from './app.ts'
import { IS_DEV } from './constants.ts'
import { cors, files, logger, session, watcher } from './middleware.ts'

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

oauthCommon.mount(app)
oauthGitHub.mount(app)
rpc.mount(app)
chat.mount(app)

IS_DEV && app.log('Listening: https://devito.test:' + options.port)
IS_DEV && app.get('/watcher', [watcher])
app.use(null, [files(dist)])
