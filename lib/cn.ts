export function cn(...args: any[]) {
  return () => {
    const classes = []
    for (const arg of args) {
      if (typeof arg === 'string') {
        classes.push(arg)
      }
      else if (typeof arg === 'function') {
        classes.push(arg())
      }
      else if (arg) {
        classes.push(Object.keys(arg).filter(k => arg[k]).join(' '))
      }
    }
    return classes.join(' ')
  }
}