export const NONSPACE = /[^\s]/g
export const SPACE = /\s/g
export const WORD = /\n|[\s]{2,}|[./\\()"'\-:,.;<>~!@#$%^&*|+=[\]{}`~?\b ]{1}|\w+/g
export const TOKEN = /\s+|[\w\.]+|[\W]/g
export const BRACKET = /[\[\]\(\)\{\}]/ // used with .test so not a /g
