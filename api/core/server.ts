import os from 'https://deno.land/x/os_paths@v7.4.0/src/mod.deno.ts'
import * as path from 'jsr:@std/path'
import { app } from './app.ts'
import { IS_DEV } from './constants.ts'
import { files, logger, session, watcher } from './middleware.ts'
import { register as registerRpc } from '../routes/rpc.ts'

const dist = 'dist'
const home = os.home() ?? '~'

const options = IS_DEV
  ? {
    cert: Deno.readTextFileSync(path.join(home, '.ssl-certs', 'devito.test.pem')),
    key: Deno.readTextFileSync(path.join(home, '.ssl-certs', 'devito.test-key.pem')),
  }
  : {}

Deno.serve(options, app.handler)

app.use(null, [logger])
app.use(null, [session])

registerRpc(app)

IS_DEV && app.log('Listening: https://devito.test:8000')
IS_DEV && app.get('/watcher', [watcher])
app.use(null, [files(dist)])
