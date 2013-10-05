(function() {
   return function skeleton_unroll(ident, type, from, to, content) {
      var out = "", token = ("class" == type) ? "." : "#"
      for(;from<=to;from++) {
         out += "\n" + token + ident + "_" + from + " {\n\t" + content.replace(/\[i\]/g, from) + ";\n\t}\n"
      }
      return out
   }
})()