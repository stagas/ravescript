import pkg from '~/src/as/pkg.ts'

export function AssemblyScript() {

  return <div>
    Welcome from AssemblyScript! {pkg.multiply(2, 3)}
  </div>
}
