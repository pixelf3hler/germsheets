/*<?gss eval=false ?>*/
if(f = germSheets.expandArguments(["fontSize", "lineHeight"], arguments, _here_)) {
   return Math.round(Math.pow(f.fontSize * 1.61803399, 2) * (1 + 2 * 1.61803399 * (f.lineHeight / f.fontSize - 1.61803399)))
}
return "error expanding arguments in: " + _here_