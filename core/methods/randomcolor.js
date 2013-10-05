(function() {
   return function randomColor(format) {
       var i = 0, r = "", hexvals = "0123456789abcdef"
       format = format || "hex"
       
       if("hex" == format) {
           r = "#";
           for(; i<6; i++) {
               r += hexvals.charAt(Math.round(Math.random() * (hexvals.length-1)))
           }
       }else {
           r = "rgb("
           for(i=0;i<3;i++) {
               r += Math.round(Math.random() * 255).toString() + ','
           }
           r = r.substring(0, r.length-1) + ")"
           
       }
       return r + ";"
   }
})()