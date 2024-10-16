"use strict";
function replaceNonAlphaNumeric(x, replaceValue) {
  return x.replaceAll(/[^a-z0-9]/ig, replaceValue);
}
export function cleanupExportName(x) {
  x = replaceNonAlphaNumeric(x.split("assembly/").slice(1).join("_"), "_");
  const parts = x.split("_");
  const [pre, name, fn, ...methodParts] = parts;
  if (!fn) {
    return x;
  } else if (fn.toLowerCase() !== name) {
    return `${pre === "gen" ? `${pre}_` : ""}${name}_${[fn, ...methodParts].join("_")}`;
  } else {
    return `${pre === "gen" ? `${pre}_` : ""}${name}_${methodParts.join("_")}`;
  }
}
export const capitalize = (s) => s[0].toUpperCase() + s.slice(1);
export const extendsRegExp = /extends\s([^\s]+)/;
export function sortCompareKeys([a], [b]) {
  return a < b ? -1 : a > b ? 1 : 0;
}
export function sortObjectInPlace(data) {
  const sorted = Object.fromEntries(
    Object.entries(data).sort(sortCompareKeys)
  );
  for (const key in data) {
    delete data[key];
  }
  Object.assign(data, sorted);
  return data;
}
