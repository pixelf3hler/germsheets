/*<?gss eval=false ?>
    skeleton_unroll.js
    unrolls a user defined skeleton stored in an iterator-block type variable
    supposed to be used as a germSheets Skeleton
  © 2013 max ɐʇ pixelf3hler · de
    The MIT License
    see license.txt
*/
if(f = germSheets.expandArguments(["ident", "type", "from", "to", "content"], arguments, _here_)) {
   
   f.ident = f.ident || "gs-box"
   f.type = f.type || "class"
   f.from = f.from || 12
   f.to = f.to || 24
   f.content = f.content || "border-radius: [i]px"
   var out = "", token = ("class" == f.type) ? "." : "#"
   f.content = f.content.replace(/^`*|[`;]*$/g, '')
   for(;f.from<=f.to;f.from++) {
      out += "\n" + token + f.ident + "-" + f.from + " {\n\t" + f.content.replace(/\[i\]/g, f.from) + ";\n\t}\n"
   }
   return out
}
return "Error expanding arguments in " + _here_