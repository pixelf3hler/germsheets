//<?gss eval=false ?>

var i = 0, r = "", hexvals = "0123456789abcdef"

r = "#";
for(; i<6; i++) {
   r += hexvals.charAt(Math.round(Math.random() * (hexvals.length-1)))
}

return r + ";"
