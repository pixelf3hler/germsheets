//<?gss eval=0 ?>
if(f = germSheets.expandArguments(["color", "image", "position", "repeat", "attachment", "size", "clip", "origin"], arguments, _here_)) {
   var r = "",
   _getColor = function(c) {
      // hex or rgb?
      // no whitespace allowed in hexstrings
      if(/^#[0-9a-z]*/i.test(c) && -1 === c.indexOf(" ")) {
         var r2 = c.substring(1)
         if(!r2 || !r2.length) return "#000"
         switch(r2.length) {
            case 1:
               return "#" + r2.repeat(3)
               
            case 3:
            case 6:
               return "#" + r2
            
            default:
               return "#000 /* invalid color format supplied */"
         }
      }
      // rgb values should be seperated with whitespace or tab
      r2 = c.split(/\u0020*|\u0009*/)
      if(!r2 || !r2.length) return "rgb(0,0,0)"
      switch(r2.length) {
         case 1:
            return "rgb(" + r2[0] + "," + r2[0] + "," + r2[0] + ")"
            
         case 3:
            // assume rgb value
            return "rgb(" + r2.join(",") + ")"
            
         case 4:
            // assume rgba value
            return "rgba(" + r2.join(",") + ")"
      }
      return "rgb(0,0,0) /* invalid color format supplied */"
   },
   _getPosition = function(p) {
      // positions should also be seperated with whitespace
      var vals = {
         "t": "top",
         "top": "top",
         "r": "right",
         "right": "right",
         "b": "bottom",
         "bottom": "bottom",
         "l": "left",
         "left": "left",
         "c": "center",
         "center": "center"
      }, tmp = p.split(/\u0020*|\u0009*/),
      xpos = /[rlc]/i.test(tmp[0]) ? vals[tmp[0]] : /\d|inherit/.test(tmp[0]) ? tmp[0] : "center",
      ypos = !tmp[1] ? "center" : /[tbc]/i.test(tmp[1]) ? vals[tmp[1]] : /\d|inherit/.test(tmp[1]) ? tmp[1] : "center"
      
      return xpos + " " + ypos
   },
   _getRepeat = function(re) {
      var vals = {
         "x": "repeat-x",
         "repeat-x": "repeat-x",
         "y": "repeat-y",
         "repeat-y": "repeat-y",
         "n": "no-repeat",
         "no": "no-repeat",
         "no-repeat": "no-repeat"
      }
      return vals[re] || "no-repeat"
   }
   
   if(f.color) r += "background-color: " + _getColor(f.color) + "; "
   if(f.image) r += "background-image: " + (/none|inherit/.test(f.image) ? f.image : "url(" + f.image + ")") + "; "
   if(f.position) r += "background-position: " + _getPosition(f.position) + "; "
   if(f.repeat) r += "background-repeat: " + _getRepeat(f.repeat) + "; "
   if(f.attachment) r += "background-attachment: " + ("f" === f.attachment.charAt(0) ? "fixed" : "scroll") + "; "
   
   // TODO: implement css3 background properties (size, clip, origin)
   
   return r.replace(/\u0020$/, '')
}
return "error: failed to expand arguments in " + _here_