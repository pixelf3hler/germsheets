/*<?gss eval=false ?>*/
if(f = germSheets.expandArguments(["googleFontFamily", "params"], arguments, _here_)) {
   //http://fonts.googleapis.com/css?family=
   return "@import url(http://fonts.googleapis.com/css?family=" + (/\u0020/.test(f.googleFontFamily) ? "'" + f.googleFontFamily + "'" : f.googleFontFamily) + (f.params ? ":" + f.params : "") + ");"
}
return "error expanding arguments in: " + _here_