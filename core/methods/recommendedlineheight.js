//<?gss eval=false ?>
if(f = germSheets.expandArguments(["fontSize", "lineWidth"], arguments, _here_)) {
   // 1.61803399 = golden ratio
   return !f.lineWidth ? Math.round(f.fontSize * 1.61803399) + "px;" : Math.round(f.fontSize * (1.61803399 - (1 / (2 * 1.61803399)) * (1 - f.lineWidth / Math.pow(f.fontSize * 1.61803399, 2)))) + "px;";
}