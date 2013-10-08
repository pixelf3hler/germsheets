/*<?gss eval=false ?>
   skeleton_paragraphs.js
   generates paragraph classes called .par_n where `n` is replaced
   by the current font size. Starts at `f.from`, stops at (including) `f.to`.
   Calculates line-height based on font size and a f.ratio. Can optionally
   calculate the optimal line width or apply an adjusted line height based
   on a given fixed width.
 © 2013 max ɐʇ pixelf3hler · de
   The MIT License
   see license.txt
*/
if(f = germSheets.expandArguments(["from", "to", "fontFamily", "setWidth", "ratio"], arguments, _here_)) {
   var 
   out = "", 
   ra = 0.0, 
   GOLDEN_RATIO = 1.61803399
   
   f.fontFamily = f.fontFamily || "sans-serif"
   
   f.ratio = !f.ratio ? "gold" : f.ratio.toLowerCase()
   
   if(isNaN(parseFloat(f.ratio))) {
      // constant value
      if('gold' === f.ratio) {
         ra = GOLDEN_RATIO
         //debug("gold: " + ra);
      }else if('pi' === f.ratio)
      {
         ra = Math.PI
      }
   }else {
      ra = parseFloat(f.ratio);
   }
   f.setWidth = f.setWidth || true
   f.from = parseInt(f.from)
   f.to = parseInt(f.to)
   // improve
   if(-1 !== f.fontFamily.indexOf(" ")) {
      f.fontFamily = f.fontFamily.split(" ").join(",")
   }
   var fs, lh
   if(true === f.setWidth) {
      var w
      //debug("f.from " + f.from + " f.to: " + f.to);
      for(;f.from<=f.to; f.from++) {
         fs = f.from
         lh = Math.round(fs * ra)
         w = Math.pow(lh,2)
         //debug(fs + "\n" + lh + "\n" + w + "\n" + ra);
         // see 
         // http://www.pearsonified.com/2011/12/golden-f.ratio-typography.php
         w = Math.pow(fs*ra,2) * (1 + 2 * ra * (lh/fs - ra))
         out += "\n.par_" + fs + " {\n\tfont-family: " + f.fontFamily + ";\n\tfont-size: " + fs + "px;\n\tline-height: " + lh + "px;\n\twidth: " + Math.round(w) + "px;\n\t}\n"
      }
   }else if(!isNaN(parseInt(f.setWidth))){
      f.setWidth = parseInt(f.setWidth)
      for(;f.from<=f.to; f.from++) {
         fs = f.from
         /* 
            also f.from 
            http://www.pearsonified.com/2011/12/golden-f.ratio-typography.php 
         */
         f.ratio = ra - (1/(2*ra)) * (1 - f.setWidth/Math.pow(fs*ra, 2))
         lh = Math.round(fs * f.ratio);
         
         //debug("\nfont size\n" + fs + "\nadjusted f.ratio\n" + f.ratio + "\nline height\n" + lh);
         out += "\n.par_" + fs + " {\n\tfont-family: " + f.fontFamily + ";\n\tfont-size: " + fs + "px;\n\tline-height: " + lh + "px;\n\twidth: " + f.setWidth + "px;\n\t}\n"
      }
   }else
   {
      for(;f.from<=f.to; f.from++)
      {
         out += "\n.par_" + f.from + " {\n\tfont: " + f.from + "px/" + ra.toFixed(2) + " " + f.fontFamily + ";\n\t}\n"
      }
      // 
   }
   return out
}
return "error expanding arguments in: " + _here_